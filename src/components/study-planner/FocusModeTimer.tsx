import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX,
  Music,
  TreePine,
  Waves,
  Coffee,
  Moon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface FocusModeTimerProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    task_type: string;
    estimated_duration_minutes: number | null;
  } | null;
  onComplete: () => void;
  onClose: () => void;
}

type SoundscapeType = "rain" | "forest" | "cafe" | "whitenoise";

const soundscapes: { id: SoundscapeType; label: string; icon: typeof Music; color: string }[] = [
  { id: "rain", label: "Rain", icon: Waves, color: "text-blue-400" },
  { id: "forest", label: "Forest", icon: TreePine, color: "text-green-400" },
  { id: "cafe", label: "Café", icon: Coffee, color: "text-amber-400" },
  { id: "whitenoise", label: "White Noise", icon: Moon, color: "text-slate-400" },
];

// Web Audio API for generating realistic ambient sounds
function createAmbientSound(audioContext: AudioContext, type: SoundscapeType, gainNode: GainNode): AudioNode[] {
  const nodes: AudioNode[] = [];

  if (type === "rain") {
    // Brown noise for rain (filtered white noise)
    const bufferSize = 2 * audioContext.sampleRate;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Boost volume
    }
    const whiteNoise = audioContext.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;
    
    // Low pass filter for rain-like sound
    const lowpass = audioContext.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 400;
    
    whiteNoise.connect(lowpass);
    lowpass.connect(gainNode);
    whiteNoise.start();
    nodes.push(whiteNoise, lowpass);
  } else if (type === "forest") {
    // Pink noise for forest ambiance
    const bufferSize = 2 * audioContext.sampleRate;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11;
      b6 = white * 0.115926;
    }
    const pinkNoise = audioContext.createBufferSource();
    pinkNoise.buffer = noiseBuffer;
    pinkNoise.loop = true;
    
    // Band pass for forest texture
    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 800;
    bandpass.Q.value = 0.5;
    
    pinkNoise.connect(bandpass);
    bandpass.connect(gainNode);
    pinkNoise.start();
    nodes.push(pinkNoise, bandpass);
    
    // Add subtle bird-like high frequencies
    const highBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const highOutput = highBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      highOutput[i] = (Math.random() * 2 - 1) * 0.02 * Math.sin(i / 1000);
    }
    const highNoise = audioContext.createBufferSource();
    highNoise.buffer = highBuffer;
    highNoise.loop = true;
    const highpass = audioContext.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 3000;
    highNoise.connect(highpass);
    highpass.connect(gainNode);
    highNoise.start();
    nodes.push(highNoise, highpass);
  } else if (type === "cafe") {
    // Warm brown noise with low rumble for cafe ambiance
    const bufferSize = 2 * audioContext.sampleRate;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.01 * white)) / 1.01;
      lastOut = output[i];
      output[i] *= 2;
    }
    const brownNoise = audioContext.createBufferSource();
    brownNoise.buffer = noiseBuffer;
    brownNoise.loop = true;
    
    // Warm low pass
    const lowpass = audioContext.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 600;
    
    brownNoise.connect(lowpass);
    lowpass.connect(gainNode);
    brownNoise.start();
    nodes.push(brownNoise, lowpass);
    
    // Add subtle murmur layer
    const murmurBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const murmurOutput = murmurBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      murmurOutput[i] = (Math.random() * 2 - 1) * 0.1 * Math.sin(i / 5000);
    }
    const murmur = audioContext.createBufferSource();
    murmur.buffer = murmurBuffer;
    murmur.loop = true;
    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 300;
    bandpass.Q.value = 1;
    murmur.connect(bandpass);
    bandpass.connect(gainNode);
    murmur.start();
    nodes.push(murmur, bandpass);
  } else if (type === "whitenoise") {
    // Pure white noise
    const bufferSize = 2 * audioContext.sampleRate;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = audioContext.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;
    
    // Slight roll off for comfort
    const lowpass = audioContext.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 8000;
    
    whiteNoise.connect(lowpass);
    lowpass.connect(gainNode);
    whiteNoise.start();
    nodes.push(whiteNoise, lowpass);
  }

  return nodes;
}

export function FocusModeTimer({ task, onComplete, onClose }: FocusModeTimerProps) {
  const defaultMinutes = task?.estimated_duration_minutes || 25;
  const [timeLeft, setTimeLeft] = useState(defaultMinutes * 60);
  const [totalTime] = useState(defaultMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSound, setSelectedSound] = useState<SoundscapeType | null>(null);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioNodesRef = useRef<AudioNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      playCompletionSound();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // Audio setup
  useEffect(() => {
    if (selectedSound && !isMuted) {
      // Clean up previous
      stopAudio();
      
      // Create new audio
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = volume / 100 * 0.15;
      gainNodeRef.current.connect(audioContextRef.current.destination);
      
      const nodes = createAmbientSound(audioContextRef.current, selectedSound, gainNodeRef.current);
      audioNodesRef.current = nodes;
    } else {
      stopAudio();
    }

    return () => stopAudio();
  }, [selectedSound, isMuted]);

  // Volume control
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100 * 0.15;
    }
  }, [volume]);

  const stopAudio = () => {
    audioNodesRef.current.forEach(node => {
      try { 
        if (node instanceof AudioBufferSourceNode) {
          node.stop(); 
        }
      } catch {}
    });
    audioNodesRef.current = [];
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
  };

  const playCompletionSound = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
    osc.start();
    osc.stop(ctx.currentTime + 1);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(defaultMinutes * 60);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex flex-col items-center justify-center p-8 animate-fade-in">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-6 right-6 text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300"
        onClick={() => {
          stopAudio();
          onClose();
        }}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Main content */}
      <div className="text-center max-w-lg animate-scale-in">
        {/* Title */}
        <h1 className="text-2xl font-light text-white/80 mb-2">Focus Mode</h1>
        {task && (
          <p className="text-lg text-white/60 mb-8">{task.title}</p>
        )}

        {/* Timer Circle */}
        <div className="relative w-64 h-64 mx-auto mb-8">
          {/* Background ring */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="120"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            <circle
              cx="128"
              cy="128"
              r="120"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 120}
              strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>
          </svg>

          {/* Timer display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-light text-white tracking-wider">
              {formatTime(timeLeft)}
            </span>
            <span className="text-sm text-white/40 mt-2">
              {isRunning ? "Stay focused" : "Ready to focus"}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300"
            onClick={handleReset}
          >
            <RotateCcw className="h-5 w-5" />
          </Button>

          <Button
            size="lg"
            className={cn(
              "h-16 w-16 rounded-full transition-all duration-300",
              isRunning 
                ? "bg-red-500/20 hover:bg-red-500/30 text-red-400" 
                : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white shadow-lg shadow-purple-500/25"
            )}
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300"
            onClick={() => {
              if (timeLeft === 0) {
                onComplete();
              }
            }}
            disabled={timeLeft > 0}
          >
            <span className="text-xs">Done</span>
          </Button>
        </div>

        {/* Soundscapes */}
        <div className="space-y-4">
          <p className="text-sm text-white/40">Ambient Sounds</p>
          <div className="flex items-center justify-center gap-3">
            {soundscapes.map((sound) => (
              <button
                key={sound.id}
                onClick={() => setSelectedSound(selectedSound === sound.id ? null : sound.id)}
                className={cn(
                  "p-3 rounded-xl transition-all duration-300",
                  selectedSound === sound.id
                    ? "bg-white/20 scale-110"
                    : "bg-white/5 hover:bg-white/10"
                )}
              >
                <sound.icon className={cn("h-5 w-5", sound.color)} />
              </button>
            ))}
          </div>

          {/* Volume control */}
          {selectedSound && (
            <div className="flex items-center justify-center gap-3 mt-4 animate-fade-in">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4 text-white/60" />
                ) : (
                  <Volume2 className="h-4 w-4 text-white/60" />
                )}
              </button>
              <Slider
                value={[volume]}
                onValueChange={([v]) => setVolume(v)}
                max={100}
                step={1}
                className="w-32"
              />
            </div>
          )}
        </div>

        {/* Completion message */}
        {timeLeft === 0 && (
          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 animate-scale-in">
            <p className="text-xl text-green-400 mb-2">🎉 Session Complete!</p>
            <p className="text-sm text-white/60 mb-4">Great work staying focused!</p>
            <Button
              onClick={onComplete}
              className="bg-green-500 hover:bg-green-400 text-white"
            >
              Mark Task Complete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
