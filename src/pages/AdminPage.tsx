import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Database, RefreshCw, Upload, AlertTriangle, CheckCircle2, Loader2, FileText, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminPage = () => {
  const [sources, setSources] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Ingestion form state
  const [ingestUrl, setIngestUrl] = useState("");
  const [ingestYear, setIngestYear] = useState(2024);
  const [ingestStage, setIngestStage] = useState<"prelims" | "mains">("prelims");
  const [ingestPaper, setIngestPaper] = useState("gs1");
  const [ingestKeyUrl, setIngestKeyUrl] = useState("");
  const [ingesting, setIngesting] = useState(false);

  useEffect(() => { loadAdminData(); }, []);

  async function loadAdminData() {
    setLoading(true);
    try {
      const [sourcesRes, jobsRes, docsRes, pendingRes] = await Promise.all([
        supabase.from("pyq_sources").select("id, name, source_type, is_active, trust_level").order("trust_level", { ascending: false }),
        supabase.from("pyq_import_jobs").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("pyq_documents").select("year, exam_stage, paper_code, total_questions, verification_status").order("year", { ascending: false }),
        supabase.from("pyq_questions").select("id", { count: "exact", head: true }).eq("is_published", false),
      ]);
      setSources(sourcesRes.data ?? []);
      setJobs(jobsRes.data ?? []);
      setDocs(docsRes.data ?? []);
      setPendingReviewCount(pendingRes.count ?? 0);
    } finally {
      setLoading(false);
    }
  }

  async function triggerIngestion() {
    if (!ingestUrl.trim()) { toast.error("Source URL is required"); return; }
    setIngesting(true);
    try {
      const { data: sourceData } = await supabase.from("pyq_sources").select("id").eq("source_type", "official").limit(1).maybeSingle();

      const resp = await supabase.functions.invoke("pyq-ingest", {
        body: {
          source_url: ingestUrl.trim(),
          year: ingestYear,
          exam_stage: ingestStage,
          paper_code: ingestPaper,
          source_id: sourceData?.id,
          key_url: ingestKeyUrl.trim() || undefined,
        },
      });

      if (resp.error) {
        toast.error(`Ingestion failed: ${resp.error.message}`);
      } else {
        toast.success(`Ingestion complete: ${resp.data?.questions_extracted ?? 0} questions extracted`);
        loadAdminData();
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIngesting(false);
    }
  }

  async function publishAllVerified() {
    const { error, count } = await supabase
      .from("pyq_questions")
      .update({ is_published: true })
      .eq("is_published", false)
      .gte("confidence_score", 0.6)
      .select("id", { count: "exact", head: true });

    if (error) {
      toast.error("Failed to publish");
    } else {
      toast.success("Published all high-confidence questions");
      loadAdminData();
    }
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
      case "failed": return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      case "running": return <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />;
      default: return <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const trustBadge = (level: number) => {
    if (level === 2) return <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px]">Official</Badge>;
    if (level === 1) return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]">Institutional</Badge>;
    return <Badge variant="outline" className="text-[10px]">Mirror</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 px-4 pb-24 lg:pb-6">
      <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Admin</h1>
      <p className="text-sm text-muted-foreground mb-6">Source management & PYQ operations</p>

      <div className="grid gap-4">
        {/* PYQ Source Registry */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-accent" /> PYQ Source Registry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sources.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  {trustBadge(s.trust_level)}
                  <span className="text-sm text-foreground">{s.name}</span>
                </div>
                <Badge variant={s.is_active ? "default" : "outline"} className="text-[10px]">
                  {s.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            ))}
            {sources.length === 0 && <p className="text-sm text-muted-foreground">No sources configured</p>}
          </CardContent>
        </Card>

        {/* Ingested Papers */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" /> Ingested Papers
              <Badge variant="secondary" className="text-[10px] ml-auto">{docs.length} papers</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {docs.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {docs.map((d: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1">
                    <span className="text-foreground">{d.year} {d.exam_stage} {d.paper_code.toUpperCase()}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{d.total_questions ?? "?"} Q</span>
                      <Badge variant="outline" className="text-[10px]">{(d.verification_status || "").replace("_", " ")}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No papers ingested yet</p>
            )}
          </CardContent>
        </Card>

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

        {/* Review Queue */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent" /> Review Queue
              {pendingReviewCount > 0 && (
                <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] ml-auto">{pendingReviewCount} pending</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {pendingReviewCount > 0 ? `${pendingReviewCount} questions pending verification` : "No questions pending review"}
            </p>
            {pendingReviewCount > 0 && (
              <Button variant="outline" size="sm" onClick={publishAllVerified} className="gap-2">
                <CheckCircle2 className="h-3.5 w-3.5" /> Publish high-confidence questions
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Ingestion Jobs */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-accent" /> Ingestion Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {jobs.map((job: any) => (
                  <div key={job.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2">
                      {statusIcon(job.status)}
                      <span className="text-foreground">{job.year ?? "?"} {job.exam_stage ?? ""} {job.paper_code?.toUpperCase() ?? ""}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{job.questions_extracted} Q</span>
                      <Badge variant="outline" className="text-[10px]">{job.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No ingestion jobs yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPage;
