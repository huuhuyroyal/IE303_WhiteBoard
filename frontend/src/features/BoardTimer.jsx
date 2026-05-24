import {
  Pause,
  Play,
  Plus,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const DEFAULT_DURATION_MS = 3 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;
const TICK_MS = 250;

export default function BoardTimer({ boardId, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [timerState, setTimerState] = useState(() => ({
    remainingMs: DEFAULT_DURATION_MS,
    isRunning: false,
    lastStartedAt: null,
    muted: false,
  }));
  const [now, setNow] = useState(Date.now());
  const containerRef = useRef(null);
  const hasAlertedRef = useRef(false);
  const storageKey = `board-timer:${boardId}`;
  const remainingMs = getRemainingMs(timerState, now);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      setTimerState({
        remainingMs:
          typeof parsed.remainingMs === "number"
            ? parsed.remainingMs
            : DEFAULT_DURATION_MS,
        isRunning: Boolean(parsed.isRunning),
        lastStartedAt:
          typeof parsed.lastStartedAt === "number"
            ? parsed.lastStartedAt
            : null,
        muted: Boolean(parsed.muted),
      });
    } catch {
      // Ignore malformed persisted timer state.
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(timerState));
  }, [storageKey, timerState]);

  useEffect(() => {
    if (!timerState.isRunning) return undefined;
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [timerState.isRunning]);

  useEffect(() => {
    if (timerState.isRunning && remainingMs <= 0) {
      setTimerState((prev) => ({
        ...prev,
        remainingMs: 0,
        isRunning: false,
        lastStartedAt: null,
      }));

      if (!timerState.muted && !hasAlertedRef.current) {
        hasAlertedRef.current = true;
        playTimerChime();
      }
      return;
    }

    if (remainingMs > 0) {
      hasAlertedRef.current = false;
    }
  }, [remainingMs, timerState.isRunning, timerState.muted]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const toggleRunning = () => {
    setTimerState((prev) => {
      if (prev.isRunning) {
        return {
          ...prev,
          remainingMs: getRemainingMs(prev, Date.now()),
          isRunning: false,
          lastStartedAt: null,
        };
      }

      return {
        ...prev,
        isRunning: true,
        lastStartedAt: Date.now(),
      };
    });
    setNow(Date.now());
  };

  const resetTimer = () => {
    setTimerState((prev) => ({
      ...prev,
      remainingMs: DEFAULT_DURATION_MS,
      isRunning: false,
      lastStartedAt: null,
    }));
    setNow(Date.now());
  };

  const addMinute = () => {
    setTimerState((prev) => ({
      ...prev,
      remainingMs: getRemainingMs(prev, Date.now()) + ONE_MINUTE_MS,
      lastStartedAt: prev.isRunning ? Date.now() : prev.lastStartedAt,
    }));
    setNow(Date.now());
  };

  const toggleMuted = () => {
    setTimerState((prev) => ({ ...prev, muted: !prev.muted }));
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm transition-all hover:border-violet-300 hover:shadow-md"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-violet-600">
          {timerState.isRunning ? <Pause size={14} /> : <Play size={14} />}
        </div>
        <span className="font-mono text-lg tracking-[0.2em] text-violet-600">
          {formatClock(remainingMs)}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+12px)] w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                Board Timer
              </h3>{" "}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4 px-5 py-5">
            <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center shadow-inner">
              <div className="font-mono text-[56px] leading-none tracking-[0.18em] text-slate-900">
                {formatClock(remainingMs)}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={addMinute}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Plus size={16} />1 min
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetTimer}
                  className="rounded-full border border-slate-200 p-3 text-slate-600 transition-colors hover:bg-slate-50"
                  title="Reset timer"
                >
                  <RotateCcw size={18} />
                </button>
                <button
                  type="button"
                  onClick={toggleRunning}
                  className="rounded-full bg-violet-500 p-3 text-white shadow-lg shadow-violet-200 transition-transform hover:scale-[1.03] hover:bg-violet-600"
                  title={timerState.isRunning ? "Pause timer" : "Start timer"}
                >
                  {timerState.isRunning ? (
                    <Pause size={22} />
                  ) : (
                    <Play size={22} fill="currentColor" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getRemainingMs(timerState, now) {
  if (!timerState.isRunning || !timerState.lastStartedAt) {
    return Math.max(0, timerState.remainingMs);
  }
  return Math.max(0, timerState.remainingMs - (now - timerState.lastStartedAt));
}

function formatClock(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function playTimerChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      660,
      context.currentTime + 0.35,
    );

    gainNode.gain.setValueAtTime(0.001, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.15,
      context.currentTime + 0.02,
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      context.currentTime + 0.45,
    );

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.45);
    oscillator.onended = () => {
      void context.close();
    };
  } catch {
    // Ignore audio failures.
  }
}
