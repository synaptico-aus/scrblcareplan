import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import CarePlanner from "@/pages/care-planner";
import SavedPlans from "@/pages/saved-plans";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import { PasswordProtected } from "@/components/PasswordProtected";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path="/login" component={Login} />
            <Route path="/">
              <ProtectedRoute>
                <CarePlanner />
              </ProtectedRoute>
            </Route>
            <Route path="/saved-plans">
              <ProtectedRoute>
                <PasswordProtected 
                  requiredPassword="caresalveocarl"
                  title="Saved Plans Access"
                  description="This area contains sensitive client information and requires authentication."
                >
                  <SavedPlans />
                </PasswordProtected>
              </ProtectedRoute>
            </Route>
            <Route component={NotFound} />
          </Switch>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
