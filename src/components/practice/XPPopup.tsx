import { motion, AnimatePresence } from "framer-motion";
import { Flame, Zap, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface XPPopupProps {
  show: boolean;
  xp: number;
  isCorrect: boolean;
  streak?: number;
  bonusTime?: number;
}

export function XPPopup({ show, xp, isCorrect, streak = 0, bonusTime = 0 }: XPPopupProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.5 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div className={cn(
            "glass-card rounded-2xl px-5 py-3 flex items-center gap-3 shadow-xl",
            isCorrect ? "border-[hsl(var(--gs-economy))]/30" : "border-destructive/30"
          )}>
            {isCorrect ? (
              <>
                <motion.div
                  initial={{ rotate: -20, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                >
                  {streak >= 3 ? (
                    <Star className="h-6 w-6 text-accent fill-accent" />
                  ) : (
                    <Zap className="h-6 w-6 text-accent fill-accent" />
                  )}
                </motion.div>
                <div className="text-center">
                  <motion.p
                    className="text-lg font-bold text-accent"
                    initial={{ scale: 1.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.15 }}
                  >
                    +{xp} XP
                  </motion.p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {streak >= 2 && (
                      <span className="flex items-center gap-0.5">
                        <Flame className="h-3 w-3 text-accent" />{streak}× streak
                      </span>
                    )}
                    {bonusTime > 0 && (
                      <span>+{bonusTime} speed bonus</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg">😔</span>
                <p className="text-sm font-semibold text-destructive">{xp < 0 ? `${xp} XP` : "No XP"}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
