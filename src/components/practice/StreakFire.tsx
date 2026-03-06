import { motion, AnimatePresence } from "framer-motion";

interface StreakFireProps {
  streak: number;
}

const messages = [
  "",
  "",
  "On fire! 🔥",
  "Hat-trick! 🎩",
  "Unstoppable! ⚡",
  "LEGENDARY! 🌟",
];

export function StreakFire({ streak }: StreakFireProps) {
  if (streak < 2) return null;
  const msg = messages[Math.min(streak, messages.length - 1)];

  return (
    <AnimatePresence>
      <motion.div
        key={streak}
        initial={{ opacity: 0, scale: 0.5, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.5 }}
        className="text-center"
      >
        <motion.p
          className="text-sm font-bold text-accent"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.4 }}
        >
          {msg}
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}
