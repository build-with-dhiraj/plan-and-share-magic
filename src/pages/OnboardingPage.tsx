import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Target, BookOpen, Clock, ChevronRight, Check } from "lucide-react";

const EXAM_TARGETS = [
  { id: "cse", label: "UPSC CSE", desc: "Civil Services Examination" },
  { id: "state_pcs", label: "State PCS", desc: "State Public Service Commission" },
  { id: "both", label: "Both", desc: "CSE + State PCS preparation" },
];

const OPTIONAL_SUBJECTS = [
  "Anthropology", "Geography", "History", "Political Science",
  "Public Administration", "Sociology", "Philosophy", "Economics",
  "Psychology", "Law", "Literature", "Mathematics",
];

const STUDY_HOURS = [
  { value: 2, label: "2 hrs", desc: "Casual" },
  { value: 4, label: "4 hrs", desc: "Regular" },
  { value: 6, label: "6 hrs", desc: "Serious" },
  { value: 8, label: "8+hrs", desc: "Full-time" },
];

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [examTarget, setExamTarget] = useState("");
  const [optionalSubjects, setOptionalSubjects] = useState<string[]>([]);
  const [studyHours, setStudyHours] = useState(4);
  const [saving, setSaving] = useState(false);

  const toggleSubject = (s: string) => {
    setOptionalSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : prev.length < 2 ? [...prev, s] : prev
    );
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          exam_target: examTarget,
          optional_subjects: optionalSubjects,
          study_hours_per_day: studyHours,
          onboarding_complete: true,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const canProceed = step === 0 ? !!examTarget : step === 1 ? true : true;

  const steps = [
    {
      icon: Target,
      title: "What are you preparing for?",
      subtitle: "We'll tailor your daily content accordingly",
      content: (
        <div className="space-y-3">
          {EXAM_TARGETS.map((t) => (
            <motion.button
              key={t.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setExamTarget(t.id)}
              className={cn(
                "w-full text-left glass-card rounded-xl p-4 border-2 transition-all",
                examTarget === t.id
                  ? "border-accent bg-accent/10"
                  : "border-transparent hover:border-border"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
                {examTarget === t.id && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check className="h-5 w-5 text-accent" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      ),
    },
    {
      icon: BookOpen,
      title: "Choose optional subjects",
      subtitle: "Select up to 2 (you can change later)",
      content: (
        <div className="grid grid-cols-2 gap-2">
          {OPTIONAL_SUBJECTS.map((s) => (
            <motion.button
              key={s}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleSubject(s)}
              className={cn(
                "text-left rounded-xl p-3 border-2 transition-all text-sm",
                optionalSubjects.includes(s)
                  ? "border-accent bg-accent/10 font-medium text-foreground"
                  : "border-border text-muted-foreground hover:border-accent/50"
              )}
            >
              {s}
            </motion.button>
          ))}
        </div>
      ),
    },
    {
      icon: Clock,
      title: "Daily study hours?",
      subtitle: "We'll pace your content and revision goals",
      content: (
        <div className="grid grid-cols-2 gap-3">
          {STUDY_HOURS.map((h) => (
            <motion.button
              key={h.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStudyHours(h.value)}
              className={cn(
                "glass-card rounded-xl p-5 text-center border-2 transition-all",
                studyHours === h.value
                  ? "border-accent bg-accent/10"
                  : "border-transparent hover:border-border"
              )}
            >
              <p className="text-2xl font-bold text-foreground">{h.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{h.desc}</p>
            </motion.button>
          ))}
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const StepIcon = currentStep.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <motion.div
        className="max-w-md w-full space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === step ? "w-8 bg-accent" : i < step ? "w-2 bg-accent/50" : "w-2 bg-border"
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <div className="text-center space-y-2">
              <div className="h-12 w-12 rounded-xl bg-accent/15 flex items-center justify-center mx-auto">
                <StepIcon className="h-6 w-6 text-accent" />
              </div>
              <h1 className="text-xl font-bold text-foreground">{currentStep.title}</h1>
              <p className="text-sm text-muted-foreground">{currentStep.subtitle}</p>
            </div>

            {currentStep.content}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <Button
            className="flex-1 h-12 gap-2"
            disabled={!canProceed || saving}
            onClick={() => {
              if (step < steps.length - 1) {
                setStep(step + 1);
              } else {
                handleComplete();
              }
            }}
          >
            {step === steps.length - 1 ? (saving ? "Saving..." : "Get Started") : "Continue"}
            {step < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {step === 1 && (
          <button
            onClick={() => setStep(2)}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Skip — I'll choose later
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default OnboardingPage;
