import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TimerRingProps {
  duration: number; // seconds
  isRunning: boolean;
  onTimeUp: () => void;
  size?: number;
}

export function TimerRing({ duration, isRunning, onTimeUp, size = 48 }: TimerRingProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCalledTimeUp = useRef(false);

  useEffect(() => {
    setTimeLeft(duration);
    hasCalledTimeUp.current = false;
  }, [duration]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            if (!hasCalledTimeUp.current) {
              hasCalledTimeUp.current = true;
              setTimeout(onTimeUp, 0);
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft, onTimeUp]);

  const progress = timeLeft / duration;
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const urgentColor = timeLeft <= 10;
  const warningColor = timeLeft <= 20 && !urgentColor;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={3}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={urgentColor ? "hsl(var(--destructive))" : warningColor ? "hsl(var(--gs-ir))" : "hsl(var(--accent))"}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transition={{ duration: 0.5 }}
        />
      </svg>
      <span className={cn(
        "absolute text-xs font-bold tabular-nums",
        urgentColor ? "text-destructive" : warningColor ? "text-[hsl(var(--gs-ir))]" : "text-foreground"
      )}>
        {timeLeft}
      </span>
      {urgentColor && timeLeft > 0 && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-destructive/30"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </div>
  );
}
