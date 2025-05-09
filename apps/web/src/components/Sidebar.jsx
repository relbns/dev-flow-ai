
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Folder, List, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

const Sidebar = ({ collapsed, setCollapsed }) => { // Accept props
  const location = useLocation();
  // const [collapsed, setCollapsed] = React.useState(false); // Remove local state

  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: <LayoutDashboard className="h-5 w-5" />
    },
    {
      name: 'Projects',
      path: '/projects',
      icon: <Folder className="h-5 w-5" />
    },
    {
      name: 'My Tasks',
      path: '/tasks',
      icon: <List className="h-5 w-5" />
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: <Settings className="h-5 w-5" />
    }
  ];

  return (
    <aside className={cn(
      "bg-sidebar border-r border-sidebar-border h-full fixed left-0 top-0 transition-all duration-300 flex flex-col z-20",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
        {!collapsed && (
          <Link to="/" className="flex items-center">
            <span className="font-code font-bold text-lg text-primary">CodeTaskHub</span>
          </Link>
        )}
        {collapsed && (
          <Link to="/" className="mx-auto">
            <span className="font-code font-bold text-xl text-primary">C</span>
          </Link>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className={collapsed ? "mx-auto" : ""}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      <nav className="flex-1 py-6 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={cn(
                  "flex items-center px-3 py-2 rounded-md transition-colors",
                  location.pathname === item.path || 
                  (item.path !== '/' && location.pathname.startsWith(item.path))
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground"
                )}
              >
                {item.icon}
                {!collapsed && <span className="ml-3">{item.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className={cn(
          "flex items-center",
          collapsed ? "justify-center" : "justify-start"
        )}>
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
            JS
          </div>
          {!collapsed && (
            <div className="ml-3">
              <p className="text-sm font-medium">John Smith</p>
              <p className="text-xs text-sidebar-foreground/70">Developer</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
