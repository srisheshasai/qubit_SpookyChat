import React, { useState } from 'react';
import { ShieldAlert, Fingerprint, LogIn, UserPlus } from 'lucide-react';

export default function Login({ onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('All credentials must be supplied.');
      return;
    }

    if (isRegister) {
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[^A-Za-z0-9]/.test(password);
      
      if (password.length < 8 || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        setErrorMsg('Complexity mismatch: Password must be 8+ characters and contain uppercase, lowercase, numbers, and special characters.');
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');

    const endpoint = isRegister ? '/api/register' : '/api/login';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Connection failed.');
      }

      onAuthSuccess(data.user, data.token);
    } catch (err) {
      console.error('Authentication error:', err);
      setErrorMsg(err.message || 'Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      {/* Background Quantum Orb Decor */}
      <div className="quantum-orb-container">
        <div className="core"></div>
        <div className="orbit orbit-1">
          <div className="particle"></div>
        </div>
        <div className="orbit orbit-2">
          <div className="particle"></div>
        </div>
      </div>

      <div className="glass-panel login-panel border-glow-cyan pulsing-glow">
        <div className="login-header">
          <Fingerprint size={48} className="glow-cyan login-icon" />
          <h1 className="quantum-gradient-text" style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>
            SPOOKYCHAT
          </h1>
          <p className="subtitle">Quantum-Entangled Cryptographic Messenger</p>
        </div>

        {errorMsg && (
          <div className="error-alert">
            <ShieldAlert size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Account Username</label>
            <input 
              id="username"
              type="text" 
              className="quantum-input" 
              placeholder="e.g. Alice"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              maxLength={20}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Quantum Access Code (Password)</label>
            <input 
              id="password"
              type="password" 
              className="quantum-input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="quantum-btn primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? (
              <span>Collapsing Wavefunction...</span>
            ) : isRegister ? (
              <>
                <UserPlus size={18} /> Initialize Account
              </>
            ) : (
              <>
                <LogIn size={18} /> Establish Connection
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <button 
            className="toggle-mode-btn"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg('');
            }}
            disabled={loading}
          >
            {isRegister ? "Already have a quantum address? Sign In" : "Need a secure quantum address? Create Account"}
          </button>
        </div>
      </div>

      <style>{`
        .login-wrapper {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background: #020306;
          overflow: hidden;
        }

        .login-panel {
          width: 90%;
          max-width: 420px;
          padding: 40px 32px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .login-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .login-icon {
          color: var(--color-cyan);
          margin-bottom: 8px;
        }

        .login-header h1 {
          font-size: 32px;
          letter-spacing: 2px;
        }

        .subtitle {
          font-size: 13px;
          color: var(--text-secondary);
          letter-spacing: 0.5px;
        }

        .error-alert {
          background: rgba(255, 51, 102, 0.1);
          border: 1px solid rgba(255, 51, 102, 0.35);
          color: #ff557f;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-group label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: 0.5px;
        }

        .login-footer {
          text-align: center;
          margin-top: 8px;
        }

        .toggle-mode-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 13px;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .toggle-mode-btn:hover {
          color: var(--color-cyan);
          text-decoration: underline;
        }

        /* 3D Quantum Orb decoration background */
        .quantum-orb-container {
          position: absolute;
          width: 300px;
          height: 300px;
          opacity: 0.25;
          pointer-events: none;
        }

        .core {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 30px;
          height: 30px;
          margin-left: -15px;
          margin-top: -15px;
          background: radial-gradient(circle, var(--color-cyan), transparent 70%);
          border-radius: 50%;
          box-shadow: 0 0 20px var(--color-cyan);
        }

        .orbit {
          position: absolute;
          top: 50%;
          left: 50%;
          border: 1px dashed rgba(255, 255, 255, 0.08);
          border-radius: 50%;
        }

        .orbit-1 {
          width: 180px;
          height: 180px;
          margin-left: -90px;
          margin-top: -90px;
          animation: spin-clockwise 8s linear infinite;
        }

        .orbit-2 {
          width: 280px;
          height: 280px;
          margin-left: -140px;
          margin-top: -140px;
          animation: spin-counter 12s linear infinite;
        }

        .particle {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .orbit-1 .particle {
          top: 0;
          left: 50%;
          margin-left: -4px;
          background: var(--color-cyan);
          box-shadow: 0 0 10px var(--color-cyan);
        }

        .orbit-2 .particle {
          bottom: 50%;
          right: 0;
          margin-bottom: -4px;
          background: var(--color-purple);
          box-shadow: 0 0 10px var(--color-purple);
        }

        @keyframes spin-clockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spin-counter {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
