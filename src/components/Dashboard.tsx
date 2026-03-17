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
  ExternalLink
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
import { seedSampleData } from '../utils/seedData';
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
  const expiredEventsThisMonth = sales.filter(s => s.type === 'Expired' && isInMonth(s.date, currentMonth));
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
  const churnRate = users.length > 0 ? (expiredEventsThisMonth.length / users.length) * 100 : 0;

  // Growth Trend Data (Last 12 Months)
  const growthData = useMemo(() => {
    const last12Months = Array.from({ length: 12 }).map((_, i) => subMonths(currentMonth, 11 - i));
    return last12Months.map(month => {
      const newInMonth = users.filter(u => isInMonth(u.createdAt, month)).length;
      const expiredInMonth = users.filter(u => isInMonth(u.expiryDate, month)).length;
      return {
        name: format(month, 'MMM yy'),
        new: newInMonth,
        net: newInMonth - expiredInMonth,
      };
    });
  }, [users, currentMonth]);

  const stats = [
    { 
      label: 'Active Users', 
      value: activeUsers.length, 
      icon: Users, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10' 
    },
    { 
      label: 'Net Profit (Month)', 
      value: `${netProfitThisMonth.toLocaleString()} Ks`, 
      icon: DollarSign, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10' 
    },
    { 
      label: 'New (This Month)', 
      value: newUsersThisMonth.length, 
      icon: UserPlus, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10' 
    },
    { 
      label: 'Expenses (Month)', 
      value: `${expensesThisMonth.toLocaleString()} Ks`, 
      icon: Receipt, 
      color: 'text-red-500', 
      bg: 'bg-red-500/10' 
    },
    { 
      label: 'Total Revenue', 
      value: `${revenueThisMonth.toLocaleString()} Ks`, 
      icon: DollarSign, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10' 
    },
    { 
      label: 'Projected Revenue', 
      value: `${projectedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} Ks`, 
      icon: TrendingUp, 
      color: 'text-amber-500', 
      bg: 'bg-amber-500/10' 
    },
    { 
      label: 'Churn Rate', 
      value: `${churnRate.toFixed(1)}%`, 
      icon: UserMinus, 
      color: 'text-red-500', 
      bg: 'bg-red-500/10' 
    },
  ];

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Overview</h2>
          <p className="text-slate-500">Real-time summary of your business performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={async () => {
              console.log("Seed button clicked");
              if (window.confirm('Are you sure you want to seed sample data? This will add data to your database.')) {
                await seedSampleData();
                alert('Sample data seeded successfully!');
              }
            }}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl border border-slate-200 shadow-sm transition-all text-sm font-bold flex items-center gap-2 text-slate-700"
          >
            Seed Sample Data
          </button>
          <button 
            onClick={() => setActiveTab('sales')}
            className="px-6 py-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 shadow-sm transition-all text-sm font-bold flex items-center gap-2 text-slate-700"
          >
            <DollarSign className="w-4 h-4 text-brand-sidebar" />
            View Sales History
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.slice(0, 4).map((stat) => (
          <div 
            key={stat.label}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-6">
              <div className={cn("p-4 rounded-2xl", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <h3 className="text-3xl font-black text-slate-800">{stat.value}</h3>
              </div>
            </div>
            <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-1000", stat.color.replace('text-', 'bg-'))} style={{ width: '60%' }} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-brand-sidebar/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-brand-sidebar" />
            </div>
            Monthly Comparison
          </h3>
          <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full uppercase tracking-widest">{format(now, 'MMMM yyyy')}</span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-5 gap-10">
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Prev Month</p>
              <p className="text-3xl font-black text-slate-800">{prevMonthTotalUsers}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">New Growth</p>
              <p className="text-3xl font-black text-emerald-500">+{newUsersThisMonth.length}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Drop-off</p>
              <p className="text-3xl font-black text-red-500">-{expiredEventsThisMonth.length}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Net Change</p>
              <p className={cn("text-3xl font-black", netChange >= 0 ? "text-emerald-500" : "text-red-500")}>
                {netChange >= 0 ? '+' : ''}{netChange}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Current Active</p>
              <p className="text-3xl font-black text-brand-sidebar">{activeUsers.length}</p>
            </div>
          </div>

          <div className="lg:col-span-2 border-l border-slate-100 pl-10">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">Revenue by Plan</p>
            <div className="space-y-3">
              {revenueByPlan.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-sidebar" />
                    <span className="text-xs font-bold text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-black text-slate-800">{item.value.toLocaleString()} Ks</span>
                </div>
              ))}
              {revenueByPlan.length === 0 && (
                <p className="text-xs text-slate-400 italic">No sales recorded this month.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Growth Trend Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              User Growth Trend
            </h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">New</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-brand-sidebar" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3F51B5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3F51B5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight={700}
                  tickLine={false} 
                  axisLine={false}
                  dy={15}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight={700}
                  tickLine={false} 
                  axisLine={false}
                  dx={-15}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #f1f5f9', 
                    borderRadius: '16px',
                    fontSize: '12px',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                  itemStyle={{ fontWeight: 700, padding: '2px 0' }}
                  labelStyle={{ color: '#64748b', marginBottom: '8px', fontWeight: 800, textTransform: 'uppercase', fontSize: '10px' }}
                  cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="new" 
                  name="New Users"
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorNew)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="net" 
                  name="Net Change"
                  stroke="#3F51B5" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorNet)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                </div>
                Expiring Soon
              </h3>
              {expiringSoon.length > 0 && (
                <button
                  onClick={handleSendBulkReminders}
                  disabled={isBulkSending}
                  className="text-[10px] font-black text-brand-sidebar hover:text-brand-blue uppercase tracking-widest flex items-center gap-2 transition-colors disabled:opacity-50"
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
            <div className="space-y-4">
              {expiringSoon.slice(0, 4).map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-brand-sidebar/20 transition-all">
                  <div>
                    <p className="text-sm font-bold text-slate-700">{user.name}</p>
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                      {(() => {
                        if (!user.expiryDate) return 'N/A';
                        try {
                          const expiryDate = parseISO(user.expiryDate);
                          return `${Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days left`;
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
                      "p-2 rounded-xl transition-all",
                      sentEmails[user.id] 
                        ? "bg-emerald-100 text-emerald-600" 
                        : "bg-white text-slate-400 hover:text-brand-sidebar shadow-sm border border-slate-100"
                    )}
                  >
                    {sendingEmails[user.id] ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : sentEmails[user.id] ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
              {expiringSoon.length === 0 && (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-10 h-10 text-emerald-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-xs font-medium">All subscriptions are up to date.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-lg">
                <RefreshCw className="w-5 h-5 text-slate-400" />
              </div>
              Recent Activity
            </h3>
            <div className="space-y-6">
              {sales.slice(0, 4).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black uppercase",
                      sale.type === 'New' ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
                    )}>
                      {sale.userName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">{sale.userName}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
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
                  <p className="text-sm font-black text-emerald-600">+{sale.amount.toLocaleString()}</p>
                </div>
              ))}
              {sales.length === 0 && (
                <p className="text-center text-slate-400 py-10 text-xs">No recent activity.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
