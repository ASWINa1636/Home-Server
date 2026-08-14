# 🏠 HomeServer — Modern, Hardened Private Cloud & Video Streaming

**HomeServer** is a modern, security-hardened private cloud storage and video streaming application built with **FastAPI** (Python) and **React + Vite**. It allows you to upload, manage, search, and stream your personal files and media securely across your local network or remotely via **Tailscale**.

---

## ✨ Features

### 🛡️ Security Hardening
- **Mandatory `SECRET_KEY` Enforcement**: Fails startup if `SECRET_KEY` is missing or uses a default fallback.
- **Configurable CORS Lockdown**: Strict origin checks using `ALLOWED_ORIGINS` (no wildcard `*`).
- **Rate Limiting**: Protected authentication endpoints (`/api/auth/login` at 5 req/min, `/api/auth/signup` at 3 req/min) using `slowapi`.
- **Password Complexity Validation**: Enforces minimum length, uppercase, lowercase, digit, and special character requirements.
- **Security Headers Middleware**: Applies `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy`.
- **Filename & Path Traversal Sanitization**: Prevents directory traversal attacks (`..`) across all file uploads, reads, downloads, renames, and deletions.
- **50GB File Upload Limit**: Enforces maximum upload sizes via stream-counting bytes.
- **Secure Error Handling**: Sanitized error responses prevent backend stack traces from leaking to clients.

---

### 🎨 Modern Glassmorphic UI & Design System
- **Dark Theme Aesthetic**: Built with modern CSS variables, glassmorphic cards (`backdrop-filter`), gradient accents, and animated ambient orbs.
- **Interactive File Dashboard**:
  - Grid & List view toggle.
  - Category filters: All Files, Videos, Music, Images, Documents, Archives.
  - Sort by Name (A-Z / Z-A), Size, or Date.
  - Instant live search and breadcrumb navigation.
  - Multi-select bulk actions (download zip, delete multiple).
- **Upload Zone**: Fullscreen drag-and-drop overlay, folder structure preservation, individual progress bars per file queue.
- **Real-Time Password Strength Meter**: Live requirement checks and progress indicator during registration.
- **Toast Notification System**: Animated slide-in toasts for success, error, warning, and info alerts.

---

### 🎬 Netflix-Style Custom Video Player
- **Cinematic Experience**: Auto-hiding control overlays (3-second timeout), top title bar, center play/pause badge animations.
- **Advanced Playback**:
  - Custom seek bar with hover time tooltip and buffered range indicator.
  - Playback speed selector (`0.5x`, `0.75x`, `1x`, `1.25x`, `1.5x`, `2x`).
  - Volume slider with one-click mute/unmute.
  - Fullscreen & Picture-in-Picture (PiP) support.
- **Zoom & Pan Controls**:
  - **1x to 4x Zoom**: Smooth zoom control via UI buttons or `Ctrl + Mouse Scroll`.
  - **Pan Support**: Click-and-drag or touch-drag when zoomed in.
  - **Ken Burns Effect**: Toggleable automatic ambient zoom & pan algorithm for slideshows or background media playback.
- **Keyboard Shortcuts**:
  - `Space` / `K` — Play / Pause
  - `Left` / `Right` arrows — Rewind / Fast-Forward 10 seconds
  - `Up` / `Down` arrows — Volume Up / Down
  - `F` — Toggle Fullscreen
  - `M` — Mute / Unmute
  - `P` — Picture-in-Picture
  - `<` / `>` — Decrease / Increase Playback Speed
  - `Esc` — Exit Fullscreen / Close Player

---

## 🚀 Quick Start

### 1. Installation
Clone the repository and run the setup script:

```bash
cd ~/homeserver
bash install.sh
```

This will:
1. Create a Python virtual environment (`env/`).
2. Install Python dependencies from `backend/requirements.txt`.
3. Generate a `backend/.env` configuration file with a strong random `SECRET_KEY`.
4. Install frontend packages and compile production assets to `frontend/dist/`.

---

### 2. Launching HomeServer
Run the start script:

```bash
./start.sh
```

Output:
```text
Starting HomeServer...

Server running at:
  Local:   http://localhost:8000
  Network: http://192.168.29.17:8000

Press Ctrl+C to stop
```

Open `http://localhost:8000` in your web browser.

---

## ⚙️ Configuration (`backend/.env`)

You can edit `backend/.env` to configure server settings:

```ini
# Mandatory high-entropy secret key for JWT tokens
SECRET_KEY=your_strong_random_secret_key_here

# Allowed origins for CORS (comma-separated)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8000

# File upload limit (in bytes) — Default is 50GB
MAX_UPLOAD_SIZE=53687091200

# File storage directory (relative to backend/)
STORAGE_DIR=./storage
```

---

## 📱 Mobile & Tailscale Access

### Accessing on Local Wi-Fi
1. Connect your phone/tablet to the same Wi-Fi network.
2. Open your mobile browser and enter the server's local IP address (e.g. `http://192.168.29.17:8000`).

### Accessing Remotely via Tailscale
1. Install **Tailscale** on your server and mobile device/laptop.
2. Connect both devices to your Tailnet.
3. Get your server's Tailscale IP:
   ```bash
   tailscale ip
   ```
4. Access the web app from anywhere at `http://<TAILSCALE-IP>:8000`.

---

## 📂 Project Architecture

```text
homeserver/
├── backend/
│   ├── main.py           # FastAPI app entry point & route definitions
│   ├── auth.py           # JWT authentication & password validation
│   ├── files.py          # File operations, uploads, streaming & range requests
│   ├── middleware.py     # Security headers & HTTP range request middleware
│   ├── database.py       # SQLAlchemy database connection
│   ├── models.py         # Database models (User)
│   ├── requirements.txt  # Python package dependencies
│   └── .env.example      # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── components/   # Sidebar, FileGrid, FileList, UploadZone, VideoPlayer, etc.
│   │   ├── contexts/     # AuthContext, ToastContext
│   │   ├── pages/        # Login, Signup, Dashboard
│   │   ├── utils/        # File extension, size & icon utilities
│   │   ├── App.jsx       # Main application routes & layout
│   │   └── index.css     # Design system & global glassmorphic CSS
│   └── dist/             # Compiled production bundle served by FastAPI
├── install.sh            # One-click installation script
├── start.sh              # Startup script
└── README.md             # Project documentation
```

---

## 🔒 Security Note
Do **not** expose port 8000 directly to the public internet using router port forwarding. Use **Tailscale** or a properly configured reverse proxy (such as Nginx or Caddy with SSL) for secure remote access.
