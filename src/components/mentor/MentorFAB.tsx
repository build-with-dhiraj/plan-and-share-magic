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
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "h-14 w-14 rounded-full shadow-lg flex items-center justify-center",
          "bg-primary text-primary-foreground",
          "ring-2 ring-primary/20 ring-offset-2 ring-offset-background",
          "cursor-pointer transition-shadow hover:shadow-xl"
        )}
      >
        <img src={mentorAvatar} alt="AI Mentor" className="h-10 w-10 rounded-full object-cover" />
      </motion.div>
    </Link>
  );
}
