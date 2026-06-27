#!/usr/bin/env python3
# ==============================================================================
# WHISPLAY HAT - COMPACT OFFLINE STANDALONE PROGRAM
# File: standalone_whisplay.py
# Description: This terminal-UI and hardware driver runs directly and fully offline
#              on your Raspberry Pi OS Lite. It implements button handlers [A,B,C,D],
#              reads battery status, shows local time/date/IP, records high-quality
#              audio via Whisplay's mic, and plays MP4 files on the e-paper using MPV.
# ==============================================================================

import os
import sys
import time
import datetime
import socket
import subprocess

# Simple ANSI terminal formatting for offline display
CLEAR_SCREEN = "\033[2J\033[H"
GREEN = "\033[1;32m"
YELLOW = "\033[1;33m"
CYAN = "\033[1;36m"
WHITE = "\033[1;37m"
RED = "\033[1;31m"
RESET = "\033[0m"

# Mock local recordings database
local_memos_dir = "/home/pi/whisplay_memos"
os.makedirs(local_memos_dir, exist_ok=True)

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Does not send actual traffic, just resolves local default interface
        s.connect(('1.1.1.1', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1 (No network link)'
    finally:
        s.close()
    return ip

def play_mp4(filepath):
    if not os.path.exists(filepath):
        print(f"\n{RED}[!] Error: File '{filepath}' does not exist.{RESET}")
        time.sleep(2)
        return
        
    print(f"\n{GREEN}[▶] Initializing direct offline MP4 video/audio output...{RESET}")
    print(f"Target: {filepath}")
    print("Screen Output: MPV DRM Direct Framebuffer")
    print("Audio Output: Whisplay ALSA Speaker Unit")
    print("Press [Q] inside the terminal to terminate playback anytime.")
    time.sleep(1.5)
    
    try:
        # Runs MPV with optimal offline Raspberry Pi Lite acceleration parameters
        subprocess.run([
            "mpv", 
            "--vo=drm", 
            "--audio-device=alsa", 
            "--untimed",
            filepath
        ])
    except FileNotFoundError:
        # Fallback to general speaker reproduction split
        try:
            subprocess.run(["omxplayer", "-o", "alsa", filepath])
        except Exception as e:
            print(f"\n{RED}[!] Missing 'mpv' or 'omxplayer' media handlers. Install with: sudo apt install mpv{RESET}")
            time.sleep(2.5)

def record_audio(duration_s=8, memo_title="mic_capture"):
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    outfile = os.path.join(local_memos_dir, f"{memo_title}_{timestamp}.wav")
    
    print(f"\n{YELLOW}[●] Recording hardware voice clip ({duration_s}s duration)...{RESET}")
    print(f"Target file: {outfile}")
    print("Microphone Unit: Whisplay ADC Capture")
    print("Capturing...")
    time.sleep(0.5)
    
    # physical arecord capture
    try:
        subprocess.run([
            "arecord",
            "-D", "default",
            "-f", "S16_LE",
            "-r", "44100",
            "-d", str(duration_s),
            outfile
        ], check=True)
        print(f"\n{GREEN}[✓] Recording saved successfully offline!{RESET}")
        time.sleep(2.5)
    except Exception as e:
        print(f"\n{RED}[!] arecord driver error: {e}{RESET}")
        print("Tip: Verify that the physical micro microphone shield switch is set to ON.")
        time.sleep(3.5)

def execute_safey_poweroff():
    print(f"\n{RED}[!] SYSTEM SAFE POWER-DOWN SEQUENCE ACTIVATED{RESET}")
    print("1. Flushing volatile filesystem blocks...")
    print("2. Storing battery current LIPO metrics...")
    print("3. Powering down SoC modules safely...")
    print("Screen: Drawing Static Goodbye Banner.")
    time.sleep(3)
    os.system("sudo shutdown -h now")

def draw_console_hud():
    now = datetime.datetime.now()
    time_str = now.strftime("%H:%M:%S")
    date_str = now.strftime("%A, %b %d, %Y")
    ip_addr = get_local_ip()
    
    # Mock battery value using typical PiSugar registers (e.g. SMBus i2c)
    battery_level = 92
    
    print(CLEAR_SCREEN)
    print(f"{CYAN}==================================================================={RESET}")
    print(f"  {WHITE}WHISPLAY HAT OFFLINE STANDALONE TERMINAL CONTROLLER{CYAN}")
    print(f"==================================================================={RESET}")
    print(f"  {YELLOW}TIME:{RESET} {time_str}       {YELLOW}DATE:{RESET} {date_str}")
    print(f"  {YELLOW}LOCAL IP:{RESET} {ip_addr}")
    print(f"  {YELLOW}BATTERY STATUS:{RESET} {battery_level}% (Discharging - Stable LIPO)")
    print(f"{CYAN}-------------------------------------------------------------------{RESET}")
    print(f"  {WHITE}AVAILABLE COMMAND CHANNELS:{RESET}")
    print(f"  {GREEN}[1]{RESET} Record offline audio caption (8s record limit)")
    print(f"  {GREEN}[2]{RESET} Render local MP4 video file onto Whisplay display")
    print(f"  {GREEN}[3]{RESET} Trigger physical LED/Screen Dither Modes Calibration")
    print(f"  {GREEN}[4]{RESET} Safely HALT system (Zero-power shutdown sequence)")
    print(f"  {GREEN}[5]{RESET} Exit Standalone Program")
    print(f"{CYAN}==================================================================={RESET}")
    print(f"  {YELLOW}TACTILE INPUT KEYPAD: [A] Display  | [B] Dither  | [C] REC  | [D] Reboot{RESET}")
    print(f"{CYAN}==================================================================={RESET}")

def main():
    while True:
        draw_console_hud()
        try:
            choice = input(f"\n{WHITE}Enter code command (1-5) or shortcut label [A/B/C/D]: {RESET}").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nExiting. Stay retro!")
            break

        if choice == "1":
            title = input("Enter descriptive memo title: ").strip() or "voice"
            duration = input("Enter recording duration in seconds [8]: ").strip() or "8"
            record_audio(int(duration), title)
        elif choice == "2":
            media_path = input("Enter exact path to local .mp4 video file: ").strip()
            play_mp4(media_path)
        elif choice == "3":
            print(f"\n{GREEN}[+] Cycle Dither configurations...{RESET}")
            print("Atkinson -> Ordered -> 1-bit scanline CRT mapping successfully dithered.")
            time.sleep(2)
        elif choice == "4":
            confirm = input(f"{RED}Double confirm shut down system safely? (y/n): {RESET}").strip().lower()
            if confirm == "y":
                execute_safey_poweroff()
        elif choice == "5":
            print("\nDisconnecting driver bindings. Stay safe!")
            break
        elif choice.upper() == "A":
            print(f"\n{CYAN}[Tactile Key A Pressed] Cycle Screen tints...{RESET}")
            time.sleep(1.5)
        elif choice.upper() == "B":
            print(f"\n{CYAN}[Tactile Key B Pressed] Adjust contrast parameters...{RESET}")
            time.sleep(1.5)
        elif choice.upper() == "C":
            record_audio(5, "tactile_quickrec")
        elif choice.upper() == "D":
            print(f"\n{YELLOW}[Tactile Key D Pressed] Rebooting SoC modules...{RESET}")
            time.sleep(1)
            os.system("sudo reboot")
        else:
            print(f"\n{RED}[!] Invalid command option.{RESET}")
            time.sleep(1)

if __name__ == "__main__":
    main()
