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
  Clock
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
}

export function Layout({ children, user, onLogout, activeTab, setActiveTab, servers = [], users = [] }: LayoutProps) {
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
    <div className="min-h-screen bg-brand-bg text-slate-900 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-brand-sidebar transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 rounded-r-3xl md:rounded-none",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        isMinimized ? "w-24" : "w-64"
      )}>
        <div className="h-full flex flex-col py-8 pl-6 relative">
          {/* Minimize Toggle */}
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="hidden md:flex absolute -right-4 top-10 w-8 h-8 bg-white rounded-full border border-slate-200 items-center justify-center text-slate-500 hover:text-brand-sidebar shadow-sm z-50"
          >
            {isMinimized ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          <div className={cn("flex items-center gap-3 mb-12 px-2 text-white transition-all", isMinimized && "justify-center pr-6")}>
            <img 
              src="https://uploads.onecompiler.io/442aqr2uj/44gkkjfhk/CNMAXDIGITAL2.0.jpg" 
              alt="Logo" 
              className="h-10 rounded-lg object-contain bg-white p-1 min-w-[40px]"
              referrerPolicy="no-referrer"
            />
            {!isMinimized && <span className="font-bold text-xl tracking-tight">CNMAX</span>}
          </div>

          <nav className="flex-1 space-y-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-4 px-6 py-4 transition-all duration-200 group relative",
                  activeTab === item.id 
                    ? "bg-brand-bg text-brand-sidebar rounded-l-full font-bold shadow-sm" 
                    : "text-white/70 hover:text-white hover:bg-white/5 rounded-l-full",
                  isMinimized && "justify-center pr-6 rounded-full"
                )}
              >
                {activeTab === item.id && !isMinimized && (
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-brand-bg" />
                )}
                <item.icon className={cn(
                  "w-5 h-5 min-w-[20px]",
                  activeTab === item.id ? "text-brand-sidebar" : "text-white/70 group-hover:text-white"
                )} />
                {!isMinimized && <span className="text-sm tracking-wide">{item.label}</span>}
                
                {isMinimized && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 pr-6">
            <div className={cn("flex items-center gap-3 px-4 mb-8 text-white/90", isMinimized && "justify-center pr-0")}>
              <img 
                src={user.photoURL} 
                alt={user.displayName} 
                className="w-10 h-10 rounded-full border-2 border-white/20 min-w-[40px]"
              />
              {!isMinimized && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{user.displayName}</p>
                  <p className="text-[10px] opacity-60 truncate uppercase tracking-widest">{user.email}</p>
                </div>
              )}
            </div>
            <button
              onClick={onLogout}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors",
                isMinimized && "justify-center pr-6"
              )}
            >
              <LogOut className="w-5 h-5 min-w-[20px]" />
              {!isMinimized && <span className="text-sm font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 bg-brand-bg/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-8 md:px-12">
          <div className="flex items-center gap-4 md:hidden">
            <img 
              src="https://uploads.onecompiler.io/442aqr2uj/44gkkjfhk/CNMAXDIGITAL2.0.jpg" 
              alt="Logo" 
              className="h-8 rounded object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="font-bold tracking-tight text-brand-sidebar">CNMAX</span>
          </div>
          
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold text-slate-800 capitalize">
              {navItems.find(i => i.id === activeTab)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-500 hover:text-brand-sidebar md:hidden"
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
            
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 text-slate-500 hover:text-brand-sidebar hover:bg-slate-100 rounded-full transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-brand-bg rounded-full"></span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">Notifications</h3>
                    <span className="text-xs font-bold bg-brand-sidebar/10 text-brand-sidebar px-2 py-1 rounded-full">
                      {notifications.length} New
                    </span>
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        <Bell className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm font-medium">All caught up!</p>
                        <p className="text-xs mt-1 text-slate-400">No critical events to report.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {notifications.map((notif) => (
                          <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-3">
                            <div className={cn("p-2 rounded-xl h-fit", notif.bg, notif.color)}>
                              <notif.icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{notif.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{notif.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                offlineServers.length > 0 ? "bg-red-500" : "bg-emerald-500"
              )} />
              <span className="text-xs font-medium text-slate-500">
                {offlineServers.length > 0 ? 'System Issues' : 'System Online'}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-8 md:p-12 overflow-auto custom-scrollbar">
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
