import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Shield, Mail, Bot } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UserPreferences {
  id: number;
  userId: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  bookingAlerts: boolean;
  messageAlerts: boolean;
  notificationEmail: string | null;
}

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [username, setUsername] = useState(user?.username || "");
  useEffect(() => { setUsername(user?.username ?? ""); }, [user?.username]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");

  interface AiSettings {
    provider: "openai_compatible" | "sarvam";
    baseUrl: string;
    model: string;
    hasApiKey: boolean;
    maskedApiKey: string;
  }

  const { data: aiSettings } = useQuery<AiSettings>({
    queryKey: ["/api/settings/ai"],
  });

  const [aiProvider, setAiProvider] = useState<string>("");
  const [aiBaseUrl, setAiBaseUrl] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("");

  const savedProvider = aiSettings?.provider, savedBaseUrl = aiSettings?.baseUrl, savedModel = aiSettings?.model;
  useEffect(() => {
    if (savedProvider !== undefined) setAiProvider(savedProvider);
    if (savedBaseUrl !== undefined) setAiBaseUrl(savedBaseUrl);
    if (savedModel !== undefined) setAiModel(savedModel);
  }, [savedProvider, savedBaseUrl, savedModel]);

  const aiSaveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/settings/ai", {
        provider: aiProvider,
        baseUrl: aiBaseUrl,
        apiKey: aiApiKey || undefined,
        model: aiModel,
      });
      return res.json();
    },
    onSuccess: (data: AiSettings) => {
      queryClient.setQueryData(["/api/settings/ai"], data);
      setAiApiKey("");
      toast({ title: "AI settings saved", description: "Your AI provider configuration has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    },
  });

  const aiTestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/settings/ai/test", {});
      return res.json() as Promise<{ ok: boolean; models?: string[]; error?: string }>;
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({
          title: "Connection successful",
          description: data.models?.length ? `Provider reachable — ${data.models.length} models available.` : "Provider reachable.",
        });
      } else {
        toast({ title: "Connection failed", description: data.error || "Unknown error", variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Connection failed", description: error.message, variant: "destructive" });
    },
  });

  const handleAiSave = () => {
    if (!aiBaseUrl || !aiModel) {
      toast({ title: "Missing fields", description: "Base URL and model are required.", variant: "destructive" });
      return;
    }
    aiSaveMutation.mutate();
  };

  const { data: preferences } = useQuery<UserPreferences>({
    queryKey: ["/api/user-preferences"],
  });

  useEffect(() => {
    if (preferences?.notificationEmail !== undefined) {
      setNotificationEmail(preferences.notificationEmail ?? "");
    }
  }, [preferences?.notificationEmail]);

  const profileMutation = useMutation({
    mutationFn: async (newUsername: string) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", { username: newUsername });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      toast({ title: "Profile updated", description: "Your username has been changed successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/password", data);
      return res.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const prefsMutation = useMutation({
    mutationFn: async (data: Partial<UserPreferences>) => {
      const res = await apiRequest("PATCH", "/api/user-preferences", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user-preferences"], data);
      toast({ title: "Preferences updated", description: "Your notification preferences have been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const handleProfileSave = () => {
    if (!username || username.length < 3) {
      toast({ title: "Invalid username", description: "Username must be at least 3 characters.", variant: "destructive" });
      return;
    }
    profileMutation.mutate(username);
  };

  const handlePasswordSave = () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Missing fields", description: "Please fill in all password fields.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "New password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "New password and confirmation must match.", variant: "destructive" });
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  const handlePrefToggle = (key: keyof Pick<UserPreferences, "emailNotifications" | "pushNotifications" | "bookingAlerts" | "messageAlerts">, value: boolean) => {
    prefsMutation.mutate({ [key]: value });
  };

  const handleEmailSave = () => {
    if (notificationEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    prefsMutation.mutate({ notificationEmail: notificationEmail || "" });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-serif text-primary" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences and configurations.</p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="bg-secondary/20 border border-border p-1 rounded-xl">
          <TabsTrigger value="account" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-account">
            <User className="h-4 w-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="ai" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-ai">
            <Bot className="h-4 w-4 mr-2" />
            AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <Card className="border-border shadow-sm bg-card/50">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="font-serif tracking-wide text-primary">Profile Information</CardTitle>
              <CardDescription>Update your account details here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-muted-foreground">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-background border-border max-w-md"
                  data-testid="input-username"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleProfileSave}
                  disabled={profileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {profileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-border shadow-sm bg-card/50">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="font-serif tracking-wide text-primary">Email Configuration</CardTitle>
              <CardDescription>Set the email address where you'd like to receive notification emails.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="notificationEmail" className="text-muted-foreground">Notification Email Address</Label>
                <div className="flex items-center gap-3 max-w-md">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="notificationEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={notificationEmail}
                      onChange={(e) => setNotificationEmail(e.target.value)}
                      className="bg-background border-border pl-10"
                      data-testid="input-notification-email"
                    />
                  </div>
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleEmailSave}
                    disabled={prefsMutation.isPending}
                    data-testid="button-save-email"
                  >
                    {prefsMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Email notifications for check-ins, new enquiries, booking confirmations, and overdue tasks will be sent to this address when email notifications are enabled.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm bg-card/50">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="font-serif tracking-wide text-primary">Notification Preferences</CardTitle>
              <CardDescription>Choose what updates you want to receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">Receive email updates about your properties.</p>
                  </div>
                  <Switch
                    checked={preferences?.emailNotifications ?? true}
                    onCheckedChange={(val) => handlePrefToggle("emailNotifications", val)}
                    data-testid="switch-email-notifications"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">Push Notifications</h4>
                    <p className="text-sm text-muted-foreground">Get push notifications for important updates.</p>
                  </div>
                  <Switch
                    checked={preferences?.pushNotifications ?? true}
                    onCheckedChange={(val) => handlePrefToggle("pushNotifications", val)}
                    data-testid="switch-push-notifications"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">Booking Alerts</h4>
                    <p className="text-sm text-muted-foreground">Receive alerts when a guest makes or cancels a reservation.</p>
                  </div>
                  <Switch
                    checked={preferences?.bookingAlerts ?? true}
                    onCheckedChange={(val) => handlePrefToggle("bookingAlerts", val)}
                    data-testid="switch-booking-alerts"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">Message Alerts</h4>
                    <p className="text-sm text-muted-foreground">Get notified when a guest sends a message.</p>
                  </div>
                  <Switch
                    checked={preferences?.messageAlerts ?? true}
                    onCheckedChange={(val) => handlePrefToggle("messageAlerts", val)}
                    data-testid="switch-message-alerts"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="border-border shadow-sm bg-card/50">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="font-serif tracking-wide text-primary">Change Password</CardTitle>
              <CardDescription>Update your account password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-muted-foreground">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-background border-border max-w-md"
                    data-testid="input-current-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-muted-foreground">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-background border-border max-w-md"
                    data-testid="input-new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-muted-foreground">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-background border-border max-w-md"
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handlePasswordSave}
                  disabled={passwordMutation.isPending}
                  data-testid="button-update-password"
                >
                  {passwordMutation.isPending ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card className="border-border shadow-sm bg-card/50">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="font-serif tracking-wide text-primary">AI Provider</CardTitle>
              <CardDescription>
                Configure which AI provider the platform uses. Any OpenAI-compatible endpoint works
                (OpenAI, OpenRouter, Groq, Ollama, vLLM…), and Sarvam is supported natively for
                Indic-language models.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2 max-w-md">
                <Label className="text-muted-foreground">Provider</Label>
                <Select value={aiProvider} onValueChange={setAiProvider} data-testid="select-ai-provider">
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai_compatible">OpenAI-compatible</SelectItem>
                    <SelectItem value="sarvam">Sarvam AI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 max-w-md">
                <Label htmlFor="aiBaseUrl" className="text-muted-foreground">Base URL</Label>
                <Input
                  id="aiBaseUrl"
                  value={aiBaseUrl}
                  onChange={(e) => setAiBaseUrl(e.target.value)}
                  placeholder={aiProvider === "sarvam" ? "https://api.sarvam.ai/v1" : "https://api.openai.com/v1"}
                  className="bg-background border-border"
                  data-testid="input-ai-base-url"
                />
              </div>

              <div className="space-y-2 max-w-md">
                <Label htmlFor="aiApiKey" className="text-muted-foreground">API Key</Label>
                <Input
                  id="aiApiKey"
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder={aiSettings?.hasApiKey ? `Saved (${aiSettings.maskedApiKey}) — leave blank to keep` : "Enter API key"}
                  className="bg-background border-border"
                  data-testid="input-ai-api-key"
                />
              </div>

              <div className="space-y-2 max-w-md">
                <Label htmlFor="aiModel" className="text-muted-foreground">Model</Label>
                <Input
                  id="aiModel"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder={aiProvider === "sarvam" ? "sarvam-105b" : "gpt-4o-mini"}
                  className="bg-background border-border"
                  data-testid="input-ai-model"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  className="border-border"
                  onClick={() => aiTestMutation.mutate()}
                  disabled={aiTestMutation.isPending}
                  data-testid="button-test-ai"
                >
                  {aiTestMutation.isPending ? "Testing..." : "Test Connection"}
                </Button>
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleAiSave}
                  disabled={aiSaveMutation.isPending}
                  data-testid="button-save-ai"
                >
                  {aiSaveMutation.isPending ? "Saving..." : "Save AI Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
