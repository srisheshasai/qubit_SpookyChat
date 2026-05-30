import React, { useState, useEffect, useRef } from 'react';
import BlochSphere from './BlochSphere';
import { Send, Eye, ShieldCheck, ShieldAlert, Radio, Activity, ChevronLeft, Sliders, X, User, MessagesSquare } from 'lucide-react';

export default function ChatWindow({ currentUser, activeChat, socket, onBackToSidebar, mobileView }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [eavesdropperToggled, setEavesdropperToggled] = useState(false);
  const [isCoreExpanded, setIsCoreExpanded] = useState(false); 

  // Quantum Telemetry States
  const [quantumState, setQuantumState] = useState({
    theta: Math.PI / 2,
    phi: 0,
    isCollapsing: false,
    collapsedState: null,
    activeQubitId: null,
    aliceBasis: null,
    bobBasis: null,
    aliceMeasurement: null,
    bobMeasurement: null,
    fidelity: 1.0,
    status: 'coherent'
  });

  const [keyVault, setKeyVault] = useState([]); // accumulated key bits
  const [isTransmitting, setIsTransmitting] = useState(false); // transport animation trigger
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Load message history when activeChat changes
  useEffect(() => {
    if (!activeChat) return;

    setMessages([]);
    setOtherUserTyping(false);
    
    socket.emit('get_messages', activeChat.id, (response) => {
      if (response.success) {
        setMessages(response.messages);
        
        // Reconstruct Key Vault bits
        const keys = [];
        response.messages.forEach(m => {
          if (m.quantumDetails && m.quantumDetails.qubits) {
            m.quantumDetails.qubits.forEach(q => {
              keys.push({
                bit: q.aliceMeasurement,
                success: m.quantumDetails.decryptedSuccessfully,
                eavesdropped: m.quantumDetails.eavesdropped
              });
            });
          }
        });
        setKeyVault(keys);
      }
    });

    // Reset quantum state to baseline precessing state
    setQuantumState({
      theta: Math.PI / 2,
      phi: 0,
      isCollapsing: false,
      collapsedState: null,
      activeQubitId: null,
      aliceBasis: null,
      bobBasis: null,
      aliceMeasurement: null,
      bobMeasurement: null,
      fidelity: 1.0,
      status: 'coherent'
    });
  }, [activeChat?.id, socket]);

  // Listen for incoming messages and updates
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      if (activeChat && message.chatId === activeChat.id) {
        const firstQubit = message.quantumDetails.qubits?.[0] || {};

        setQuantumState({
          theta: firstQubit.theta || Math.PI / 2,
          phi: firstQubit.phi || 0,
          isCollapsing: true,
          collapsedState: firstQubit.bobMeasurement,
          activeQubitId: firstQubit.qubitId,
          aliceBasis: firstQubit.aliceBasis,
          bobBasis: firstQubit.bobBasis,
          aliceMeasurement: firstQubit.aliceMeasurement,
          bobMeasurement: firstQubit.bobMeasurement,
          fidelity: message.quantumDetails.fidelity,
          status: message.quantumDetails.eavesdropped ? 'intercepted' : 'collapsed'
        });

        setIsTransmitting(true);
        setTimeout(() => {
          setIsTransmitting(false);
          setMessages(prev => [...prev, message]);
          
          const newBits = (message.quantumDetails.qubits || []).map(q => ({
            bit: q.aliceMeasurement,
            success: message.quantumDetails.decryptedSuccessfully,
            eavesdropped: message.quantumDetails.eavesdropped
          }));
          setKeyVault(prev => [...prev, ...newBits]);

          setTimeout(() => {
            setQuantumState(prev => ({
              ...prev,
              isCollapsing: false,
              collapsedState: null,
              status: 'coherent'
            }));
          }, 1500);

        }, 1200);
      }
    };

    const handleMessageSent = (message) => {
      if (activeChat && message.chatId === activeChat.id) {
        setMessages(prev => [...prev, message]);
        
        const newBits = (message.quantumDetails.qubits || []).map(q => ({
          bit: q.aliceMeasurement,
          success: message.quantumDetails.decryptedSuccessfully,
          eavesdropped: message.quantumDetails.eavesdropped
        }));
        setKeyVault(prev => [...prev, ...newBits]);
        
        const firstQubit = message.quantumDetails.qubits?.[0] || {};
        
        setQuantumState({
          theta: firstQubit.theta || Math.PI / 2,
          phi: firstQubit.phi || 0,
          isCollapsing: true,
          collapsedState: firstQubit.bobMeasurement,
          activeQubitId: firstQubit.qubitId,
          aliceBasis: firstQubit.aliceBasis,
          bobBasis: firstQubit.bobBasis,
          aliceMeasurement: firstQubit.aliceMeasurement,
          bobMeasurement: firstQubit.bobMeasurement,
          fidelity: message.quantumDetails.fidelity,
          status: message.quantumDetails.eavesdropped ? 'intercepted' : 'collapsed'
        });

        setTimeout(() => {
          setQuantumState(prev => ({
            ...prev,
            isCollapsing: false,
            collapsedState: null,
            status: 'coherent'
          }));
        }, 1500);
      }
    };

    const handleTypingStatus = ({ chatId, senderId, isTyping }) => {
      if (activeChat && chatId === activeChat.id && senderId !== currentUser.id) {
        // If it's a group, we can set typing indicator to true if anyone else typing
        setOtherUserTyping(isTyping);
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('typing_status', handleTypingStatus);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('typing_status', handleTypingStatus);
    };
  }, [socket, activeChat?.id, currentUser.id]);

  // Scroll to bottom of message list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherUserTyping, isTransmitting]);

  // Idle precession animation (kept synchronized)
  useEffect(() => {
    if (quantumState.isCollapsing) return;

    const interval = setInterval(() => {
      setQuantumState(prev => {
        if (prev.isCollapsing) return prev;
        
        const timeFactor = (Date.now() / 1500) % (Math.PI * 2);
        const thetaOscillate = Math.PI / 2 + Math.sin(Date.now() / 3000) * 0.15;
        
        return {
          ...prev,
          phi: timeFactor,
          theta: thetaOscillate
        };
      });
    }, 50);

    return () => clearInterval(interval);
  }, [quantumState.isCollapsing]);

  // Handle typing status triggers
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { 
        chatId: activeChat.id, 
        senderId: currentUser.id, 
        recipientId: activeChat.isGroup ? 'group' : activeChat.otherUser.id, 
        isTyping: true 
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing', { 
        chatId: activeChat.id, 
        senderId: currentUser.id, 
        recipientId: activeChat.isGroup ? 'group' : activeChat.otherUser.id, 
        isTyping: false 
      });
    }, 1500);
  };

  // Decrypt characters using XOR and multi-qubit measurements
  const decryptText = (cipher, qubitsArray) => {
    if (!qubitsArray || qubitsArray.length === 0) return cipher;
    
    const keyByte = qubitsArray.reduce((acc, q, idx) => {
      const bit = q.bobMeasurement !== undefined ? q.bobMeasurement : q.aliceMeasurement;
      return acc + (bit << (idx % 8));
    }, 0);
    
    return cipher.split('').map(char => {
      return String.fromCharCode(char.charCodeAt(0) ^ keyByte);
    }).join('');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || isTransmitting) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
    socket.emit('typing', { 
      chatId: activeChat.id, 
      senderId: currentUser.id, 
      recipientId: activeChat.isGroup ? 'group' : activeChat.otherUser.id, 
      isTyping: false 
    });

    const rawMessage = inputText;
    setInputText('');

    // Generate an array of 8 qubits (representing an 8-bit quantum key distribution array)
    const NUM_QUBITS = 8;
    const qubits = [];
    const bases = ['rectilinear', 'diagonal'];

    for (let i = 0; i < NUM_QUBITS; i++) {
      const qBasis = bases[Math.floor(Math.random() * bases.length)];
      const qMeasurement = Math.random() < 0.5 ? 0 : 1;
      
      let qTheta = Math.PI / 2;
      let qPhi = 0;
      if (qBasis === 'rectilinear') {
        qTheta = qMeasurement === 0 ? 0 : Math.PI;
      } else {
        qTheta = Math.PI / 2;
        qPhi = qMeasurement === 0 ? 0 : Math.PI;
      }

      qubits.push({
        qubitId: `qb-${i}-${Math.random().toString(36).substr(2, 5)}`,
        theta: qTheta,
        phi: qPhi,
        aliceBasis: qBasis,
        bobBasis: qBasis,
        aliceMeasurement: qMeasurement,
        bobMeasurement: qMeasurement 
      });
    }

    const keyByte = qubits.reduce((acc, q, idx) => acc + (q.aliceMeasurement << idx), 0);

    const cipherText = rawMessage.split('').map(char => {
      return String.fromCharCode(char.charCodeAt(0) ^ keyByte);
    }).join('');

    const quantumDetails = {
      qubits,
      eavesdropped: eavesdropperToggled,
      fidelity: 1.0,
      decryptedSuccessfully: true
    };

    const encryptedPayload = {
      cipher: cipherText
    };

    setIsTransmitting(true);
    
    const firstQ = qubits[0];
    setQuantumState({
      theta: firstQ.theta,
      phi: firstQ.phi,
      isCollapsing: false,
      collapsedState: null,
      activeQubitId: firstQ.qubitId,
      aliceBasis: firstQ.aliceBasis,
      bobBasis: firstQ.bobBasis,
      aliceMeasurement: firstQ.aliceMeasurement,
      bobMeasurement: null,
      fidelity: 1.0,
      status: 'coherent'
    });

    setTimeout(() => {
      setIsTransmitting(false);
      socket.emit('send_message', {
        chatId: activeChat.id,
        senderId: currentUser.id,
        recipientId: activeChat.isGroup ? 'group' : activeChat.otherUser.id,
        encryptedPayload,
        quantumDetails
      });
    }, 1200);
  };

  const renderEncryptedSnippet = (text) => {
    const symbols = "!@#$%^&*()_+{}|:<>?-=[]\\;',./";
    return text.split('').map(() => {
      return symbols[Math.floor(Math.random() * symbols.length)];
    }).join('');
  };

  if (!activeChat) {
    return (
      <div className="no-chat-screen glass-panel">
        <Radio size={48} className="glow-cyan floating-qubit" style={{ opacity: 0.5, marginBottom: 16 }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Quantum Grid Offline</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 360, textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
          Establish connection. Open an existing active chat, scan a friend's QR code, or search their name to entangle.
        </p>
      </div>
    );
  }

  // Get sender name helper (important for groups)
  const getSenderName = (senderId) => {
    if (senderId === currentUser.id) return 'Me';
    if (activeChat.isGroup && activeChat.participants) {
      const match = activeChat.participants.find(p => p.id === senderId);
      return match ? match.username : 'Unknown node';
    }
    return activeChat.otherUser.username;
  };

  return (
    <div className="chat-window-wrapper">
      {/* 1. Main Chat Area */}
      <div className="main-chat-pane glass-panel">
        {/* Chat Header */}
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {mobileView === 'chat' && (
              <button 
                className="control-icon-btn glow-cyan" 
                onClick={onBackToSidebar} 
                style={{ marginRight: 12, padding: 4 }}
                title="Go Back"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            
            {/* Header Avatar Badge */}
            <div className="chat-avatar-wrapper header-avatar" style={{ marginRight: 12 }}>
              <div className="avatar" style={{ 
                width: 36, 
                height: 36, 
                borderRadius: '50%', 
                background: 'rgba(255, 255, 255, 0.05)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: activeChat.isGroup ? 'var(--color-purple)' : 'var(--color-cyan)',
                boxShadow: activeChat.isGroup ? '0 0 10px rgba(208, 0, 255, 0.2)' : '0 0 10px rgba(0, 240, 255, 0.2)'
              }}>
                {activeChat.isGroup ? <MessagesSquare size={16} /> : <User size={16} />}
              </div>
            </div>

            <div className="partner-info">
              <h3 className="glow-cyan" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                {activeChat.isGroup ? activeChat.groupName : activeChat.otherUser.username}
              </h3>
              <div className="quantum-status">
                <span className="pulsing-heartbeat"></span>
                <span className="status-lbl">
                  {activeChat.isGroup 
                    ? `GHZ Entangled (${activeChat.participants.length} nodes)` 
                    : 'Entangled Qubits Coherent'}
                </span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="channel-security">
              {eavesdropperToggled ? (
                <div className="security-tag compromised border-glow-red glow-red">
                  <ShieldAlert size={14} /> COMPROMISED
                </div>
              ) : (
                <div className="security-tag secure border-glow-cyan glow-cyan">
                  <ShieldCheck size={14} /> SECURED
                </div>
              )}
            </div>

            <button 
              className={`control-icon-btn ${isCoreExpanded ? 'glow-cyan' : ''}`}
              onClick={() => setIsCoreExpanded(!isCoreExpanded)}
              title="Toggle Quantum Monitor"
              style={{ padding: 6, border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 8 }}
            >
              <Sliders size={18} />
            </button>
          </div>
        </div>

        {/* Message Log */}
        <div className="messages-log">
          {messages.length === 0 && !isTransmitting && (
            <div className="empty-chat-welcome">
              <p>No transmissions yet. Start typing to initialize qubit exchange.</p>
              <div className="qubit-infocard glass-card">
                <div className="card-lbl">
                  {activeChat.isGroup ? 'GHZ MULTI-PARTY CRYPTOGRAPHY' : 'MULTI-QUBIT BELL ENCRYPTION'}
                </div>
                <p>
                  {activeChat.isGroup 
                    ? 'All participants are entangled in a Greenberger-Horne-Zeilinger (GHZ) state. When a message is sent, the state collapses globally, generating matching key bytes for all group members.'
                    : 'Every message generates an array of 8 entangled qubits. The cipher key is synthesized from the measurements. Intercepting a single qubit collapses its state, altering the final key.'
                  }
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const decrypted = msg.quantumDetails.decryptedSuccessfully;

            return (
              <div key={msg.id} className={`message-bubble-wrapper ${isMe ? 'outgoing' : 'incoming'}`}>
                {activeChat.isGroup && !isMe && (
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: 2, marginLeft: 4, fontFamily: 'var(--font-mono)' }}>
                    {getSenderName(msg.senderId)}
                  </span>
                )}
                
                <div className={`message-bubble glass-card ${!decrypted ? 'compromised border-glow-red' : isMe ? 'me border-glow-purple' : 'them border-glow-cyan'}`}>
                  {decrypted ? (
                    <p className="message-text">
                      {decryptText(msg.encryptedPayload.cipher, msg.quantumDetails.qubits)}
                    </p>
                  ) : (
                    <div className="intercepted-message">
                      <p className="cipher-scramble font-mono">
                        {renderEncryptedSnippet(msg.encryptedPayload.cipher)}
                      </p>
                      <div className="alert-box glow-red">
                        <ShieldAlert size={12} />
                        <span>QUANTUM DECRYPTION FAILURE: Multi-bit key mismatch</span>
                      </div>
                    </div>
                  )}

                  <div className="message-telemetry">
                    <span className="telemetry-item">
                      Qubits: <span className="font-mono">8 Array</span>
                    </span>
                    <span className="telemetry-bullet">•</span>
                    <span className="telemetry-item">
                      Fidelity: <span className="font-mono">{(msg.quantumDetails.fidelity * 100).toFixed(0)}%</span>
                    </span>
                    <span className="telemetry-bullet">•</span>
                    <span className="telemetry-item">
                      Status: <span className="font-mono">{decrypted ? 'OK' : 'COLLAPSED'}</span>
                    </span>
                  </div>
                </div>
                <span className="message-timestamp">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}

          {/* Active Particle Transport Animation */}
          {isTransmitting && (
            <div className="particle-stream-overlay">
              <div className="quantum-beam">
                <div className="pulse-beam"></div>
                {eavesdropperToggled && <div className="eve-intercept-barrier border-glow-red glow-red">EVE INTERCEPTING</div>}
                <div className={`qubit-particle ${eavesdropperToggled ? 'collapsed' : ''}`}></div>
              </div>
              <p className="telemetry-text font-mono text-glow-cyan">
                {eavesdropperToggled ? '⚠️ Eve Detected! Collapsing Multi-Party GHZ State Vector...' : '⚡ Exchanging GHZ Entangled Keys...'}
              </p>
            </div>
          )}

          {/* Typing Indicator */}
          {otherUserTyping && (
            <div className="typing-indicator-bubble">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-text">Group member is measuring...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Console */}
        <form className="chat-input-console" onSubmit={handleSendMessage}>
          <input 
            type="text" 
            className="quantum-input" 
            placeholder="Type a secure message..."
            value={inputText}
            onChange={handleInputChange}
            disabled={isTransmitting}
            maxLength={500}
          />
          <button 
            type="submit" 
            className="quantum-btn primary"
            disabled={!inputText.trim() || isTransmitting}
            title="Fire Qubits"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* 2. Quantum Core Dashboard Panel (Collapsible slide-in sidebar) */}
      <div className={`quantum-core-pane glass-panel border-glow-cyan ${isCoreExpanded ? 'expanded' : ''}`}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={18} className="glow-cyan" />
            <h3 className="glow-cyan" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px' }}>
              Core Telemetry
            </h3>
          </div>
          <button 
            className="control-icon-btn glow-red" 
            onClick={() => setIsCoreExpanded(false)}
            title="Close Panel"
            style={{ padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 3D Canvas Bloch Sphere */}
        <div className="bloch-sphere-viewport glass-card">
          <BlochSphere 
            theta={quantumState.theta} 
            phi={quantumState.phi} 
            isCollapsing={quantumState.isCollapsing} 
            collapsedState={quantumState.collapsedState}
          />
          <div className="sphere-status">
            <span className="label font-mono">
              {activeChat.isGroup ? 'GHZ State Vector' : 'Channel Qubit Vector'}
            </span>
            <span className={`val font-mono ${quantumState.status === 'intercepted' ? 'glow-red' : 'glow-cyan'}`}>
              {quantumState.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Core Live Telemetry */}
        <div className="telemetry-list glass-card">
          <div className="tel-row">
            <span className="lbl">Entanglement Mode:</span>
            <span className="val font-mono" style={{ color: 'var(--color-purple)' }}>
              {activeChat.isGroup ? 'GHZ State' : 'Bell State'}
            </span>
          </div>
          <div className="tel-row">
            <span className="lbl">Nodes Entangled:</span>
            <span className="val font-mono">
              {activeChat.isGroup ? `${activeChat.participants.length} Devices` : '2 Devices'}
            </span>
          </div>
          <div className="tel-row">
            <span className="lbl">Qubits Exchanged:</span>
            <span className="val font-mono">8 Qubits / msg</span>
          </div>
          <div className="tel-row">
            <span className="lbl">First Qubit ID:</span>
            <span className="val font-mono" style={{ fontSize: '11px' }}>{quantumState.activeQubitId || 'Coherent'}</span>
          </div>
          <div className="tel-row">
            <span className="lbl">Fidelity Phase:</span>
            <span className={`val font-mono ${quantumState.fidelity < 1.0 ? 'glow-red' : 'glow-green'}`}>
              {(quantumState.fidelity * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Eavesdropper Simulator Panel */}
        <div className={`eavesdropper-card glass-card ${eavesdropperToggled ? 'active border-glow-red' : ''}`}>
          <div className="card-header">
            <Eye size={18} className={eavesdropperToggled ? 'glow-red' : ''} />
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px' }}>Eve's Quantum Probe</h4>
          </div>
          <p className="card-desc">
            Simulate a middle-man attacker attempting to measure the 8 photon qubits in transit.
          </p>
          <label className="quantum-switch">
            <input 
              type="checkbox" 
              checked={eavesdropperToggled} 
              onChange={() => setEavesdropperToggled(!eavesdropperToggled)} 
            />
            <span className="slider"></span>
          </label>
        </div>

        {/* QKD Key Vault Bit Store */}
        <div className="key-vault-card glass-card">
          <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px', marginBottom: 4 }}>
            Shared QKD Vault (Bits)
          </h4>
          <div className="bits-grid">
            {keyVault.length === 0 ? (
              <span className="empty-vault-text font-mono">Empty. Exchange keys.</span>
            ) : (
              keyVault.map((key, i) => (
                <span 
                  key={i} 
                  className={`vault-bit font-mono ${key.eavesdropped ? 'compromised pulsing-glow' : 'secure'}`}
                  title={`Keybit ${i}: ${key.success ? 'Secure' : 'Corrupted'}`}
                >
                  {key.success ? key.bit : 'X'}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
