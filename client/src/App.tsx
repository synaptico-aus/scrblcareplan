import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CarePlanner from "@/pages/care-planner";
import SavedPlans from "@/pages/saved-plans";
import DocumentAnalysis from "@/pages/document-analysis";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={CarePlanner} />
      <Route path="/saved-plans" component={SavedPlans} />
      <Route path="/document-analysis" component={DocumentAnalysis} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
