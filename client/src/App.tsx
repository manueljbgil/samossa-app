import { Switch, Route, Router, type RouteComponentProps } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import Place from "@/pages/Place";
import Auth from "@/pages/Auth";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/not-found";

function PlaceRoute(props: RouteComponentProps<{ id?: string }>) {
  const id = props.params.id ? Number(props.params.id) : undefined;
  return <Place overrideId={id} />;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      <Route path="/profile" component={Profile} />
      <Route path="/:id?" component={PlaceRoute} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router>
            <AppShell>
              <AppRouter />
            </AppShell>
          </Router>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
