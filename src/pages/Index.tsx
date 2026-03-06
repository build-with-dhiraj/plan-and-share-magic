import { motion } from "framer-motion";
import { IssueCard } from "@/components/issues/IssueCard";
import { CheckCircle } from "lucide-react";

const SAMPLE_ISSUES = [
  {
    id: "1",
    title: "India's Digital Public Infrastructure Gets Global Recognition at G20",
    synopsis: "India's DPI stack — Aadhaar, UPI, DigiLocker — endorsed as a model for developing nations at the G20 Digital Economy Ministers' meet.",
    gsTags: ["economy", "ir", "science"] as const,
    sourceCount: 7,
    confidence: 0.92,
    staticAnchor: "Digital India Programme, Article 21 (Privacy)",
    isHero: true,
  },
  {
    id: "2",
    title: "Supreme Court Expands Scope of Article 21 to Include Climate Rights",
    synopsis: "In a landmark ruling, the SC held that the right to a clean environment is integral to the right to life under Article 21.",
    gsTags: ["polity", "environment"] as const,
    sourceCount: 5,
    confidence: 0.88,
    staticAnchor: "Article 21, NHRC, Paris Agreement",
  },
  {
    id: "3",
    title: "RBI Introduces New Framework for Climate Risk Assessment in Banking",
    synopsis: "RBI circular mandates all scheduled commercial banks to integrate climate-related financial risks into their stress-testing frameworks.",
    gsTags: ["economy", "environment"] as const,
    sourceCount: 4,
    confidence: 0.85,
    staticAnchor: "RBI Functions, Basel Norms, TCFD",
  },
  {
    id: "4",
    title: "Sixth Schedule Areas: Centre Proposes Amendments for Greater Autonomy",
    synopsis: "MHA proposes amendments to Sixth Schedule to grant autonomous councils more fiscal and legislative powers in Northeast states.",
    gsTags: ["polity", "society"] as const,
    sourceCount: 3,
    confidence: 0.82,
    staticAnchor: "Sixth Schedule, Article 244, NEFA",
  },
  {
    id: "5",
    title: "ISRO's Gaganyaan Crew Module Successfully Completes Abort Test",
    synopsis: "ISRO demonstrates the crew escape system of Gaganyaan in a test flight from Sriharikota, a major milestone for India's human spaceflight programme.",
    gsTags: ["science"] as const,
    sourceCount: 6,
    confidence: 0.9,
    staticAnchor: "ISRO Missions, Space Policy 2023",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const Index = () => {
  return (
    <div className="container max-w-3xl py-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Today's Brief</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <motion.div className="space-y-4" variants={container} initial="hidden" animate="show">
        {SAMPLE_ISSUES.map((issue) => (
          <motion.div key={issue.id} variants={item}>
            <IssueCard {...issue} />
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="mt-8 flex items-center justify-center gap-2 text-muted-foreground py-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <CheckCircle className="h-5 w-5 text-gs-economy" />
        <span className="text-sm font-medium">You're all caught up</span>
      </motion.div>
    </div>
  );
};

export default Index;
