
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeProvider as CustomThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import WelcomeToast from "@/components/ui/WelcomeToast";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MigrationPage = lazy(() => import("./pages/MigrationPage"));
const PedigreePage = lazy(() => import("./pages/PedigreePage"));
const VetAIProfilePage = lazy(() => import("./pages/VetAIProfilePage"));
const PetDetailsPage = lazy(() => import("./pages/PetDetailsPage"));
const BreederProfilePage = lazy(() => import("./pages/BreederProfilePage"));
const BreedingMatchPage = lazy(() => import("./pages/BreedingMatchPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="light">
    <CustomThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <WelcomeToast />
                <Suspense
                  fallback={
                    <div className="min-h-screen flex items-center justify-center text-sm text-foreground/60">
                      Loading...
                    </div>
                  }
                >
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/pet/:petId" element={<PetDetailsPage />} />
                    <Route path="/migrate" element={<MigrationPage />} />
                    <Route path="/pedigree/:petId" element={<PedigreePage />} />
                    <Route path="/profile/:userId" element={<BreederProfilePage />} />
                    <Route path="/vet-profile/:petId" element={<VetAIProfilePage />} />
                    <Route path="/breeding/:petId" element={<BreedingMatchPage />} />
                    <Route path="/privacy" element={<PrivacyPolicyPage />} />
                    <Route path="/terms" element={<TermsOfServicePage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </CustomThemeProvider>
  </ThemeProvider>
);

export default App;
