import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import AppLayout from "./components/layout/app-layout";
import AIChatbot from "./components/ai-chatbot";
import Dashboard from "./pages/dashboard";
import Properties from "./pages/properties";
import PropertyDetail from "./pages/property-detail";
import Bookings from "./pages/bookings";
import Messages from "./pages/messages";
import Gallery from "./pages/gallery";
import Expenses from "./pages/expenses";
import Enquiries from "./pages/enquiries";
import FollowUps from "./pages/followups";
import Reviews from "./pages/reviews";
import Housekeeping from "./pages/housekeeping";
import CheckIns from "./pages/check-ins";
import Settings from "./pages/settings";
import Login from "./pages/login";
import Invoice from "./pages/invoice";
import CalendarPage from "./pages/calendar";
import Analytics from "./pages/analytics";
import Guests from "./pages/guests";
import GuestDetail from "./pages/guest-detail";
import { Loader2 } from "lucide-react";

function ProtectedRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <>
      <AppLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/properties" component={Properties} />
          <Route path="/properties/:id" component={PropertyDetail} />
          <Route path="/bookings" component={Bookings} />
          <Route path="/guests" component={Guests} />
          <Route path="/guests/:id" component={GuestDetail} />
          <Route path="/check-ins" component={CheckIns} />
          <Route path="/invoice/:bookingId" component={Invoice} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/messages" component={Messages} />
          <Route path="/expenses" component={Expenses} />
          <Route path="/enquiries" component={Enquiries} />
          <Route path="/follow-ups" component={FollowUps} />
          <Route path="/reviews" component={Reviews} />
          <Route path="/housekeeping" component={Housekeeping} />
          <Route path="/gallery" component={Gallery} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
      <AIChatbot />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AuthProvider>
            <ProtectedRouter />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
