
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Using @ alias
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ThemeToggle from '@/components/ThemeToggle';
import ApiKeysSection from '@/components/settings/ApiKeysSection'; 
import { Github, User, Bell, Shield, Moon, Sun, Edit3 } from 'lucide-react'; // Added Edit3 for an icon

const Settings = () => {
  const [sessionUser, setSessionUser] = useState(null);
  const [profileData, setProfileData] = useState({
    avatarUrl: '',
    fallbackName: 'N/A',
    fullName: 'N/A',
    email: 'N/A',
    gitHubUsername: 'N/A',
  });

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setSessionUser(session.user);
        const meta = session.user.user_metadata;
        setProfileData({
          avatarUrl: meta.avatar_url || '',
          fallbackName: (meta.full_name || meta.user_name || 'N A').split(' ').map(n => n[0]).join('').toUpperCase(),
          fullName: meta.full_name || meta.user_name || 'N/A',
          email: session.user.email || 'N/A', // Main email from auth.users
          gitHubUsername: meta.user_name || 'N/A',
        });
      }
    };
    fetchSession();
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="profile" className="mb-8">
            <TabsList className="mb-6">
              <TabsTrigger value="profile" className="flex gap-2">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </TabsTrigger>
              <TabsTrigger value="account" className="flex gap-2">
                <Shield className="h-4 w-4" />
                <span>Account</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex gap-2">
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex gap-2">
                <Sun className="h-4 w-4" />
                <span>Appearance</span>
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex gap-2">
                <Github className="h-4 w-4" />
                <span>Integrations</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>
                    This information is a reflection of your GitHub profile data and is not editable here.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <div className="flex flex-col items-center sm:items-start space-y-2">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={profileData.avatarUrl} alt={profileData.fullName} />
                        <AvatarFallback className="text-2xl">{profileData.fallbackName}</AvatarFallback>
                      </Avatar>
                       <Button variant="outline" size="sm" disabled>
                        <Edit3 className="mr-2 h-3 w-3" /> Change Avatar (GitHub)
                      </Button>
                    </div>
                    
                    <div className="flex-1 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="fullName">Full Name</Label>
                          <Input id="fullName" value={profileData.fullName} readOnly />
                        </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="gitHubUsername">GitHub Username</Label>
                        <Input id="gitHubUsername" value={profileData.gitHubUsername} readOnly />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={profileData.email} readOnly />
                      </div>
                    </div>
                  </div>
                  {/* "Save Changes" and "Cancel" buttons removed as fields are read-only */}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>
                    Manage your account settings and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Password</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input id="currentPassword" type="password" />
                      </div>
                      <div></div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input id="newPassword" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input id="confirmPassword" type="password" />
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <Button>Change Password</Button>
                    </div>
                  </div>
                  
                  <div className="pb-4 pt-6 border-t">
                    <h3 className="text-lg font-medium mb-4">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Enable 2FA</p>
                        <p className="text-sm text-muted-foreground">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                  
                  <div className="pb-2 pt-6 border-t">
                    <h3 className="text-lg font-medium text-destructive mb-4">Danger Zone</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Delete Account</p>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete your account and all data
                        </p>
                      </div>
                      <Button variant="destructive">Delete Account</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>
                    Manage how and when you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {['Task Assignments', 'Task Updates', 'Comments', 'Project Updates', 'Due Date Reminders'].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">{item}</p>
                          <p className="text-sm text-muted-foreground">
                            Receive notifications when {item.toLowerCase()} occur
                          </p>
                        </div>
                        <Switch defaultChecked={i < 3} />
                      </div>
                    ))}
                  </div>
                  
                  <div className="pb-2 pt-4 border-t">
                    <h3 className="font-medium mb-4">Notification Channels</h3>
                    <div className="space-y-4">
                      {['Email', 'In-app Notifications', 'Browser Push Notifications'].map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium">{item}</p>
                          </div>
                          <Switch defaultChecked={i < 2} />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Customize the appearance of the application
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium mb-2">Theme</h3>
                    <div className="flex items-center space-x-4">
                      <div
                        className="w-16 h-16 rounded-md bg-white border-2 border-primary flex items-center justify-center cursor-pointer"
                      >
                        <Sun className="h-8 w-8 text-primary" />
                      </div>
                      <div
                        className="w-16 h-16 rounded-md bg-gray-900 border-2 border-transparent flex items-center justify-center cursor-pointer"
                      >
                        <Moon className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">Dark Mode</p>
                      <p className="text-sm text-muted-foreground">
                        Toggle between light and dark mode
                      </p>
                    </div>
                    <ThemeToggle />
                  </div>
                  
                  <div className="pb-2 pt-4 border-t">
                    <h3 className="font-medium mb-4">Layout Density</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="density">Interface Density</Label>
                        <Select defaultValue="comfortable">
                          <SelectTrigger id="density">
                            <SelectValue placeholder="Select density" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="compact">Compact</SelectItem>
                            <SelectItem value="comfortable">Comfortable</SelectItem>
                            <SelectItem value="spacious">Spacious</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="integrations">
              <Card>
                <CardHeader>
                  <CardTitle>Integrations</CardTitle>
                  <CardDescription>
                    Connect external services with your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 flex items-center justify-center bg-black rounded-md">
                          <Github className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium">GitHub</h3>
                          <p className="text-sm text-muted-foreground">
                            Connect your GitHub account to track repository activity
                          </p>
                        </div>
                      </div>
                      <Button>Connect</Button>
                    </div>
                    
                    {/* Additional integrations would go here */}
                  </div>
                  
                  <div className="pb-2 pt-4 border-t">
                    {/* Replace placeholder with the actual ApiKeysSection component */}
                    <ApiKeysSection />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Settings;
