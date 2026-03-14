import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminPage = () => {
  const [ingestUrl, setIngestUrl] = useState("");
  const [ingestYear, setIngestYear] = useState(2024);
  const [ingestStage, setIngestStage] = useState<"prelims" | "mains">("prelims");
  const [ingestPaper, setIngestPaper] = useState("gs1");
  const [ingestKeyUrl, setIngestKeyUrl] = useState("");
  const [ingesting, setIngesting] = useState(false);

  async function triggerIngestion() {
    if (!ingestUrl.trim()) { toast.error("Source URL is required"); return; }
    setIngesting(true);
    try {
      const resp = await supabase.functions.invoke("pyq-ingest", {
        body: {
          source_url: ingestUrl.trim(),
          year: ingestYear,
          exam_stage: ingestStage,
          paper_code: ingestPaper,
          key_url: ingestKeyUrl.trim() || undefined,
        },
      });

      if (resp.error) {
        toast.error(`Ingestion failed: ${resp.error.message}`);
      } else {
        toast.success(`Ingestion complete: ${resp.data?.questions_extracted ?? 0} questions extracted`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIngesting(false);
    }
  }

  return (
    <div className="container max-w-4xl py-6 px-4 pb-24 lg:pb-6">
      <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Admin</h1>
      <p className="text-sm text-muted-foreground mb-6">Source management & PYQ operations</p>

      <div className="grid gap-4">
        {/* Trigger New Ingestion */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-accent" /> Trigger New Ingestion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">PDF URL or paste text *</label>
              <input
                type="text"
                value={ingestUrl}
                onChange={(e) => setIngestUrl(e.target.value)}
                placeholder="https://upsc.gov.in/sites/default/files/..."
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border bg-background text-foreground"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Year</label>
                <input
                  type="number"
                  value={ingestYear}
                  onChange={(e) => setIngestYear(parseInt(e.target.value) || 2024)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border bg-background text-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Stage</label>
                <select value={ingestStage} onChange={(e) => setIngestStage(e.target.value as any)} className="w-full mt-1 px-3 py-2 text-sm rounded-lg border bg-background text-foreground">
                  <option value="prelims">Prelims</option>
                  <option value="mains">Mains</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Paper</label>
                <select value={ingestPaper} onChange={(e) => setIngestPaper(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm rounded-lg border bg-background text-foreground">
                  <option value="gs1">GS-1</option>
                  <option value="gs2">GS-2</option>
                  <option value="gs3">GS-3</option>
                  <option value="gs4">GS-4</option>
                  <option value="essay">Essay</option>
                  <option value="csat">CSAT</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Answer Key URL (optional)</label>
              <input
                type="url"
                value={ingestKeyUrl}
                onChange={(e) => setIngestKeyUrl(e.target.value)}
                placeholder="https://upsc.gov.in/sites/default/files/Answer-Key..."
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border bg-background text-foreground"
              />
            </div>

            <Button onClick={triggerIngestion} disabled={ingesting} className="w-full gap-2">
              {ingesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {ingesting ? "Ingesting..." : "Start Ingestion"}
            </Button>
          </CardContent>
        </Card>

        {/* Info card */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent" /> PYQ System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              PYQ tables have not been created yet. Source registry, ingestion jobs, and review queue will appear here once the database schema is set up.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPage;
