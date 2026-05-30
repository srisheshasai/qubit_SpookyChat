import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Search, QrCode, LogOut, User, Check, Users, UserPlus, X, MessagesSquare } from 'lucide-react';

export default function ChatSidebar({ 
  currentUser, 
  chats, 
  activeChat, 
  onSelectChat, 
  onLogout, 
  onOpenScanner, 
  socket 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const qrCanvasRef = useRef(null);

  // Generate QR Code when modal is opened
  useEffect(() => {
    if (showQRModal && qrCanvasRef.current && currentUser) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        currentUser.quantumProfile,
        {
          width: 200,
          margin: 1.5,
          color: {
            dark: '#05070f',
            light: '#00f0ff'
          }
        },
        (error) => {
          if (error) console.error("Error generating QR canvas:", error);
        }
      );
    }
  }, [showQRModal, currentUser]);

  // Handle Search Input Change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    socket.emit('search_users', { query: searchQuery, excludeUserId: currentUser.id }, (response) => {
      if (response.success) {
        setSearchResults(response.users);
      } else {
        console.error("Search error:", response.error);
      }
    });
  }, [searchQuery, socket, currentUser.id]);

  // Click on a search result to start/open a chat
  const handleSelectSearchResult = (searchedUser) => {
    socket.emit('create_chat', { senderId: currentUser.id, recipientId: searchedUser.id }, (response) => {
      if (response.success) {
        onSelectChat(response.chat);
        setSearchQuery('');
        setSearchResults([]);
      } else {
        alert("Failed to initialize chat: " + response.error);
      }
    });
  };

  // Determine contacts: unique users from active 1-on-1 chats
  const contacts = chats
    .filter(c => !c.isGroup)
    .map(c => c.otherUser)
    .reduce((acc, current) => {
      const x = acc.find(item => item.id === current.id);
      if (!x) {
        return acc.concat([current]);
      } else {
        return acc;
      }
    }, []);

  const handleToggleContact = (contactId) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(prev => prev.filter(id => id !== contactId));
    } else {
      setSelectedContacts(prev => [...prev, contactId]);
    }
  };

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      alert("Please enter a group name");
      return;
    }
    if (selectedContacts.length < 1) {
      alert("Please select at least 1 contact to join the group");
      return;
    }

    const participantIds = [currentUser.id, ...selectedContacts];

    socket.emit('create_group_chat', { groupName, participantIds }, (response) => {
      if (response.success) {
        onSelectChat(response.chat);
        setShowGroupModal(false);
        setGroupName('');
        setSelectedContacts([]);
      } else {
        alert("Failed to create group chat: " + response.error);
      }
    });
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderEncryptedSnippet = (text) => {
    if (!text) return '';
    const symbols = "!@#$%^&*()_+{}|:<>?-=[]\\;',./";
    const len = Math.min(text.length, 12);
    let scrambled = '';
    for (let i = 0; i < len; i++) {
      scrambled += symbols[Math.floor(Math.random() * symbols.length)];
    }
    return scrambled;
  };

  return (
    <div className="sidebar-wrapper glass-panel">
      {/* User Info Header */}
      <div className="sidebar-header">
        <div className="user-profile-badge">
          <div className="avatar pulsing-glow">
            <User size={18} />
          </div>
          <div className="user-text">
            <h3 className="username" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              {currentUser.username}
            </h3>
            <span className="status-label">Quantum Active</span>
          </div>
        </div>

        <div className="header-controls" style={{ gap: 4 }}>
          <button 
            className="control-icon-btn glow-cyan" 
            title="Create Entangled Group"
            onClick={() => setShowGroupModal(true)}
          >
            <UserPlus size={18} />
          </button>
          <button 
            className="control-icon-btn glow-cyan" 
            title="My QR Code"
            onClick={() => setShowQRModal(true)}
          >
            <QrCode size={18} />
          </button>
          <button 
            className="control-icon-btn glow-red" 
            title="Log Out"
            onClick={onLogout}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sidebar-actions">
        <button className="quantum-btn primary" style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }} onClick={onOpenScanner}>
          <QrCode size={16} /> Scan QR Code
        </button>
      </div>

      {/* Search Input */}
      <div className="search-box">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            className="quantum-input" 
            placeholder="Search by username..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Chat List / Search Results Area */}
      <div className="list-area">
        {searchQuery.trim() !== '' ? (
          // Search Results View
          <div className="search-results-section">
            <h4 className="section-title">Search Results</h4>
            {searchResults.length === 0 ? (
              <p className="empty-message">No quantum nodes found</p>
            ) : (
              searchResults.map(user => (
                <div 
                  key={user.id} 
                  className="search-item glass-card"
                  onClick={() => handleSelectSearchResult(user)}
                >
                  <div className="avatar">
                    <User size={16} />
                  </div>
                  <div className="search-item-info">
                    <span className="search-username">{user.username}</span>
                    <span className="search-subtitle">Open Quantum Channel</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // Active Chats View
          <div className="chats-section">
            <h4 className="section-title">Quantum Channels</h4>
            {chats.length === 0 ? (
              <p className="empty-message">No active entanglement. Add friends or create a group to begin.</p>
            ) : (
              chats.map(chat => {
                const isActive = activeChat && activeChat.id === chat.id;
                
                if (chat.isGroup) {
                  const onlineCount = chat.participants.filter(p => p.status === 'online' && p.id !== currentUser.id).length;
                  return (
                    <div 
                      key={chat.id} 
                      className={`chat-item glass-card ${isActive ? 'active' : ''}`}
                      onClick={() => onSelectChat(chat)}
                    >
                      <div className="chat-avatar-wrapper">
                        <div className="avatar" style={{ color: 'var(--color-purple)' }}>
                          <MessagesSquare size={18} />
                        </div>
                      </div>

                      <div className="chat-item-info">
                        <div className="chat-item-header">
                          <span className="chat-username">{chat.groupName}</span>
                          <span className="chat-time">
                            {chat.lastMessage ? formatTime(chat.lastMessage.timestamp) : ''}
                          </span>
                        </div>
                        <div className="chat-item-sub">
                          <p className="chat-message-preview">
                            {chat.lastMessage ? (
                              chat.lastMessage.quantumDetails.decryptedSuccessfully ? (
                                <span style={{ fontFamily: 'var(--font-mono)', opacity: 0.6, letterSpacing: '1px' }}>
                                  {"🔐 " + renderEncryptedSnippet(chat.lastMessage.encryptedPayload.cipher)}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--color-red)' }}>⚠️ INTERCEPTED</span>
                              )
                            ) : (
                              <span style={{ fontStyle: 'italic', opacity: 0.6 }}>GHZ entangled ({chat.participants.length} nodes)</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // 1-on-1 chat
                  const isOnline = chat.otherUser.status === 'online';
                  return (
                    <div 
                      key={chat.id} 
                      className={`chat-item glass-card ${isActive ? 'active' : ''} ${isOnline ? 'online' : ''}`}
                      onClick={() => onSelectChat(chat)}
                    >
                      <div className="chat-avatar-wrapper">
                        <div className="avatar">
                          <User size={18} />
                        </div>
                        <span className={`status-dot ${isOnline ? 'online' : ''}`}></span>
                      </div>

                      <div className="chat-item-info">
                        <div className="chat-item-header">
                          <span className="chat-username">{chat.otherUser.username}</span>
                          <span className="chat-time">
                            {chat.lastMessage ? formatTime(chat.lastMessage.timestamp) : ''}
                          </span>
                        </div>
                        <div className="chat-item-sub">
                          <p className="chat-message-preview">
                            {chat.lastMessage ? (
                              chat.lastMessage.quantumDetails.decryptedSuccessfully ? (
                                <span style={{ fontFamily: 'var(--font-mono)', opacity: 0.6, letterSpacing: '1px' }}>
                                  {"🔐 " + renderEncryptedSnippet(chat.lastMessage.encryptedPayload.cipher)}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--color-red)' }}>⚠️ INTERCEPTED</span>
                              )
                            ) : (
                              <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Entangled, ready to send</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
              })
            )}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showGroupModal && (
        <div className="qr-personal-overlay" onClick={() => setShowGroupModal(false)}>
          <div 
            className="glass-panel qr-personal-card border-glow-purple"
            style={{ maxWidth: '360px', padding: '24px', textAlign: 'left', alignItems: 'stretch' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 className="glow-purple" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px' }}>
                Entangle Group Chat
              </h2>
              <button 
                className="close-btn" 
                onClick={() => setShowGroupModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group">
                <label>Quantum Group Name</label>
                <input 
                  type="text" 
                  className="quantum-input" 
                  placeholder="e.g. Quantum League" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label style={{ marginBottom: 6 }}>Select Group Nodes (Contacts)</label>
                <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 8 }}>
                  {contacts.length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No active contacts. Scan a QR code or search to add friends first!
                    </span>
                  ) : (
                    contacts.map(c => (
                      <label 
                        key={c.id} 
                        style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '13px', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, transition: 'var(--transition-smooth)' }}
                        className="glass-card"
                      >
                        <input 
                          type="checkbox" 
                          checked={selectedContacts.includes(c.id)}
                          onChange={() => handleToggleContact(c.id)}
                          style={{ accentColor: 'var(--color-purple)' }}
                        />
                        <span>{c.username}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                className="quantum-btn primary" 
                style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, var(--color-purple), var(--color-cyan))', boxShadow: '0 0 20px rgba(208, 0, 255, 0.3)' }}
                disabled={contacts.length === 0}
              >
                Create GHZ Entangled Chat
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Personal QR Modal */}
      {showQRModal && (
        <div className="qr-personal-overlay" onClick={() => setShowQRModal(false)}>
          <div 
            className="glass-panel qr-personal-card border-glow-cyan"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="qr-personal-header">
              <h2 className="glow-cyan" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                My Public Qubit Address
              </h2>
            </div>
            
            <div className="qr-canvas-holder border-glow-cyan pulsing-glow">
              <canvas ref={qrCanvasRef}></canvas>
            </div>

            <div className="qr-personal-info">
              <span className="qr-username">{currentUser.username}</span>
              <p className="qr-desc">
                Present this QR code to another user. Scanning this collapses their channel list and spawns a mutual entangled keypair between you instantly.
              </p>
            </div>

            <button 
              className="quantum-btn" 
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setShowQRModal(false)}
            >
              <Check size={16} /> Closed Gate
            </button>
          </div>
        </div>
      )}

      <style>{`
        .sidebar-wrapper {
          width: 340px;
          height: 100%;
          display: flex;
          flex-direction: column;
          border-radius: 0px;
          border-right: 1px solid var(--glass-border);
          flex-shrink: 0;
        }

        .sidebar-header {
          padding: 20px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--glass-border);
        }

        .user-profile-badge {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          border: 1px solid var(--glass-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-cyan);
        }

        .avatar.pulsing-glow {
          border-color: var(--color-cyan);
          box-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
        }

        .user-text {
          display: flex;
          flex-direction: column;
        }

        .username {
          font-size: 15px;
          color: var(--text-primary);
        }

        .status-label {
          font-size: 10px;
          color: var(--color-green);
          font-family: var(--font-mono);
          letter-spacing: 0.5px;
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .control-icon-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-smooth);
        }

        .control-icon-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: scale(1.05);
        }

        .control-icon-btn.glow-cyan:hover {
          color: var(--color-cyan);
          text-shadow: 0 0 8px var(--color-cyan-glow);
        }

        .control-icon-btn.glow-red:hover {
          color: var(--color-red);
          text-shadow: 0 0 8px var(--color-red-glow);
        }

        .sidebar-actions {
          padding: 12px 16px;
          border-bottom: 1px solid var(--glass-border);
        }

        .search-box {
          padding: 12px 16px;
          border-bottom: 1px solid var(--glass-border);
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-input-wrapper .search-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .search-input-wrapper .quantum-input {
          width: 100%;
          padding-left: 36px;
          padding-top: 8px;
          padding-bottom: 8px;
          font-size: 13px;
        }

        .list-area {
          flex: 1;
          overflow-y: auto;
          padding: 12px 8px;
        }

        .section-title {
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
          margin-left: 8px;
        }

        .empty-message {
          font-size: 12px;
          color: var(--text-muted);
          text-align: center;
          margin-top: 24px;
          padding: 0 16px;
          line-height: 1.5;
        }

        /* Chat list item styling */
        .chat-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          margin-bottom: 6px;
          cursor: pointer;
          border-color: transparent;
        }

        .chat-item:hover {
          border-color: rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
        }

        .chat-item.active {
          background: rgba(0, 240, 255, 0.04);
          border-color: rgba(0, 240, 255, 0.2);
          box-shadow: inset 0 0 12px rgba(0, 240, 255, 0.05);
        }

        .chat-item.active .avatar {
          color: var(--color-cyan);
          border-color: rgba(0, 240, 255, 0.3);
        }

        .chat-avatar-wrapper {
          position: relative;
        }

        .status-dot {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--text-muted);
          border: 2px solid var(--bg-secondary);
        }

        .status-dot.online {
          background: var(--color-green);
          box-shadow: 0 0 6px var(--color-green);
        }

        .chat-item-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .chat-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chat-username {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .chat-time {
          font-size: 11px;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .chat-item-sub {
          display: flex;
          align-items: center;
        }

        .chat-message-preview {
          font-size: 12px;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          width: 100%;
        }

        /* Search item styling */
        .search-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          margin-bottom: 6px;
          cursor: pointer;
        }

        .search-item-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .search-username {
          font-size: 13px;
          font-weight: 500;
        }

        .search-subtitle {
          font-size: 10px;
          color: var(--color-cyan);
          font-family: var(--font-mono);
        }

        /* Personal QR Code Overlay Modal */
        .qr-personal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(3, 4, 9, 0.85);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .qr-personal-card {
          width: 100%;
          max-width: 320px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          text-align: center;
        }

        .qr-personal-header h2 {
          font-size: 18px;
        }

        .qr-canvas-holder {
          padding: 12px;
          background: #05070f;
          border-radius: 12px;
          border: 1px solid rgba(0, 240, 255, 0.25);
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .qr-canvas-holder canvas {
          display: block;
          border-radius: 6px;
        }

        .qr-personal-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .qr-personal-info .qr-username {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-cyan);
          font-family: var(--font-display);
        }

        .qr-desc {
          font-size: 11px;
          color: var(--text-secondary);
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
