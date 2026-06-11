import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

import Dashboard from "@/pages/dashboard";
import Cases from "@/pages/cases";
import CaseDetail from "@/pages/case-detail";
import CaseNew from "@/pages/case-new";
import EvidenceDetail from "@/pages/evidence-detail";
import Timeline from "@/pages/timeline";
import YaraScanner from "@/pages/yara";
import Reports from "@/pages/reports";
import SearchPage from "@/pages/search";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RedirectToDashboard() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/dashboard");
  }, [setLocation]);
  return null;
}

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={RedirectToDashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/cases" component={Cases} />
        <Route path="/cases/new" component={CaseNew} />
        <Route path="/cases/:id" component={CaseDetail} />
        <Route path="/evidence/:id" component={EvidenceDetail} />
        <Route path="/timeline/:caseId" component={Timeline} />
        <Route path="/yara" component={YaraScanner} />
        <Route path="/reports/:caseId" component={Reports} />
        <Route path="/search" component={SearchPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
