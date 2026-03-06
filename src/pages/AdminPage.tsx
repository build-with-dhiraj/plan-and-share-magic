import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminPage = () => (
  <div className="container max-w-4xl py-6 px-4">
    <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Admin</h1>
    <p className="text-sm text-muted-foreground mb-6">Source management & pipeline monitoring</p>

    <div className="grid gap-4">
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-accent" /> Source Registry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">47 sources configured, 10 active for MVP</p>
          <Button variant="outline" size="sm">Manage Sources</Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-accent" /> Pipeline Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Last run: waiting for Cloud setup</p>
          <Button variant="outline" size="sm">View Logs</Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" /> Benchmark Delta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Coverage comparison with coaching platforms — coming with pipeline</p>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default AdminPage;
