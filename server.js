const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const db = require('./database');

const app = express();
app.disable('x-powered-by'); // Remove powered-by fingerprint header

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.json());

// Serve static files from the React app build folder
app.use(express.static(path.join(__dirname, 'client/dist')));

// Cryptographic token session secret and validation helpers
const SERVER_SECRET = process.env.SESSION_SECRET || db.getOrGenerateSecret();

function generateSessionToken(userId) {
  const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 Hours validity
  const payload = `${userId}:${expiry}`;
  const hmac = crypto.createHmac('sha256', SERVER_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${signature}`;
}

function verifySessionToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    
    const payload = Buffer.from(parts[0], 'base64url').toString('utf8');
    const signature = parts[1];
    
    const hmac = crypto.createHmac('sha256', SERVER_SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest('base64url');
    
    if (signature !== expectedSignature) return null;
    
    const [userId, expiryStr] = payload.split(':');
    const expiry = parseInt(expiryStr, 10);
    if (Date.now() > expiry) return null; // Expired token
    
    return userId;
  } catch (err) {
    return null;
  }
}

// In-Memory Rate Limiter (Max 10 auth attempts/minute per IP)
const authAttempts = new Map();
function checkRateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const record = authAttempts.get(ip);
  
  if (record) {
    if (now - record.lastAttempt > 60000) {
      authAttempts.set(ip, { count: 1, lastAttempt: now });
      return next();
    }
    if (record.count >= 10) {
      return res.status(429).json({ error: 'Too many authentication attempts. Please try again in 1 minute.' });
    }
    record.count += 1;
    record.lastAttempt = now;
  } else {
    authAttempts.set(ip, { count: 1, lastAttempt: now });
  }
  next();
}

// Track active online users: userId -> socketId
const onlineUsers = new Map();

// API REST routes for signup and login with Rate Limiting and HMAC Session Tokens
app.post('/api/register', checkRateLimit, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const userProfile = db.createUser(username, password);
    const token = generateSessionToken(userProfile.id);
    res.status(201).json({ success: true, user: userProfile, token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/login', checkRateLimit, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const userProfile = db.verifyUser(username, password);
    const token = generateSessionToken(userProfile.id);
    res.json({ success: true, user: userProfile, token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Serve frontend SPA for all remaining routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
});

// Socket.io Real-Time Handler with Cryptographic Authentication Handshake
io.on('connection', (socket) => {
  let authenticatedUserId = null;

  console.log(`Socket connected: ${socket.id}`);

  // Authenticate socket connection with secure session token
  socket.on('authenticate', (token) => {
    const verifiedUserId = verifySessionToken(token);
    if (verifiedUserId) {
      const user = db.getUserById(verifiedUserId);
      if (user) {
        authenticatedUserId = verifiedUserId;
        onlineUsers.set(verifiedUserId, socket.id);
        console.log(`User ${user.username} (${verifiedUserId}) is online on socket ${socket.id}`);
        
        socket.broadcast.emit('user_status_changed', { userId: verifiedUserId, status: 'online' });
      }
    } else {
      console.log(`Unauthorised socket connection attempt rejected: ${socket.id}`);
      socket.emit('unauthorized');
      setTimeout(() => {
        socket.disconnect(true);
      }, 300);
    }
  });

  // Search users by name
  socket.on('search_users', ({ query, excludeUserId }, callback) => {
    try {
      const results = db.searchUsers(query, excludeUserId);
      callback({ success: true, users: results });
    } catch (err) {
      callback({ success: false, error: err.message });
    }
  });

  // Get user profile (e.g. via QR code content match)
  socket.on('resolve_qr_profile', (qrString, callback) => {
    try {
      const match = qrString.match(/spookychat:\/\/user\/([a-f0-9-]+)/i);
      if (match) {
        const userId = match[1];
        const user = db.getUserById(userId);
        if (user) {
          callback({ success: true, user });
        } else {
          callback({ success: false, error: 'User not found in database' });
        }
      } else {
        callback({ success: false, error: 'Invalid SpookyChat QR format' });
      }
    } catch (err) {
      callback({ success: false, error: err.message });
    }
  });

  // Create a 1-on-1 chat session
  socket.on('create_chat', ({ senderId, recipientId }, callback) => {
    try {
      const chat = db.createChat(senderId, recipientId);
      const otherUser = db.getUserById(recipientId);
      
      callback({ 
        success: true, 
        chat: {
          id: chat.id,
          isGroup: false,
          otherUser,
          lastMessage: null,
          createdAt: chat.createdAt
        } 
      });

      const recipientSocketId = onlineUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('chat_list_updated');
      }
    } catch (err) {
      callback({ success: false, error: err.message });
    }
  });

  // Create a Group Chat session
  socket.on('create_group_chat', ({ groupName, participantIds }, callback) => {
    try {
      const chat = db.createGroupChat(groupName, participantIds);
      
      // Notify all active participants about the new group
      participantIds.forEach(pid => {
        const pSocketId = onlineUsers.get(pid);
        if (pSocketId) {
          io.to(pSocketId).emit('chat_list_updated');
        }
      });

      callback({ success: true, chat });
    } catch (err) {
      callback({ success: false, error: err.message });
    }
  });

  // Get chat list for the authenticated user
  socket.on('get_chats', (userId, callback) => {
    try {
      const chats = db.getChatsForUser(userId);
      
      // Map online status
      const chatsWithStatus = chats.map(c => {
        if (c.isGroup) {
          return {
            ...c,
            participants: c.participants.map(p => ({
              ...p,
              status: onlineUsers.has(p.id) ? 'online' : 'offline'
            }))
          };
        } else {
          return {
            ...c,
            otherUser: {
              ...c.otherUser,
              status: onlineUsers.has(c.otherUser.id) ? 'online' : 'offline'
            }
          };
        }
      });
      
      callback({ success: true, chats: chatsWithStatus });
    } catch (err) {
      callback({ success: false, error: err.message });
    }
  });

  // Get message history for a specific chat
  socket.on('get_messages', (chatId, callback) => {
    try {
      const messages = db.getMessagesForChat(chatId);
      callback({ success: true, messages });
    } catch (err) {
      callback({ success: false, error: err.message });
    }
  });

  // Handle quantum-encrypted real-time message sending (Group & 1-on-1)
  socket.on('send_message', ({ chatId, senderId, recipientId, encryptedPayload, quantumDetails }) => {
    console.log(`Processing message in chat ${chatId} from ${senderId}`);
    
    const eavesdropped = quantumDetails.eavesdropped || false;
    let overallFidelity = 1.0;
    let decryptedSuccessfully = true;

    // Process the multi-qubit array for interception / collapse
    const processedQubits = (quantumDetails.qubits || []).map((q) => {
      let bobMeasurement = q.aliceMeasurement; 

      if (eavesdropped) {
        // Eve intercepts the key transmission channel
        const bases = ['rectilinear', 'diagonal'];
        const eveBasis = bases[Math.floor(Math.random() * bases.length)];

        if (eveBasis !== q.aliceBasis) {
          // Entanglement breaks
          const matchesOriginal = Math.random() < 0.5;
          if (!matchesOriginal) {
            bobMeasurement = q.aliceMeasurement === 0 ? 1 : 0; // bit flipped
          }
        }
      }

      return {
        ...q,
        bobMeasurement
      };
    });

    const hasMismatch = processedQubits.some(q => q.aliceMeasurement !== q.bobMeasurement);
    if (hasMismatch) {
      decryptedSuccessfully = false;
    }

    if (eavesdropped) {
      overallFidelity = 0.5;
    }

    const completeQuantumDetails = {
      ...quantumDetails,
      qubits: processedQubits,
      eavesdropped,
      fidelity: overallFidelity,
      decryptedSuccessfully
    };

    // Save message with group reference
    const savedMsg = db.saveMessage(chatId, senderId, recipientId, encryptedPayload, completeQuantumDetails);

    // If it's a group chat, we broadcast it to all other participants
    // We look up the chat session in database.json to find participants list
    const chats = db.getChatsForUser(senderId);
    const activeChatSession = chats.find(c => c.id === chatId);

    if (activeChatSession && activeChatSession.isGroup) {
      activeChatSession.participants.forEach(p => {
        // Skip the sender themselves
        if (p.id === senderId) return;

        const pSocketId = onlineUsers.get(p.id);
        if (pSocketId) {
          io.to(pSocketId).emit('receive_message', savedMsg);
          io.to(pSocketId).emit('chat_list_updated');
          console.log(`Delivered group message to ${p.username} on socket ${pSocketId}`);
        }
      });
    } else {
      // Standard 1-on-1 broadcast
      const recipientSocketId = onlineUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive_message', savedMsg);
        io.to(recipientSocketId).emit('chat_list_updated');
      }
    }

    // Echo message back to sender
    socket.emit('message_sent', savedMsg);
    socket.emit('chat_list_updated');
  });

  // Typing indicators (Group & 1-on-1)
  socket.on('typing', ({ chatId, senderId, recipientId, isTyping }) => {
    // If it's a group chat, we notify all other participants
    const chats = db.getChatsForUser(senderId);
    const activeChatSession = chats.find(c => c.id === chatId);

    if (activeChatSession && activeChatSession.isGroup) {
      activeChatSession.participants.forEach(p => {
        if (p.id === senderId) return;
        const pSocketId = onlineUsers.get(p.id);
        if (pSocketId) {
          io.to(pSocketId).emit('typing_status', { chatId, senderId, isTyping });
        }
      });
    } else {
      const recipientSocketId = onlineUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('typing_status', { chatId, senderId, isTyping });
      }
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    if (authenticatedUserId) {
      onlineUsers.delete(authenticatedUserId);
      socket.broadcast.emit('user_status_changed', { userId: authenticatedUserId, status: 'offline' });
    }
  });
});

// Retrieve list of available IPv4 addresses on the host system
function getNetworkIps() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const interfaceName in interfaces) {
    for (const iface of interfaces[interfaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🛸 SpookyChat Backend Server is now Active!`);
  console.log(`🔌 Listening on Port: ${PORT}`);
  console.log(`🖥️  Local Host Address: http://localhost:${PORT}`);
  
  const localIps = getNetworkIps();
  if (localIps.length > 0) {
    console.log(`🌐 Network Addresses (Share these with other computers):`);
    localIps.forEach(ip => {
      console.log(`   👉 http://${ip}:${PORT}`);
    });
  } else {
    console.log(`🌐 Network Address: No active network adapter found.`);
  }
  
  console.log(`🔒 Quantum Channels: Operating in Bell State |ψ+> and GHZ States`);
  console.log(`======================================================\n`);
});
