import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import AppLayout from "./components/layout/app-layout";
import Login from "./pages/login";
import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";

// Route components load on demand. Importing all 20 pages eagerly put every
// screen, chart and editor into the first download, so the initial bundle
// carried the whole app before the dashboard could paint.
const Dashboard = lazy(() => import("./pages/dashboard"));
const Properties = lazy(() => import("./pages/properties"));
const PropertyDetail = lazy(() => import("./pages/property-detail"));
const Bookings = lazy(() => import("./pages/bookings"));
const Messages = lazy(() => import("./pages/messages"));
const Gallery = lazy(() => import("./pages/gallery"));
const Expenses = lazy(() => import("./pages/expenses"));
const Enquiries = lazy(() => import("./pages/enquiries"));
const FollowUps = lazy(() => import("./pages/followups"));
const Pricing = lazy(() => import("./pages/pricing"));
const Tickets = lazy(() => import("./pages/tickets"));
const Reviews = lazy(() => import("./pages/reviews"));
const Housekeeping = lazy(() => import("./pages/housekeeping"));
const CheckIns = lazy(() => import("./pages/check-ins"));
const Settings = lazy(() => import("./pages/settings"));
const Invoice = lazy(() => import("./pages/invoice"));
const CalendarPage = lazy(() => import("./pages/calendar"));
const Analytics = lazy(() => import("./pages/analytics"));
const Guests = lazy(() => import("./pages/guests"));
const GuestDetail = lazy(() => import("./pages/guest-detail"));
const AIChatbot = lazy(() => import("./components/ai-chatbot"));


function FullPageSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <>
      <AppLayout>
          <Suspense fallback={<FullPageSpinner />}>
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
          <Route path="/pricing" component={Pricing} />
          <Route path="/tickets" component={Tickets} />
          <Route path="/reviews" component={Reviews} />
          <Route path="/housekeeping" component={Housekeeping} />
          <Route path="/gallery" component={Gallery} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
            </Switch>
          </Suspense>
      </AppLayout>
      <Suspense fallback={null}>
        <AIChatbot />
      </Suspense>
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
