import { useState, useCallback, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SplashScreen from "@/components/SplashScreen";
import AppLayout from "@/components/AppLayout";

import AdminRoute from "@/components/AdminRoute";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import OnboardingPage from "@/pages/OnboardingPage";
import WorkoutPage from "@/pages/WorkoutPage";
import ProgressPage from "@/pages/ProgressPage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import ProgramsPage from "@/pages/ProgramsPage";
import ProfilePage from "@/pages/ProfilePage";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminProgramPage from "@/pages/AdminProgramPage";
import ProgramDetailPage from "@/pages/ProgramDetailPage";
import ConsentPage from "@/pages/ConsentPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import AuthCallbackPage from "@/pages/AuthCallbackPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const AuthGate = ({ children }: { children: ReactNode }) => {
  const { sessionChecked } = useAuth();
  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  return <>{children}</>;
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
        <BrowserRouter>
          <AuthProvider>
            <OnboardingProvider>
              <AppLayout>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/consent" element={<ConsentPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />

                  {/* Guest-accessible routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/workout/:id" element={<WorkoutPage />} />
                  <Route path="/programs" element={<ProgramsPage />} />
                  <Route path="/program/:id" element={<ProgramDetailPage />} />

                  {/* Frictionless browse — viewable without auth, actions gated */}
                  <Route path="/progress" element={<ProgressPage />} />
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route path="/profile" element={<ProfilePage />} />

                  {/* Admin-only routes */}
                  <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                  <Route path="/admin/programs/:programId" element={<AdminRoute><AdminProgramPage /></AdminRoute>} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            </OnboardingProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
