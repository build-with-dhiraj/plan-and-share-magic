import { Link, useLocation } from "react-router-dom";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import mentorAvatar from "@/assets/mentor-avatar.png";

export function MentorFAB() {
  const location = useLocation();
  
  // Don't show on the mentor page itself
  if (location.pathname === "/mentor") return null;

  return (
    <Link to="/mentor" className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40">
      <motion.div
        whileHover={{ scale: 1.12, rotate: -3 }}
        whileTap={{ scale: 0.92 }}
        className={cn(
          "h-14 w-14 rounded-2xl flex items-center justify-center overflow-hidden p-0.5",
          "bg-gradient-to-br from-white/80 to-slate-100/80 dark:from-slate-700/80 dark:to-slate-800/80 backdrop-blur-sm",
          "shadow-[0_8px_30px_-4px_rgba(0,0,0,0.25),0_2px_8px_-2px_rgba(0,0,0,0.15)]",
          "drop-shadow-lg",
          "cursor-pointer transition-shadow hover:shadow-[0_12px_40px_-4px_rgba(0,0,0,0.3),0_4px_12px_-2px_rgba(0,0,0,0.2)]",
          "border border-white/60 dark:border-white/10"
        )}
      >
        <img src={mentorAvatar} alt="AI Mentor" className="h-[3.25rem] w-[3.25rem] rounded-xl object-cover object-[center_15%] scale-150" />
      </motion.div>
    </Link>
  );
}
