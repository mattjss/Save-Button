import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

const SAVE_DELAY_MS = 1400;

type SaveState = "idle" | "saving" | "saved";

type VisualConfig = {
  label: string;
  description: string;
  background: string;
  textColor: string;
  ring: string;
};

const stateConfig: Record<SaveState, VisualConfig> = {
  idle: {
    label: "Save",
    description: "Ready to save your latest changes.",
    background: "#F0F0F0",
    textColor: "#1f1f1f",
    ring: "0 0 0 1px rgba(15, 23, 42, 0.1), 0 12px 30px rgba(15, 23, 42, 0.25)"
  },
  saving: {
    label: "SAVING",
    description: "Working on it with a smooth transition.",
    background: "#111827",
    textColor: "#e2e8f0",
    ring: "0 0 0 1px rgba(148, 163, 184, 0.4), 0 18px 36px rgba(15, 23, 42, 0.2)"
  },
  saved: {
    label: "SAVED",
    description: "Everything is safely stored.",
    background: "#16a34a",
    textColor: "#f0fdf4",
    ring: "0 0 0 1px rgba(22, 163, 74, 0.5), 0 18px 36px rgba(22, 163, 74, 0.25)"
  }
};

const labelTransition = {
  type: "spring",
  stiffness: 420,
  damping: 28
} as const;

export default function App() {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timerRef = useRef<number | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const config = stateConfig[saveState];

  const nextStateDescription = useMemo(() => {
    if (saveState === "saved") {
      return "Click again to reset the button.";
    }
    if (saveState === "saving") {
      return "Hang tight, saving in progress.";
    }
    return "Click to save and preview the animation.";
  }, [saveState]);

  const handleClick = () => {
    if (saveState === "saving") {
      return;
    }

    if (saveState === "saved") {
      setSaveState("idle");
      return;
    }

    setSaveState("saving");
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setSaveState("saved");
    }, SAVE_DELAY_MS);
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto flex h-full items-center justify-center">
        <div className="flex h-[500px] w-[500px] items-center justify-center bg-[#1F1F1F] p-10 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
          <div className="flex w-full flex-col items-center gap-8 text-center">
            <motion.button
              type="button"
              onClick={handleClick}
              disabled={saveState === "saving"}
              aria-busy={saveState === "saving"}
              className="relative inline-flex items-center justify-center gap-3 rounded-[32px] px-4 py-2 text-xs font-semibold tracking-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed"
              animate={{
                backgroundColor: config.background,
                color: config.textColor,
                boxShadow: config.ring
              }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 260, damping: 24 }
              }
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={saveState}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={prefersReducedMotion ? { duration: 0 } : labelTransition}
                >
                  <span>{config.label}</span>
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}


