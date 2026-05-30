import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Login from './components/Login';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import QRScannerModal from './components/QRScannerModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [mobileView, setMobileView] = useState('sidebar'); // 'sidebar' or 'chat'

  // Load session from localStorage on startup
  useEffect(() => {
    const savedUser = localStorage.getItem('spookychat_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (err) {
        console.error("Failed to parse saved session:", err);
      }
    }
  }, []);

  // Initialize Socket.io connection when user logs in
  useEffect(() => {
    if (!currentUser) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setChats([]);
      setActiveChat(null);
      return;
    }

    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Successfully established connection to Quantum Grid');
      const token = localStorage.getItem('spookychat_token');
      newSocket.emit('authenticate', token);
    });

    newSocket.on('unauthorized', () => {
      console.warn("Session expired or unauthorized, logging out.");
      handleLogout();
    });

    const refreshChats = () => {
      newSocket.emit('get_chats', currentUser.id, (response) => {
        if (response.success) {
          setChats(response.chats);
          if (activeChat) {
            const updatedChat = response.chats.find(c => c.id === activeChat.id);
            if (updatedChat) {
              setActiveChat(updatedChat);
            }
          }
        }
      });
    };

    newSocket.on('chat_list_updated', refreshChats);
    newSocket.on('user_status_changed', refreshChats);

    newSocket.emit('get_chats', currentUser.id, (response) => {
      if (response.success) {
        setChats(response.chats);
      }
    });

    return () => {
      newSocket.off('chat_list_updated', refreshChats);
      newSocket.off('user_status_changed', refreshChats);
      newSocket.off('unauthorized');
      newSocket.disconnect();
    };
  }, [currentUser]);

  const handleAuthSuccess = (user, token) => {
    localStorage.setItem('spookychat_user', JSON.stringify(user));
    localStorage.setItem('spookychat_token', token);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('spookychat_user');
    localStorage.removeItem('spookychat_token');
    setCurrentUser(null);
  };

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
    setMobileView('chat');
  };

  const handleQRScanSuccess = (qrText) => {
    if (!socket || !currentUser) return;
    
    setIsScannerOpen(false);

    socket.emit('resolve_qr_profile', qrText, (response) => {
      if (response.success) {
        const friend = response.user;
        
        socket.emit('create_chat', { senderId: currentUser.id, recipientId: friend.id }, (chatResponse) => {
          if (chatResponse.success) {
            setActiveChat(chatResponse.chat);
            setMobileView('chat');
            
            socket.emit('get_chats', currentUser.id, (chatsRes) => {
              if (chatsRes.success) setChats(chatsRes.chats);
            });
          } else {
            alert(`Entanglement failed: ${chatResponse.error}`);
          }
        });
      } else {
        alert(`QR Verification Failed: ${response.error}`);
      }
    });
  };

  if (!currentUser) {
    return <Login onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className={`app-workspace ${mobileView}`}>
      {/* Sidebar navigation */}
      <ChatSidebar 
        currentUser={currentUser}
        chats={chats}
        activeChat={activeChat}
        onSelectChat={handleSelectChat}
        onLogout={handleLogout}
        onOpenScanner={() => setIsScannerOpen(true)}
        socket={socket}
        mobileView={mobileView}
      />

      {/* Main chat window and Quantum core monitor */}
      {socket && (
        <ChatWindow 
          currentUser={currentUser}
          activeChat={activeChat}
          socket={socket}
          onBackToSidebar={() => setMobileView('sidebar')}
          mobileView={mobileView}
        />
      )}

      {/* QR scanner modal */}
      <QRScannerModal 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleQRScanSuccess}
      />

      <style>{`
        .app-workspace {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: var(--bg-primary);
        }

        /* Flexible responsive layouts for phone and tablet sizes */
        @media (max-width: 768px) {
          .app-workspace.sidebar .chat-window-wrapper {
            display: none !important;
          }
          .app-workspace.chat .sidebar-wrapper {
            display: none !important;
          }
          .app-workspace.chat .chat-window-wrapper {
            width: 100% !important;
            display: flex !important;
          }
          .app-workspace.sidebar .sidebar-wrapper {
            width: 100% !important;
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
