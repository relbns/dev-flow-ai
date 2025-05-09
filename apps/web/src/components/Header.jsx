
import React from 'react';
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
import { Bell, User, Building, ChevronLeft } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";

const Header = ({ title, contextType, organization, organizations = [], onContextChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const handleBack = () => {
    // Go up one level in the hierarchy
    const path = location.pathname;
    
    if (path.includes('/projects/')) {
      // From specific project to projects list
      navigate('/projects');
    }
    else if (path.includes('/tasks/')) {
      // From specific task to tasks list
      navigate('/tasks');
    }
    else if (path.includes('/settings/')) {
      // If we're in a settings subpage, go back to main settings
      if (path !== '/settings') {
        navigate('/settings');
      } else {
        navigate('/');
      }
    }
    else {
      // For any other case, go to the root
      navigate('/');
    }
  };
  
  // Check if we're not on the root page
  const shouldShowBackButton = location.pathname !== '/';
  
  return (
    <header className="border-b border-border px-6 py-3 bg-background sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {shouldShowBackButton && (
            <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-xl font-semibold truncate">{title}</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Context Switcher */}
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
                    <span className="hidden sm:inline">{organization?.name}</span>
                    <Badge variant="outline" className="ml-1 text-xs hidden sm:inline-flex">
                      Organization
                    </Badge>
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onContextChange('personal')}
              >
                <User className="mr-2 h-4 w-4" />
                <span>Personal</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <div className="text-sm px-2 py-1.5 text-muted-foreground">
                Organizations
              </div>

              {Array.isArray(organizations) && organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  className="cursor-pointer"
                  onClick={() => onContextChange('organization', org)}
                >
                  <Building className="mr-2 h-4 w-4" />
                  <span>{org.name}</span>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/organizations')}>
                <Building className="mr-2 h-4 w-4" />
                <span>Create/Join Organization</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Notifications */}
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
                  <DropdownMenuItem key={i} className="py-2 px-4 cursor-pointer" onClick={() => toast({ title: "Notification clicked", description: "This would navigate to the item."})}>
                    <div>
                      <p className="text-sm font-medium">New task assigned</p>
                      <p className="text-xs text-muted-foreground">Jane assigned you a task in API Project</p>
                      <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer justify-center font-medium" onClick={() => navigate('/notifications')}>
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings/profile')}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                toast({ title: "Logged out", description: "You have been logged out." });
                navigate('/login');
              }}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
