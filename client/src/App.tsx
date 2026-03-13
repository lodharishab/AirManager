import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import AppLayout from "./components/layout/app-layout";
import AIChatbot from "./components/ai-chatbot";
import Dashboard from "./pages/dashboard";
import Properties from "./pages/properties";
import PropertyDetail from "./pages/property-detail";
import Bookings from "./pages/bookings";
import Messages from "./pages/messages";
import Settings from "./pages/settings";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard}/>
        <Route path="/properties" component={Properties}/>
        <Route path="/properties/:id" component={PropertyDetail}/>
        <Route path="/bookings" component={Bookings}/>
        <Route path="/messages" component={Messages}/>
        <Route path="/settings" component={Settings}/>
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <AIChatbot />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;