import { useCallback, useRef } from 'react';
import { SoundTone } from '@/contexts/SettingsContext';

interface SoundOptions {
  volume?: number;
  enabled?: boolean;
  tone?: SoundTone;
}

// Tone configurations for different sound styles
const toneConfigs = {
  default: {
    taskComplete: { notes: [523.25, 659.25, 783.99], type: 'sine' as OscillatorType, duration: 0.3 },
    achievement: { notes: [392, 523.25, 659.25, 783.99, 1046.5], type: 'triangle' as OscillatorType, duration: 0.4 },
  },
  soft: {
    taskComplete: { notes: [440, 523.25, 659.25], type: 'sine' as OscillatorType, duration: 0.4 },
    achievement: { notes: [329.63, 440, 523.25, 659.25, 880], type: 'sine' as OscillatorType, duration: 0.5 },
  },
  chime: {
    taskComplete: { notes: [1046.5, 1318.5, 1568], type: 'sine' as OscillatorType, duration: 0.25 },
    achievement: { notes: [783.99, 987.77, 1174.66, 1396.91, 1568], type: 'sine' as OscillatorType, duration: 0.35 },
  },
  retro: {
    taskComplete: { notes: [262, 330, 392], type: 'square' as OscillatorType, duration: 0.15 },
    achievement: { notes: [262, 330, 392, 523, 659], type: 'square' as OscillatorType, duration: 0.2 },
  },
};

export function useSoundEffects(options: SoundOptions = {}) {
  const { volume = 0.3, enabled = true, tone = 'default' } = options;
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Play a simple tone with the Web Audio API
  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!enabled) return;
    
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }, [enabled, volume, getAudioContext]);

  // Task completion sound - uses tone configuration
  const playTaskComplete = useCallback(() => {
    if (!enabled) return;
    
    try {
      const ctx = getAudioContext();
      const config = toneConfigs[tone].taskComplete;
      
      config.notes.forEach((freq, i) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = config.type;
        
        const startTime = ctx.currentTime + i * 0.1;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume * 0.4, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + config.duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + config.duration + 0.05);
      });
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }, [enabled, volume, getAudioContext, tone]);

  // Achievement unlocked - uses tone configuration
  const playAchievement = useCallback(() => {
    if (!enabled) return;
    
    try {
      const ctx = getAudioContext();
      const config = toneConfigs[tone].achievement;
      
      config.notes.forEach((freq, i) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = config.type;
        
        const startTime = ctx.currentTime + i * 0.12;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume * 0.5, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + config.duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + config.duration + 0.05);
      });
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }, [enabled, volume, getAudioContext, tone]);

  // Button click - subtle pop
  const playClick = useCallback(() => {
    playTone(800, 0.05, 'sine');
  }, [playTone]);

  // Error sound - descending buzz
  const playError = useCallback(() => {
    if (!enabled) return;
    
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.setValueAtTime(400, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
      oscillator.type = 'sawtooth';
      
      gainNode.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }, [enabled, volume, getAudioContext]);

  // Focus mode ambient - soft drone (returns stop function)
  const startAmbient = useCallback(() => {
    if (!enabled) return () => {};
    
    try {
      const ctx = getAudioContext();
      const oscillators: OscillatorNode[] = [];
      const gainNodes: GainNode[] = [];
      
      // Create multiple oscillators for a richer ambient sound
      const frequencies = [60, 120, 180, 240]; // Harmonic series based on ~60Hz
      
      frequencies.forEach((freq, i) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        // Lower volume for higher harmonics
        const harmVol = volume * 0.08 * (1 / (i + 1));
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(harmVol, ctx.currentTime + 2);
        
        oscillator.start(ctx.currentTime);
        
        oscillators.push(oscillator);
        gainNodes.push(gainNode);
      });
      
      // Return stop function
      return () => {
        const stopTime = ctx.currentTime + 1;
        gainNodes.forEach(gain => {
          gain.gain.linearRampToValueAtTime(0, stopTime);
        });
        oscillators.forEach(osc => {
          osc.stop(stopTime + 0.1);
        });
      };
    } catch (e) {
      console.warn('Audio playback failed:', e);
      return () => {};
    }
  }, [enabled, volume, getAudioContext]);

  return {
    playTaskComplete,
    playAchievement,
    playClick,
    playError,
    startAmbient,
    playTone,
  };
}
