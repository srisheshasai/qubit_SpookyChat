const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'spookychat.db');
const db = new DatabaseSync(DB_PATH);

// Initialize DB schema with normalized relational tables and indexes
db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE COLLATE NOCASE,
    salt TEXT,
    password_hash TEXT,
    quantum_profile TEXT,
    created_at TEXT
  );
  
  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    is_group INTEGER DEFAULT 0,
    group_name TEXT,
    created_at TEXT
  );
  
  CREATE TABLE IF NOT EXISTS chat_participants (
    chat_id TEXT,
    user_id TEXT,
    PRIMARY KEY (chat_id, user_id),
    FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT,
    sender_id TEXT,
    recipient_id TEXT,
    encrypted_payload TEXT, -- Stored as JSON string
    quantum_details TEXT,   -- Stored as JSON string
    timestamp TEXT,
    FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
`);

// Run data migration from legacy database.json if present
const legacyJsonPath = path.join(__dirname, 'database.json');
if (fs.existsSync(legacyJsonPath)) {
  try {
    const raw = fs.readFileSync(legacyJsonPath, 'utf8');
    const oldData = JSON.parse(raw);

    // Disable foreign keys temporarily for bulk import
    db.exec('PRAGMA foreign_keys = OFF;');

    // 1. Migrate Users
    if (oldData.users && oldData.users.length > 0) {
      const insertUser = db.prepare(`
        INSERT OR IGNORE INTO users (id, username, salt, password_hash, quantum_profile, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      oldData.users.forEach(u => {
        insertUser.run(u.id, u.username, u.salt, u.passwordHash, u.quantumProfile, u.createdAt || new Date().toISOString());
      });
      console.log(`[LEGACY MIGRATION] Imported ${oldData.users.length} users into SQLite.`);
    }

    // 2. Migrate Chats
    if (oldData.chats && oldData.chats.length > 0) {
      const insertChat = db.prepare(`
        INSERT OR IGNORE INTO chats (id, is_group, group_name, created_at)
        VALUES (?, ?, ?, ?)
      `);
      const insertParticipant = db.prepare(`
        INSERT OR IGNORE INTO chat_participants (chat_id, user_id)
        VALUES (?, ?)
      `);

      oldData.chats.forEach(c => {
        const isGroup = c.isGroup ? 1 : 0;
        insertChat.run(c.id, isGroup, c.groupName || null, c.createdAt || new Date().toISOString());

        if (c.participants) {
          c.participants.forEach(pid => {
            const userId = typeof pid === 'object' ? pid.id : pid;
            insertParticipant.run(c.id, userId);
          });
        } else if (c.userAId && c.userBId) {
          insertParticipant.run(c.id, c.userAId);
          insertParticipant.run(c.id, c.userBId);
        }
      });
      console.log(`[LEGACY MIGRATION] Imported ${oldData.chats.length} chat sessions into SQLite.`);
    }

    // 3. Migrate Messages
    if (oldData.messages && oldData.messages.length > 0) {
      const insertMsg = db.prepare(`
        INSERT OR IGNORE INTO messages (id, chat_id, sender_id, recipient_id, encrypted_payload, quantum_details, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      oldData.messages.forEach(m => {
        const payloadStr = JSON.stringify(m.encryptedPayload);
        const quantumStr = JSON.stringify(m.quantumDetails);
        insertMsg.run(m.id, m.chatId, m.senderId, m.recipientId, payloadStr, quantumStr, m.timestamp || new Date().toISOString());
      });
      console.log(`[LEGACY MIGRATION] Imported ${oldData.messages.length} messages into SQLite.`);
    }

    // Restore foreign key checking
    db.exec('PRAGMA foreign_keys = ON;');

    // Rename file to prevent double migration
    fs.renameSync(legacyJsonPath, path.join(__dirname, 'database.json.bak'));
    console.log(`[LEGACY MIGRATION] Migration complete. database.json backed up to database.json.bak.`);
  } catch (err) {
    db.exec('PRAGMA foreign_keys = ON;'); // ensure it's re-enabled
    console.error(`[LEGACY MIGRATION] Error migrating database:`, err);
  }
}

// Password hashing
function hashPassword(password, salt) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
  return { salt, hash };
}

// Password complexity check
function isPasswordComplex(password) {
  if (password.length < 8) return false;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasUppercase && hasLowercase && hasNumber && hasSpecial;
}

// Create new user
function createUser(username, password) {
  const cleanedUsername = username.trim();
  
  if (!isPasswordComplex(password)) {
    throw new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
  }
  
  // Check if exists
  const existingStmt = db.prepare('SELECT id FROM users WHERE username = ?');
  const existing = existingStmt.get(cleanedUsername);
  if (existing) {
    throw new Error('Username already exists');
  }

  const { salt, hash } = hashPassword(password);
  const userId = crypto.randomUUID();
  const quantumProfile = `spookychat://user/${userId}?name=${encodeURIComponent(cleanedUsername)}`;

  const insertStmt = db.prepare(`
    INSERT INTO users (id, username, salt, password_hash, quantum_profile, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  insertStmt.run(userId, cleanedUsername, salt, hash, quantumProfile, now);

  return {
    id: userId,
    username: cleanedUsername,
    quantumProfile,
    createdAt: now
  };
}

// Verify credentials
function verifyUser(username, password) {
  const cleanedUsername = username.trim();
  const selectStmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const user = selectStmt.get(cleanedUsername);

  if (!user) {
    throw new Error('User not found');
  }

  const { hash } = hashPassword(password, user.salt);
  if (hash !== user.password_hash) {
    throw new Error('Incorrect password');
  }

  return {
    id: user.id,
    username: user.username,
    quantumProfile: user.quantum_profile,
    createdAt: user.created_at
  };
}

// Find user by ID
function getUserById(id) {
  const selectStmt = db.prepare('SELECT id, username, quantum_profile as quantumProfile, created_at as createdAt FROM users WHERE id = ?');
  const user = selectStmt.get(id);
  return user || null;
}

// Find user by exact username
function getUserByUsername(username) {
  const selectStmt = db.prepare('SELECT id, username, quantum_profile as quantumProfile, created_at as createdAt FROM users WHERE username = ?');
  const user = selectStmt.get(username.trim());
  return user || null;
}

// Search users by name, excluding requester
function searchUsers(query, excludeUserId) {
  const cleanedQuery = `%${query.trim()}%`;
  const selectStmt = db.prepare(`
    SELECT id, username, quantum_profile as quantumProfile, created_at as createdAt 
    FROM users 
    WHERE id != ? AND username LIKE ?
  `);
  return selectStmt.all(excludeUserId, cleanedQuery);
}

// Create a new 1-on-1 chat session
function createChat(userAId, userBId) {
  // Check if 1-on-1 chat already exists
  const existingStmt = db.prepare(`
    SELECT cp1.chat_id as id
    FROM chat_participants cp1
    JOIN chat_participants cp2 ON cp1.chat_id = cp2.chat_id
    JOIN chats c ON c.id = cp1.chat_id
    WHERE c.is_group = 0 AND cp1.user_id = ? AND cp2.user_id = ?
  `);
  const existing = existingStmt.get(userAId, userBId);

  if (existing) {
    const chatDetails = db.prepare('SELECT * FROM chats WHERE id = ?').get(existing.id);
    return {
      id: chatDetails.id,
      isGroup: false,
      groupName: null,
      participants: [userAId, userBId],
      createdAt: chatDetails.created_at
    };
  }

  // Create new chat
  const chatId = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const insertChat = db.prepare('INSERT INTO chats (id, is_group, group_name, created_at) VALUES (?, 0, NULL, ?)');
  insertChat.run(chatId, now);

  const insertParticipant = db.prepare('INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)');
  insertParticipant.run(chatId, userAId);
  insertParticipant.run(chatId, userBId);

  return {
    id: chatId,
    isGroup: false,
    groupName: null,
    participants: [userAId, userBId],
    createdAt: now
  };
}

// Create a new group chat
function createGroupChat(groupName, participantIds) {
  if (!groupName || groupName.trim() === '') {
    throw new Error('Group name cannot be blank');
  }
  if (!participantIds || participantIds.length < 2) {
    throw new Error('Groups require at least 2 participants');
  }

  const chatId = crypto.randomUUID();
  const now = new Date().toISOString();

  const insertChat = db.prepare('INSERT INTO chats (id, is_group, group_name, created_at) VALUES (?, 1, ?, ?)');
  insertChat.run(chatId, groupName.trim(), now);

  const insertParticipant = db.prepare('INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)');
  participantIds.forEach(pid => {
    insertParticipant.run(chatId, pid);
  });

  return {
    id: chatId,
    isGroup: true,
    groupName: groupName.trim(),
    participants: participantIds,
    createdAt: now
  };
}

// Get all chats (1-on-1 and Group) for a user
function getChatsForUser(userId) {
  const chatsQuery = db.prepare(`
    SELECT c.id, c.is_group as isGroup, c.group_name as groupName, c.created_at as createdAt
    FROM chats c
    JOIN chat_participants cp ON c.id = cp.chat_id
    WHERE cp.user_id = ?
  `);
  const chatsList = chatsQuery.all(userId);

  const finalChats = chatsList.map(c => {
    // Fetch last message
    const msgQuery = db.prepare(`
      SELECT * FROM messages 
      WHERE chat_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `);
    const lastMsgRaw = msgQuery.get(c.id);
    let lastMessage = null;

    if (lastMsgRaw) {
      lastMessage = {
        id: lastMsgRaw.id,
        chatId: lastMsgRaw.chat_id,
        senderId: lastMsgRaw.sender_id,
        recipientId: lastMsgRaw.recipient_id,
        encryptedPayload: JSON.parse(lastMsgRaw.encrypted_payload),
        quantumDetails: JSON.parse(lastMsgRaw.quantum_details),
        timestamp: lastMsgRaw.timestamp
      };
    }

    if (c.isGroup === 1) {
      // Gather group participants list
      const membersQuery = db.prepare(`
        SELECT u.id, u.username
        FROM users u
        JOIN chat_participants cp ON u.id = cp.user_id
        WHERE cp.chat_id = ?
      `);
      const members = membersQuery.all(c.id);

      return {
        id: c.id,
        isGroup: true,
        groupName: c.groupName,
        participants: members,
        lastMessage,
        createdAt: c.createdAt
      };
    } else {
      // Fetch the other participant
      const otherUserQuery = db.prepare(`
        SELECT u.id, u.username, u.quantum_profile as quantumProfile
        FROM users u
        JOIN chat_participants cp ON u.id = cp.user_id
        WHERE cp.chat_id = ? AND cp.user_id != ?
      `);
      const otherUser = otherUserQuery.get(c.id, userId);

      return {
        id: c.id,
        isGroup: false,
        otherUser: otherUser || { id: 'unknown', username: 'Unknown User' },
        lastMessage,
        createdAt: c.createdAt
      };
    }
  });

  // Sort by last message timestamp or creation date (newest first)
  return finalChats.sort((a, b) => {
    const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp) : new Date(a.createdAt);
    const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp) : new Date(b.createdAt);
    return bTime - aTime;
  });
}

// Save message with quantum state parameters
function saveMessage(chatId, senderId, recipientId, encryptedPayload, quantumDetails) {
  const msgId = crypto.randomUUID();
  const now = new Date().toISOString();

  const insertMsg = db.prepare(`
    INSERT INTO messages (id, chat_id, sender_id, recipient_id, encrypted_payload, quantum_details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const payloadStr = JSON.stringify(encryptedPayload);
  const quantumStr = JSON.stringify(quantumDetails);

  insertMsg.run(msgId, chatId, senderId, recipientId, payloadStr, quantumStr, now);

  return {
    id: msgId,
    chatId,
    senderId,
    recipientId,
    encryptedPayload,
    quantumDetails,
    timestamp: now
  };
}

// Get messages for a specific chat
function getMessagesForChat(chatId) {
  const messagesQuery = db.prepare(`
    SELECT * FROM messages 
    WHERE chat_id = ? 
    ORDER BY timestamp ASC
  `);
  const rows = messagesQuery.all(chatId);

  return rows.map(r => ({
    id: r.id,
    chatId: r.chat_id,
    senderId: r.sender_id,
    recipientId: r.recipient_id,
    encryptedPayload: JSON.parse(r.encrypted_payload),
    quantumDetails: JSON.parse(r.quantum_details),
    timestamp: r.timestamp
  }));
}

function getOrGenerateSecret() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  
  const selectStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const record = selectStmt.get('session_secret');
  
  if (record) {
    return record.value;
  }
  
  const newSecret = crypto.randomBytes(32).toString('hex');
  const insertStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  insertStmt.run('session_secret', newSecret);
  return newSecret;
}

module.exports = {
  createUser,
  verifyUser,
  getUserById,
  getUserByUsername,
  searchUsers,
  createChat,
  createGroupChat,
  getChatsForUser,
  saveMessage,
  getMessagesForChat,
  getOrGenerateSecret
};
