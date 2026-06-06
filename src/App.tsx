import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "motion/react";
import { useEffect, useRef, useState } from "react";

const SAVE_DELAY_MS = 3000;

type SaveState = "idle" | "saving" | "saved";

/* ─── Web Audio Sound Design ──────────────────────────────────────────────── */

function getAC(): AudioContext {
  if (!(window as any)._saveAC) (window as any)._saveAC = new AudioContext()
  return (window as any)._saveAC
}

function note(freq: number, dur: number, vol = 0.09, when = 0) {
  const ac = getAC()
  if (ac.state === 'suspended') ac.resume()
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  const t0 = ac.currentTime + when
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.005)
  gain.gain.setTargetAtTime(0.0001, t0 + 0.012, dur * 0.28)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.04)
}

const sounds = {
  hover: () => note(1046.5, 0.08, 0.012),
  click: () => note(659.25, 0.1, 0.11),
  tick: () => note(329.63, 0.02, 0.009),
  success: () => { note(880, 0.18, 0.095); note(1318.5, 0.26, 0.082, 0.16) },
}

/* ─── Main Component ──────────────────────────────────────────────────────── */

export default function App() {
  const isEmbed = new URLSearchParams(window.location.search).has('embed')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timerRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEmbed) return
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'theme') setTheme(e.data.theme)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [isEmbed])

  const isLight = theme === 'light'

  const handleClick = () => {
    if (saveState === "saving") return;
    if (saveState === "saved") { setSaveState("idle"); return; }
    sounds.click();
    setSaveState("saving");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => { setSaveState("saved"); }, SAVE_DELAY_MS);
  };

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

  const pillIdleBg = isLight ? "#1F1F1F" : "#F0F0F0"
  const pillIdleColor = isLight ? "#F0F0F0" : "#1F1F1F"
  const pillActiveBg = isLight ? "#F0F0F0" : "#1F1F1F"
  const pillActiveColor = isLight ? "#1F1F1F" : "#F0F0F0"
  const badgeBg = isLight ? "#F0F0F0" : "#1F1F1F"

  return (
    <div
      className={`h-screen w-screen overflow-hidden flex items-center justify-center cursor-pointer${isLight ? ' light' : ''}`}
      onClick={handleBackdropClick}
      style={{
        background: isLight ? '#FCFCFC' : '#101010',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
        borderRadius: 10,
      }}
    >
      <div
        className="flex h-[400px] w-[400px] items-center justify-center scale-[1.5] origin-center"
        style={{ background: isLight ? '#FCFCFC' : '#101010' }}
      >
        <div className="relative flex justify-center" onClick={(e) => e.stopPropagation()}>
          <motion.button
            type="button"
            onClick={handleClick}
            onMouseEnter={() => { if (isIdle) sounds.hover() }}
            disabled={saveState === "saving"}
            layout
            className="relative mt-1 inline-flex h-[32px] items-center justify-center rounded-[32px] px-4 text-[12px] font-semibold leading-[20px] tracking-[0.02em] disabled:cursor-not-allowed overflow-visible"
            animate={{
              backgroundColor: isIdle ? pillIdleBg : pillActiveBg,
              color: isIdle ? pillIdleColor : pillActiveColor,
            }}
            transition={{ duration: 0.25, ease: "easeInOut", layout: { duration: 0.25, ease: "easeInOut" } }}
            whileHover={isIdle ? { scale: 1.04 } : undefined}
            whileTap={isIdle ? { scale: 0.97 } : undefined}
          >
            <MorphingLabel state={saveState} />
          </motion.button>

          <AnimatePresence>
            {!isIdle && (
              <motion.div
                className="absolute right-0 top-0 flex h-[16px] w-[16px] items-center justify-center rounded-[8px]"
                style={{ backgroundColor: badgeBg }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <SpinnerToCheck isSaved={saveState === "saved"} isLight={isLight} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {!isEmbed && (
        <label className="toggle" aria-label="Toggle theme" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={isLight} onChange={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
          <span className="knob"></span>
        </label>
      )}
    </div>
  );
}

/* ─── Morphing Label Component ─────────────────────────────────────────── */

const SUFFIX_TRANSITION = { duration: 0.175, ease: "easeOut" as const };

function MorphingLabel({ state }: { state: SaveState }) {
  const root = "Sav";
  const suffixes: Record<SaveState, string> = { idle: "e", saving: "ing", saved: "ed" };
  const suffixWidth: Record<SaveState, number> = { idle: 1, saving: 3, saved: 2 };

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

function SpinnerToCheck({ isSaved, isLight }: { isSaved: boolean; isLight: boolean }) {
  const rotation = useMotionValue(0);
  const dashOffset = useMotionValue(CIRCUMFERENCE * 0.67);
  const fillOpacity = useMotionValue(0);
  const checkProgress = useMotionValue(0);

  const strokeColor = isLight ? "#1F1F1F" : "#FFFFFF"
  const checkColor = isLight ? "#F0F0F0" : "#1F1F1F"
  const fillColor = isLight ? "#1F1F1F" : "white"

  useEffect(() => {
    if (isSaved) return;
    const controls = animate(rotation, rotation.get() + 360, {
      duration: 0.7, ease: "linear", repeat: Infinity,
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
          <motion.circle cx="6" cy="6" r="5" stroke={strokeColor} strokeWidth="1.5" style={{ opacity: trackOpacity }} />
          <motion.circle
            cx="6" cy="6" r="5" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            style={{ strokeDashoffset: dashOffset, opacity: arcOpacity }}
            transform="rotate(-90 6 6)"
          />
        </svg>
      </motion.div>
      <motion.div className="absolute inset-0 rounded-full" style={{ opacity: fillOpacity, backgroundColor: fillColor }} />
      <motion.svg viewBox="0 0 12 12" fill="none" className="absolute inset-0 h-full w-full">
        <motion.path
          d="M3.5 6.2L5.2 7.8L8.5 4.2"
          stroke={checkColor} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
          style={{ pathLength: checkProgress }}
        />
      </motion.svg>
    </div>
  );
}
