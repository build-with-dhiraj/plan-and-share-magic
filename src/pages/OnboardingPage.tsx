import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const OnboardingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        className="max-w-md w-full text-center space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-2xl">U</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome to UPSC Engine</h1>
          <p className="text-muted-foreground">Your daily current affairs companion for UPSC preparation</p>
        </div>

        <div className="space-y-3">
          <div className="glass-card rounded-xl p-4 text-left">
            <p className="font-medium text-sm text-foreground">📰 Daily Brief</p>
            <p className="text-xs text-muted-foreground mt-1">10-15 curated issues, not 100 articles</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-left">
            <p className="font-medium text-sm text-foreground">🧠 Built-in Revision</p>
            <p className="text-xs text-muted-foreground mt-1">Spaced repetition so you actually remember</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-left">
            <p className="font-medium text-sm text-foreground">🎯 Prelims + Mains + Essay</p>
            <p className="text-xs text-muted-foreground mt-1">Same issue, three exam-ready views</p>
          </div>
        </div>

        <Button className="w-full h-12 bg-primary text-primary-foreground text-base" onClick={() => navigate("/")}>
          Get Started
        </Button>
      </motion.div>
    </div>
  );
};

export default OnboardingPage;
