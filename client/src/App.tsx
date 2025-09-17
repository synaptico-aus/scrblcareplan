import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CarePlanner from "@/pages/care-planner";
import SavedPlans from "@/pages/saved-plans";
import NotFound from "@/pages/not-found";
import { PasswordProtected } from "@/components/PasswordProtected";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/" component={CarePlanner} />
          <Route path="/saved-plans">
            <PasswordProtected 
              requiredPassword="caresalveocarl"
              title="Saved Plans Access"
              description="This area contains sensitive client information and requires authentication."
            >
              <SavedPlans />
            </PasswordProtected>
          </Route>
          <Route component={NotFound} />
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
