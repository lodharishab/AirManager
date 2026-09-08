import { useState } from "react";
import { Home, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function Login() {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password);
        toast({ title: "Account created", description: "Welcome to AirManager!" });
      }
    } catch (err: unknown) {
      toast({
        title: mode === "login" ? "Login failed" : "Registration failed",
        description: (err instanceof Error ? err.message : String(err)) || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex w-[420px] shrink-0 flex-col justify-between bg-card border-r border-border p-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Home size={18} className="text-primary-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">AirManager</span>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            {[
              { label: "Properties managed", value: "2,400+" },
              { label: "Average occupancy", value: "87%" },
              { label: "Default currency", value: "INR (₹)" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between py-3 border-b border-border/60 last:border-0">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <span className="text-sm font-semibold text-foreground">{stat.value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The complete platform for short-term rental hosts — manage bookings, guests, revenue, and operations from one place.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">© 2025 AirManager. All rights reserved.</p>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Home size={18} className="text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground">AirManager</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {mode === "login" ? "Welcome back" : "Create an account"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {mode === "login"
                ? "Sign in to your AirManager account"
                : "Get started managing your properties"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium text-foreground">
                Username
              </Label>
              <Input
                id="username"
                data-testid="input-username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="h-10 bg-muted/40 border-border focus:border-primary focus-visible:ring-primary/20 text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  data-testid="input-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "register" ? "At least 6 characters" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="h-10 bg-muted/40 border-border focus:border-primary focus-visible:ring-primary/20 text-foreground pr-10"
                />
                <button
                  type="button"
                  data-testid="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              data-testid="button-submit"
              disabled={loading}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-md shadow-primary/20 transition-all mt-2"
            >
              {loading && <Loader2 size={16} className="animate-spin mr-2" />}
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          {/* Mode toggle */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                data-testid="link-switch-mode"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-primary hover:underline font-medium"
              >
                {mode === "login" ? "Create one" : "Sign in"}
              </button>
            </p>
          </div>

          {/* Tab pills below — optional secondary toggle */}
          <div className="flex gap-1 bg-muted/50 rounded-xl p-1 mt-6">
            <button
              type="button"
              data-testid="tab-login"
              onClick={() => setMode("login")}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                mode === "login"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              data-testid="tab-register"
              onClick={() => setMode("register")}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                mode === "register"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
