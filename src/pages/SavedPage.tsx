import { Bookmark } from "lucide-react";

const SavedPage = () => (
  <div className="container max-w-3xl py-6 px-4">
    <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Saved</h1>
    <p className="text-sm text-muted-foreground mb-6">Your bookmarked issues</p>
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <Bookmark className="h-12 w-12 mb-4 opacity-30" />
      <p className="text-sm">No saved issues yet</p>
      <p className="text-xs mt-1">Bookmark issues from the daily brief to see them here</p>
    </div>
  </div>
);

export default SavedPage;
