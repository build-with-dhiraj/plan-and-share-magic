import { motion } from "framer-motion";
import { SyllabusTagChip } from "@/components/issues/SyllabusTagChips";
import { Progress } from "@/components/ui/progress";

const GS_TOPICS = [
  { name: "Polity & Governance", slug: "polity", issueCount: 42, coverage: 78 },
  { name: "Economy", slug: "economy", issueCount: 38, coverage: 65 },
  { name: "Environment & Ecology", slug: "environment", issueCount: 29, coverage: 52 },
  { name: "International Relations", slug: "ir", issueCount: 24, coverage: 45 },
  { name: "Science & Technology", slug: "science", issueCount: 31, coverage: 60 },
  { name: "Ethics & Integrity", slug: "ethics", issueCount: 15, coverage: 35 },
  { name: "Indian History", slug: "history", issueCount: 18, coverage: 40 },
  { name: "Geography", slug: "geography", issueCount: 20, coverage: 50 },
  { name: "Society", slug: "society", issueCount: 22, coverage: 48 },
  { name: "Essay", slug: "essay", issueCount: 12, coverage: 30 },
];

const SyllabusPage = () => {
  return (
    <div className="container max-w-4xl py-4 sm:py-6 px-4">
      <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-1">Explore by Syllabus</h1>
      <p className="text-xs sm:text-sm text-muted-foreground mb-5">Browse current affairs mapped to UPSC GS papers</p>

      <motion.div
        className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.05 }}
      >
        {GS_TOPICS.map((topic) => (
          <motion.div
            key={topic.slug}
            className="glass-card rounded-xl p-4 sm:p-5 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.97]"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between mb-3">
              <SyllabusTagChip tag={topic.slug as any} />
              <span className="text-xs text-muted-foreground">{topic.issueCount} issues</span>
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-2">{topic.name}</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Coverage</span>
                <span>{topic.coverage}%</span>
              </div>
              <Progress value={topic.coverage} className="h-1.5" />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default SyllabusPage;
