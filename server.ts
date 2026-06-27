import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Mock/InMemory storage for the controller
let systemState = "active"; // "booting", "active", "shutting_down", "halted"
let shutdownProgress = 0;
let bootProgress = 0;
let bootTimer: NodeJS.Timeout | null = null;
let shutdownTimer: NodeJS.Timeout | null = null;
let batteryPercent = 88;
let isCharging = true;
let batteryTimer: NodeJS.Timeout | null = null;

// Simulate battery changes
batteryTimer = setInterval(() => {
  if (isCharging) {
    batteryPercent += 1;
    if (batteryPercent >= 100) {
      batteryPercent = 100;
      isCharging = false;
    }
  } else {
    batteryPercent -= 1;
    if (batteryPercent <= 20) {
      isCharging = true;
    }
  }
}, 30000);

// Default Boot Splashes
let currentBootSplash = "Cyberpunk Pi Sugar";
let currentShutdownSplash = "System Halted";

// Preset configurations
const splashPresets = {
  boot: [
    {
      id: "cyberpunk",
      name: "Cyberpunk Pi Sugar",
      type: "pixel",
      themeColor: "#ff007f",
      art: "PISUGAR WHISPLAY\n==================\n[SYS] CORE_OK\n[BAT] 3.82V_OK\n[NET] WLAN0_ACTIVE\n[DSP] E-INK_OK\n=================="
    },
    {
      id: "retro",
      name: "Retro Raspberry",
      type: "raster",
      themeColor: "#ff5555",
      art: "   .----.  _  _ \n  / .--. \\| || | \n  | |    |/| || | \n  | |    |-| || | \n  | '--' /| || | \n   '----' |_||_| \n Raspberry Pi OS OS_LITE"
    },
    {
      id: "terminal",
      name: "Minimalist Terminal",
      type: "text",
      themeColor: "#00ff66",
      art: "boot: /boot/vmlinuz-linux...\ninit: systemd-252.1...\nmounting /dev/mmcblk0p2...\n[ OK ] Loaded Whisplay Driver.\n[ OK ] IP: 192.168.1.144\nSystem Ready."
    },
    {
      id: "matrix",
      name: "The Matrix Grid",
      type: "matrix",
      themeColor: "#33ff33",
      art: "1010011110010110\n0110101011101010\n WHISPLAY ACTIVE \nSYS_LVL: STABLE\n0010110101110101\n1110101001101110"
    }
  ],
  shutdown: [
    {
      id: "halted",
      name: "System Halted",
      art: "SYSTEM HALTED SAFELY.\n=====================\nPowering down SoC...\nBattery entering sleep...\nWhisplay Color LCD sleeping.\nGoodbye.",
      themeColor: "#ff3333"
    },
    {
      id: "classic",
      name: "Classic Goodbye",
      art: "   * GOOD BYE *   \n\nRemoving file nodes.\nStopping systemd-journal.\nShutting down Whisplay.\n[ OK ] Safe to pull power.",
      themeColor: "#00ffff"
    },
    {
      id: "pixel_sleep",
      name: "Industrial Screen Sleep",
      art: "[SLEEP]\n - Color LCD Sleep Mode\n - Speakers Disabled\n - Low Power State\n=====================",
      themeColor: "#ffaa00"
    }
  ]
};

// Custom User uploaded Splashes
let userBootSplash: string | null = null;
let userShutdownSplash: string | null = null;

// Initial Audio Recordings
let savedRecordings = [
  {
    id: "rec_1",
    name: "System Microphone Test",
    date: "2026-06-22 14:10",
    duration: "4.2s",
    size: "35 KB",
    audioData: "" // Will be fallback synthesized or empty, client handles mock sound waveform
  },
  {
    id: "rec_2",
    name: "Whisplay Speaker Calibration",
    date: "2026-06-22 14:15",
    duration: "6.8s",
    size: "54 KB",
    audioData: ""
  }
];

// Initial Media Files (MP4 references)
let mediaFiles = [
  {
    id: "media_1",
    name: "Cyberpunk Digital Clock Loop",
    uploadedAt: "Preset",
    size: "1.2 MB",
    duration: "10s",
    isPreset: true,
    url: "/assets/presets/cyber_clock.mp4"
  },
  {
    id: "media_2",
    name: "Cascading Matrix code rain",
    uploadedAt: "Preset",
    size: "2.4 MB",
    duration: "15s",
    isPreset: true,
    url: "/assets/presets/matrix_rain.mp4"
  },
  {
    id: "media_3",
    name: "Dynamic Waveform Graphic Visualizer",
    uploadedAt: "Preset",
    size: "3.1 MB",
    duration: "12s",
    isPreset: true,
    url: "/assets/presets/wave_viz.mp4"
  }
];

// IP Gathering simulation
let simulatedNetworks = [
  { ssid: "Whisplay_Net_5G", signal: 95, security: "WPA2", isConnected: true },
  { ssid: "Home_WiFi_Secure", signal: 78, security: "WPA2/WPA3", isConnected: false },
  { ssid: "RPi_Hotspot", signal: 62, security: "Open", isConnected: false },
  { ssid: "Public_Transit_Guest", signal: 45, security: "Open", isConnected: false },
  { ssid: "CoffeeShop_Air", signal: 30, security: "WEP", isConnected: false },
];

let ethernetInterface = {
  interface: "eth0",
  status: "connected",
  ipAddress: "192.168.1.42",
  speed: "1000 Mbps",
  mac: "b8:27:eb:11:22:33"
};

let wifiInterface = {
  interface: "wlan0",
  status: "associated",
  ipAddress: "192.168.1.144",
  mac: "b8:27:eb:44:55:66"
};

const getSystemIp = () => {
  if (wifiInterface.status === "associated") {
    return wifiInterface.ipAddress;
  }
  if (ethernetInterface.status === "connected") {
    return ethernetInterface.ipAddress;
  }
  return "127.0.0.1";
};

// --- API ENDPOINTS ---

// Fetch overall Whisplay controller state & metrics
app.get("/api/system-status", (req, res) => {
  // Simulate active CPU and Temp changes
  const cpuLoad = systemState === "active" ? Math.floor(Math.random() * 8) + 3 : 0;
  const tempC = systemState === "active" ? parseFloat((40 + Math.random() * 4).toFixed(1)) : 22.0;
  const ramUsage = systemState === "active" ? 18.4 : 0.0;

  res.json({
    state: systemState,
    time: new Date().toLocaleTimeString(),
    date: new Date().toLocaleDateString(),
    ipAddress: getSystemIp(),
    batteryPercent,
    isCharging,
    cpuLoad,
    tempC,
    ramUsage,
    currentBootSplash,
    currentShutdownSplash,
    shutdownProgress: systemState === "shutting_down" ? shutdownProgress : 0,
    bootProgress: systemState === "booting" ? bootProgress : 0,
  });
});

// Trigger the safe shutdown sequence
app.post("/api/shutdown", (req, res) => {
  if (systemState === "active") {
    systemState = "shutting_down";
    shutdownProgress = 0;

    if (shutdownTimer) clearInterval(shutdownTimer);
    shutdownTimer = setInterval(() => {
      shutdownProgress += 10;
      if (shutdownProgress >= 100) {
        clearInterval(shutdownTimer!);
        systemState = "halted";
      }
    }, 300);

    res.json({ success: true, message: "Shutdown sequence initiated. Screen displays shutdown splash." });
  } else {
    res.status(400).json({ success: false, message: "System is not in active state." });
  }
});

// Trigger a reboot sequence
app.post("/api/reboot", (req, res) => {
  systemState = "booting";
  bootProgress = 0;

  if (bootTimer) clearInterval(bootTimer);
  bootTimer = setInterval(() => {
    bootProgress += 10;
    if (bootProgress >= 100) {
      clearInterval(bootTimer!);
      systemState = "active";
    }
  }, 250);

  res.json({ success: true, message: "System rebooting. Loading boot splash screen." });
});

// Audio recordings retrieval
app.get("/api/recordings", (req, res) => {
  res.json({ recordings: savedRecordings });
});

// Save a new audio recording
app.post("/api/recordings", (req, res) => {
  const { name, duration, size, audioData } = req.body;
  
  const newRecording = {
    id: `rec_${Date.now()}`,
    name: name || `Voice Rec ${savedRecordings.length + 1}`,
    date: new Date().toISOString().replace("T", " ").substring(0, 16),
    duration: duration || "5.0s",
    size: size || "42 KB",
    audioData: audioData || ""
  };

  savedRecordings.unshift(newRecording);
  res.json({ success: true, recording: newRecording });
});

// Delete an audio recording
app.delete("/api/recordings/:id", (req, res) => {
  const { id } = req.params;
  savedRecordings = savedRecordings.filter(rec => rec.id !== id);
  res.json({ success: true, message: "Recording deleted." });
});

// Media Library retrieval
app.get("/api/media", (req, res) => {
  res.json({ media: mediaFiles });
});

// Register a custom uploaded video file metadata
app.post("/api/media", (req, res) => {
  const { name, size, duration } = req.body;

  const newMedia = {
    id: `media_${Date.now()}`,
    name: name || `Uploaded Video ${mediaFiles.length + 1}`,
    uploadedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    size: size || "1.5 MB",
    duration: duration || "12s",
    isPreset: false,
    url: "" // Simulated url, client uses local binary blob URL
  };

  mediaFiles.unshift(newMedia);
  res.json({ success: true, media: newMedia });
});

// Edit boot and shutdown splashes settings
app.post("/api/splash/save", (req, res) => {
  const { bootTheme, shutdownTheme, customBootHex, customShutdownHex } = req.body;
  if (bootTheme) currentBootSplash = bootTheme;
  if (shutdownTheme) currentShutdownSplash = shutdownTheme;

  if (customBootHex) {
    userBootSplash = customBootHex;
  }
  if (customShutdownHex) {
    userShutdownSplash = customShutdownHex;
  }

  res.json({
    success: true,
    currentBootSplash,
    currentShutdownSplash,
    userBootSplash: !!userBootSplash,
    userShutdownSplash: !!userShutdownSplash
  });
});

// Fetch python-service and terminal initialization installer scripts for safe installation on physical Pi.
app.get("/api/installer", (req, res) => {
  const pythonScript = `#!/usr/bin/env python3
# ==============================================================================
# WHISPLAY HAT CONTROLLER COMPANION SERVICE
# File: whisplay_service.py
# Descripton: Connects the Web Console backend/endpoints to physical Whisplay
#             Hardware (e.g., ST7789 Color LCD, side button, microphone audio rec, volume out)
# ==============================================================================

import os
import sys
import time
import datetime
import socket
import subprocess
import requests
import psutil

# Hardware specifics (ST7789 color LCD display, resolution 240x280 pixels)
# To install dependencies: pip3 install psutil requests mini-dither pillow ST7789
try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Warning: Pillow not found, LCD rendering requires 'pip3 install pillow'")

WEB_CONSOLE_URL = "${process.env.APP_URL || "http://your-applet-url-or-ip"}"
POLL_INTERVAL_S = 1.0

def get_ip_address():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

def play_mp4(filepath):
    print(f"[Whisplay] Playing {filepath} on Whisplay Hat.")
    # On Pi OS Lite: mpv has very efficient CLI video output via rpi-drm / standard framebuffer
    # also supports outputting audio to the ALSA speaker hats automatically
    try:
        subprocess.run(["mpv", "--vo=drm", "--audio-device=alsa", filepath], check=True)
    except Exception as e:
        print("Error playing with mpv:", e)
        # Fallback to general speaker out split
        subprocess.run(["omxplayer", "-o", "alsa", filepath])

def record_audio(duration, outfile="record.wav"):
    print(f"[Whisplay] Recording audio for {duration} seconds to {outfile}...")
    # Use standard linux capture sound tools via ALSA and physical Whisplay Hat Mic
    # arecord -D hw:1,0 -c 1 -r 44100 -f S16_LE -d duration outfile
    try:
        subprocess.run(["arecord", "-D", "default", "-f", "S16_LE", "-r", "44100", "-d", str(duration), outfile], check=True)
        print("[Whisplay] Recording complete!")
        return True
    except Exception as e:
        print("Recording error:", e)
        return False

def safely_shutdown():
    print("[Whisplay] Safe shutdown sequence initiated. Running poweroff command...")
    # Draw shutdown terminal splash first on the physical screen
    draw_splash("System Halted")
    time.sleep(2)
    os.system("sudo shutdown -h now")

def draw_splash(theme_name):
    print(f"[Whisplay] Rendering Splash Screen on 1.69-inch ST7789 Color LCD Hat Display (240x280 PX): {theme_name}")
    # Physical display code goes here: e.g.epd.display(epd.getbuffer(img))

def poll_console_commands():
    print("[Whisplay] Polling web server for command events...")
    while True:
        try:
            r = requests.get(f"{WEB_CONSOLE_URL}/api/system-status")
            status = r.json()
            
            # Check server power state trigger
            if status.get("state") == "shutting_down":
                safely_shutdown()
                break
                
            # Perform other commands (like playing uploaded media or downloading records)
            # update parameters
        except Exception as e:
            print("[Whisplay] Error polling:", e)
        time.sleep(POLL_INTERVAL_S)

if __name__ == "__main__":
    print("=========================================")
    print("  Whisplay Companion Receiver Active  ")
    print("  IP Address Detected: " + get_ip_address())
    print("=========================================")
    poll_console_commands()
`;

  const installScript = `#!/bin/bash
# ==============================================================================
# PIP SUGAR WHISPLAY HAT INITIALIZER INSTALLER
# File: whisplay-init.sh
# Run: curl -sL ${process.env.APP_URL || "http://your-applet-url-or-ip"}/api/installer | bash
# ==============================================================================

echo "========================================================="
echo "  Preparing PiSugar Whisplay Hat Graphic Installer Module"
echo "  Raspberry Pi OS Lite Target System Configuration"
echo "========================================================="

# 1. Update Core Package Repository
echo "[+] Updating apt lists..."
sudo apt-get update -y

# 2. Install essential system dependencies for mp4 playback, audio recordings, and Python handlers
echo "[+] Installing core utilities (mpv, arecord, python3, pip, ffmpeg)..."
sudo apt-get install -y mpv ffmpeg alsa-utils python3 python3-pip python3-psutil curl

# 3. Install Python bindings for Whisplay hat
echo "[+] Setting up Whisplay display helper bindings..."
sudo pip3 install pillow requests pexpect --break-system-packages || sudo pip3 install pillow requests pexpect

# 4. Configure ALSA sound card for Whisplay Speaker and Mic integration
echo "[+] Configuring audio card priority..."
sudo bash -c "cat << EOF > /etc/asound.conf
pcm.!default {
    type asym
    playback.pcm {
        type plug
        slave.pcm \"hw:1,0\"
    }
    capture.pcm {
        type plug
        slave.pcm \"hw:1,0\"
    }
}
EOF"

# 5. Create autostart supervisor systemd service
echo "[+] Creating background Whisplay daemon daemon..."
cat << 'EOF' | sudo tee /etc/systemd/system/whisplay.service > /dev/null
[Unit]
Description=PiSugar Whisplay Controller Daemon
After=network.target

[Service]
ExecStart=/usr/bin/python3 /home/pi/whisplay_service.py
WorkingDirectory=/home/pi
StandardOutput=inherit
StandardError=inherit
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
EOF

# 6. Fetch python agent file
echo "[+] Fetching core python runtime handlers..."
curl -o /home/pi/whisplay_service.py ${process.env.APP_URL || "http://your-applet-url-or-ip"}/api/installer?file=service

# 7. Enable and boot the service
sudo systemctl daemon-reload
sudo systemctl enable whisplay.service
sudo systemctl start whisplay.service

echo "[SUCCESS] Installation Complete! Whisplay is now listening to your Control Console."
echo "Press power button anytime or interact via web dashboard to safely operate hardware."
`;

  const { file } = req.query;
  if (file === "service") {
    res.setHeader("Content-Type", "text/x-python");
    res.send(pythonScript);
  } else {
    res.setHeader("Content-Type", "text/plain");
    res.send(installScript + "\n\n### PYTHON SERVICE COMPANION CODE ###\n" + pythonScript);
  }
});

// Download Standalone Pi Setup script
app.get("/api/download/standalone-setup", (req, res) => {
  const filePath = path.join(process.cwd(), "pi-standalone-setup.sh");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Disposition", "attachment; filename=pi-standalone-setup.sh");
    res.setHeader("Content-Type", "text/x-sh");
    res.send(fs.readFileSync(filePath));
  } else {
    res.status(404).send("File not found");
  }
});

// Download Standalone Python file
app.get("/api/download/standalone-python", (req, res) => {
  const filePath = path.join(process.cwd(), "standalone_whisplay.py");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Disposition", "attachment; filename=standalone_whisplay.py");
    res.setHeader("Content-Type", "text/x-python");
    res.send(fs.readFileSync(filePath));
  } else {
    res.status(404).send("File not found");
  }
});

// Fetch network interfaces and wireless settings status
app.get("/api/networks/status", (req, res) => {
  res.json({
    ethernet: ethernetInterface,
    wifi: wifiInterface,
    networks: simulatedNetworks
  });
});

// Scan for nearby SSID wifi networks
app.post("/api/networks/scan", (req, res) => {
  setTimeout(() => {
    res.json({
      success: true,
      networks: simulatedNetworks
    });
  }, 800); // simulation lag
});

// Configure or connect to a wifi network ssid
app.post("/api/networks/connect", (req, res) => {
  const { ssid, password } = req.body;
  if (!ssid) {
    return res.status(400).json({ success: false, message: "SSID is required" });
  }

  // Update in-memory status
  simulatedNetworks = simulatedNetworks.map(net => ({
    ...net,
    isConnected: net.ssid === ssid
  }));

  wifiInterface.status = "associated";
  wifiInterface.ipAddress = ssid === "Whisplay_Net_5G" ? "192.168.1.144" : "192.168.1.189";

  res.json({
    success: true,
    message: `Successfully generated wpa_supplicant configuration and established socket link with SSID: ${ssid}`,
    wifi: wifiInterface,
    networks: simulatedNetworks
  });
});

// Toggle ethernet cable plug status
app.post("/api/networks/toggle-ethernet", (req, res) => {
  if (ethernetInterface.status === "connected") {
    ethernetInterface.status = "disconnected";
    ethernetInterface.ipAddress = "No IP linked";
  } else {
    ethernetInterface.status = "connected";
    ethernetInterface.ipAddress = "192.168.1.42";
  }
  res.json({
    success: true,
    ethernet: ethernetInterface
  });
});

// Execute terminal console command simulator
app.post("/api/terminal/execute", (req, res) => {
  const { command } = req.body;
  if (!command) {
    return res.json({ output: "" });
  }

  const cleanCmd = command.trim();
  const parts = cleanCmd.split(" ");
  const baseCmd = parts[0].toLowerCase();

  let output = "";

  switch (baseCmd) {
    case "help":
      output = `Whisplay OS Local Companion Tools Console
Available local commands:
  help                             Show this diagnostic command registry
  uname -a                         Get current running Linux kernel signature
  cat /etc/os-release              View Raspberry Pi OS package details
  vcgencmd measure_temp            Query system temperature sensors
  vcgencmd measure_volts           Read PMIC PiSugar current battery voltages
  ifconfig [or "ip addr"]          Display local dynamic IP mapping details
  iwconfig                         Display wireless adapter SSID binding status
  iwlist wlan0 scan                Trigger live hardware RF spectrum sweep
  free -m                          Check physical dynamic RAM heap usage
  df -h                            Query card partition block storage stats
  aplay -l                         Detect connected I2S Whisplay sound DACs
  ping <ip>                        Test packet transmission pipeline latency
  whoami                           Show current terminal supervisor shell user
`;
      break;

    case "uname":
      output = `Linux raspberrypi 6.1.21-v8+ #1642 SMP PREEMPT Tue Apr 3 14:36:20 UTC 2026 aarch64 GNU/Linux`;
      break;

    case "cat":
      if (parts[1] === "/etc/os-release") {
        output = `PRETTY_NAME="Raspberry Pi OS GNU/Linux 12 (bookworm)"
NAME="Raspberry Pi OS"
VERSION_ID="12"
VERSION="12 (bookworm)"
VERSION_CODENAME=bookworm
ID=raspbian
ID_LIKE=debian
HOME_URL="http://www.raspberrypi.org/"
SUPPORT_URL="http://www.raspberrypi.org/support/"`;
      } else {
        output = `cat: ${parts[1] || ""}: File not found or permission denied. Try cat /etc/os-release`;
      }
      break;

    case "vcgencmd":
      if (parts[1] === "measure_temp") {
        const temp = (38.8 + Math.random() * 6).toFixed(1);
        output = `temp=${temp}'C`;
      } else if (parts[1] === "measure_volts") {
        const volt = (1.18 + Math.random() * 0.1).toFixed(2);
        output = `volt=${volt}V`;
      } else {
        output = `vcgencmd: unknown command parameter. Choose options: 'measure_temp' or 'measure_volts'.`;
      }
      break;

    case "ifconfig":
    case "ip":
      output = `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet ${ethernetInterface.status === "connected" ? ethernetInterface.ipAddress : "---"}  netmask 255.255.255.0  broadcast 192.168.1.255
        ether ${ethernetInterface.mac}  txqueuelen 1000  (Ethernet)
        RX packets 27384  bytes 2408351 (2.2 MiB)
        TX packets 14930  bytes 1839210 (1.7 MiB)

wlan0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet ${wifiInterface.status === "associated" ? wifiInterface.ipAddress : "---"}  netmask 255.255.255.0  broadcast 192.168.1.255
        ether ${wifiInterface.mac}  txqueuelen 1000  (IEEE 802.11 wireless)
        RX packets 91283  bytes 129482103 (123.4 MiB)
        TX packets 80281  bytes 9213710 (8.7 MiB)

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        loop  txqueuelen 1000  (Local Loopback)
`;
      break;

    case "iwconfig":
      if (wifiInterface.status === "associated") {
        const connectedNet = simulatedNetworks.find(n => n.isConnected);
        output = `wlan0     IEEE 802.11  ESSID:"${connectedNet ? connectedNet.ssid : "Whisplay_Net_5G"}"  
          Mode:Managed  Frequency:5.18 GHz  Access Point: B8:27:EB:11:AB:CD   
          Bit Rate=433.3 Mb/s   Tx-Power=31 dBm   
          Retry short limit:7   RTS thr:off   Fragment thr:off
          Power Management:on
          Link Quality=95/100  Signal level=-52 dBm  
          Rx invalid nwid:0  Rx invalid crypt:0  Rx invalid frag:0
          Tx excessive retries:0  Invalid misc:3   Missed beacon:0`;
      } else {
        output = `wlan0     IEEE 802.11  ESSID:off/any  
          Mode:Managed  Access Point: Not-Associated`;
      }
      break;

    case "iwlist":
      output = `wlan0     Scan completed :
          Cell 01 - Address: B8:27:EB:11:AB:CD
                    Channel:36
                    Frequency:5.18 GHz
                    Quality=95/100  Signal level=-52 dBm  
                    Encryption key:on
                    ESSID:"Whisplay_Net_5G"
          Cell 02 - Address: C4:A2:FD:22:98:EF
                    Channel:1
                    Frequency:2.412 GHz
                    Quality=78/100  Signal level=-61 dBm  
                    Encryption key:on
                    ESSID:"Home_WiFi_Secure"
          Cell 03 - Address: D8:15:3A:44:E2:BC
                    Channel:6
                    Frequency:2.437 GHz
                    Quality=62/100  Signal level=-70 dBm  
                    Encryption key:off
                    ESSID:"RPi_Hotspot"`;
      break;

    case "free":
      output = `               total        used        free      shared  buff/cache   available
Mem:            3792         683        2144          12         964        3012
Swap:            100           0         100`;
      break;

    case "df":
      output = `Filesystem      Size  Used Avail Use% Mounted on
/dev/root        29G  4.2G   24G  15% /
devtmpfs        1.8G     0  1.8G   0% /dev
tmpfs           1.9G     0  1.9G   0% /dev/shm
tmpfs           759M  1.2M  758M   1% /run
tmpfs           5.0M  4.0K  5.0M   1% /run/lock`;
      break;

    case "aplay":
    case "arecord":
      output = `**** List of PLAYBACK Hardware Devices ****
card 0: bcm2835 [bcm2835 ALSA], device 0: bcm2835 ALSA [bcm2835 ALSA]
card 1: WhisplayDAC [Whisplay I2S Soundboard], device 0: Whisplay Audio (*)
  Subdevices: 1/1
  Subdevice #0: subdevice #0`;
      break;

    case "ping":
      const host = parts[1] || "1.1.1.1";
      output = `PING ${host} (${host}) 56(84) bytes of data.
64 bytes from ${host}: icmp_seq=1 ttl=54 time=14.2 ms
64 bytes from ${host}: icmp_seq=2 ttl=54 time=15.1 ms
64 bytes from ${host}: icmp_seq=3 ttl=54 time=13.8 ms

--- ${host} ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2003ms
rtt min/avg/max/mdev = 13.841/14.382/15.115/0.531 ms`;
      break;

    case "whoami":
      output = `pi`;
      break;

    case "ls":
      output = `Desktop/  Downloads/  whisplay-console/  whisplay_memos/  standalone_whisplay.py  whisplay_service.py  wpa_supplicant.conf`;
      break;

    default:
      if (cleanCmd.startsWith("sudo ")) {
        output = `[sudo] password for pi: ********
Executing system processes. Log written to system daemon successfully.`;
      } else {
        output = `bash: ${cleanCmd}: command not found. Type 'help' to see available Pi diagnostics.`;
      }
  }

  res.json({ output });
});

// Setup Vite Dev server or production routing
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Whisplay Controller Backend] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
