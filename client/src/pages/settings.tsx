import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Shield, CreditCard } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-serif text-primary">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences and configurations.</p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="bg-secondary/20 border border-border p-1 rounded-xl">
          <TabsTrigger value="account" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="h-4 w-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="billing" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <Card className="border-border shadow-sm bg-card/50">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="font-serif tracking-wide text-primary">Profile Information</CardTitle>
              <CardDescription>Update your personal details here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-secondary/50 border border-primary/20 flex items-center justify-center overflow-hidden">
                  <img src="https://i.pravatar.cc/150?u=a042581f4e29026024d" alt="Profile" className="w-full h-full object-cover" />
                </div>
                <Button variant="outline" className="border-border text-foreground hover:bg-secondary/30">
                  Change Avatar
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-muted-foreground">First Name</Label>
                  <Input id="firstName" defaultValue="John" className="bg-background border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-muted-foreground">Last Name</Label>
                  <Input id="lastName" defaultValue="Doe" className="bg-background border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-muted-foreground">Email Address</Label>
                  <Input id="email" type="email" defaultValue="john.doe@example.com" className="bg-background border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-muted-foreground">Phone Number</Label>
                  <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" className="bg-background border-border" />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="border-border shadow-sm bg-card/50">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="font-serif tracking-wide text-primary">Notification Preferences</CardTitle>
              <CardDescription>Choose what updates you want to receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">New Bookings</h4>
                    <p className="text-sm text-muted-foreground">Receive an email when a guest makes a new reservation.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">Cancellations</h4>
                    <p className="text-sm text-muted-foreground">Receive an SMS when a guest cancels their stay.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">Guest Messages</h4>
                    <p className="text-sm text-muted-foreground">Get notified immediately when a guest sends a message.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">Weekly Reports</h4>
                    <p className="text-sm text-muted-foreground">Receive a weekly summary of your property performance.</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card className="border-border shadow-sm bg-card/50">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="font-serif tracking-wide text-primary">Payment Methods</CardTitle>
              <CardDescription>Manage how you get paid and pay for subscriptions.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="p-4 border border-border rounded-xl flex items-center justify-between bg-background/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-secondary/50 rounded flex items-center justify-center font-bold text-primary text-xs">
                    VISA
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Visa ending in 4242</p>
                    <p className="text-xs text-muted-foreground">Expires 12/28</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">Default</span>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">Edit</Button>
                </div>
              </div>
              
              <Button variant="outline" className="w-full mt-4 border-dashed border-border text-primary hover:bg-secondary/20">
                + Add Payment Method
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="security">
          <Card className="border-border shadow-sm bg-card/50">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="font-serif tracking-wide text-primary">Security Settings</CardTitle>
              <CardDescription>Manage your account security and password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-muted-foreground">Current Password</Label>
                  <Input id="currentPassword" type="password" className="bg-background border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-muted-foreground">New Password</Label>
                  <Input id="newPassword" type="password" className="bg-background border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-muted-foreground">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" className="bg-background border-border" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Update Password</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}