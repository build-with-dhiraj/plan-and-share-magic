import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const SearchPage = () => (
  <div className="container max-w-3xl py-6 px-4">
    <div className="relative mb-6">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input placeholder="Search issues, topics, facts..." className="pl-10 h-12 text-base" autoFocus />
    </div>
    <div className="text-center py-12 text-muted-foreground">
      <p className="text-sm">Search across all issues, facts, and topics</p>
      <p className="text-xs mt-1">Try "Article 21", "RBI policy", or "climate change"</p>
    </div>
  </div>
);

export default SearchPage;
