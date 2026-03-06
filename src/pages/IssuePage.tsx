import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Brain, PenTool, Clock, ExternalLink } from "lucide-react";

const IssuePage = () => {
  const { id } = useParams();

  return (
    <div className="container max-w-4xl py-4 sm:py-6 px-4">
      {/* Reading progress bar */}
      <div className="fixed top-0 lg:top-16 left-0 right-0 h-1 bg-muted z-40">
        <div className="h-full bg-accent w-1/3 transition-all" />
      </div>

      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Badge className="gs-tag-economy border text-xs">Economy</Badge>
          <Badge className="gs-tag-environment border text-xs">Environment</Badge>
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground leading-tight mb-2.5">
          RBI Introduces New Framework for Climate Risk Assessment in Banking
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs sm:text-sm">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Updated 2h ago</span>
          <span>4 sources</span>
          <span>Confidence: 85%</span>
        </div>
      </div>

      <Tabs defaultValue="prelims" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-5 h-11">
          <TabsTrigger value="prelims" className="flex items-center gap-1.5 text-xs sm:text-sm h-9">
            <BookOpen className="h-3.5 w-3.5" /> Prelims
          </TabsTrigger>
          <TabsTrigger value="mains" className="flex items-center gap-1.5 text-xs sm:text-sm h-9">
            <Brain className="h-3.5 w-3.5" /> Mains
          </TabsTrigger>
          <TabsTrigger value="essay" className="flex items-center gap-1.5 text-xs sm:text-sm h-9">
            <PenTool className="h-3.5 w-3.5" /> Essay
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prelims" className="reading-prose space-y-4">
          <div className="glass-card rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-foreground text-base font-sans">Key Facts</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                <span>RBI mandates climate risk stress-testing for all scheduled commercial banks from FY 2025-26.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                <span>Framework aligns with TCFD (Task Force on Climate-related Financial Disclosures) recommendations.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                <span>Banks must classify assets into "green", "transition", and "brown" categories for risk assessment.</span>
              </li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="mains" className="reading-prose space-y-4">
          <div className="glass-card rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-foreground text-base font-sans">Background</h3>
            <p className="text-sm text-muted-foreground">Climate change poses systemic risks to financial stability. The RBI's move follows global central banks integrating climate risks into prudential regulation...</p>
          </div>
        </TabsContent>

        <TabsContent value="essay" className="reading-prose space-y-4">
          <div className="glass-card rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-foreground text-base font-sans">Essay Hooks</h3>
            <blockquote className="border-l-2 border-accent pl-4 italic text-sm text-muted-foreground">
              "The economy is a wholly owned subsidiary of the environment." — Herman Daly
            </blockquote>
          </div>
        </TabsContent>
      </Tabs>

      {/* Static Anchors */}
      <div className="mt-8 glass-card rounded-xl p-5">
        <h3 className="font-semibold text-foreground text-sm font-sans mb-3 flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-accent" /> Static Anchors — Revise These
        </h3>
        <div className="flex flex-wrap gap-2">
          {["RBI Functions", "Basel Norms III", "TCFD Framework", "Green Finance"].map((anchor) => (
            <Badge key={anchor} variant="outline" className="text-xs cursor-pointer hover:bg-muted">
              {anchor}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IssuePage;
