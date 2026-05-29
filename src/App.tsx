import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "motion/react";
import { useEffect, useRef, useState } from "react";

const SAVE_DELAY_MS = 3000;

type SaveState = "idle" | "saving" | "saved";

/* ─── Web Audio Sound Design ──────────────────────────────────────────────── */

function getAC(): AudioContext {
  if (!(window as any)._saveAC) {
    (window as any)._saveAC = new AudioContext()
  }
  return (window as any)._saveAC
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12, when = 0) {
  const ac = getAC()
  if (ac.state === 'suspended') ac.resume()
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freq, ac.currentTime + when)
  gain.gain.setValueAtTime(0, ac.currentTime + when)
  gain.gain.linearRampToValueAtTime(vol, ac.currentTime + when + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + when + dur)
  osc.start(ac.currentTime + when)
  osc.stop(ac.currentTime + when + dur + 0.02)
}

const sounds = {
  hover:   () => tone(960, 0.035, 'triangle', 0.025),
  click:   () => { tone(560, 0.06, 'triangle', 0.1); tone(400, 0.09, 'triangle', 0.06, 0.04) },
  tick:    () => tone(680, 0.022, 'square', 0.018),
  success: () => {
    tone(1047, 0.15, 'sine', 0.1)
    tone(1319, 0.18, 'sine', 0.09, 0.12)
    tone(1568, 0.28, 'sine', 0.07, 0.22)
  },
}

/* ─── Main Component ──────────────────────────────────────────────────────── */

export default function App() {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timerRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  const handleClick = () => {
    if (saveState === "saving") return;

    if (saveState === "saved") {
      setSaveState("idle");
      return;
    }

    sounds.click();
    setSaveState("saving");

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setSaveState("saved");
    }, SAVE_DELAY_MS);
  };

  // Tick sound during saving
  useEffect(() => {
    if (saveState === "saving") {
      tickRef.current = window.setInterval(() => sounds.tick(), 340);
    } else {
      if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
      if (saveState === "saved") sounds.success();
    }
    return () => { if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; } };
  }, [saveState]);

  const isIdle = saveState === "idle";

  const handleBackdropClick = () => {
    if (saveState === "saved") setSaveState("idle");
  };

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-[#101010] flex items-center justify-center cursor-pointer"
      onClick={handleBackdropClick}
    >
      {/* 400×400 artboard — zoomed to fit screen */}
      <div className="flex h-[400px] w-[400px] items-center justify-center bg-[#101010] scale-[2] origin-center">
        <div className="relative flex justify-center" onClick={(e) => e.stopPropagation()}>
          {/* Pill button */}
          <motion.button
            type="button"
            onClick={handleClick}
            onMouseEnter={() => { if (isIdle) sounds.hover() }}
            disabled={saveState === "saving"}
            layout
            className="relative mt-1 inline-flex h-[32px] items-center justify-center rounded-[32px] px-4 text-[12px] font-semibold leading-[20px] tracking-[0.02em] disabled:cursor-not-allowed overflow-visible"
            animate={{
              backgroundColor: isIdle ? "#F0F0F0" : "#1F1F1F",
              color: isIdle ? "#1F1F1F" : "#F0F0F0",
            }}
            transition={{ duration: 0.25, ease: "easeInOut", layout: { duration: 0.25, ease: "easeInOut" } }}
            whileHover={isIdle ? { scale: 1.04 } : undefined}
            whileTap={isIdle ? { scale: 0.97 } : undefined}
          >
            <MorphingLabel state={saveState} />
          </motion.button>

          {/* Badge — top-right of pill */}
          <AnimatePresence>
            {!isIdle && (
              <motion.div
                className="absolute right-0 top-0 flex h-[16px] w-[16px] items-center justify-center rounded-[8px] bg-[#1F1F1F]"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <SpinnerToCheck isSaved={saveState === "saved"} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ─── Morphing Label Component ─────────────────────────────────────────── */

const SUFFIX_TRANSITION = { duration: 0.175, ease: "easeOut" as const };

function MorphingLabel({ state }: { state: SaveState }) {
  const root = "Sav";
  const suffixes: Record<SaveState, string> = {
    idle: "e",
    saving: "ing",
    saved: "ed",
  };

  const suffixWidth: Record<SaveState, number> = {
    idle: 1,
    saving: 3,
    saved: 2,
  };

  return (
    <span className="inline-flex items-center justify-center whitespace-nowrap">
      <span className="inline-block">{root}</span>
      <motion.span
        layout
        className="relative inline-block h-[20px] leading-[20px] overflow-hidden align-top"
        animate={{ width: `${suffixWidth[state]}ch` }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={state}
            className="absolute left-0 top-0 inline-block"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={SUFFIX_TRANSITION}
          >
            {suffixes[state]}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </span>
  );
}

/* ─── Spinner → Checkmark morph (12×12) ───────────────────────────────── */

const CIRCUMFERENCE = 2 * Math.PI * 5;

function SpinnerToCheck({ isSaved }: { isSaved: boolean }) {
  const rotation = useMotionValue(0);
  const dashOffset = useMotionValue(CIRCUMFERENCE * 0.67);
  const fillOpacity = useMotionValue(0);
  const checkProgress = useMotionValue(0);

  useEffect(() => {
    if (isSaved) return;
    const controls = animate(rotation, rotation.get() + 360, {
      duration: 0.7,
      ease: "linear",
      repeat: Infinity,
    });
    return () => controls.stop();
  }, [isSaved, rotation]);

  useEffect(() => {
    if (!isSaved) return;
    const step1 = animate(dashOffset, 0, { duration: 0.3, ease: "easeInOut" });
    const timeout = setTimeout(() => {
      animate(fillOpacity, 1, { duration: 0.2, ease: "easeOut" });
      animate(checkProgress, 1, { duration: 0.3, ease: "easeOut" });
    }, 280);
    return () => { step1.stop(); clearTimeout(timeout); };
  }, [isSaved, dashOffset, fillOpacity, checkProgress]);

  useEffect(() => {
    if (!isSaved) {
      dashOffset.set(CIRCUMFERENCE * 0.67);
      fillOpacity.set(0);
      checkProgress.set(0);
    }
  }, [isSaved, dashOffset, fillOpacity, checkProgress]);

  const trackOpacity = useTransform(fillOpacity, [0, 1], [0.2, 0]);
  const arcOpacity = useTransform(fillOpacity, [0, 0.5], [1, 0]);

  return (
    <div className="relative h-[12px] w-[12px]">
      <motion.div className="absolute inset-0" style={{ rotate: rotation }}>
        <svg viewBox="0 0 12 12" fill="none" className="h-full w-full">
          <motion.circle cx="6" cy="6" r="5" stroke="#FFFFFF" strokeWidth="1.5" style={{ opacity: trackOpacity }} />
          <motion.circle
            cx="6" cy="6" r="5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            style={{ strokeDashoffset: dashOffset, opacity: arcOpacity }}
            transform="rotate(-90 6 6)"
          />
        </svg>
      </motion.div>
      <motion.div className="absolute inset-0 rounded-full bg-white" style={{ opacity: fillOpacity }} />
      <motion.svg viewBox="0 0 12 12" fill="none" className="absolute inset-0 h-full w-full">
        <motion.path
          d="M3.5 6.2L5.2 7.8L8.5 4.2"
          stroke="#1F1F1F" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
          style={{ pathLength: checkProgress }}
        />
      </motion.svg>
    </div>
  );
}
