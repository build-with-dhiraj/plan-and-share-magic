import { Bot, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SUGGESTIONS = [
  "Explain the significance of the 16th Finance Commission",
  "Compare India's DPI with other G20 nations",
  "What are the key environmental judgments of 2024?",
  "Create a revision plan for GS Paper 2",
];

const MentorPage = () => (
  <div className="container max-w-3xl py-6 px-4 flex flex-col h-[calc(100vh-8rem)]">
    <div className="flex items-center gap-2 mb-6">
      <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
        <Bot className="h-4 w-4 text-accent" />
      </div>
      <div>
        <h1 className="text-lg font-bold text-foreground">AI Study Mentor</h1>
        <p className="text-xs text-muted-foreground">Powered by your issue database</p>
      </div>
    </div>

    <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
      <Sparkles className="h-10 w-10 text-accent mb-4 opacity-50" />
      <p className="text-sm text-muted-foreground mb-6">Ask anything about current affairs, get UPSC-focused answers with citations</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {SUGGESTIONS.map((s) => (
          <Badge key={s} variant="outline" className="cursor-pointer hover:bg-muted text-xs py-1.5 px-3">
            {s}
          </Badge>
        ))}
      </div>
    </div>

    <div className="flex gap-2 mt-4">
      <Input placeholder="Ask your study mentor..." className="flex-1" />
      <Button size="icon" className="bg-primary text-primary-foreground shrink-0">
        <Sparkles className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

export default MentorPage;
