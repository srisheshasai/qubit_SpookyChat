import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { Camera, Upload, X, AlertTriangle } from 'lucide-react';

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [scanMode, setScanMode] = useState('camera'); // 'camera' or 'file'
  const [errorMsg, setErrorMsg] = useState('');
  const scannerRef = useRef(null);
  const fileReaderRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    
    setErrorMsg('');

    if (scanMode === 'camera') {
      // Small timeout to allow container DOM element to render
      const timer = setTimeout(() => {
        try {
          const html5QrcodeScanner = new Html5QrcodeScanner(
            "qr-reader",
            { 
              fps: 10, 
              qrbox: { width: 200, height: 200 },
              aspectRatio: 1.0,
              showTorchButtonIfSupported: true
            },
            /* verbose= */ false
          );

          html5QrcodeScanner.render(
            (decodedText) => {
              // Success! Clear scanner and report back
              html5QrcodeScanner.clear().then(() => {
                onScanSuccess(decodedText);
              }).catch(err => {
                console.error("Failed to clear scanner on success:", err);
                onScanSuccess(decodedText);
              });
            },
            (error) => {
              // Ignore constant seek logs
            }
          );

          scannerRef.current = html5QrcodeScanner;
        } catch (err) {
          console.error("Camera init error:", err);
          setErrorMsg("Could not access camera. Try uploading an image instead.");
          setScanMode('file');
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(err => {
            console.error("Failed to clear scanner on unmount:", err);
          });
        }
      };
    }
  }, [isOpen, scanMode]);

  if (!isOpen) return null;

  // Handle file upload scanning
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setErrorMsg('');
    const html5QrCode = new Html5Qrcode("qr-reader-file");
    fileReaderRef.current = html5QrCode;

    try {
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      onScanSuccess(decodedText);
    } catch (err) {
      console.error("File scanning error:", err);
      setErrorMsg("Failed to detect QR code in image. Please try a clearer picture.");
    }
  };

  return (
    <div className="qr-modal-overlay">
      <div className="glass-panel qr-modal-content border-glow-cyan">
        {/* Header */}
        <div className="qr-modal-header">
          <h2 className="glow-cyan" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            Quantum Scanner
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Mode Toggles */}
        <div className="qr-mode-tabs">
          <button 
            className={`qr-tab ${scanMode === 'camera' ? 'active' : ''}`}
            onClick={() => setScanMode('camera')}
          >
            <Camera size={16} /> Use Camera
          </button>
          <button 
            className={`qr-tab ${scanMode === 'file' ? 'active' : ''}`}
            onClick={() => setScanMode('file')}
          >
            <Upload size={16} /> Upload Image
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="qr-error-banner">
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scan Area */}
        <div className="qr-scan-area">
          {scanMode === 'camera' ? (
            <div id="qr-reader" className="webcam-container"></div>
          ) : (
            <div className="file-uploader-container">
              <div id="qr-reader-file" style={{ display: 'none' }}></div>
              <label className="file-dropzone glass-card">
                <Upload size={40} className="glow-cyan" style={{ marginBottom: 12, opacity: 0.7 }} />
                <span>Drag and drop profile QR image or click to browse</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}
        </div>

        <p className="qr-instructions">
          Scan another user's unique SpookyChat QR code to instantly start an entangled communication channel.
        </p>
      </div>

      <style>{`
        .qr-modal-overlay {
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

        .qr-modal-content {
          width: 100%;
          max-width: 440px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .qr-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .close-btn:hover {
          color: var(--color-red);
          transform: rotate(90deg);
        }

        .qr-mode-tabs {
          display: flex;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 3px;
        }

        .qr-tab {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 8px 12px;
          border-radius: 6px;
          font-family: var(--font-sans);
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: var(--transition-smooth);
        }

        .qr-tab.active {
          background: var(--bg-tertiary);
          color: var(--color-cyan);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 240, 255, 0.15);
        }

        .qr-error-banner {
          background: rgba(255, 51, 102, 0.1);
          border: 1px solid rgba(255, 51, 102, 0.3);
          color: #ff557f;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 13px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .qr-scan-area {
          min-height: 250px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.4);
          position: relative;
        }

        .webcam-container {
          width: 100% !important;
          border: none !important;
          background: transparent !important;
        }

        #qr-reader__scan_region {
          background: transparent !important;
        }

        #qr-reader img {
          display: none;
        }

        #qr-reader__dashboard {
          padding: 12px !important;
          background: rgba(0,0,0,0.4) !important;
          border-radius: 8px !important;
          border: 1px solid var(--glass-border) !important;
        }

        #qr-reader__dashboard_btn_start, #qr-reader__dashboard_btn_stop {
          background: var(--color-cyan) !important;
          color: black !important;
          border: none !important;
          padding: 6px 12px !important;
          border-radius: 4px !important;
          font-family: var(--font-display) !important;
          font-weight: 700 !important;
          cursor: pointer !important;
        }

        .file-uploader-container {
          width: 100%;
          padding: 16px;
        }

        .file-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 20px;
          cursor: pointer;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .file-dropzone:hover {
          border-color: var(--color-cyan);
          color: var(--text-primary);
        }

        .qr-instructions {
          text-align: center;
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
