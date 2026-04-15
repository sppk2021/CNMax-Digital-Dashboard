import React, { useMemo, useState } from 'react';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  RefreshCw, 
  TrendingUp, 
  DollarSign,
  AlertCircle,
  Settings,
  Mail,
  CheckCircle2,
  Loader2,
  Receipt,
  ExternalLink,
  Clock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { cn, getStatus, isInMonth, getNow } from '../utils';
import { seedSampleData, clearAllData } from '../utils/seedData';
import { startOfMonth, subMonths, addDays, isBefore, parseISO, format } from 'date-fns';

interface DashboardProps {
  users: any[];
  sales: any[];
  expenses: any[];
  setActiveTab: (tab: any) => void;
}

export function Dashboard({ users, sales, expenses, setActiveTab }: DashboardProps) {
  const now = getNow();
  const currentMonth = startOfMonth(now);
  const threeDaysFromNow = addDays(now, 3);
  const [sendingEmails, setSendingEmails] = useState<Record<string, boolean>>({});
  const [sentEmails, setSentEmails] = useState<Record<string, boolean>>({});
  const [isBulkSending, setIsBulkSending] = useState(false);

  const handleSendReminder = async (user: any) => {
    setSendingEmails(prev => ({ ...prev, [user.id]: true }));
    try {
      const response = await fetch('/api/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          expiryDate: user.expiryDate
        }),
      });
      
      if (response.ok) {
        setSentEmails(prev => ({ ...prev, [user.id]: true }));
      }
    } catch (error) {
      console.error('Failed to send reminder:', error);
    } finally {
      setSendingEmails(prev => ({ ...prev, [user.id]: false }));
    }
  };

  const handleSendBulkReminders = async () => {
    if (expiringSoon.length === 0) return;
    setIsBulkSending(true);
    try {
      const response = await fetch('/api/send-bulk-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: expiringSoon }),
      });
      
      if (response.ok) {
        const newSent = { ...sentEmails };
        expiringSoon.forEach(u => { newSent[u.id] = true; });
        setSentEmails(newSent);
      }
    } catch (error) {
      console.error('Failed to send bulk reminders:', error);
    } finally {
      setIsBulkSending(false);
    }
  };

  // Metrics
  const activeUsers = users.filter(u => getStatus(u.expiryDate, u.subscriptionStartDate) === 'Active');
  const expiredUsers = users.filter(u => getStatus(u.expiryDate, u.subscriptionStartDate) === 'Expired');
  const expiringSoon = users.filter(u => {
    if (!u.expiryDate) return false;
    try {
      const expiry = parseISO(u.expiryDate);
      return getStatus(u.expiryDate, u.subscriptionStartDate) === 'Active' && isBefore(expiry, threeDaysFromNow);
    } catch (e) {
      return false;
    }
  });
  
  const newUsersThisMonth = users.filter(u => isInMonth(u.createdAt, currentMonth));
  const renewedSalesThisMonth = sales.filter(s => s.type === 'Renewal' && isInMonth(s.date, currentMonth));
  const totalSalesThisMonth = sales.filter(s => isInMonth(s.date, currentMonth));
  const revenueThisMonth = totalSalesThisMonth.reduce((acc, s) => acc + s.amount, 0);
  const expensesThisMonth = expenses.filter(e => isInMonth(e.date, currentMonth)).reduce((acc, e) => acc + e.amount, 0);
  const netProfitThisMonth = revenueThisMonth - expensesThisMonth;

  // Monthly Comparison Metrics
  const renewedUserIdsThisMonth = new Set(renewedSalesThisMonth.map(s => s.userId));
  const expiredSalesThisMonth = sales.filter(s => s.type === 'Expired' && isInMonth(s.date, currentMonth));
  const expiredEventsThisMonth = expiredSalesThisMonth.filter(s => !renewedUserIdsThisMonth.has(s.userId));
  
  const prevMonthTotalUsers = users.filter(u => {
    if (!u.createdAt) return false;
    try {
      return isBefore(parseISO(u.createdAt), currentMonth);
    } catch (e) {
      return false;
    }
  }).length;
  const netChange = newUsersThisMonth.length - expiredEventsThisMonth.length;

  // Revenue Breakdown by Plan
  const revenueByPlan = useMemo(() => {
    const currentSales = sales.filter(s => isInMonth(s.date, currentMonth));
    const breakdown: Record<string, number> = {};
    currentSales.forEach(s => {
      const plan = s.planName || 'Other';
      breakdown[plan] = (breakdown[plan] || 0) + s.amount;
    });
    return Object.entries(breakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [sales, currentMonth]);

  // Advanced Metrics
  const avgPlanPrice = sales.length > 0 ? sales.reduce((acc, s) => acc + s.amount, 0) / sales.length : 0;
  const projectedRevenue = activeUsers.length * avgPlanPrice;
  const churnBase = activeUsers.length + expiredEventsThisMonth.length;
  const churnRate = churnBase > 0 ? (expiredEventsThisMonth.length / churnBase) * 100 : 0;

  // Growth Trend Data (Last 12 Months)
  const growthData = useMemo(() => {
    const last12Months = Array.from({ length: 12 }).map((_, i) => subMonths(currentMonth, 11 - i));
    return last12Months.map(month => {
      const newInMonth = users.filter(u => isInMonth(u.createdAt, month)).length;
      
      const renewalsInMonth = sales.filter(s => s.type === 'Renewal' && isInMonth(s.date, month));
      const renewedIds = new Set(renewalsInMonth.map(s => s.userId));
      
      const expiredSalesInMonth = sales.filter(s => s.type === 'Expired' && isInMonth(s.date, month));
      const trulyExpiredInMonth = expiredSalesInMonth.filter(s => !renewedIds.has(s.userId)).length;
      
      return {
        name: format(month, 'MMM yy'),
        new: newInMonth,
        net: newInMonth - trulyExpiredInMonth,
      };
    });
  }, [users, sales, currentMonth]);

  const stats = [
    { 
      label: 'Active Users', 
      value: activeUsers.length, 
      icon: Users, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10',
      trend: '+12%'
    },
    { 
      label: 'Net Profit', 
      value: `${netProfitThisMonth.toLocaleString()} Ks`, 
      icon: DollarSign, 
      color: 'text-brand-primary', 
      bg: 'bg-brand-primary/10',
      trend: '+8.4%'
    },
    { 
      label: 'New Users', 
      value: newUsersThisMonth.length, 
      icon: UserPlus, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10',
      trend: '+5'
    },
    { 
      label: 'Monthly Expenses', 
      value: `${expensesThisMonth.toLocaleString()} Ks`, 
      icon: Receipt, 
      color: 'text-red-500', 
      bg: 'bg-red-500/10',
      trend: '-2.1%'
    },
  ];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-brand-text mb-1 tracking-tight">Business Overview</h2>
          <p className="text-brand-text-muted text-sm font-medium">Real-time summary of your business performance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setActiveTab('sales')}
            className="clay-btn-primary flex items-center gap-2 text-sm font-bold shadow-md hover:shadow-lg"
          >
            <DollarSign className="w-4 h-4" />
            View Sales History
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat) => (
          <div 
            key={stat.label}
            className="metric-card group border-none shadow-clay"
          >
            <div className="flex items-start justify-between mb-2">
              <div className={cn("p-3 rounded-2xl", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg",
                stat.trend.startsWith('+') ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
              )}>
                {stat.trend.startsWith('+') ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                {stat.trend}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-2xl font-bold text-brand-text tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="clay-card p-6 md:p-8 border-none shadow-clay bg-brand-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h3 className="text-lg font-bold text-brand-text flex items-center gap-3">
            <div className="p-2.5 bg-brand-primary/10 rounded-2xl">
              <TrendingUp className="w-5 h-5 text-brand-primary" />
            </div>
            Monthly Performance
          </h3>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-bg/50 rounded-xl border border-brand-border shadow-sm">
            <Clock className="w-3.5 h-3.5 text-brand-text-muted opacity-50" />
            <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{format(now, 'MMMM yyyy')}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">Growth</p>
              <p className="text-xl font-bold text-emerald-500">+{newUsersThisMonth.length}</p>
              <p className="text-[10px] text-brand-text-muted">New users</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">Churn</p>
              <p className="text-xl font-bold text-red-500">-{expiredEventsThisMonth.length}</p>
              <p className="text-[10px] text-brand-text-muted">Expired</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">Net</p>
              <p className={cn("text-xl font-bold", netChange >= 0 ? "text-emerald-500" : "text-red-500")}>
                {netChange >= 0 ? '+' : ''}{netChange}
              </p>
              <p className="text-[10px] text-brand-text-muted">Total change</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">Active</p>
              <p className="text-xl font-bold text-brand-primary">{activeUsers.length}</p>
              <p className="text-[10px] text-brand-text-muted">Current total</p>
            </div>
          </div>

          <div className="lg:col-span-4 lg:border-l border-brand-border lg:pl-12">
            <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest mb-4">Revenue Breakdown</p>
            <div className="space-y-3">
              {revenueByPlan.map((item) => (
                <div key={item.name} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-primary group-hover:scale-150 transition-transform" />
                    <span className="text-xs font-medium text-brand-text">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-brand-text">{item.value.toLocaleString()} Ks</span>
                </div>
              ))}
              {revenueByPlan.length === 0 && (
                <p className="text-xs text-brand-text-muted italic">No sales recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Growth Trend Chart */}
        <div className="lg:col-span-2 clay-card p-6 md:p-8 border-none shadow-clay bg-brand-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
            <h3 className="text-lg font-bold text-brand-text flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 rounded-2xl">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              User Growth Trend
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">New</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-primary" />
                <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Net</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-brand-border)" />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false}
                  dy={15}
                  tick={{ fill: 'var(--color-brand-text-muted)', fontSize: 10, fontWeight: 600 }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false}
                  dx={-15}
                  tick={{ fill: 'var(--color-brand-text-muted)', fontSize: 10, fontWeight: 600 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--color-brand-card)', 
                    border: '1px solid var(--color-brand-border)', 
                    borderRadius: '12px',
                    fontSize: '11px',
                    boxShadow: 'var(--shadow-medium)',
                    padding: '10px'
                  }}
                  itemStyle={{ fontWeight: 600, padding: '2px 0' }}
                  labelStyle={{ color: 'var(--color-brand-text-muted)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', fontSize: '9px' }}
                  cursor={{ stroke: 'var(--color-brand-border)', strokeWidth: 2 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="new" 
                  name="New Users"
                  stroke="#3b82f6" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorNew)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="net" 
                  name="Net Change"
                  stroke="#6366f1" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorNet)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          <div className="clay-card p-6 border-none shadow-medium">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-brand-text flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                </div>
                Expiring Soon
              </h3>
              {expiringSoon.length > 0 && (
                <button
                  onClick={handleSendBulkReminders}
                  disabled={isBulkSending}
                  className="text-[10px] font-bold text-brand-primary hover:text-brand-primary-hover uppercase tracking-widest flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isBulkSending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Mail className="w-3 h-3" />
                  )}
                  Notify All
                </button>
              )}
            </div>
            <div className="space-y-3">
              {expiringSoon.slice(0, 4).map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-brand-bg rounded-xl border border-brand-border group hover:border-brand-primary/30 transition-all">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-brand-text truncate">{user.name}</p>
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-0.5">
                      {(() => {
                        if (!user.expiryDate) return 'N/A';
                        try {
                          const expiryDate = parseISO(user.expiryDate);
                          const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                          return `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`;
                        } catch (e) {
                          return 'Invalid Date';
                        }
                      })()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSendReminder(user)}
                    disabled={sendingEmails[user.id] || sentEmails[user.id]}
                    className={cn(
                      "p-2 rounded-lg transition-all active:scale-90",
                      sentEmails[user.id] 
                        ? "bg-emerald-500/10 text-emerald-600" 
                        : "bg-brand-bg border border-brand-border text-brand-text-muted hover:text-brand-primary"
                    )}
                  >
                    {sendingEmails[user.id] ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : sentEmails[user.id] ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Mail className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
              {expiringSoon.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/20 mx-auto mb-2" />
                  <p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-widest">All up to date</p>
                </div>
              )}
            </div>
          </div>

          <div className="clay-card p-6 border-none shadow-medium">
            <h3 className="text-base font-bold text-brand-text mb-6 flex items-center gap-3">
              <div className="p-2 bg-brand-primary/10 rounded-xl">
                <RefreshCw className="w-4 h-4 text-brand-primary" />
              </div>
              Recent Activity
            </h3>
            <div className="space-y-4">
              {sales.slice(0, 4).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase",
                      sale.type === 'New' ? "bg-blue-500/10 text-blue-600" : "bg-brand-primary/10 text-brand-primary"
                    )}>
                      {sale.userName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-brand-text">{sale.userName}</p>
                      <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mt-0.5">
                        {sale.type} • {(() => {
                          if (!sale.date) return 'N/A';
                          try {
                            return format(parseISO(sale.date), 'MMM d');
                          } catch (e) {
                            return 'Invalid Date';
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-emerald-600">+{sale.amount.toLocaleString()}</p>
                </div>
              ))}
              {sales.length === 0 && (
                <p className="text-center text-brand-text-muted py-8 text-[10px] font-bold uppercase tracking-widest">No activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
