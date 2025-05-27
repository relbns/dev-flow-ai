import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  User,
  Building,
  ChevronLeft,
  RefreshCw,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import LoginButton from './LoginButton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';

const Header = ({
  title,
  contextType,
  organization,
  organizations = [],
  onContextChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, loading: authLoading, logout } = useAuth();

  const [loading, setLoading] = useState(false);

  // Function to handle fetching GitHub organizations
  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const orgs = await apiClient.github.getOrganizations();
      if (typeof onContextChange === 'function' && Array.isArray(orgs)) {
        const formattedOrgs = orgs.map(org => ({
          id: org.id,
          login: org.login,
          avatar_url: org.avatar_url
        }));
        onContextChange('updateOrganizations', formattedOrgs);
      }
    } catch (error) {
      toast({
        title: 'Failed to fetch organizations',
        description: error.message || 'Please check your GitHub permissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to handle logout
  const handleLogout = async () => {
    try {
      setLoading(true);
      await apiClient.auth.logout();
      logout(); // Also call the logout function from useAuth
      
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
      navigate('/');
    } catch (error) {
      toast({
        title: 'Logout Error',
        description: error.message || 'Failed to logout',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to handle login with GitHub for org permissions
  const handleRequestOrgPermissions = () => {
    try {
      // Use the same redirect URI as the main login button
      const clientId = 'Ov23liGyrjPcmvI0QH2n';
      const redirectUri = 'https://dev-flow-ai.vercel.app/api/auth/github/callback';
      const scopes = 'user:email read:user repo read:org';
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&prompt=consent`;
      
      window.location.href = githubAuthUrl;
    } catch (error) {
      toast({
        title: 'Login Error',
        description: error.message || 'Failed to initiate GitHub login',
        variant: 'destructive',
      });
      console.error('Error initiating GitHub login:', error);
    }
  };

  const handleBack = () => {
    const path = location.pathname;

    if (path.includes('/projects/')) {
      navigate('/projects');
    } else if (path.includes('/tasks/')) {
      navigate('/tasks');
    } else if (path.includes('/settings/')) {
      if (path !== '/settings') {
        navigate('/settings');
      } else {
        navigate('/');
      }
    } else {
      navigate('/');
    }
  };

  const shouldShowBackButton = location.pathname !== '/';

  return (
    <header className="border-b border-border px-6 py-3 bg-background sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {shouldShowBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="mr-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-xl font-semibold truncate">{title}</h1>
        </div>

        <div className="flex items-center space-x-3">
          {/* Context Switcher - KEEP THIS - it's important for org/personal project context */}
          {!authLoading && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  {contextType === 'personal' ? (
                    <>
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">Personal</span>
                    </>
                  ) : (
                    <>
                      <Building className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {organization?.name || organization?.login}
                      </span>
                      <Badge
                        variant="outline"
                        className="ml-1 text-xs hidden sm:inline-flex"
                      >
                        Organization
                      </Badge>
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => onContextChange && onContextChange('personal')}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Personal</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <div className="text-sm px-2 py-1.5 text-muted-foreground">
                  Organizations
                </div>

                {Array.isArray(organizations) && organizations.length > 0 ? (
                  organizations.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      className="cursor-pointer"
                      onClick={() => onContextChange && onContextChange('organization', { 
                        id: org.id, 
                        name: org.login, 
                        login: org.login,
                        avatar_url: org.avatar_url 
                      })}
                    >
                      <Building className="mr-2 h-4 w-4" />
                      <span>{org.login}</span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="text-sm px-2 py-1.5 text-muted-foreground italic">
                    No organizations found
                  </div>
                )}

                {/* Add Request Permissions Item */}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-muted-foreground"
                  onClick={handleRequestOrgPermissions}
                  disabled={loading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Request Org Permissions</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Notifications - only show if user is logged in */}
          {!authLoading && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-80 overflow-auto">
                  {[1, 2, 3].map((i) => (
                    <DropdownMenuItem
                      key={i}
                      className="py-2 px-4 cursor-pointer"
                      onClick={() =>
                        toast({
                          title: 'Notification clicked',
                          description: 'This would navigate to the item.',
                        })
                      }
                    >
                      <div>
                        <p className="text-sm font-medium">New task assigned</p>
                        <p className="text-xs text-muted-foreground">
                          Jane assigned you a task in API Project
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          2 hours ago
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer justify-center font-medium"
                  onClick={() => navigate('/notifications')}
                >
                  View all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu / Login Button - ONLY in header */}
          {!authLoading && (user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName || user.username}
                      className="h-6 w-6 rounded-full"
                    />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {user.displayName || user.username}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings/profile')}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} disabled={loading}>
                  {loading ? 'Logging out...' : 'Log out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <LoginButton variant="outline" />
          ))}
        </div>
      </div>
    </header>
  );
};

export default Header;