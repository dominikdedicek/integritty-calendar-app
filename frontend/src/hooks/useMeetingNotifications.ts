import { useEffect, useRef, useCallback } from 'react';
import { CalendarEvent } from '../types';

interface UseMeetingNotificationsProps {
  currentEvent: CalendarEvent | null;
}

// Global audio context - reused across calls
let globalAudioContext: AudioContext | null = null;
let audioUnlocked = false;

function getAudioContext(): AudioContext {
  if (!globalAudioContext) {
    globalAudioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return globalAudioContext;
}

// Unlock audio on first user interaction
function unlockAudio(): void {
  if (audioUnlocked) return;

  const unlock = async () => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      // Play a silent sound to unlock
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0;
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.001);
      audioUnlocked = true;
      console.log('Audio unlocked');

      // Remove listeners after unlock
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown', unlock);
    } catch (e) {
      console.error('Failed to unlock audio:', e);
    }
  };

  document.addEventListener('click', unlock);
  document.addEventListener('touchstart', unlock);
  document.addEventListener('keydown', unlock);
}

// Initialize audio unlock on module load
if (typeof window !== 'undefined') {
  unlockAudio();
}

// Simple bell sound using Web Audio API
function createBellSound(audioContext: AudioContext): void {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 830; // Bell frequency
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}

async function playBell(times: number): Promise<void> {
  try {
    const audioContext = getAudioContext();

    // Resume if suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    for (let i = 0; i < times; i++) {
      createBellSound(audioContext);
      if (i < times - 1) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }
    console.log(`Played ${times} bell(s)`);
  } catch (e) {
    console.error('Failed to play bell:', e);
  }
}

export function useMeetingNotifications({ currentEvent }: UseMeetingNotificationsProps): void {
  const notifiedRef = useRef<{
    fiveMin: boolean;
    oneMin: boolean;
    end: boolean;
    eventId: string | null;
  }>({
    fiveMin: false,
    oneMin: false,
    end: false,
    eventId: null,
  });

  const checkAndNotify = useCallback(() => {
    if (!currentEvent) {
      // Reset notifications when no meeting
      notifiedRef.current = {
        fiveMin: false,
        oneMin: false,
        end: false,
        eventId: null,
      };
      return;
    }

    // Reset if different event
    if (notifiedRef.current.eventId !== currentEvent.id) {
      notifiedRef.current = {
        fiveMin: false,
        oneMin: false,
        end: false,
        eventId: currentEvent.id,
      };
    }

    const now = new Date().getTime();
    const endTime = new Date(currentEvent.end).getTime();
    const minutesRemaining = (endTime - now) / 1000 / 60;

    // 5 minutes before end - 1 bell
    if (minutesRemaining <= 5 && minutesRemaining > 4 && !notifiedRef.current.fiveMin) {
      notifiedRef.current.fiveMin = true;
      playBell(1);
      console.log('Notification: 5 minutes remaining - 1 bell');
    }

    // 1 minute before end - 2 bells
    if (minutesRemaining <= 1 && minutesRemaining > 0.5 && !notifiedRef.current.oneMin) {
      notifiedRef.current.oneMin = true;
      playBell(2);
      console.log('Notification: 1 minute remaining - 2 bells');
    }

    // Meeting ended - 3 bells
    if (minutesRemaining <= 0 && !notifiedRef.current.end) {
      notifiedRef.current.end = true;
      playBell(3);
      console.log('Notification: Meeting ended - 3 bells');
    }
  }, [currentEvent]);

  useEffect(() => {
    // Check immediately
    checkAndNotify();

    // Check every second for precise timing
    const interval = setInterval(checkAndNotify, 1000);

    return () => clearInterval(interval);
  }, [checkAndNotify]);
}
