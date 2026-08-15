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

### 🔐 Admin Dashboard
- Full user management with storage quotas, device tracking, and account control.
- Storage increase requests with admin approval/rejection workflow.
- User ↔ Admin messaging system.
- Account deletion request management.
- Audit logging of all admin actions.
- Auto-refresh with configurable intervals.

### 🔑 Password Management
- **Forgot Password**: Secure token-based password reset (printed to server logs or optionally emailed).
- **Change Password**: Authenticated users can change their password with automatic session rotation.
- **Session Invalidation**: All existing JWT tokens are invalidated when a password is changed.

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

# File storage directory
STORAGE_PATH=/data/uploads
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

## 🌐 Public Access via Tailscale Funnel

You can expose your HomeServer to the public internet securely using **Tailscale Funnel**. This allows anyone (even people without Tailscale) to access your server using a public HTTPS link!

### How it works
Tailscale Funnel can be permanently configured to run in the background as a service. Once configured, you never need to enter your password or manually start it again. As long as your HomeServer is running on port 8000, Tailscale will magically route public HTTPS traffic to it!

### Step-by-Step Setup
1. **Enable Funnel:** Go to the [Tailscale Funnel settings](https://login.tailscale.com/f/funnel) and ensure it is turned on for your account.
2. **Configure the Background Proxy (Run this ONCE):**
   Open a terminal and run the following command to permanently configure the Funnel in the background:
   ```bash
   sudo tailscale funnel --bg 8000
   ```
   *(Enter your password when prompted. It will say "Funnel started and running in the background.")*
3. **Start your Server:**
   You can now start your web server using your custom shortcut from anywhere:
   ```bash
   homeserver
   ```
4. **Access your server:**
   Your public link will now work flawlessly from any device in the world, even on LTE!
   `Available on the internet: https://aswin-inspiron-3501.tailfcb304.ts.net/`

### Customizing your Link
By default, Tailscale generates a link using your machine's original hostname (e.g., `aswin-inspiron-3501.tailfcb304.ts.net`). You can easily customize this!

1. Go to your **[Tailscale Admin Console](https://login.tailscale.com/admin/machines)**.
2. Find your laptop in the list, click the three dots (`...`) on the right, and choose **Edit machine name**.
3. Change it to something cleaner, like `cloud`, `server`, or `homeserver`.
4. Your public link will instantly update (e.g., `https://cloud.tailfcb304.ts.net/`)!

---



## 📂 Project Architecture

```text
homeserver/
├── backend/
│   ├── main.py           # FastAPI app entry point & route definitions
│   ├── auth.py           # JWT authentication & password validation
│   ├── files.py          # File operations, uploads, streaming & range requests
│   ├── admin.py          # Admin dashboard API routes
│   ├── middleware.py      # Security headers & HTTP range request middleware
│   ├── database.py       # SQLAlchemy database connection
│   ├── models.py         # Database models (User, FileRecord, Device, etc.)
│   ├── promote_admin.py  # CLI script to promote a user to admin
│   ├── requirements.txt  # Python package dependencies
│   └── .env.example      # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── components/   # Sidebar, FileGrid, FileList, UploadZone, VideoPlayer, Modals
│   │   ├── contexts/     # AuthContext, ToastContext
│   │   ├── hooks/        # useAutoRefresh
│   │   ├── pages/        # Login, Signup, Dashboard, ResetPassword, Admin/*
│   │   ├── utils/        # File extension, size & icon utilities
│   │   ├── api.js        # Axios API client with configurable base URL
│   │   ├── App.jsx       # Main application routes & layout
│   │   └── index.css     # Design system & global glassmorphic CSS
│   ├── vercel.json       # Vercel SPA routing configuration
│   ├── .env.example      # Frontend environment variable template
│   └── dist/             # Compiled production bundle served by FastAPI
├── install.sh            # One-click installation script
├── start.sh              # Startup script
└── README.md             # Project documentation
```

---

## 🔒 Security Note
Do **not** expose port 8000 directly to the public internet using router port forwarding. Use **Tailscale** (private access) or **Tailscale Funnel** (public access with TLS) for secure remote access.
