import React, { useState, useEffect, useRef } from "react";
import {
  Monitor,
  FolderOpen,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Mic,
  Trash2,
  Download,
  Power,
  RotateCcw,
  FileCheck,
  Cpu,
  Thermometer,
  Zap,
  Clock,
  Wifi,
  Copy,
  Info,
  Sliders,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Upload,
  BatteryCharging,
  Settings,
  Flame,
  CheckCircle2,
  Keyboard,
  Terminal
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Types
interface Recording {
  id: string;
  name: string;
  date: string;
  duration: string;
  size: string;
  audioData: string; // Base64 data URI
}

interface MediaFile {
  id: string;
  name: string;
  uploadedAt: string;
  size: string;
  duration: string;
  isPreset: boolean;
  url: string;
}

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
      art: "SYSTEM HALTED SAFELY.\n=====================\nPowering down SoC...\nBattery entering sleep...\nGoodbye.",
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

export default function App() {
  // System State Sync
  const [systemState, setSystemState] = useState<"booting" | "active" | "shutting_down" | "halted">("booting");
  const [sysMetrics, setSysMetrics] = useState({
    time: "",
    date: "",
    ipAddress: "192.168.1.144",
    batteryPercent: 88,
    isCharging: true,
    cpuLoad: 3,
    tempC: 41.2,
    ramUsage: 18.4,
    currentBootSplash: "Cyberpunk Pi Sugar",
    currentShutdownSplash: "System Halted",
    shutdownProgress: 0,
    bootProgress: 100
  });

  // Client Display Preferences
  const [displayTheme, setDisplayTheme] = useState<"eink" | "amber" | "matrix" | "cyber">("amber");
  const [ditherMode, setDitherMode] = useState<"threshold" | "ordered" | "crt" | "pixel">("crt");
  const [screenContrast, setScreenContrast] = useState<number>(75);
  const [screenBrightness, setScreenBrightness] = useState<number>(90);
  const [activeConsoleLog, setActiveConsoleLog] = useState<string[]>([]);

  // Media Playback State
  const [mediaList, setMediaList] = useState<MediaFile[]>([]);
  const [activeMedia, setActiveMedia] = useState<MediaFile | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [videoProgress, setVideoProgress] = useState<number>(0); // Percentage
  const [videoDuration, setVideoDuration] = useState<number>(10); // Standard demo duration
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [mediaVolume, setMediaVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  
  // Local video reader elements
  const videoFileRef = useRef<HTMLInputElement>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const virtualCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Recording State
  const [recordingsList, setRecordingsList] = useState<Recording[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recDuration, setRecDuration] = useState<number>(0);
  const [customRecName, setCustomRecName] = useState<string>("");
  const [audioInputLevel, setAudioInputLevel] = useState<number>(0);
  
  // Real Mic Elements
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const speechIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pulseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Splash Customizer
  const [bootTextArt, setBootTextArt] = useState<string>(
    "PISUGAR WHISPLAY\n==================\n[SYS] CORE_OK\n[BAT] 3.82V_OK\n[NET] WLAN0_ACTIVE\n[DSP] E-INK_OK\n=================="
  );
  const [shutdownTextArt, setShutdownTextArt] = useState<string>(
    "SYSTEM HALTED SAFELY.\n=====================\nPowering down SoC...\nBattery entering sleep...\nGoodbye."
  );
  const [selectedBootPreset, setSelectedBootPreset] = useState<string>("cyberpunk");
  const [selectedShutdownPreset, setSelectedShutdownPreset] = useState<string>("halted");
  const [customSplashFile, setCustomSplashFile] = useState<string | null>(null);
  const [fileNotification, setFileNotification] = useState<string | null>(null);

  // Copy helper
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Standalone offline guide tab state
  const [offlineTab, setOfflineTab] = useState<"node-fullstack" | "python-terminal">("node-fullstack");

  // Terminal mode state
  const [isTerminalMode, setIsTerminalMode] = useState<boolean>(false);
  const [terminalInput, setTerminalInput] = useState<string>("");
  const [terminalHistory, setTerminalHistory] = useState<{ type: "input" | "output"; text: string }[]>([
    { type: "output", text: "WHISPLAY RETRO LINUX KERNEL SERVICE BOOT COMPLETED." },
    { type: "output", text: "Bluetooth & USB Keyboard modules detected. Input device standard: generic." },
    { type: "output", text: "Type 'help' and press [Enter] to query physical hardware registries." }
  ]);

  // Wifi and Ethernet states
  const [networksList, setNetworksList] = useState<{ ssid: string; signal: number; security: string; isConnected: boolean }[]>([]);
  const [ethernetInterface, setEthernetInterface] = useState<{ interface: string; status: string; ipAddress: string; mac: string }>({
    interface: "eth0", status: "connected", ipAddress: "192.168.1.42", mac: "b8:27:eb:11:22:33"
  });
  const [wifiInterface, setWifiInterface] = useState<{ interface: string; status: string; ipAddress: string; mac: string }>({
    interface: "wlan0", status: "associated", ipAddress: "192.168.1.144", mac: "b8:27:eb:44:55:66"
  });
  const [isScanningWifi, setIsScanningWifi] = useState<boolean>(false);
  const [selectedSsid, setSelectedSsid] = useState<string>("");
  const [wifiPassword, setWifiPassword] = useState<string>("");
  const [keyboardStatusActive, setKeyboardStatusActive] = useState<boolean>(true);

  // Setup sample audio variables fallback
  const simulatedAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sync Timer for overall system metrics polling
  useEffect(() => {
    let timer = setInterval(() => {
      fetchSystemStatus();
    }, 2000);

    fetchSystemStatus();
    fetchRecordings();
    fetchMedia();
    fetchNetworkStatus();

    return () => clearInterval(timer);
  }, []);

  // Set local state timers or boot transitions
  useEffect(() => {
    if (systemState === "booting") {
      const logs = [
        "Initializing ARM Cortex-A53 processor...",
        "Memory: 412M / 512M active, OS: Lite Node v1",
        "Loading Broadcom BCM2837 SoC drivers...",
        "Power unit: PiSugar LIPO Hat linked successfully",
        "[ OK ] Battery status read: 88% stability bound",
        "Loading systemd-modules-load.service...",
        "Mounting /dev/mmcblk0p2 virtual local storage...",
        "Loading Whisplay ST7789 240x280 Color LCD driver...",
        "[ OK ] Whisplay 240x280 Color LCD frame buffer active.",
        "Initializing Whisplay Audio Shield (ALSA)...",
        "[ OK ] Speaker hat and Microphone synced.",
        "[ OK ] Local Host Socket: 192.168.1.144",
        "Connecting to Control Station backend gateway...",
        "[ OK ] Controller Bridge Online."
      ];

      setActiveConsoleLog([]);
      let logIndex = 0;
      const logTimer = setInterval(() => {
        if (logIndex < logs.length) {
          setActiveConsoleLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${logs[logIndex]}`]);
          logIndex++;
        } else {
          clearInterval(logTimer);
          setSystemState("active");
        }
      }, 350);

      return () => clearInterval(logTimer);
    }
  }, [systemState]);

  // Handle active audio wave when playing recording or synthesizing sounds
  const [audioPlaybackLevel, setAudioPlaybackLevel] = useState<number>(0);
  useEffect(() => {
    let playTimer: NodeJS.Timeout | null = null;
    if (isPlaying && systemState === "active") {
      playTimer = setInterval(() => {
        setAudioPlaybackLevel(Math.floor(Math.random() * 85) + 15);
      }, 100);
    } else {
      setAudioPlaybackLevel(0);
    }
    return () => {
      if (playTimer) clearInterval(playTimer);
    };
  }, [isPlaying, systemState]);

  // Live clock and dates variables
  const formatTime = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };
  const formatDate = () => {
    const d = new Date();
    return d.toLocaleDateString([], { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  };

  // Pull API data
  const fetchSystemStatus = async () => {
    try {
      const r = await fetch("/api/system-status");
      const d = await r.json();
      setSysMetrics(prev => ({
        ...prev,
        ...d,
        time: d.time || formatTime(),
        date: d.date || formatDate()
      }));

      // Map backend systemState if required
      if (d.state && d.state !== systemState) {
        // If server triggered shutdown we align state
        if (d.state === "shutting_down" || d.state === "halted") {
          setSystemState(d.state);
        }
      }
    } catch (e) {
      // Fallback state on network failures
      setSysMetrics(prev => ({
        ...prev,
        time: formatTime(),
        date: formatDate()
      }));
    }
  };

  const fetchRecordings = async () => {
    try {
      const r = await fetch("/api/recordings");
      const d = await r.json();
      if (d.recordings) {
        setRecordingsList(d.recordings);
      }
    } catch (e) {
      console.warn("Could not load recordings standard database API:", e);
    }
  };

  const fetchMedia = async () => {
    try {
      const r = await fetch("/api/media");
      const d = await r.json();
      if (d.media) {
        setMediaList(d.media);
      }
    } catch (e) {
      console.warn("Could not load media files listing:", e);
    }
  };

  const fetchNetworkStatus = async () => {
    try {
      const r = await fetch("/api/networks/status");
      const d = await r.json();
      if (d) {
        setEthernetInterface(d.ethernet);
        setWifiInterface(d.wifi);
        setNetworksList(d.networks);
      }
    } catch (e) {
      console.warn("Could not load network statuses:", e);
    }
  };

  const scanWifiNetworks = async () => {
    setIsScanningWifi(true);
    try {
      const r = await fetch("/api/networks/scan", { method: "POST" });
      const d = await r.json();
      if (d.success) {
        setNetworksList(d.networks);
        addTerminalLine("[RF_SWEEP] Live 802.11 scan completed. Spectrum updated in control cache.", "output");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanningWifi(false);
    }
  };

  const connectWifiNetwork = async (ssid: string) => {
    if (!ssid) return;
    try {
      const r = await fetch("/api/networks/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssid, password: wifiPassword })
      });
      const d = await r.json();
      if (d.success) {
        setWifiInterface(d.wifi);
        setNetworksList(d.networks);
        setWifiPassword("");
        setSelectedSsid("");
        addTerminalLine(`[NET_CONNECT] Associated successfully with network: ${ssid}. IP resolved: ${d.wifi.ipAddress}`, "output");
        fetchSystemStatus();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleEthernetCable = async () => {
    try {
      const r = await fetch("/api/networks/toggle-ethernet", { method: "POST" });
      const d = await r.json();
      if (d.success) {
        setEthernetInterface(d.ethernet);
        addTerminalLine(`[NET_CARRIER] Ethernet state toggled. Carrier links: ${d.ethernet.status.toUpperCase()}`, "output");
        fetchSystemStatus();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTerminalSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput;
    setTerminalInput("");
    addTerminalLine(`pi@whisplay:~$ ${cmd}`, "input");

    try {
      const r = await fetch("/api/terminal/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd })
      });
      const d = await r.json();
      addTerminalLine(d.output, "output");
    } catch (err) {
      addTerminalLine(`bash: command execution failure. Bridge interface offline.`, "output");
    }
  };

  const addTerminalLine = (text: string, type: "input" | "output") => {
    setTerminalHistory(prev => [...prev, { type, text }]);
  };

  // Safe Shutdown Control Action
  const handleShutdown = async () => {
    if (confirm("Execute safe software halt sequence? This flushes flash operations and places the Whisplay power controller in sleep mode.")) {
      try {
        setSystemState("shutting_down");
        const r = await fetch("/api/shutdown", { method: "POST" });
        const d = await r.json();
        // The server manages simulated progress down
        let step = 0;
        const progressTimer = setInterval(() => {
          step += 10;
          setSysMetrics(prev => ({ ...prev, shutdownProgress: step }));
          if (step >= 100) {
            clearInterval(progressTimer);
            setSystemState("halted");
          }
        }, 300);
      } catch (e) {
        setSystemState("halted");
      }
    }
  };

  // Reboot Target Action
  const handleReboot = async () => {
    try {
      setSystemState("booting");
      await fetch("/api/reboot", { method: "POST" });
    } catch (e) {
      // Direct client retry
      setSystemState("booting");
    }
  };

  // Copy text utility helper
  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  // Real browser client microphone recorder
  const startRecordingInput = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          // Save with descriptive metadata
          const recName = customRecName.trim() || `Whisplay Mic Capture ${recordingsList.length + 1}`;
          const fileSizeKb = Math.round((audioBlob.size / 1024) * 10) / 10;
          const calculatedDuration = recDuration ? `${recDuration}s` : "4.5s";

          try {
            await fetch("/api/recordings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: recName,
                duration: calculatedDuration,
                size: `${fileSizeKb} KB`,
                audioData: base64Data
              })
            });
            fetchRecordings();
            setCustomRecName("");
          } catch (e) {
            console.error("Save failed:", e);
          }
        };
      };

      // Set up simple live canvas mic analyzer
      if (typeof window !== "undefined") {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioCtx();
        audioContextRef.current = audioContext;
        
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        speechIntervalRef.current = setInterval(() => {
          if (analyserRef.current) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((src, val) => src + val, 0);
            const avg = sum / dataArray.length;
            setAudioInputLevel(Math.min(100, Math.floor(avg * 1.5)));
          }
        }, 80);
      }

      mediaRecorder.start();
      setIsRecording(true);
      setRecDuration(0);

      if (pulseTimerRef.current) clearInterval(pulseTimerRef.current);
      pulseTimerRef.current = setInterval(() => {
        setRecDuration(prev => prev + 1);
      }, 1000);

    } catch (e: any) {
      alert("Microphone connection denied or unavailable. Grant microphone permissions in the frame/browser to test physical audio logging.");
      console.error(e);
    }
  };

  const stopRecordingInput = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);

    if (pulseTimerRef.current) clearInterval(pulseTimerRef.current);
    if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);

    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setAudioInputLevel(0);
  };

  const handleDeleteRecording = async (id: string) => {
    try {
      await fetch(`/api/recordings/${id}`, { method: "DELETE" });
      fetchRecordings();
    } catch (e) {
      setRecordingsList(prev => prev.filter(rec => rec.id !== id));
    }
  };

  // Play target recording
  const handlePlayRecording = (recording: Recording) => {
    if (simulatedAudioRef.current) {
      simulatedAudioRef.current.pause();
    }

    if (recording.audioData) {
      const audio = new Audio(recording.audioData);
      simulatedAudioRef.current = audio;
      audio.play();

      setIsPlaying(true);
      setActiveMedia({
        id: recording.id,
        name: recording.name,
        uploadedAt: "Voice Rec",
        duration: recording.duration,
        size: recording.size,
        isPreset: false,
        url: ""
      });

      audio.onended = () => {
        setIsPlaying(false);
        setActiveMedia(null);
      };
    } else {
      // Simulate playback tone of empty recordings
      const synthTone = () => {
        if (typeof window !== "undefined") {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = "sine";
          osc.frequency.setValueAtTime(440, ctx.currentTime); // Standard 440hz Tone
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          gain.gain.setValueAtTime(0.001, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
          
          osc.start();
          osc.stop(ctx.currentTime + 1.5);
        }
      };

      synthTone();
      setIsPlaying(true);
      setActiveMedia({
        id: recording.id,
        name: recording.name + " [Tone Simulation]",
        uploadedAt: "Local Synth",
        duration: "1.5s",
        size: "10 KB",
        isPreset: false,
        url: ""
      });

      setTimeout(() => {
        setIsPlaying(false);
        setActiveMedia(null);
      }, 1500);
    }
  };


  // --- MEDIA PLAYER VIDEO PROCESSING (COLOR LCD CRUNCHER) ---
  
  // Choose or Upload user local .mp4 file
  const handleUploadVideoClick = () => {
    if (videoFileRef.current) {
      videoFileRef.current.click();
    }
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        alert("Please upload a valid .mp4 or similar video file.");
        return;
      }

      setFileNotification(`Parsing format: ${file.name}`);

      // Create local URL for direct zero-latency sandbox rendering
      const localFileUrl = URL.createObjectURL(file);
      
      const newMediaItem: MediaFile = {
        id: `media_${Date.now()}`,
        name: file.name,
        uploadedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        size: `${Math.round((file.size / 1024 / 1024) * 100) / 100} MB`,
        isPreset: false,
        duration: "Active",
        url: localFileUrl
      };

      // Push to backend
      try {
        await fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            size: newMediaItem.size,
            duration: "Dynamic"
          })
        });
        fetchMedia();
      } catch (err) {
        // Fallback local pushes
        setMediaList(prev => [newMediaItem, ...prev]);
      }

      // Automatically play uploaded file
      setFileNotification(null);
      handlePlayVideo(newMediaItem);
    }
  };

  // Play Selected Video
  const handlePlayVideo = (media: MediaFile) => {
    if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
    
    // Stop any physical playbacks
    if (simulatedAudioRef.current) {
      simulatedAudioRef.current.pause();
    }

    setActiveMedia(media);
    setIsPlaying(true);
    setVideoProgress(0);
    setVideoCurrentTime(0);

    // Initializing direct browser video player context
    if (typeof window !== "undefined") {
      let videoEl = videoElementRef.current;
      if (!videoEl) {
        videoEl = document.createElement("video");
        videoEl.crossOrigin = "anonymous";
        videoEl.loop = true;
        videoEl.playsInline = true;
        videoEl.muted = isMuted;
        videoElementRef.current = videoEl;
      }

      // If preset target, load a procedural preset visuals or abstract canvas pattern
      if (media.isPreset || !media.url) {
        // Set simulated audio wave pattern
        videoDurationRef.current = 15;
        playProceduralVisualLoop();
      } else {
        videoEl.src = media.url;
        videoEl.volume = mediaVolume / 100;
        videoEl.muted = isMuted;
        
        videoEl.onloadedmetadata = () => {
          setVideoDuration(videoEl!.duration || 10);
          videoDurationRef.current = videoEl!.duration || 10;
        };

        videoEl.play().catch(err => {
          console.warn("Video autoplay failed, playing procedurally:", err);
          playProceduralVisualLoop();
        });

        // Run rendering frames sequence
        runVideoFrameLoop();
      }
    }
  };

  const videoDurationRef = useRef<number>(10);

  const playProceduralVisualLoop = () => {
    let tickCount = 0;
    const dur = 15;
    setVideoDuration(dur);

    playbackIntervalRef.current = setInterval(() => {
      tickCount += 0.1;
      setVideoCurrentTime(Number(tickCount.toFixed(1)));
      setVideoProgress((tickCount / dur) * 100);

      // Render custom matrix math animations onto procedural Color LCD canvas simulator
      renderProceduralFrame(tickCount);

      if (tickCount >= dur) {
        tickCount = 0; // Loop around
      }
    }, 100);
  };

  const runVideoFrameLoop = () => {
    const video = videoElementRef.current;
    if (!video) return;

    playbackIntervalRef.current = setInterval(() => {
      if (video.paused || video.ended) {
        // Render current active layout if paused
        return;
      }

      const currTime = video.currentTime;
      const progress = (currTime / video.duration) * 100;
      setVideoCurrentTime(Number(currTime.toFixed(1)));
      setVideoProgress(progress);

      // Raw frame dump to pixel canvas
      renderVideoFrameToEInk(video);
    }, 60); // ~15-18 FPS retro screen target
  };

  // Convert raw video frames into gorgeous high-fidelity 1-bit or color LCD dither preview
  const renderVideoFrameToEInk = (video: HTMLVideoElement) => {
    const canvas = virtualCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 240;
    const height = 280;

    // Draw raw video scaled to 240x280 ratio
    ctx.drawImage(video, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    applyIndustrialDitherFilter(data, width, height);
    ctx.putImageData(imgData, 0, 0);
  };

  // Renders beautiful, fully local math equations, digital matrix text, or audio waves
  // in case external video has CORS, or for immediate preset display inside 240x280 pixels
  const renderProceduralFrame = (tick: number) => {
    const canvas = virtualCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 240;
    const height = 280;

    // Clear Screen Canvas
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    if (activeMedia?.id === "media_1") {
      // Cyberpunk Digital clock animation
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(8, 8, width - 16, height - 16);

      // Multiple harmonic dynamic waves
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const y = 190 + Math.sin(x * 0.05 + tick * 3) * 15;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.strokeStyle = "#ff00a0";
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const y = 210 + Math.cos(x * 0.04 + tick * 1.8) * 10;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Custom time rendering
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px monospace";
      const hours = Math.floor(tick * 1.5) % 24;
      const minutes = Math.floor(tick * 15) % 60;
      const formatted = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${Math.floor(tick * 100 % 60).toString().padStart(2, "0")}`;
      ctx.fillText(formatted, 38, 90);

      // Subtitles
      ctx.font = "11px monospace";
      ctx.fillStyle = "#ffaa00";
      ctx.fillText("WHISPLAY LCD V-CORE", 55, 130);
      
      ctx.fillStyle = "#888888";
      ctx.font = "9px monospace";
      ctx.fillText("COLOR LCD RES: 240x280", 60, 155);

    } else if (activeMedia?.id === "media_2") {
      // Cascading Matrix Digital Rain at 240x280 scale
      ctx.fillStyle = "#39ff14";
      ctx.font = "11px monospace";
      
      for (let col = 0; col < 24; col++) {
        const xPos = col * 10 + 6;
        const speed = (col % 5) + 1.5;
        const offset = (tick * speed * 15) % 260;
        
        ctx.fillText(String.fromCharCode(33 + Math.floor(Math.random() * 90)), xPos, offset);
        ctx.fillText(String.fromCharCode(33 + Math.floor(Math.random() * 90)), xPos, (offset - 30 < 0) ? offset + 220 : offset - 30);
      }
      
      // Horizontal active status bar
      ctx.fillStyle = "#000000";
      ctx.fillRect(20, 110, 200, 45);
      ctx.strokeStyle = "#39ff14";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(20, 110, 200, 45);
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px monospace";
      ctx.fillText("MATRIX OVERRIDE", 60, 137);

    } else {
      // Symmetrical rich audio waveform
      ctx.strokeStyle = "#ff007f";
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const factor = Math.sin(x * 0.06) * Math.cos(x * 0.015 + tick);
        const y = 140 + factor * (45 + Math.abs(Math.sin(tick * 2)) * 35);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Grid dots background
      ctx.fillStyle = "#444444";
      for (let i = 0; i < width; i += 20) {
        for (let j = 0; j < height; j += 20) {
          ctx.fillRect(i, j, 1.5, 1.5);
        }
      }

      ctx.fillStyle = "#00ffff";
      ctx.font = "bold 13px monospace";
      ctx.fillText("LIVE AUDIO WAVE", 65, 230);
    }

    // Apply dither filter to render dithered/color look
    const imgData = ctx.getImageData(0, 0, width, height);
    applyIndustrialDitherFilter(imgData.data, width, height);
    ctx.putImageData(imgData, 0, 0);
  };

  // Atkinson/Ordered / Phosphor CRT shader simulation
  const applyIndustrialDitherFilter = (data: Uint8ClampedArray, width: number, height: number) => {
    const contrastVal = (screenContrast - 50) * 3; // map -75 to 150
    const factor = (259 * (contrastVal + 255)) / (255 * (259 - contrastVal));
    const brightnessOffset = screenBrightness - 90;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        
        let r = data[i];
        let g = data[i+1];
        let b = data[i+2];

        // 1. Grayscale Conversion
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;

        // 2. Brightness adjust
        gray = gray + brightnessOffset;

        // 3. Contrast adjustment
        gray = factor * (gray - 128) + 128;
        gray = Math.max(0, Math.min(255, gray));

        // 4. Apply selected layout visual dither shader
        if (ditherMode === "threshold") {
          // Simple 1-bit solid split
          const val = gray > 120 ? 255 : 0;
          data[i] = val;
          data[i+1] = val;
          data[i+2] = val;
        } else if (ditherMode === "ordered") {
          // 4x4 Bayer Dithering Matrix calculation
          const bayer = [
            [  0, 128,  32, 160 ],
            [ 192,  64, 224,  96 ],
            [  48, 176,  16, 144 ],
            [ 240, 112, 208,  80 ]
          ];
          const bx = x % 4;
          const by = y % 4;
          const threshold = bayer[by][bx];
          const val = gray > threshold ? 255 : 0;
          data[i] = val;
          data[i+1] = val;
          data[i+2] = val;
        } else if (ditherMode === "crt") {
          // Simulated Phosphor scanline dots
          const pixelDense = y % 2 === 0 ? 0.35 : 1.0;
          let val = gray > 110 ? 255 : 0;
          val = val * pixelDense;
          
          data[i] = val;
          data[i+1] = val;
          data[i+2] = val;
        } else {
          // Retro pixel blockiness mode (No active dither split, downsampled grayscale)
          const pxVal = Math.floor(gray / 32) * 32;
          data[i] = pxVal;
          data[i+1] = pxVal;
          data[i+2] = pxVal;
        }
      }
    }
  };

  const handlePauseVideo = () => {
    setIsPlaying(false);
    if (videoElementRef.current) {
      videoElementRef.current.pause();
    }
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
    }
  };

  const handleStopVideo = () => {
    setIsPlaying(false);
    setActiveMedia(null);
    setVideoProgress(0);
    setVideoCurrentTime(0);
    if (videoElementRef.current) {
      videoElementRef.current.pause();
      videoElementRef.current.currentTime = 0;
    }
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    setMediaVolume(vol);
    if (videoElementRef.current) {
      videoElementRef.current.volume = vol / 100;
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoElementRef.current) {
      videoElementRef.current.muted = nextMuted;
    }
  };


  // --- SPLASH THEME CONFIGS ---
  const handleBootPresetChange = (presetId: string) => {
    setSelectedBootPreset(presetId);
    const matched = splashPresets.boot.find(p => p.id === presetId);
    if (matched) {
      setBootTextArt(matched.art);
      saveSplashConfig(matched.name, undefined);
    }
  };

  const handleShutdownPresetChange = (presetId: string) => {
    setSelectedShutdownPreset(presetId);
    const matched = splashPresets.shutdown.find(p => p.id === presetId);
    if (matched) {
      setShutdownTextArt(matched.art);
      saveSplashConfig(undefined, matched.name);
    }
  };

  const saveSplashConfig = async (bootName?: string, shutName?: string) => {
    try {
      await fetch("/api/splash/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bootTheme: bootName || sysMetrics.currentBootSplash,
          shutdownTheme: shutName || sysMetrics.currentShutdownSplash
        })
      });
      fetchSystemStatus();
    } catch (e) {
      console.warn("Could not sync splash screen configuration to real server endpoint:", e);
    }
  };


  // --- PHYSICAL DIRECT HARDWARE SIDE BUTTON ---
  // Replicates the sole physical custom action button on the PiSugar Whisplay HAT
  const pressHardwareButton = (pressType: "single" | "double" | "long") => {
    const synthBeep = (freq: number, duration = 0.15) => {
      if (typeof window !== "undefined") {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration - 0.05);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      }
    };

    if (pressType === "single") {
      synthBeep(880, 0.12); // Quick chirp
      // Toggle display tint option sequentially
      const themes: ("eink" | "amber" | "matrix" | "cyber")[] = ["eink", "amber", "matrix", "cyber"];
      const currIdx = themes.indexOf(displayTheme);
      const nextIdx = (currIdx + 1) % themes.length;
      setDisplayTheme(themes[nextIdx]);
      addTerminalLine(`[PISUGAR_BUTTON] Single-click detected -> Cycle Phosphor Tint: ${themes[nextIdx].toUpperCase()}`, "output");
    } else if (pressType === "double") {
      synthBeep(520, 0.2); // Double beep tone
      setTimeout(() => synthBeep(660, 0.15), 100);
      // Trigger instant sample audio mic record test
      if (!isRecording) {
        startRecordingInput();
        addTerminalLine(`[PISUGAR_BUTTON] Double-click detected -> Starting Mic audio dump capture...`, "output");
      } else {
        stopRecordingInput();
        addTerminalLine(`[PISUGAR_BUTTON] Double-click detected -> Audio dump compiled & saved on FAT32 partition.`, "output");
      }
    } else if (pressType === "long") {
      synthBeep(330, 0.45); // Safe power off long warning beep
      addTerminalLine(`[PISUGAR_BUTTON] Long-press detected -> Initiating safe OS kernel halt...`, "output");
      handleShutdown();
    }
  };

  // Keyboard Hotkey bindings for USB or Bluetooth keyboards
  useEffect(() => {
    if (!keyboardStatusActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering shortcuts if user is typing in any text inputs or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" || 
        target.tagName === "TEXTAREA" || 
        target.isContentEditable ||
        target.closest("form")
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      
      // Map keys to controls:
      if (key === "s") {
        pressHardwareButton("single");
      } else if (key === "r") {
        pressHardwareButton("double");
      } else if (key === "h") {
        pressHardwareButton("long");
      } else if (key === "t") {
        setIsTerminalMode(prev => !prev);
        addTerminalLine(`[KEYPAD] Map USB/BT Keyboard Key [T] -> Toggled ST7789 Color LCD terminal display`, "output");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMediaVolume(prev => {
          const next = Math.min(100, prev + 10);
          addTerminalLine(`[KEYPAD] Map USB/BT Keyboard Key [ArrowUp] -> Volume Up: ${next}%`, "output");
          return next;
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setMediaVolume(prev => {
          const next = Math.max(0, prev - 10);
          addTerminalLine(`[KEYPAD] Map USB/BT Keyboard Key [ArrowDown] -> Volume Down: ${next}%`, "output");
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [systemState, isTerminalMode, displayTheme, ditherMode, keyboardStatusActive, isRecording]);


  // Custom screen color scheme mapper
  const getScreenBgColor = () => {
    switch (displayTheme) {
      case "eink": return "bg-[#d0d3cd] text-[#1c1d1a] border-[#b0b3ab]";
      case "amber": return "bg-[#180a02] text-[#ff7700] border-[#551e04]";
      case "matrix": return "bg-[#031405] text-[#39ff14] border-[#0c3c13]";
      case "cyber": return "bg-[#100115] text-[#ff007f] border-[#440552]";
    }
  };

  const getScreenTextColorHex = () => {
    switch (displayTheme) {
      case "eink": return "#1c1d1a";
      case "amber": return "#ffaa00";
      case "matrix": return "#39ff14";
      case "cyber": return "#ff007f";
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 font-sans antialiased overflow-x-hidden selection:bg-amber-500 selection:text-black">
      
      {/* Background Matrix Grid Pattern */}
      <div className="absolute inset-x-0 top-0 h-[500px] bg-[linear-gradient(to_bottom,rgba(245,158,11,0.03)_1px,transparent_1px),linear-gradient(to_right,rgba(245,158,11,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      {/* Top Header Panel */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Logo Title and active system indicators */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/30">
              <Zap className="h-6 w-6 text-amber-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white font-mono">WHISPLAY HAT</h1>
                <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded font-mono">
                  Raspberry Pi Companion
                </span>
              </div>
              <p className="text-xs text-slate-400">Graphic Station Console & Hardware Orchestrator</p>
            </div>
          </div>

          {/* Quick Stats Banner */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs">
            
            {/* System Status Pills */}
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-full border border-slate-800">
              <span className="text-slate-500 font-mono">SYS:</span>
              <span className={`inline-flex items-center gap-1.5 font-semibold font-mono ${
                systemState === "active" ? "text-emerald-500" :
                systemState === "booting" ? "text-amber-500" : "text-rose-500"
              }`}>
                <span className={`h-2 w-2 rounded-full ${
                  systemState === "active" ? "bg-emerald-500 animate-pulse" :
                  systemState === "booting" ? "bg-amber-500 animate-spin" : "bg-rose-500"
                }`} />
                {systemState.toUpperCase()}
              </span>
            </div>

            {/* Simulated IP Address Badge */}
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-full border border-slate-800">
              <Wifi className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-mono text-slate-300">{sysMetrics.ipAddress}</span>
            </div>

            {/* PiSugar Battery HUD */}
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-full border border-slate-800">
              <BatteryCharging className={`h-3.5 w-3.5 ${sysMetrics.isCharging ? "text-amber-500 animate-bounce" : "text-emerald-400"}`} />
              <span className="font-mono text-slate-300">
                BAT: {sysMetrics.batteryPercent}% ({sysMetrics.isCharging ? "CHG" : "DISCHG"})
              </span>
            </div>

            {/* Core Clock */}
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-full border border-slate-800 font-mono text-amber-500">
              <Clock className="h-3.5 w-3.5" />
              <span>{sysMetrics.time || "14:18:46"}</span>
            </div>

          </div>
        </div>
      </header>

      {/* Main Single-View Console Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 relative z-10">
        
        {/* Intro Alert Warning */}
        <div id="intro-card" className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white text-sm">Hardware Simulation & Command Interface</h3>
              <p className="text-xs text-slate-400 max-w-xl">
                This console orchestrates your PiSugar Whisplay HAT. Interact below to play videos, record voice, change splashes, or trigger power bounds. Copy the deployment script to test real hardware.
              </p>
            </div>
          </div>
          <a href="#integration-section" className="text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 px-3.5 py-2 rounded-lg transition shrink-0 inline-flex items-center gap-1">
            <FileCheck className="h-3.5 w-3.5" />
            Get Installation Package
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ========================================================== */}
          {/* LEFT COLUMN: THE VIRTUAL WHISPLAY HARDWARE CONTROLLER      */}
          {/* ========================================================== */}
          <section className="lg:col-span-5 flex flex-col gap-5">
            
            {/* The Physical Device Enclosure Mockup */}
            <div className="bg-gradient-to-b from-[#232630] to-[#14161f] border-2 border-slate-700/60 p-5 rounded-2xl shadow-2xl relative overflow-hidden">
              
              {/* Subtle visual circuits styling on Hat corners */}
              <div className="absolute top-0 right-0 p-3 text-slate-800 text-[9px] font-mono leading-none pointer-events-none select-none">
                PISUGAR WHISPLAY<br />REV 1.8 // GPIO SHIELD
              </div>

              {/* Status Header of Hat */}
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-600 animate-ping absolute" />
                  <div className="h-3 w-3 rounded-full bg-red-600 relative border border-black" />
                  <span className="text-[10px] font-mono tracking-widest text-slate-400 font-semibold">REC_ACTIVE</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-mono">Mute:</span>
                  <button 
                    onClick={toggleMute}
                    className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                  >
                    {isMuted ? <VolumeX className="h-3.5 w-3.5 text-rose-500" /> : <Volume2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* SCREEN CASING WITH GLASS BEZEL */}
              <div className="bg-[#101217] p-5 rounded-xl border border-slate-800 shadow-inner relative flex flex-col items-center">
                
                {/* Simulated 1.69" High-Fidelity Color LCD Display Window */}
                <div 
                  className={`w-[240px] h-[280px] rounded-lg border-2 p-4 ${getScreenBgColor()} transition-colors duration-300 relative overflow-hidden flex flex-col justify-between shadow-2xl`}
                  style={{ opacity: screenBrightness / 100 }}
                >
                  
                  {/* Subtle glass glare overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none" />
                  
                  {/* Scanlines Overlay if CRT/Dither mode matched */}
                  {ditherMode === "crt" && (
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.22)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />
                  )}

                  {/* ACTIVE SCREEN RENDERING CONTENT DEPENDING ON RUNTIME STATE */}
                  <AnimatePresence mode="wait">
                    {systemState === "booting" && (
                      <motion.div 
                        key="booting-screen"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full flex flex-col justify-between font-mono text-[9px] leading-tight"
                      >
                        <div className="line-clamp-12 h-[180px] overflow-hidden leading-relaxed">
                          {activeConsoleLog.length > 0 ? (
                            activeConsoleLog.slice(-12).map((log, i) => (
                              <div key={i} className="truncate select-none text-[8px]">{log}</div>
                            ))
                          ) : (
                            <div>[SYS] BOOTING DAEMON...</div>
                          )}
                        </div>
                        <div className="border-t border-current pt-1.5 flex items-center justify-between">
                          <span className="font-bold">LITE OS BOOTSTRAP</span>
                          <span>{sysMetrics.bootProgress || 20}%</span>
                        </div>
                      </motion.div>
                    )}

                    {systemState === "shutting_down" && (
                      <motion.div 
                        key="shudown-screen"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full flex flex-col justify-between font-mono text-[10px]"
                      >
                        <div className="text-center font-bold py-8 flex flex-col items-center gap-2">
                          <Power className="h-8 w-8 animate-spin text-red-500" />
                          <span>SAFE HALT IN PROGRESS...</span>
                        </div>
                        <div className="w-full bg-current/25 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-current h-full transition-all duration-300"
                            style={{ width: `${sysMetrics.shutdownProgress}%` }}
                          />
                        </div>
                        <div className="text-[8px] flex justify-between uppercase">
                          <span>Unmounting SD Node</span>
                          <span>{sysMetrics.shutdownProgress}%</span>
                        </div>
                      </motion.div>
                    )}

                    {systemState === "halted" && (
                      <motion.div 
                        key="halted-screen"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full flex flex-col items-center justify-center font-mono text-center"
                      >
                        <Square className="h-8 w-8 opacity-30 mb-2 text-rose-500 animate-pulse" />
                        <span className="text-[11px] font-bold tracking-widest uppercase text-rose-550">System Power Halted</span>
                        <span className="text-[8px] opacity-60 mt-1">Color LCD screen entering deep sleep. Safe to detach LIPO battery.</span>
                      </motion.div>
                    )}

                    {systemState === "active" && (
                      <motion.div 
                        key="active-screen"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full flex flex-col justify-between"
                      >
                        
                        {/* Hidden Canvas or Video Player Feed Overlay */}
                        {activeMedia ? (
                          <div className="h-full flex flex-col justify-between relative">
                            {/* Canvas actually drawing video frames or procedural dither visualizers */}
                            <canvas 
                              ref={virtualCanvasRef} 
                              width={240} 
                              height={280}
                              className="absolute inset-0 w-full h-full object-cover rounded opacity-90"
                            />

                            {/* Minimal control visual bar printed top */}
                            <div className="z-10 bg-black/85 px-2 py-1 text-[9px] font-mono flex items-center justify-between text-white border-b border-white/20 select-none">
                              <span className="truncate max-w-[120px]">▶ {activeMedia.name}</span>
                              <span>{videoCurrentTime}s / {videoDuration}s</span>
                            </div>

                            {/* Spectrum wave animation simulated overlaid */}
                            <div className="z-10 absolute bottom-2 right-2 left-2 flex items-end justify-between h-9 bg-black/50 px-2 rounded-md pointer-events-none select-none">
                              {[...Array(16)].map((_, i) => {
                                const level = isPlaying ? Math.floor(Math.sin(i * 0.4 + videoCurrentTime * 3) * 20) + 20 : 2;
                                return (
                                  <div 
                                    key={i} 
                                    className="w-1.5 bg-[#00f0ff] transition-all duration-75 rounded-t-sm"
                                    style={{ 
                                      height: `${level}%`, 
                                      maxHeight: "100%",
                                      backgroundColor: getScreenTextColorHex()
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ) : isTerminalMode ? (
                          // Retro Monochrome Micro Terminal Screen View - Full 240x280 scale!
                          <div className="h-full flex flex-col justify-between font-mono text-[9px] leading-tight select-none">
                            <div className="flex-1 overflow-hidden">
                              <div className="text-amber-500 font-bold border-b border-current/25 pb-1 flex justify-between uppercase text-[8px]" style={{ color: getScreenTextColorHex() }}>
                                <span>TERMINAL_ACTIVE</span>
                                <span className="animate-pulse">● TTY_ST7789</span>
                              </div>
                              <div className="mt-1 space-y-1 max-h-[190px] overflow-hidden leading-snug text-[8px]" style={{ color: getScreenTextColorHex() }}>
                                {terminalHistory.slice(-14).map((line, i) => (
                                  <div key={i} className="truncate opacity-90">
                                    {line.text}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="border-t border-current/20 pt-1 flex items-center justify-between text-[7px]" style={{ color: getScreenTextColorHex() }}>
                              <span className="truncate select-none">Shortcuts: S (Simulate) • T (Toggle)</span>
                              <span className="animate-pulse shrink-0">_</span>
                            </div>
                          </div>
                        ) : (
                          // Dynamic Active Dashboard Layout - 240x280 Portrait LCD Special HUD
                          <div className="h-full flex flex-col justify-between text-left h-full">
                            {/* Micro status header row */}
                            <div className="flex items-center justify-between text-[8px] font-mono border-b border-current/20 pb-1.5 uppercase select-none">
                              <div className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-ping" />
                                <span className="h-1.5 w-1.5 bg-green-500 rounded-full absolute" />
                                <span>ST7789 COLOR HUD</span>
                              </div>
                              <span>IP: {sysMetrics.ipAddress}</span>
                            </div>

                            {/* Large Clock Display */}
                            <div className="text-center py-2 my-auto">
                              <div className="text-3xl font-mono font-bold tracking-widest">{sysMetrics.time.split(" ")[0]}</div>
                              <div className="text-[9px] uppercase tracking-wider font-mono opacity-80 mt-1">
                                {sysMetrics.date}
                              </div>
                            </div>

                            {/* Audio VU levels panel in the middle */}
                            <div className="border border-current/10 bg-current/[2%] px-2 py-2 rounded font-mono text-[8px] space-y-1 select-none">
                              <div className="flex justify-between items-center opacity-70">
                                <span>ALSA AUDIO BUS</span>
                                <span>{isMuted ? "MUTED" : "ACTIVE"}</span>
                              </div>
                              <div className="h-1.5 bg-current/10 rounded-full overflow-hidden flex">
                                <div 
                                  className="h-full bg-current transition-all" 
                                  style={{ width: isMuted ? "0%" : `${mediaVolume}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[7px] opacity-50">
                                <span>0dB</span>
                                <span>Vol: {mediaVolume}%</span>
                                <span>+24dB</span>
                              </div>
                            </div>

                            {/* Color LCD Rich System Progress Meters */}
                            <div className="space-y-1.5 pt-2 border-t border-current/15">
                              {/* CPU and RAM meters */}
                              <div className="grid grid-cols-2 gap-2 text-[8px] font-mono">
                                <div>
                                  <div className="flex justify-between mb-0.5 opacity-80">
                                    <span>CPU LOAD:</span>
                                    <span>{sysMetrics.cpuLoad}%</span>
                                  </div>
                                  <div className="h-1 bg-current/15 rounded-full overflow-hidden">
                                    <div className="h-full bg-current" style={{ width: `${sysMetrics.cpuLoad}%` }}></div>
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between mb-0.5 opacity-80">
                                    <span>TEMP:</span>
                                    <span>{sysMetrics.tempC}°C</span>
                                  </div>
                                  <div className="h-1 bg-current/15 rounded-full overflow-hidden">
                                    <div className="h-full bg-current" style={{ width: `${(sysMetrics.tempC / 80) * 100}%` }}></div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Micro Telemetry Footer row */}
                            <div className="flex items-center justify-between text-[8px] font-mono pt-1.5 border-t border-current/20 mt-1 select-none">
                              <div className="flex items-center gap-0.5">
                                <span className="opacity-70">BAT:</span>
                                <strong>{sysMetrics.batteryPercent}%</strong>
                              </div>
                              <div className="flex items-center gap-0.5">
                                <span className="opacity-70 text-green-500">SYS:</span>
                                <strong>ONLINE</strong>
                              </div>
                              <div className="flex items-center gap-0.5">
                                <span className="opacity-70">WiFi:</span>
                                <strong className="text-emerald-500">Excellent</strong>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>

                {/* Micro branding label in bezel */}
                <div className="mt-2 text-[9px] font-mono text-slate-500 tracking-widest uppercase select-none">
                  ST7789 COLOR LCD PANEL (240x280 PX - 1.69")
                </div>

              </div>

              {/* DEEPLY AUTHENTIC PISUGAR WHISPLAY MULTI-PRESS SIDE BUTTON */}
              <div className="mt-4 pt-1 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
                <div className="text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-2 text-center font-semibold select-none">
                  PiSugar HAT Side Button Emulator
                </div>
                <p className="text-[10px] text-slate-500 text-center font-mono mb-3 leading-tight select-none">
                  The Whisplay has exactly 1 custom companion button. Test multi-event durations:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: "single", label: "Single Click", detail: "Cycle Tint" },
                    { type: "double", label: "Double Click", detail: "Mic On/Off" },
                    { type: "long", label: "Long Hold", detail: "OS Kernel Halt" }
                  ].map((btn, i) => (
                    <button
                      key={i}
                      disabled={systemState === "halted"}
                      onClick={() => pressHardwareButton(btn.type as any)}
                      className="flex flex-col items-center p-2 rounded-lg border text-center transition-all bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700/60 text-slate-100 active:from-slate-950 active:to-slate-900 hover:border-amber-500/50"
                    >
                      <span className="h-6 w-12 rounded bg-slate-950 flex items-center justify-center font-mono font-bold text-amber-500 border border-slate-800 text-[10px] shadow uppercase whitespace-nowrap">
                        {btn.type === "long" ? "3s hold" : btn.type === "double" ? "2x tap" : "1x tap"}
                      </span>
                      <span className="text-[9px] font-bold text-slate-300 mt-1.5 font-mono leading-tight select-none">
                        {btn.label}
                      </span>
                      <span className="text-[8px] text-slate-400 mt-0.5 font-mono uppercase select-none">
                        {btn.detail}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hardware Bezel Diagnostics Details */}
              <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 inline-block animate-pulse" />
                  <span>VOLTAGE: 3.84 V (LIPO)</span>
                </div>
                <span>TEMP STATE: STABLE</span>
              </div>

              {/* Cover styled shutdown physical activator button */}
              <div className="mt-4 flex gap-2">
                {systemState === "halted" ? (
                  <button 
                    onClick={handleReboot}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition font-mono border-b-2 border-emerald-800 active:border-0"
                  >
                    <RotateCcw className="h-4 w-4 animate-spin-slow" />
                    Bypass & Power Up Pi Modules
                  </button>
                ) : (
                  <button 
                    onClick={handleShutdown}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition font-mono border-b-2 border-rose-800 active:border-0"
                  >
                    <Power className="h-4 w-4" />
                    Force Safe Shutdown
                  </button>
                )}
              </div>

            </div>

            {/* SCREEN CALIBRATION PANEL */}
            <div className="bg-slate-900/85 border border-slate-800 p-4 rounded-xl">
              <h3 className="font-bold text-white text-xs tracking-wider uppercase font-mono mb-3 flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-amber-500" />
                Virtual Display Calibration
              </h3>

              <div className="space-y-3 text-xs">
                
                {/* Theme Selector */}
                <div>
                  <label className="text-slate-400 block mb-1 text-[11px] uppercase font-mono">LCD Color Scheme</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: "eink", label: "Classic" },
                      { id: "amber", label: "Amber" },
                      { id: "matrix", label: "Volt" },
                      { id: "cyber", label: "Neon" }
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setDisplayTheme(theme.id as any)}
                        className={`py-1 px-1 rounded text-[10px] font-mono border uppercase transition-all ${
                          displayTheme === theme.id 
                          ? "bg-amber-500 text-slate-950 border-amber-500 font-bold" 
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {theme.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dither Mode */}
                <div>
                  <label className="text-slate-400 block mb-1 text-[11px] uppercase font-mono">Dither Shader Algorithm</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: "threshold", label: "1-Bit Threshold" },
                      { id: "ordered", label: "Bayer Matrix" },
                      { id: "crt", label: "CRT Scanline" },
                      { id: "pixel", label: "Pixel Blocks" }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setDitherMode(mode.id as any)}
                        className={`py-1 px-1 rounded text-[10px] font-mono border uppercase transition-all ${
                          ditherMode === mode.id
                          ? "bg-amber-500 text-slate-950 border-amber-500 font-bold"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {mode.id.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sliders for Contrast & Brightness */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Contrast ({screenContrast}%)</span>
                    <input 
                      type="range" 
                      min="10" 
                      max="100" 
                      value={screenContrast} 
                      onChange={(e) => setScreenContrast(Number(e.target.value))}
                      className="w-full accent-amber-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer" 
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Backlight ({screenBrightness}%)</span>
                    <input 
                      type="range" 
                      min="10" 
                      max="100" 
                      value={screenBrightness} 
                      onChange={(e) => setScreenBrightness(Number(e.target.value))}
                      className="w-full accent-amber-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer" 
                    />
                  </div>
                </div>

              </div>
            </div>

          </section>

          {/* ========================================================== */}
          {/* RIGHT COLUMN: REGLATORY DECKS & PERIPHERAL INPUTS           */}
          {/* ========================================================== */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* 1. MP4 VIDEO TRANSFER & PLAYBACK CONSOLE */}
            <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Monitor className="text-amber-500 h-5 w-5" />
                  <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                    Whisplay Screen Video Player (.mp4)
                  </h2>
                </div>
                
                {/* Upload Button */}
                <button
                  onClick={handleUploadVideoClick}
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition select-none cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Transfer MP4 File
                </button>
              </div>

              {/* Hidden input */}
              <input 
                type="file" 
                ref={videoFileRef}
                onChange={handleVideoFileChange}
                accept="video/mp4,video/*"
                className="hidden"
              />

              {/* Video Player Info Controls */}
              {activeMedia ? (
                <div className="bg-slate-950/90 rounded-xl p-4 border border-amber-500/20 mb-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <span className="text-[10px] text-amber-500 font-mono tracking-widest uppercase block mb-0.5">CURRENTLY RENDERING ON WHISPLAY</span>
                      <h4 className="font-bold text-white text-sm font-mono truncate max-w-[280px] sm:max-w-md">
                        {activeMedia.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Size: {activeMedia.size} // Source: {activeMedia.uploadedAt}
                      </span>
                    </div>
                    
                    <button 
                      onClick={handleStopVideo}
                      className="text-slate-400 hover:text-white"
                      title="Clear Playback"
                    >
                      <Square className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Progress Line */}
                  <div className="flex items-center gap-3 text-xs font-mono my-3">
                    <span>{videoCurrentTime}s</span>
                    <div className="flex-1 bg-slate-800 h-2 rounded overflow-hidden relative">
                      <div 
                        className="bg-amber-500 h-full transition-all duration-100" 
                        style={{ width: `${videoProgress}%` }}
                      />
                    </div>
                    <span>{videoDuration > 0 ? `${videoDuration}s` : "..."}</span>
                  </div>

                  {/* Playback action items */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1.5 border-t border-slate-900 text-xs">
                    <div className="flex items-center gap-2">
                      {isPlaying ? (
                        <button 
                          onClick={handlePauseVideo}
                          className="bg-amber-500 text-slate-950 font-bold py-1.5 px-3 rounded flex items-center gap-1 font-mono hover:bg-amber-400 transition"
                        >
                          <Pause className="h-3.5 w-3.5" /> Pause
                        </button>
                      ) : (
                        <button 
                          onClick={() => handlePlayVideo(activeMedia)}
                          className="bg-amber-500 text-slate-950 font-bold py-1.5 px-3 rounded flex items-center gap-1 font-mono hover:bg-amber-400 transition"
                        >
                          <Play className="h-3.5 w-3.5" /> Play
                        </button>
                      )}
                      
                      <button 
                        onClick={handleStopVideo}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-1.5 px-3 rounded font-mono transition"
                      >
                        Stop
                      </button>
                    </div>

                    {/* Speakers Volume Sliders */}
                    <div className="flex items-center gap-2 text-slate-300">
                      <Volume2 className="h-3.5 w-3.5" />
                      <span className="font-mono text-[11px] text-slate-400">Speaker Vol ({mediaVolume}%)</span>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={mediaVolume}
                        onChange={handleVolumeChange}
                        className="w-20 sm:w-24 accent-amber-500 bg-slate-900 h-1 rounded appearance-none cursor-pointer" 
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={handleUploadVideoClick}
                  className="bg-slate-950/40 hover:bg-slate-950/60 border-2 border-dashed border-slate-800 hover:border-amber-500/30 rounded-xl p-6 text-center cursor-pointer transition mb-4 select-none"
                >
                  <Monitor className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-semibold mb-0.5">Drag & Drop or Click to Select Video</p>
                  <p className="text-[10px] text-slate-500 font-mono">Compatible with standard MP4 (H.264 video codec / AAC audio)</p>
                </div>
              )}

              {/* Playback Presets list */}
              <div>
                <h4 className="text-[11px] font-semibold text-slate-400 font-mono uppercase tracking-widest mb-2 flex items-center justify-between">
                  <span>Available Library Playlists</span>
                  <span className="text-[10px] text-amber-500/80 normal-case lowercase font-mono">Will dither to retro raster on LCD</span>
                </h4>

                <div className="space-y-1.5 max-h-[145px] overflow-y-auto pr-1">
                  {mediaList.map((media) => {
                    const isActive = activeMedia?.id === media.id;
                    return (
                      <div 
                        key={media.id} 
                        className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono border transition ${
                          isActive 
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400" 
                          : "bg-slate-950/60 border-slate-850 hover:border-slate-800 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate max-w-[240px] sm:max-w-md">
                          <Play className={`h-3.5 w-3.5 shrink-0 ${isActive && isPlaying ? "text-amber-500 animate-spin-slow" : "text-slate-500"}`} />
                          <span className="truncate">{media.name}</span>
                          {media.isPreset && (
                            <span className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded shrink-0">Preset</span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-slate-500 text-[10px] shrink-0">{media.size}</span>
                          <button
                            onClick={() => handlePlayVideo(media)}
                            className="bg-slate-800 hover:bg-slate-700 hover:text-white px-2 py-0.8 rounded text-[10px] font-semibold transition"
                          >
                            Play
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* 2. AUDIO RECORDER CONSOLE */}
            <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Mic className="text-amber-500 h-5 w-5" />
                  <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                    Whisplay Microphone Recorder Block
                  </h2>
                </div>
                {isRecording && (
                  <span className="flex items-center gap-1.5 text-xs text-rose-500 font-bold font-mono animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    LIVE RECORDING
                  </span>
                )}
              </div>

              {/* Recording interface area */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mb-4">
                
                {/* Control Panel buttons */}
                <div className="md:col-span-5 space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Recording Segment Name</label>
                    <input 
                      type="text" 
                      placeholder="My Record audio note"
                      value={customRecName}
                      onChange={(e) => setCustomRecName(e.target.value)}
                      disabled={isRecording}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-lg p-2 text-xs font-mono text-white placeholder-slate-600 outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    {isRecording ? (
                      <button
                        onClick={stopRecordingInput}
                        className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition font-mono uppercase"
                      >
                        <Square className="h-4 w-4" /> Stop Rec 
                      </button>
                    ) : (
                      <button
                        onClick={startRecordingInput}
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition font-mono uppercase cursor-pointer"
                      >
                        <Mic className="h-4 w-4" /> Record Voice
                      </button>
                    )}
                  </div>
                </div>

                {/* Recorder Telemetry & Sound Analyzer levels */}
                <div className="md:col-span-7 bg-slate-950/80 p-3.5 rounded-xl border border-slate-850 h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] font-mono border-b border-slate-900 pb-1.5 mb-2 text-slate-400">
                    <span>MIC INPUT BAR LEVEL</span>
                    <span>Duration: {recDuration}s</span>
                  </div>

                  {/* Dynamic Graphic Equalizer bar */}
                  <div className="h-10 flex items-end justify-between gap-1 bg-slate-950 p-2 border border-slate-900 rounded">
                    {[...Array(20)].map((_, i) => {
                      // Generate dynamic equalizer patterns based on isRecording state
                      let level = 10;
                      if (isRecording) {
                        level = Math.max(10, Math.floor((audioInputLevel / 100) * (Math.random() * 80 + 20)));
                        if (i % 3 === 0) level *= 0.6;
                      } else {
                        level = 8;
                      }

                      return (
                        <div 
                          key={i} 
                          className={`flex-1 rounded-sm transition-all duration-75 ${isRecording ? "bg-amber-500" : "bg-slate-800"}`}
                          style={{ height: `${level}%` }}
                        />
                      );
                    })}
                  </div>

                  <div className="text-[9px] font-mono text-slate-500 mt-1 uppercase text-right select-none">
                    ADC Channel #1 / physical sound capture
                  </div>
                </div>

              </div>

              {/* List of saved voice captures */}
              <div>
                <h4 className="text-[11px] font-semibold text-slate-400 font-mono uppercase tracking-widest mb-2 select-none">
                  Stored Audio Captures ({recordingsList.length})
                </h4>

                <div className="space-y-1.5 max-h-[148px] overflow-y-auto pr-1">
                  {recordingsList.map((rec) => (
                    <div 
                      key={rec.id} 
                      className="bg-slate-950/60 border border-slate-850 hover:border-slate-800 p-2 rounded-lg flex items-center justify-between text-xs font-mono text-slate-300"
                    >
                      <div className="flex items-center gap-2.5 truncate max-w-[200px] sm:max-w-xs">
                        <Volume2 className="h-3.5 w-3.5 text-slate-500" />
                        <div className="truncate">
                          <p className="font-semibold text-white truncate">{rec.name}</p>
                          <p className="text-[9px] text-slate-500">{rec.date} • {rec.duration}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">{rec.size}</span>
                        <button
                          onClick={() => handlePlayRecording(rec)}
                          className="bg-slate-800 hover:bg-slate-705 text-amber-500 hover:text-amber-400 px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 shrink-0"
                        >
                          <Play className="h-3 w-3" /> Play Out
                        </button>
                        <button
                          onClick={() => handleDeleteRecording(rec.id)}
                          className="text-slate-500 hover:text-rose-500 p-1 rounded transition"
                          title="Delete audio file"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {recordingsList.length === 0 && (
                    <div className="text-center font-mono text-xs text-slate-600 py-3">
                      No audio clips captured. Record voice above to save notes.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 3. TERMINAL, NETWORK & KEYBOARD CONTROL DECK */}
            <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4 font-mono">
                <div className="flex items-center gap-2">
                  <Terminal className="text-amber-500 h-5 w-5" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                    Terminal & Network Control Deck
                  </h2>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsTerminalMode(prev => !prev)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase border transition cursor-pointer select-none ${
                      isTerminalMode 
                      ? "bg-amber-500 text-slate-950 border-amber-500 hover:bg-amber-400" 
                      : "bg-slate-950 text-slate-400 border-slate-850 hover:border-slate-800"
                    }`}
                  >
                    {isTerminalMode ? "OLED: Terminal Mode" : "OLED: GUI Mode"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mb-5">
                
                {/* Network Capabilities Panel */}
                <div className="xl:col-span-6 space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800 pb-2">
                    <span className="text-white font-bold uppercase flex items-center gap-1">
                      <Wifi className="h-3.5 w-3.5 text-amber-500" />
                      Pi Interfaces (Eth/WiFi)
                    </span>
                    <span className="text-slate-500 text-[10px]">Dual interfaces</span>
                  </div>

                  {/* Ethernet Interface status */}
                  <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-850 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${ethernetInterface.status === "connected" ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`} />
                        <span className="font-mono text-xs text-white font-bold">{ethernetInterface.interface.toUpperCase()} (Ethernet)</span>
                      </div>
                      <button
                        onClick={toggleEthernetCable}
                        className="text-[9px] font-mono uppercase bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-2 py-0.5 rounded text-amber-400 font-semibold transition cursor-pointer"
                      >
                        {ethernetInterface.status === "connected" ? "Unplug wire" : "Plug wire"}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-900">
                      <div>Status: <strong className="text-slate-200">{ethernetInterface.status === "connected" ? "CARRIER ACTIVE" : "CARRIER DOWN"}</strong></div>
                      <div>MAC: <strong className="text-slate-200">{ethernetInterface.mac}</strong></div>
                      <div className="col-span-2">Dynamic IP: <strong className="text-amber-500 text-xs">{ethernetInterface.ipAddress}</strong></div>
                    </div>
                  </div>

                  {/* WiFi Interface status & search scanner */}
                  <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-850 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${wifiInterface.status === "associated" ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`} />
                        <span className="font-mono text-xs text-white font-bold">{wifiInterface.interface.toUpperCase()} (Wireless)</span>
                      </div>
                      <button
                        onClick={scanWifiNetworks}
                        disabled={isScanningWifi}
                        className="text-[9px] font-mono uppercase bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        {isScanningWifi ? (
                          <>
                            <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Sweeping...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-2.5 w-2.5" /> scan wifi
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-900 pb-1.5">
                      <div>Status: <strong className="text-slate-200">{wifiInterface.status.toUpperCase()}</strong></div>
                      <div>Mac address: <strong className="text-slate-200">{wifiInterface.mac}</strong></div>
                      <div className="col-span-2">Dynamic WiFi IP: <strong className="text-amber-500 text-xs">{wifiInterface.ipAddress}</strong></div>
                    </div>

                    {/* WiFi password form drawer */}
                    {selectedSsid && (
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-amber-500/30 space-y-2">
                        <div className="text-[10px] uppercase font-mono text-slate-300 flex justify-between">
                          <span>Secure passphrase for <strong>{selectedSsid}</strong></span>
                          <button onClick={() => setSelectedSsid("")} className="text-rose-500 hover:text-rose-400 font-bold">Cancel</button>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            placeholder="WPA Passphrase"
                            value={wifiPassword}
                            onChange={(e) => setWifiPassword(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded p-1.5 text-xs font-mono text-white flex-1 outline-none focus:border-amber-500/50"
                          />
                          <button
                            onClick={() => connectWifiNetwork(selectedSsid)}
                            className="bg-amber-500 text-slate-950 hover:bg-amber-400 px-3 rounded text-xs font-bold font-mono transition inline-flex items-center"
                          >
                            Join
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Discovered networks list */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase font-mono text-slate-500 block">RF Discoveries (Broadcom BCM43438)</span>
                      
                      <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
                        {networksList.map((net, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedSsid(net.ssid)}
                            className={`flex items-center justify-between p-1.5 rounded text-[11px] font-mono border cursor-pointer transition ${
                              net.isConnected 
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold" 
                              : "bg-slate-900/60 border-slate-900 text-slate-300 hover:border-slate-800"
                            }`}
                          >
                            <span className="truncate flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${net.isConnected ? "bg-emerald-400" : "bg-slate-500"}`} />
                              {net.ssid}
                            </span>
                            <div className="flex items-center gap-2 text-[9px] text-slate-500 shrink-0">
                              <span>{net.security}</span>
                              <span className="font-bold text-slate-400">{net.signal}% signal</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bluetooth / USB Keyboard Input Guide */}
                <div className="xl:col-span-6 space-y-4 font-mono">
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                    <span className="text-white font-bold uppercase flex items-center gap-1">
                      <Keyboard className="h-3.5 w-3.5 text-amber-500" />
                      USB & Bluetooth Keyboards
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-slate-500">Listener:</span>
                      <button
                        onClick={() => {
                          setKeyboardStatusActive(prev => !prev);
                          addTerminalLine(`[INPUT] USB/BT Keyboard bindings ${!keyboardStatusActive ? "ENABLED" : "SUSPENDED"} globally.`, "output");
                        }}
                        className={`text-[9.5px] px-1.5 py-0.5 rounded border uppercase transition cursor-pointer ${
                          keyboardStatusActive 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold"
                          : "bg-slate-950 text-slate-500 border-slate-850"
                        }`}
                      >
                        {keyboardStatusActive ? "Bound" : "Muted"}
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-850 space-y-3">
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Physical key captures map generic USB or Bluetooth input devices directly to tactile Whisplay HAT components. <strong className="text-white">Click elsewhere then press keys to test:</strong>
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold">
                      {[
                        { key: "S", task: "Simulate Single-click (Display Theme)" },
                        { key: "R", task: "Simulate Double-click (Mic Record)" },
                        { key: "H", task: "Simulate Long-press (Safe halt shutdown)" },
                        { key: "T", task: "Toggle OLED status display terminal layout" },
                        { key: "↑", task: "Increase audio speaker volume" },
                        { key: "↓", task: "Decrease audio speaker volume" }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-900 hover:border-slate-850 rounded">
                          <span className="h-5 w-5 bg-slate-950 font-bold text-amber-500 text-[11px] flex items-center justify-center rounded border border-slate-800 shadow-sm shrink-0">
                            {item.key}
                          </span>
                          <span className="text-slate-300 text-[10px] truncate">{item.task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Monospace Diagnostic SSH Console Shell Prompt */}
              <div className="space-y-2 pt-1.5 border-t border-slate-800/80 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-bold uppercase flex items-center gap-1">
                    <Terminal className="h-3.5 w-3.5 text-amber-500" />
                    Interactive diagnostics terminal
                  </span>
                  <button
                    onClick={() => setTerminalHistory([
                      { type: "output", text: "WHISPLAY RETRO LINUX SYSTEM REBOOTED ON LIVE BUFFER." },
                      { type: "output", text: "Bluetooth & USB Keyboard modules detected. Input device standard: generic." },
                      { type: "output", text: "Type 'help' and press [Enter] to query physical hardware registries." }
                    ])}
                    className="text-[9px] uppercase font-mono text-slate-500 hover:text-amber-500 cursor-pointer"
                  >
                    Clear buffers
                  </button>
                </div>

                <div className="bg-slate-950 rounded-lg border border-slate-850 p-3 h-48 overflow-y-auto font-mono text-[11px] leading-relaxed flex flex-col justify-between">
                  <div className="space-y-1 overflow-y-auto flex-1 mb-2 pr-1 select-text">
                    {terminalHistory.map((line, idx) => (
                      <div 
                        key={idx} 
                        className={`whitespace-pre-wrap ${
                          line.type === "input" ? "text-amber-500 font-semibold" : "text-[#d0d4cd] opacity-90"
                        }`}
                      >
                        {line.text}
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleTerminalSubmit} className="flex items-center gap-2 border-t border-slate-905 pt-2 shrink-0">
                    <span className="text-emerald-500 font-bold shrink-0">pi@whisplay:~$</span>
                    <input
                      type="text"
                      placeholder="Type diagnostic command (e.g., help, uname -a, ifconfig, iwconfig, df -h, vcgencmd measure_temp)"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      className="bg-transparent border-0 outline-none text-white font-semibold text-xs flex-1 select-text"
                    />
                    <button
                      type="submit"
                      className="bg-slate-900 hover:bg-slate-800 text-amber-500 hover:text-amber-400 font-mono text-[10px] font-bold py-1 px-3.5 rounded border border-slate-800 transition uppercase cursor-pointer"
                    >
                      Exec
                    </button>
                  </form>
                </div>
              </div>
            </section>

            {/* 4. COOL BOOT & SHUTDOWN SPLASH SCREEN CUSTOMIZER */}
            <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
                <Sparkles className="text-amber-500 h-5 w-5" />
                <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                  Boot & Shutdown Splash Core Customizer
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Boot Splash Settings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white font-bold uppercase">1. Cool Boot Splash Theme</span>
                    <span className="text-amber-500 font-mono text-[10px]">active</span>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-850">
                    <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                      {[
                        { id: "cyberpunk", name: "Cyberpunk" },
                        { id: "retro", name: "Retro Pi" },
                        { id: "terminal", name: "Terminal init" },
                        { id: "matrix", name: "The Matrix" }
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handleBootPresetChange(preset.id)}
                          className={`text-[10px] font-mono py-1 rounded border uppercase transition ${
                            selectedBootPreset === preset.id 
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/50" 
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-500 font-mono uppercase block mb-1">Splash screen logo banner / Text</span>
                      <textarea
                        value={bootTextArt}
                        onChange={(e) => {
                          setBootTextArt(e.target.value);
                          saveSplashConfig("Custom Hex Text", undefined);
                        }}
                        rows={5}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-amber-500/30 rounded p-2 text-[10px] font-mono text-slate-300 leading-tight outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Shutdown Splash Settings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white font-bold uppercase">2. Cool Shutdown Splash</span>
                    <span className="text-rose-500 font-mono text-[10px]">active</span>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-850">
                    <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                      {[
                        { id: "halted", name: "Halted" },
                        { id: "classic", name: "Goodbye" },
                        { id: "pixel_sleep", name: "Low Pwr" }
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handleShutdownPresetChange(preset.id)}
                          className={`text-[10px] font-mono py-1 rounded border uppercase transition ${
                            selectedShutdownPreset === preset.id 
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/50" 
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-500 font-mono uppercase block mb-1">Shut down message text overlay</span>
                      <textarea
                        value={shutdownTextArt}
                        onChange={(e) => {
                          setShutdownTextArt(e.target.value);
                          saveSplashConfig(undefined, "Custom Hex Text");
                        }}
                        rows={5}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-amber-500/30 rounded p-2 text-[10px] font-mono text-slate-300 leading-tight outline-none"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Preview Indicator */}
              <div className="mt-4 p-3 bg-slate-950/40 rounded-lg border border-slate-800 flex items-start gap-2.5 text-xs">
                <Settings className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-slate-400 font-mono text-[10px] leading-relaxed">
                  TIP: Pressing tactile shortcut button <strong className="text-amber-500 bg-slate-900 px-1 py-0.2 rounded border border-slate-800 select-all font-mono">[D]</strong> restarts runtime services and displays your custom boot logo banner on the simulated Pi screen. Pressing <strong className="text-rose-500 bg-slate-900 px-1 py-0.2 rounded border border-slate-800 select-all font-mono">Force Safe Shutdown</strong> displays your shutdown image before turning the virtual modules offline.
                </p>
              </div>

            </section>

            {/* 4. PHYSICAL PI HARDWARE INTEGRATION DECK */}
            <section id="integration-section" className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Cpu className="text-amber-500 h-5 w-5" />
                  <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                    Physical Raspberry Pi Integration Kit
                  </h2>
                </div>

                <div className="flex gap-2">
                  <a
                    href="/api/installer"
                    target="_blank"
                    className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-mono px-3 py-1 rounded text-xs flex items-center gap-1.5 transition select-none"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Service Script
                  </a>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                To connect this dynamic graphic control dashboard to a real physical <strong className="text-slate-200">PiSugar Whisplay HAT</strong> mounted on <strong className="text-slate-200">Raspberry Pi OS Lite</strong>, run the setup pipeline below in your terminal via SSH:
              </p>

              {/* Terminal installation command block */}
              <div className="bg-slate-950 rounded-xl border border-slate-850 p-4 mb-4 font-mono relative overflow-hidden group">
                <div className="absolute top-2 right-2 flex gap-1">
                  <button 
                    onClick={() => handleCopyToClipboard(`curl -sL ${window.location.origin}/api/installer | bash`, "installer")}
                    className="p-1 px-2.5 rounded bg-slate-905 hover:bg-slate-800 text-slate-400 hover:text-white transition text-[10px] flex items-center gap-1 border border-slate-800"
                  >
                    {copiedSection === "installer" ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Copied Code!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy SSH Cmd
                      </>
                    )}
                  </button>
                </div>

                <div className="text-[10px] text-slate-600 block uppercase select-none mb-2"># Install command (Target: Pi CPU)</div>
                <div className="text-xs text-amber-500 font-bold overflow-x-auto whitespace-pre pr-24 select-all">
                  curl -sL <span className="text-white">{window.location.origin}</span>/api/installer | bash
                </div>
              </div>

              {/* Bullet details on real pi operation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono text-slate-400">
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                  <div className="flex items-center gap-2 mb-1.5 text-slate-200 uppercase text-[10px] sm:text-[11px] font-bold pb-1 border-b border-slate-900">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Media Render Stack
                  </div>
                  <ul className="space-y-1 text-[11px] list-disc pl-3">
                    <li>Utilizes <strong className="text-slate-300">MPV DRM framebuffers</strong>.</li>
                    <li>Supports direct video rendering onto the Whisplay OLED matrix screen.</li>
                    <li>Audio output automatically routes to WHISPLAY ALSA sound device.</li>
                  </ul>
                </div>

                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                  <div className="flex items-center gap-2 mb-1.5 text-slate-200 uppercase text-[10px] sm:text-[11px] font-bold pb-1 border-b border-slate-900">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ADC Sound Capture
                  </div>
                  <ul className="space-y-1 text-[11px] list-disc pl-3">
                    <li>Hooks up directly to <strong className="text-slate-300">arecord core utility</strong>.</li>
                    <li>Captures clean PCM wav at 44100Hz audio from physical Whisplay microphone.</li>
                    <li>Transfers results back to the web console storage instantly.</li>
                  </ul>
                </div>
              </div>

            </section>

            {/* 5. STANDALONE & OFFLINE DEPLOYMENT HUBS */}
            <section id="offline-standalone-section" className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="text-amber-500 h-5 w-5" />
                  <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                    Standalone Offline Program Hub
                  </h2>
                </div>
                <div className="text-[10px] bg-slate-950 px-2 py-0.5 rounded text-amber-500 font-mono tracking-widest uppercase">
                  Zero Network Required
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Run this software directly on your physical Raspberry Pi OS computer completely offline. Follow the instructions to configure local standalone drivers and control buttons:
              </p>

              {/* Toggles for deployment system */}
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <button
                  type="button"
                  onClick={() => setOfflineTab("node-fullstack")}
                  className={`py-2 px-3 rounded-lg border text-xs font-mono uppercase transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    offlineTab === "node-fullstack"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/40"
                      : "bg-slate-950/40 text-slate-400 border-slate-850 hover:border-slate-800"
                  }`}
                >
                  <Cpu className="h-3.5 w-3.5" />
                  Node.js Fullstack GUI
                </button>
                <button
                  type="button"
                  onClick={() => setOfflineTab("python-terminal")}
                  className={`py-2 px-3 rounded-lg border text-xs font-mono uppercase transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    offlineTab === "python-terminal"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/40"
                      : "bg-slate-950/40 text-slate-400 border-slate-850 hover:border-slate-800"
                  }`}
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  Lightweight Python CLI
                </button>
              </div>

              {offlineTab === "node-fullstack" ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    This deploys the full React UI + Express backend directly inside your subnetwork. It runs local sqlite, local mini OLED displays, and handles active controls through your local web browser.
                  </p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <a
                      href="/api/download/standalone-setup"
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition select-none cursor-pointer font-mono"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Standalone Setup (.sh)
                    </a>
                  </div>

                  <div className="bg-slate-950 rounded-xl border border-slate-850 p-4 font-mono text-[11px] text-slate-300 space-y-2">
                    <p className="text-amber-500 font-bold"># Setup offline fullstack daemon via terminal SSH:</p>
                    <ol className="list-decimal pl-4 space-y-1.5 text-slate-400">
                      <li>Download the standalone shell installer setup file above.</li>
                      <li>Move it to your Pi using: <code className="text-white select-all bg-slate-900 px-1 rounded">scp pi-standalone-setup.sh pi@your_pi_ip:/home/pi/</code></li>
                      <li>Execute the standalone automated setup on your Pi:<br />
                        <code className="text-amber-400 font-semibold select-all bg-slate-900 px-1 rounded">sudo bash pi-standalone-setup.sh</code>
                      </li>
                      <li>Extract your code bundle to <code className="text-white">/opt/whisplay-console</code>, compile and build it:
                        <code className="block bg-slate-900 border border-slate-800 p-1.5 mt-1 rounded text-[10px] text-white overflow-x-auto whitespace-pre leading-normal">
                          npm install && npm run build
                        </code>
                      </li>
                      <li>Enable and trigger the daemon service to run offline forever:
                        <code className="block bg-slate-900 border border-slate-800 p-1.5 mt-1 rounded text-[10px] text-white leading-normal">
                          sudo systemctl enable whisplay-console.service<br />
                          sudo systemctl start whisplay-console.service
                        </code>
                      </li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    A raw, lightning-fast native <strong className="text-slate-200">Python 3 script</strong> that runs directly on Raspberry Pi OS Lite terminal. Perfect for maximum efficiency, OLED graphics performance, and zero lag.
                  </p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <a
                      href="/api/download/standalone-python"
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition select-none cursor-pointer font-mono"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Standalone script (.py)
                    </a>
                  </div>

                  <div className="bg-slate-950 rounded-xl border border-slate-850 p-4 font-mono text-[11px] text-slate-300 space-y-2">
                    <p className="text-amber-500 font-bold"># Setup & Use Lightweight Python Offline Native Tool:</p>
                    <ol className="list-decimal pl-4 space-y-1.5 text-slate-400">
                      <li>Download the Python standalone workspace controller script files above.</li>
                      <li>Copy to target machine: <code className="text-white select-all bg-slate-900 px-1 rounded">scp standalone_whisplay.py pi@your_pi_ip:/home/pi/</code></li>
                      <li>Add executable permissions: <code className="text-white select-all bg-slate-900 px-1 rounded">chmod +x standalone_whisplay.py</code></li>
                      <li>Launch offline program:<br />
                        <code className="text-amber-400 font-semibold select-all bg-slate-900 px-1 rounded">python3 standalone_whisplay.py</code>
                      </li>
                    </ol>
                    <p className="text-[10px] text-slate-500 italic pt-1">
                      No server overhead. Intercepts key events, logs IP, reads real systems metrics and controls Alsa sound cards directly!
                    </p>
                  </div>
                </div>
              )}
            </section>

          </div>

        </div>

      </main>

      {/* Footer copyright and specifications */}
      <footer className="mt-12 py-8 bg-slate-950 border-t border-slate-900 text-slate-500 text-xs font-mono relative z-10 select-none">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p>WHISPLAY HAT CONTROLLER CONSOLE • VERSION 1.10</p>
          <p className="text-[10px] text-slate-600">
            Engineered with high-contrast tactical styles. Simulates PiSugar LIPO modules, arecord registers, and high-fidelity 1.69" Color LCD displays for perfect local sandbox development.
          </p>
        </div>
      </footer>

    </div>
  );
}
