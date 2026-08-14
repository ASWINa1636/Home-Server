# HomeServer — Tailscale Multi-Device Access

This guide explains how to run the HomeServer backend and access it from
other devices through your existing Tailscale network.

## 1. Prerequisites

On the HomeServer:

- Ubuntu/Linux
- Python virtual environment
- Tailscale installed and connected
- HomeServer project located at `~/homeserver`

On every client device:

- Tailscale installed
- Logged into the same Tailscale account/tailnet

---

## 2. Start Tailscale

Check whether Tailscale is connected:

```bash
tailscale status
```

Get the HomeServer's Tailscale IP:

```bash
tailscale ip
```

Example:

```text
100.101.102.103
```

The `100.x.x.x` address is the address to use from other Tailscale devices.

You can also see all connected devices with:

```bash
tailscale status
```

---

## 3. Start the HomeServer backend

Open a terminal on the HomeServer:

```bash
cd ~/homeserver/backend
```

Activate the Python environment:

```bash
source ../env/bin/activate
```

Start FastAPI so it accepts connections from the network:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

You should see:

```text
Uvicorn running on http://0.0.0.0:8000
Application startup complete.
```

Keep this terminal running.

---

## 4. Access from another laptop/PC

Make sure Tailscale is running on the client device.

If the HomeServer Tailscale IP is:

```text
100.101.102.103
```

open:

```text
http://100.101.102.103:8000
```

The general format is:

```text
http://<HOMESERVER-TAILSCALE-IP>:8000
```

Example:

```text
http://100.101.102.103:8000
```

---

## 5. Access from a phone

1. Install Tailscale on the phone.
2. Log into the same Tailscale account/tailnet.
3. Make sure the HomeServer appears as connected.
4. Open a browser.
5. Enter:

```text
http://<HOMESERVER-TAILSCALE-IP>:8000
```

Example:

```text
http://100.101.102.103:8000
```

The phone does NOT need to be connected to the same Wi-Fi. Tailscale provides the private network connection.

---

## 6. Test the API

FastAPI documentation:

```text
http://<HOMESERVER-TAILSCALE-IP>:8000/docs
```

Example:

```text
http://100.101.102.103:8000/docs
```

Test from another device:

```bash
curl http://<HOMESERVER-TAILSCALE-IP>:8000
```

Example:

```bash
curl http://100.101.102.103:8000
```

---

## 7. If the connection does not work

### Check Tailscale

On the HomeServer:

```bash
tailscale status
```

and:

```bash
tailscale ip
```

### Check that Uvicorn is listening

Run:

```bash
ss -ltnp | grep 8000
```

You want to see something similar to:

```text
0.0.0.0:8000
```

If you see:

```text
127.0.0.1:8000
```

the server is only accessible locally. Start it with:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Check the firewall

If UFW is enabled:

```bash
sudo ufw status
```

Allow port 8000 if necessary:

```bash
sudo ufw allow 8000/tcp
```

---

## 8. Authentication

The HomeServer API contains protected endpoints.

For example:

```text
GET /api/files/list?folder=all
```

may return:

```text
401 Unauthorized
```

when the client is not authenticated.

This does NOT necessarily mean the server is unreachable.

The expected flow is:

```text
Client
   |
   | Tailscale
   v
HomeServer
   |
   | Port 8000
   v
FastAPI
   |
   | Login
   v
Authentication
   |
   v
Protected API
```

If the application opens but `/api/files/list` returns `401`, check the application's login/token handling.

---

## 9. Recommended startup routine

Every time you want to use the HomeServer:

### Terminal 1

```bash
tailscale status
tailscale ip
```

Record the `100.x.x.x` address.

### Terminal 2

```bash
cd ~/homeserver/backend
source ../env/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Client device

Open:

```text
http://<TAILSCALE-IP>:8000
```

---

## 10. Quick reference

| Purpose | Command / URL |
|---|---|
| Check Tailscale | `tailscale status` |
| Get Tailscale IP | `tailscale ip` |
| Start backend | `uvicorn main:app --host 0.0.0.0 --port 8000 --reload` |
| Check port | `ss -ltnp \| grep 8000` |
| Web app | `http://<TAILSCALE-IP>:8000` |
| API docs | `http://<TAILSCALE-IP>:8000/docs` |

### Example

If:

```text
tailscale ip
```

returns:

```text
100.101.102.103
```

then use:

```text
Web App:  http://100.101.102.103:8000
API:      http://100.101.102.103:8000/docs
```

---

## Security note

Do not expose port 8000 directly to the public internet with router port forwarding.

For remote access, keep the service inside your Tailscale network or put it behind a properly configured production reverse proxy.
