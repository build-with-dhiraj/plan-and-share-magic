import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Palette, Target, Moon, Sun, Monitor, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="container max-w-3xl py-6 px-4 pb-24 lg:pb-6">
      <h1 className="text-2xl font-bold text-foreground tracking-tight mb-6">Settings</h1>

      <div className="space-y-4">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-accent" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3">
              {profile?.avatar_url && (
                <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">{profile?.display_name || "User"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-accent" /> Exam Target
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm text-foreground">{profile?.exam_target?.toUpperCase() || "Not set"}</p>
            {profile?.optional_subjects && profile.optional_subjects.length > 0 && (
              <p className="text-xs text-muted-foreground">Optionals: {profile.optional_subjects.join(", ")}</p>
            )}
            <p className="text-xs text-muted-foreground">{profile?.study_hours_per_day || 4}h/day target</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4 text-accent" /> Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all",
                    theme === opt.value
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-muted-foreground hover:border-accent/50"
                  )}
                >
                  <opt.icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full h-11 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
