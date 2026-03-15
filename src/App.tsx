import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import IssuePage from "./pages/IssuePage";
import PracticePage from "./pages/PracticePage";
import DailyChallengePage from "./pages/DailyChallengePage";
import SavedPage from "./pages/SavedPage";
import SearchPage from "./pages/SearchPage";
import AdminPage from "./pages/AdminPage";
import SettingsPage from "./pages/SettingsPage";
import OnboardingPage from "./pages/OnboardingPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* All content routes (no login required) */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/issue/:id" element={<IssuePage />} />
                <Route path="/practice" element={<PracticePage />} />
                <Route path="/daily" element={<DailyChallengePage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/saved" element={<SavedPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* Protected routes */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>

              {/* Onboarding (protected but outside AppLayout) */}
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

              {/* Redirects for removed routes */}
              <Route path="/syllabus" element={<Navigate to="/search" replace />} />
              <Route path="/revision" element={<Navigate to="/practice?tab=revise" replace />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/mentor" element={<Navigate to="/" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
