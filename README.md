# 🛸 SpookyChat: Quantum-Entangled Cryptographic Messenger

[![Node Version](https://img.shields.io/badge/node-%3E%3D22.5.0-blue.svg?logo=node.js)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/database-SQLite_Native-cyan.svg?logo=sqlite)](https://www.sqlite.org/)
[![UI Library](https://img.shields.io/badge/frontend-React_19-blue?logo=react)](https://react.dev/)
[![Bundler](https://img.shields.io/badge/bundler-Vite_8-7c3aed?logo=vite)](https://vite.dev/)
[![Tunnel](https://img.shields.io/badge/tunnel-ngrok_static-002f6c.svg?logo=ngrok)](https://ngrok.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)

SpookyChat is a professional-grade, real-time messaging application designed to simulate **Quantum Key Distribution (QKD)**. It utilizes the **E91 Bell State Entanglement Protocol** for 1-on-1 chats and a multi-party **Greenberger-Horne-Zeilinger (GHZ) Entanglement State** for group conversations. It includes a live 3D Bloch Sphere visualizer that precesses continuously in superposition and collapses instantly upon measurement.

---

## 🔮 Core Quantum Specifications

SpookyChat simulates real-time physical transport and measurement of photon qubits, demonstrating the fundamental principles of quantum cryptography:

### 1. 1-on-1 Chat: E91 Protocol Simulation
For direct messaging, SpookyChat simulates the E91 quantum key distribution algorithm:
* **Entangled Pairs**: Generates an 8-qubit array initialized in the Bell singlet state:
  $$|\psi^+\rangle = \frac{1}{\sqrt{2}}(|00\rangle + |11\rangle)$$
* **Dual Basis Alignment**: The sender (Alice) and receiver (Bob) measure their respective qubits using randomly chosen bases (Rectilinear $[+]$ or Diagonal $[x]$).
* **Fidelity Collapsing**: When bases match, their keybits correlate perfectly ($100\%$ fidelity). When an eavesdropper (Eve) intercepts a qubit, the wavefunction collapses prematurely. Bob's measurement becomes randomized, resulting in key mismatches, decryption failure, and a **Quantum Security Alert**.

```
       [ Alice (Sender) ]                    [ Eve (Probe) ]                    [ Bob (Receiver) ]
      Basis: [+] or [x]                    Basis: [+] or [x]                  Basis: [+] or [x]
              |                                     |                                   |
    (Generate Entangled Qubits)                     |                                   |
              |                                     |                                   |
              +=============> [ Qubit In Transit ] =+=+==============> [ Measurement ] --+
                                     |                |
                                     v                v
                             Wavefunction Collapses   Entanglement Broken (Fidelity -> 50%)
```

### 2. Group Chat: Multi-Party GHZ Entanglement
For group messaging, SpookyChat implements multi-party entanglement:
* **GHZ State Vector**: Entangles all group participants in a shared Greenberger-Horne-Zeilinger state:
  $$|\text{GHZ}\rangle = \frac{1}{\sqrt{2}}(|00...0\rangle + |11...1\rangle)$$
* **Global Collapse**: When a message is broadcast, the sender collapses the global state vector, generating matching keybytes for all group members simultaneously to facilitate secure multi-party decryption.

### 3. Visual Bloch Sphere Telemetry
The collapsible **Quantum Core Monitor** includes a real-time 3D Bloch Sphere that renders the active qubit state:
$$|\psi\rangle = \cos\left(\frac{\theta}{2}\right)|0\rangle + e^{i\phi}\sin\left(\frac{\theta}{2}\right)|1\rangle$$
* **Superposition Precession**: The state vector precesses continuously around the Z-axis ($\phi$ shift) while idle.
* **Instant Collapse**: Upon message transmission, the vector collapses instantly to $|0\rangle$ (North Pole) or $|1\rangle$ (South Pole), mapping the wave function collapse.

---

## 🛠️ Technology Stack & Architecture

SpookyChat is built as a highly optimized, lightweight client-server web app:

* **Backend**: Express, Socket.io (WebSocket duplex engine).
* **Database**: Native built-in `node:sqlite` SQLite engine (no external compilation required).
* **Frontend**: React 19, Lucide React, HTML5 Canvas.
* **Bundler & Build Tool**: Vite 8 / Rolldown (generating minified static assets in `client/dist`).
* **Desktop App Wrapper**: Chromium Standalone Application Mode (`--app`).

### Folder Structure:
```text
├── client/                     # React Frontend source code
│   ├── src/
│   │   ├── components/         # Login, Sidebar, ChatWindow, BlochSphere
│   │   ├── App.jsx             # Main router and Socket lifecycle
│   │   └── index.css           # Premium space-dark glassmorphism styling
│   └── vite.config.js          # Vite bundler parameters
├── database.js                 # Native node:sqlite helper functions
├── server.js                   # Express, Socket.io server and QKD handlers
├── build_portable.py           # Python script generating zip packages
├── host_launch.bat             # Desktop launcher pointing to Render Cloud
└── start_spookychat.bat        # Local developer server + ngrok launcher
```

---

## ⚡ Quickstart Guide

### 1. Prerequisites
Install Node.js version **`v22.5.0`** or higher (required for native `node:sqlite` support).

### 2. Local Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/srisheshasai/qubit_SpookyChat.git
cd qubit_SpookyChat
npm run build
```

### 3. Launching the App
* **Local Server + ngrok Tunnel**: Double-click **`start_spookychat.bat`**. This spins up the local Node server, starts a secure ngrok tunnel on your static domain (`https://zackary-unfertilising-helen.ngrok-free.dev`), and opens a standalone application window.
* **Render Cloud Connection**: Double-click **`host_launch.bat`**. This launches a local standalone application window pointing directly to the live Render deployment (`https://qubit-spookychat.onrender.com`).

---

## ☁️ 24/7 Cloud Deployment

SpookyChat is deployed on **Render** to remain active online 24/7 even when your personal computer is turned off.

### Automated CI/CD Build Command
On Render or Railway, link your GitHub repository and configure the following parameters:
* **Runtime**: `Node` (Version `22.x` or higher)
* **Build Command**: `npm run build` (This automatically runs `npm install && npm run client:install && npm run client:build`)
* **Start Command**: `node server.js`

### Relational Schema Diagram:
All data is stored inside a transactional relational SQLite file `spookychat.db`:

```mermaid
erDiagram
    users {
        TEXT id PK
        TEXT username UNIQUE
        TEXT salt
        TEXT password_hash
        TEXT quantum_profile
    }
    chats {
        TEXT id PK
        INTEGER is_group
        TEXT group_name
    }
    chat_participants {
        TEXT chat_id PK, FK
        TEXT user_id PK, FK
    }
    messages {
        TEXT id PK
        TEXT chat_id FK
        TEXT sender_id FK
        TEXT encrypted_payload
        TEXT quantum_details
        TEXT timestamp
    }

    users ||--o{ chat_participants : participates
    chats ||--o{ chat_participants : contains
    chats ||--o{ messages : records
    users ||--o{ messages : sends
```

---

## 📦 Portable Distribution Packages

We provide pre-packaged executable archives for others, generated using Python's standard `zipfile` module for maximum compatibility:

1. **Offline Server/Client Bundle (`spookychat-portable.zip` - 36 MB)**:
   Contains a local Node runtime and SQLite database. The interactive launcher menu allows users to:
   * **Option 1**: Connect to your live Render server (`https://qubit-spookychat.onrender.com`).
   * **Option 2**: Run a private, isolated local server on their own machine (`http://localhost:5000`).
2. **Live Client-Only Package (`spookychat-render-portable.zip` - 1.2 KB)**:
   An ultra-lightweight client widget for others that connects directly to the live Render website with zero configuration.

---

## 🔒 Security Specifications

* **Persisted Server HMAC Secret**: The HMAC signature secret key is saved inside the SQLite `settings` table on first boot. This ensures session tokens remain valid and persistent across server reboots.
* **Unauthorized Flush Buffer**: If a token verification fails, the server sends an `unauthorized` event to the client and delays socket disconnection by `300ms`, allowing the client's service worker to safely clear local storage and redirect to the login screen.
* **In-Memory Rate Limiting**: REST login and registration endpoints are protected by an IP-based rate limiter (maximum 10 authentication attempts per minute).
* **Fingerprint Header Protection**: Express fingerprint headers (`X-Powered-By`) are stripped to prevent server software enumeration.
* **Relational Integrity**: Foreign key constraints with `ON DELETE CASCADE` prevent orphaned logs or orphaned messages inside the database.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
