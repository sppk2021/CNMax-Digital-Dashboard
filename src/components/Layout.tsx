import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CircleDollarSign, 
  BarChart3, 
  Settings,
  LogOut, 
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Server,
  Bell,
  AlertTriangle,
  Info,
  Clock,
  Moon,
  Sun
} from 'lucide-react';
import { cn } from '../utils';
import { differenceInDays, parseISO } from 'date-fns';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  servers?: any[];
  users?: any[];
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export function Layout({ 
  children, 
  user, 
  onLogout, 
  activeTab, 
  setActiveTab, 
  servers = [], 
  users = [],
  isDarkMode,
  toggleDarkMode
}: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'sales', label: 'Sales', icon: CircleDollarSign },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'servers', label: 'Servers', icon: Server },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'plans', label: 'Plans', icon: Settings },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Calculate Notifications
  const offlineServers = servers.filter(s => s.status === 'Offline');
  const maintenanceServers = servers.filter(s => s.status === 'Maintenance');
  
  const expiringSoonUsers = users.filter(u => {
    if (!u.expiryDate) return false;
    try {
      const days = differenceInDays(parseISO(u.expiryDate), new Date());
      return days >= 0 && days <= 3;
    } catch (e) {
      return false;
    }
  });

  const recentlyExpiredUsers = users.filter(u => {
    if (!u.expiryDate) return false;
    try {
      const days = differenceInDays(new Date(), parseISO(u.expiryDate));
      return days > 0 && days <= 3;
    } catch (e) {
      return false;
    }
  });

  const notifications = [
    ...offlineServers.map(s => ({
      id: `server-offline-${s.id}`,
      type: 'critical',
      title: 'Server Offline',
      message: `${s.name} is currently offline.`,
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-50'
    })),
    ...maintenanceServers.map(s => ({
      id: `server-maint-${s.id}`,
      type: 'warning',
      title: 'Server Maintenance',
      message: `${s.name} is under maintenance.`,
      icon: Info,
      color: 'text-orange-500',
      bg: 'bg-orange-50'
    }))
  ];

  if (expiringSoonUsers.length > 0) {
    notifications.push({
      id: 'users-expiring',
      type: 'warning',
      title: 'Subscriptions Expiring',
      message: `${expiringSoonUsers.length} user(s) expiring in the next 3 days.`,
      icon: Clock,
      color: 'text-orange-500',
      bg: 'bg-orange-50'
    });
  }

  if (recentlyExpiredUsers.length > 0) {
    notifications.push({
      id: 'users-expired',
      type: 'critical',
      title: 'Recent Expirations',
      message: `${recentlyExpiredUsers.length} user(s) expired in the last 3 days.`,
      icon: Users,
      color: 'text-red-500',
      bg: 'bg-red-50'
    });
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col md:flex-row transition-colors duration-300">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-brand-card transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 border-r border-brand-border",
        isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        isMinimized ? "w-20" : "w-64"
      )}>
        <div className="h-full flex flex-col py-6 px-4 relative">
          {/* Minimize Toggle */}
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="hidden md:flex absolute -right-3.5 top-8 w-7 h-7 bg-brand-card border border-brand-border rounded-full shadow-medium items-center justify-center text-brand-text-muted hover:text-brand-primary z-50 transition-all active:scale-90"
          >
            {isMinimized ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          <div className={cn("flex items-center gap-3 mb-10 px-2 transition-all", isMinimized && "justify-center")}>
            <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center min-w-[40px] shadow-lg shadow-brand-primary/20">
              <img 
                src="https://uploads.onecompiler.io/442aqr2uj/44gkkjfhk/CNMAXDIGITAL2.0.jpg" 
                alt="Logo" 
                className="w-6 h-6 rounded-lg object-contain brightness-0 invert"
                referrerPolicy="no-referrer"
              />
            </div>
            {!isMinimized && (
              <div className="overflow-hidden">
                <span className="font-bold text-lg tracking-tight text-brand-text block truncate">CNMax Digital</span>
                <p className="text-[10px] uppercase tracking-widest text-brand-text-muted font-bold truncate">Admin Panel</p>
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-200 group relative",
                  activeTab === item.id 
                    ? "bg-brand-primary/10 text-brand-primary rounded-xl" 
                    : "text-brand-text-muted hover:text-brand-text rounded-xl hover:bg-brand-primary/5",
                  isMinimized && "justify-center px-0"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 min-w-[20px] transition-colors",
                  activeTab === item.id ? "text-brand-primary" : "text-brand-text-muted group-hover:text-brand-text"
                )} />
                {!isMinimized && <span className="text-sm font-medium">{item.label}</span>}
                
                {activeTab === item.id && !isMinimized && (
                  <div className="w-1 h-5 bg-brand-primary rounded-full ml-auto" />
                )}

                {isMinimized && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-brand-card border border-brand-border shadow-2xl text-brand-text font-bold text-xs rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-brand-border">
            <div className={cn("flex items-center gap-3 rounded-2xl", isMinimized ? "justify-center" : "p-2 hover:bg-brand-primary/5 transition-colors")}>
              <div className="relative">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || user.email} 
                    className="w-9 h-9 rounded-full min-w-[36px] object-cover border border-brand-border"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full min-w-[36px] bg-brand-primary flex items-center justify-center text-white font-bold text-sm">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-brand-card rounded-full"></div>
              </div>
              {!isMinimized && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-brand-text truncate">{user.displayName || user.email?.split('@')[0]}</p>
                  <p className="text-[10px] text-brand-text-muted truncate uppercase tracking-widest font-bold">Administrator</p>
                </div>
              )}
            </div>
            <button 
              onClick={onLogout}
              title="Logout"
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 mt-2 text-red-500 hover:text-red-600 transition-colors rounded-xl hover:bg-red-500/10",
                isMinimized && "justify-center"
              )}
            >
              <LogOut size={18} />
              {!isMinimized && <span className="text-sm font-bold">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-brand-bg">
        {/* Header */}
        <header className="h-20 bg-brand-card/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-6 md:px-10 border-b border-brand-border">
          <div className="flex items-center gap-4 md:hidden">
            <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center shadow-lg">
              <img 
                src="https://uploads.onecompiler.io/442aqr2uj/44gkkjfhk/CNMAXDIGITAL2.0.jpg" 
                alt="Logo" 
                className="h-6 rounded object-contain brightness-0 invert"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          
          <div className="hidden md:block">
            <h1 className="text-lg font-bold text-brand-text tracking-tight">
              {navItems.find(i => i.id === activeTab)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <button 
              onClick={toggleDarkMode}
              className="p-2.5 bg-brand-bg rounded-xl border border-brand-border text-brand-text-muted hover:text-brand-primary transition-all active:scale-95"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 bg-brand-bg rounded-xl border border-brand-border text-brand-text-muted hover:text-brand-primary md:hidden active:scale-95 transition-all"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2.5 bg-brand-bg rounded-xl border border-brand-border text-brand-text-muted hover:text-brand-primary transition-all active:scale-95 relative"
              >
                <Bell className="w-4.5 h-4.5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border border-brand-card rounded-full"></span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-4 w-80 bg-brand-card rounded-2xl shadow-2xl border border-brand-border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-brand-border flex items-center justify-between bg-brand-bg/50">
                    <h3 className="font-bold text-brand-text text-sm">Notifications</h3>
                    <span className="text-[10px] font-bold bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full">
                      {notifications.length} New
                    </span>
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-brand-text-muted">
                        <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">All caught up!</p>
                        <p className="text-xs mt-1 opacity-70">No critical events to report.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-brand-border">
                        {notifications.map((notif) => (
                          <div key={notif.id} className="p-4 hover:bg-brand-bg transition-colors flex gap-4">
                            <div className={cn("p-2.5 rounded-xl h-fit", notif.bg, notif.color)}>
                              <notif.icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-brand-text">{notif.title}</p>
                              <p className="text-xs text-brand-text-muted mt-1 leading-relaxed">{notif.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center gap-3 p-1 bg-brand-bg rounded-xl border border-brand-border">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName} 
                  className="w-7 h-7 rounded-lg object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-brand-primary flex items-center justify-center text-white text-[10px] font-bold">
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-bold pr-2 text-brand-text">{user.displayName || user.email?.split('@')[0]}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 md:p-10 overflow-auto custom-scrollbar">
          {children}
        </div>
      </main>

      {/* Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
