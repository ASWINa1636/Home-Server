# 🏠 HomeServer — Modern, Hardened Private Cloud & Video Streaming

**HomeServer** is a modern, security-hardened private cloud storage and video streaming application built with **FastAPI** (Python) and **React + Vite**. It allows you to upload, manage, search, and stream your personal files and media securely — privately via **Tailscale** or publicly via **Cloudflare Tunnel**.

---

## ✨ Features

### 🛡️ Security Hardening
- **Mandatory `SECRET_KEY` Enforcement**: Fails startup if `SECRET_KEY` is missing or uses a default fallback.
- **Configurable CORS Lockdown**: Strict origin checks using `ALLOWED_ORIGINS` (no wildcard `*`).
- **Rate Limiting**: Protected authentication endpoints (`/api/auth/login` at 5 req/min, `/api/auth/signup` at 3 req/min) using `slowapi`.
- **Password Complexity Validation**: Enforces minimum length, uppercase, lowercase, digit, and special character requirements.
- **Security Headers Middleware**: Applies `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `Strict-Transport-Security` (auto-enabled over HTTPS).
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
- **Connection Indicator**: Sidebar shows current access path — 🟢 Private (Tailscale), 🌐 Public (Cloudflare), or 🏠 Local.

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
  Local:     http://localhost:8000
  Network:   http://192.168.29.17:8000
  Tailscale: http://100.100.100.100:8000  (private, high-speed)

  For public access, run cloudflared tunnel in a separate terminal.

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
# Include your Cloudflare Tunnel domain for public access
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8000,https://your-domain.com

# File upload limit (in bytes) — Default is 50GB
MAX_UPLOAD_SIZE=53687091200

# File storage directory
STORAGE_PATH=/data/uploads
```

---

## 🌐 Hybrid Access Architecture

HomeServer supports **two simultaneous access paths** from a single backend:

```text
┌─────────────────────────────────────────────────────────┐
│                     Your Laptop                         │
│                                                         │
│   FastAPI (port 8000) ← serves API + React frontend     │
│       ▲              ▲                                  │
│       │              │                                  │
│   Tailscale      cloudflared                            │
│   (WireGuard)    (Cloudflare Tunnel)                    │
│       │              │                                  │
└───────│──────────────│──────────────────────────────────┘
        │              │
        ▼              ▼
  ┌───────────┐  ┌──────────────┐
  │ Trusted   │  │ Public Users │
  │ Users     │  │ (anyone)     │
  │           │  │              │
  │ Tailscale │  │ Cloudflare   │
  │ app       │  │ HTTPS URL    │
  │ installed │  │              │
  │           │  │ your-domain  │
  │ Fast,     │  │ .com         │
  │ direct    │  │              │
  └───────────┘  └──────────────┘
```

| Feature | Tailscale (Private) | Cloudflare Tunnel (Public) |
|---------|--------------------|-----------------------------|
| **Who** | You + trusted users | Anyone with the link |
| **Speed** | ⚡ Direct WireGuard | 🌐 Via Cloudflare edge |
| **Setup** | Install Tailscale app | Just open the URL |
| **Encryption** | WireGuard (E2E) | Cloudflare TLS |
| **URL** | `http://<tailscale-ip>:8000` | `https://your-domain.com` |
| **Indicator** | 🟢 Private | 🌐 Public |

---

## 📱 Private Access via Tailscale (High-Speed)

This is the **fastest** way to access your server. Traffic flows directly between devices over an encrypted WireGuard tunnel — no intermediaries.

### For You (Server Owner)
1. Install **Tailscale** on your laptop (server): https://tailscale.com/download
2. Log in and connect to your tailnet.
3. Your server is automatically accessible at your Tailscale IP.

### For Trusted Users
1. Have them install **Tailscale** on their device.
2. Share your tailnet with them (Tailscale Admin Console → Share a device or use Tailscale sharing).
3. Give them your Tailscale IP:
   ```bash
   tailscale ip -4
   ```
4. They access: `http://<YOUR-TAILSCALE-IP>:8000`

> **Note**: This is plain HTTP, but it's fully secure — Tailscale encrypts all traffic end-to-end using WireGuard. No HTTPS certificate is needed.

---

## 🌐 Public Access via Cloudflare Tunnel

For users who don't have Tailscale, Cloudflare Tunnel provides fast, secure public access with a proper HTTPS URL.

### Step 1: Install `cloudflared`

```bash
# Debian/Ubuntu
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Or via package manager
# Arch: yay -S cloudflared
# macOS: brew install cloudflared
```

### Step 2: Quick Test (No Account Needed)

Try it instantly with a temporary random URL:

```bash
cloudflared tunnel --url http://localhost:8000
```

This gives you a temporary `https://xxxxx.trycloudflare.com` URL. Great for testing!

### Step 3: Permanent Tunnel with Custom Domain

For a stable URL with your own domain:

#### a) Create a Cloudflare account & add your domain
1. Sign up at https://dash.cloudflare.com
2. Add your domain and point its nameservers to Cloudflare.

#### b) Authenticate `cloudflared`
```bash
cloudflared tunnel login
```
This opens a browser — select your domain to authorize.

#### c) Create a named tunnel
```bash
cloudflared tunnel create homeserver
```

#### d) Configure DNS
```bash
cloudflared tunnel route dns homeserver cloud.your-domain.com
```
Replace `cloud.your-domain.com` with your desired subdomain.

#### e) Create the config file
```bash
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOF
tunnel: homeserver
credentials-file: /home/$USER/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: cloud.your-domain.com
    service: http://localhost:8000
    originRequest:
      noTLSVerify: true
  - service: http_status:404
EOF
```

> Replace `<TUNNEL-ID>` with the ID printed by `cloudflared tunnel create`. You can find it with `cloudflared tunnel list`.

#### f) Run the tunnel
```bash
cloudflared tunnel run homeserver
```

#### g) (Optional) Run as a system service
```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

Now your server is permanently available at `https://cloud.your-domain.com`!

### Step 4: Update CORS

Add your Cloudflare domain to `backend/.env`:

```ini
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8000,https://cloud.your-domain.com
```

Then restart the server.

---

## 📂 Project Architecture

```text
homeserver/
├── backend/
│   ├── main.py           # FastAPI app entry point & route definitions
│   ├── auth.py           # JWT authentication & password validation
│   ├── files.py          # File operations, uploads, streaming & range requests
│   ├── admin.py          # Admin dashboard API routes
│   ├── middleware.py      # Security headers, CSP, HSTS & range request middleware
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
│   │   ├── api.js        # Axios API client with dynamic base URL
│   │   ├── App.jsx       # Main application routes & layout
│   │   └── index.css     # Design system & global glassmorphic CSS
│   └── dist/             # Compiled production bundle served by FastAPI
├── install.sh            # One-click installation script
├── start.sh              # Startup script
└── README.md             # Project documentation
```

---

## 🔒 Security Note

- Do **not** expose port 8000 directly to the public internet using router port forwarding.
- Use **Tailscale** for private access (encrypted WireGuard tunnel).
- Use **Cloudflare Tunnel** for public access (Cloudflare handles TLS, DDoS protection, and edge caching).
- Both methods keep your server's real IP address hidden from the internet.
