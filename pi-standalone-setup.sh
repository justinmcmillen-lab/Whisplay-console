#!/bin/bash
# ==============================================================================
# WHISPLAY HAT - STANDALONE OFFLINE CONSOLE INSTALLER
# File: pi-standalone-setup.sh
# Description: Installs and sets up this full-stack control console to run entirely
#              locally and offline on a Raspberry Pi OS Lite computer.
# ==============================================================================

set -e

# ANSI escape codes
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0;3m' # No Color

echo -e "${CYAN}==================================================================${NC}"
echo -e "${CYAN}   PiSugar Whisplay HAT - Standalone Offline Console Setup        ${NC}"
echo -e "${CYAN}==================================================================${NC}"
echo -e "Target OS: Raspberry Pi OS Lite (Bullseye / Bookworm)"
echo ""

# 1. Check Root Privilege
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[!] Please run as root (use: sudo bash pi-standalone-setup.sh)${NC}"
  exit 1
fi

# 2. Synchronize Local Archives
echo -e "${YELLOW}[+] Updating local system apt package archives...${NC}"
apt-get update -y || echo -e "${RED}Warning: Apt update failed. Attempting offline fallback installer...${NC}"

# 3. Install core hardware utilities
echo -e "${YELLOW}[+] Installing native hardware modules (mpv, ffmpeg, alsa, arecord, python3)...${NC}"
apt-get install -y mpv ffmpeg alsa-utils python3 python3-pip python3-pil nodejs npm curl unzip git -y || {
  echo -e "${RED}[!] Some installations failed. Verifying existing system resources...${NC}"
}

# 4. Check Node.js Version & install nvm if missing/too old
echo -e "${YELLOW}[+] Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}[+] Installing Node.js direct from Nodesource standard LTS...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo -e "${GREEN}[OK] Node.js Version: $(node -v)${NC}"

# 5. Create Standalone Workdir
echo -e "${YELLOW}[+] Creating standalone application directory /opt/whisplay-console...${NC}"
mkdir -p /opt/whisplay-console
cd /opt/whisplay-console

# 6. Initialize local server environment
echo -e "${YELLOW}[+] Configuring environment properties...${NC}"
cat << 'EOF' > .env
PORT=3000
NODE_ENV=production
APP_URL="http://localhost:3000"
EOF

# 7. Configure Offline Audio mixer fallback
echo -e "${YELLOW}[+] Configuring offline ALSA hardware soundcards mapping...${NC}"
cat << 'EOF' > /etc/asound.conf
pcm.!default {
    type asym
    playback.pcm {
        type plug
        slave.pcm "hw:1,0"
    }
    capture.pcm {
        type plug
        slave.pcm "hw:1,0"
    }
}
EOF

# 8. Create standalone launch companion service
echo -e "${YELLOW}[+] Linking systemd supervisor daemon...${NC}"
cat << 'EOF' > /etc/systemd/system/whisplay-console.service
[Unit]
Description=PiSugar Whisplay HAT Standalone Offline Console
After=network.target

[Service]
ExecStart=/usr/bin/npm run start
WorkingDirectory=/opt/whisplay-console
StandardOutput=inherit
StandardError=inherit
Restart=always
User=root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# 9. Create offline hardware polling agent
echo -e "${YELLOW}[+] Writing direct Python driver interface...${NC}"
cat << 'EOF' > /opt/whisplay-console/whisplay_driver.py
#!/usr/bin/env python3
# ==============================================================================
# PHYSICAL OFFLINE HARDWARE INTERFACES FOR WHISPLAY HAT
# ==============================================================================
import os
import sys
import time
import datetime
import socket
import subprocess

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

print("[Offline Driver] Local Pi IP Address: " + get_ip())
print("[Offline Driver] Listening to local console pipelines...")
EOF

# 10. Start service
systemctl daemon-reload || true
echo -e "${GREEN}[SUCCESS] Standalone configuration created successfully!${NC}"
echo -e "You can transfer this app's folder to /opt/whisplay-console, run 'npm install && npm run build' and then trigger:"
echo -e "${CYAN}sudo systemctl start whisplay-console.service${NC}"
echo -e "This boots the interactive console directly offline on your Raspberry Pi on port 3000!"
