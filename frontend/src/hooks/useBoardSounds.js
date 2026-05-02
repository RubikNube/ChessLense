import { useCallback, useEffect, useRef } from "react";

const BOARD_SOUND_PATTERNS = {
  move: [
    [660, 0.05, 0.045],
    [880, 0.045, 0.04],
  ],
  capture: [
    [440, 0.045, 0.05],
    [330, 0.07, 0.055],
  ],
  check: [
    [740, 0.05, 0.045],
    [988, 0.065, 0.05],
    [1175, 0.07, 0.05],
  ],
  "game-end": [
    [523, 0.05, 0.045],
    [659, 0.06, 0.05],
    [784, 0.12, 0.055],
  ],
};

function useBoardSounds(enabled) {
  const audioContextRef = useRef(null);

  useEffect(() => {
    return () => {
      const audioContext = audioContextRef.current;
      audioContextRef.current = null;

      if (!audioContext || audioContext.state === "closed") {
        return;
      }

      void audioContext.close().catch((error) => {
        console.error("Failed to close board sound audio context:", error);
      });
    };
  }, []);

  return useCallback((eventName) => {
    if (!enabled) {
      return;
    }

    const pattern = BOARD_SOUND_PATTERNS[eventName];

    if (!pattern) {
      console.error(`Unknown board sound event: ${eventName}`);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const AudioContextConstructor =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextConstructor) {
      console.error("Web Audio API is unavailable for board sounds.");
      return;
    }

    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContextConstructor();
    }

    const audioContext = audioContextRef.current;
    const playPattern = () => {
      let startTime = audioContext.currentTime;

      for (const [frequency, duration, volume] of pattern) {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, startTime);
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        gain.gain.linearRampToValueAtTime(volume, startTime + duration * 0.6);
        gain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);

        startTime += duration;
      }
    };

    if (audioContext.state === "suspended") {
      void audioContext.resume().then(playPattern).catch((error) => {
        console.error("Failed to resume board sound audio context:", error);
      });
      return;
    }

    playPattern();
  }, [enabled]);
}

export default useBoardSounds;
