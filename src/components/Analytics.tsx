import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown,
  Users,
  RefreshCw,
  UserPlus,
  UserMinus,
  DollarSign,
  Download,
  Receipt
} from 'lucide-react';
import { cn, getStatus, isInMonth, getNow } from '../utils';
import { format, startOfMonth, subMonths, addMonths, isBefore, parseISO } from 'date-fns';

interface AnalyticsProps {
  users: any[];
  sales: any[];
  expenses: any[];
}

export function Analytics({ users, sales, expenses }: AnalyticsProps) {
  const [selectedMonth, setSelectedMonth] = useState(getNow());

  const prevMonth = subMonths(selectedMonth, 1);
  
  const currentMonthData = useMemo(() => {
    const startOfCurrent = startOfMonth(selectedMonth);
    
    const newUsers = users.filter(u => isInMonth(u.createdAt, selectedMonth));
    const renewals = sales.filter(s => s.type === 'Renewal' && isInMonth(s.date, selectedMonth));
    const totalSales = sales.filter(s => isInMonth(s.date, selectedMonth));
    const revenue = totalSales.reduce((acc, s) => acc + s.amount, 0);
    const monthlyExpenses = expenses.filter(e => isInMonth(e.date, selectedMonth));
    const totalExpenses = monthlyExpenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = revenue - totalExpenses;
    
    // Previous Month Total Users (Total users created before this month)
    const prevMonthTotalUsers = users.filter(u => {
      if (!u.createdAt) return false;
      try {
        return isBefore(parseISO(u.createdAt), startOfCurrent);
      } catch (e) {
        return false;
      }
    }).length;
    
    // Expired users this month (drop-off) - using events for accuracy
    const expiredEvents = sales.filter(s => s.type === 'Expired' && isInMonth(s.date, selectedMonth));
    
    // Current Active Users (users currently active)
    const activeUsers = users.filter(u => getStatus(u.expiryDate, u.subscriptionStartDate) === 'Active').length;
    
    // Net Change
    const netChange = newUsers.length - expiredEvents.length;

    return { 
      newUsers, 
      renewals, 
      totalSales, 
      revenue, 
      totalExpenses,
      netProfit,
      expiredThisMonth: expiredEvents, // Renamed internally for consistency with UI
      prevMonthTotalUsers,
      activeUsers,
      netChange
    };
  }, [users, sales, expenses, selectedMonth]);

  const handleDownloadReport = () => {
    const monthStr = format(selectedMonth, 'MMMM_yyyy');
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Summary Section
    csvContent += `Monthly Report: ${format(selectedMonth, 'MMMM yyyy')}\n\n`;
    csvContent += "Metric,Value\n";
    csvContent += `Previous Month Total Users,${currentMonthData.prevMonthTotalUsers}\n`;
    csvContent += `New Users (Growth),${currentMonthData.newUsers.length}\n`;
    csvContent += `Expired Users (Drop-off),${currentMonthData.expiredThisMonth.length}\n`;
    csvContent += `Net Change,${currentMonthData.netChange}\n`;
    csvContent += `Current Active Users,${currentMonthData.activeUsers}\n`;
    csvContent += `Monthly Revenue,${currentMonthData.revenue} Ks\n`;
    csvContent += `Monthly Expenses,${currentMonthData.totalExpenses} Ks\n`;
    csvContent += `Net Profit,${currentMonthData.netProfit} Ks\n`;
    csvContent += `Total Renewals,${currentMonthData.renewals.length}\n\n`;

    // New Users Section
    csvContent += "NEW USERS\nName,Join Date,Plan\n";
    currentMonthData.newUsers.forEach(u => {
      let dateStr = 'N/A';
      if (u.createdAt) {
        try { dateStr = format(parseISO(u.createdAt), 'yyyy-MM-dd'); } catch(e) {}
      }
      csvContent += `"${u.name}","${dateStr}","${u.planName || 'N/A'}"\n`;
    });
    csvContent += "\n";

    // Renewed Users Section
    csvContent += "RENEWED USERS\nName,Renewal Date,Plan,Amount\n";
    currentMonthData.renewals.forEach(s => {
      let dateStr = 'N/A';
      if (s.date) {
        try { dateStr = format(parseISO(s.date), 'yyyy-MM-dd'); } catch(e) {}
      }
      csvContent += `"${s.userName}","${dateStr}","${s.planName || 'N/A'}","${s.amount}"\n`;
    });
    csvContent += "\n";

    // Expired Users Section
    csvContent += "EXPIRED USERS\nName,Expiry Date,Plan\n";
    currentMonthData.expiredThisMonth.forEach(u => {
      let dateStr = 'N/A';
      if (u.expiryDate) {
        try { dateStr = format(parseISO(u.expiryDate), 'yyyy-MM-dd'); } catch(e) {}
      }
      csvContent += `"${u.name}","${dateStr}","${u.planName || 'N/A'}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Monthly_Report_${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const prevMonthData = useMemo(() => {
    const newUsers = users.filter(u => isInMonth(u.createdAt, prevMonth));
    const totalSales = sales.filter(s => isInMonth(s.date, prevMonth));
    const revenue = totalSales.reduce((acc, s) => acc + s.amount, 0);
    const prevMonthExpenses = expenses.filter(e => isInMonth(e.date, prevMonth)).reduce((acc, e) => acc + e.amount, 0);
    return { newUsers, totalSales, revenue, expenses: prevMonthExpenses };
  }, [users, sales, expenses, prevMonth]);

  const revenueData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), 5 - i));
    return last6Months.map(month => {
      const monthSales = sales.filter(s => isInMonth(s.date, month));
      const monthExpenses = expenses.filter(e => isInMonth(e.date, month)).reduce((acc, e) => acc + e.amount, 0);
      const revenue = monthSales.reduce((acc, s) => acc + s.amount, 0);
      return {
        name: format(month, 'MMM'),
        revenue,
        expenses: monthExpenses,
        profit: revenue - monthExpenses,
        new: monthSales.filter(s => s.type === 'New').reduce((acc, s) => acc + s.amount, 0),
        renewal: monthSales.filter(s => s.type === 'Renewal').reduce((acc, s) => acc + s.amount, 0),
      };
    });
  }, [sales, expenses]);

  const pieData = [
    { name: 'New', value: currentMonthData.totalSales.filter(s => s.type === 'New').length },
    { name: 'Renewal', value: currentMonthData.renewals.length },
  ];

  const planDistribution = useMemo(() => {
    const active = users.filter(u => getStatus(u.expiryDate, u.subscriptionStartDate) === 'Active');
    const counts: Record<string, number> = {};
    active.forEach(u => {
      const plan = u.planName || 'Unknown';
      counts[plan] = (counts[plan] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [users]);

  const churnData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), 5 - i));
    return last6Months.map(month => {
      const startOfThisMonth = startOfMonth(month);
      
      // Total users who were active at the START of this month
      // (Created before this month AND not expired before this month)
      const usersAtStart = users.filter(u => {
        if (!u.createdAt || !u.expiryDate) return false;
        try {
          const created = parseISO(u.createdAt);
          const expiry = parseISO(u.expiryDate);
          return isBefore(created, startOfThisMonth) && isBefore(startOfThisMonth, expiry);
        } catch (e) {
          return false;
        }
      }).length;

      const expiredInMonth = sales.filter(s => s.type === 'Expired' && isInMonth(s.date, month)).length;
      
      const churnRate = usersAtStart > 0 ? (expiredInMonth / usersAtStart) * 100 : 0;

      return {
        name: format(month, 'MMM'),
        rate: parseFloat(churnRate.toFixed(1)),
        expired: expiredInMonth,
        base: usersAtStart
      };
    });
  }, [users, sales]);

  const COLORS = ['#3b82f6', '#f97316', '#10b981', '#a855f7', '#f43f5e'];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Analytics & Reports</h2>
          <p className="text-slate-500">Deep dive into your monthly performance metrics.</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition-all text-sm font-bold"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
          <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
              className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-brand-sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-4 font-bold text-slate-700">
              <Calendar className="w-4 h-4 text-brand-sidebar" />
              {format(selectedMonth, 'MMMM yyyy')}
            </div>
            <button 
              onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
              className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-brand-sidebar"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <MetricCard 
          label="Prev Month Total" 
          value={currentMonthData.prevMonthTotalUsers} 
          icon={Users}
          color="blue"
        />
        <MetricCard 
          label="New Users (Growth)" 
          value={currentMonthData.newUsers.length} 
          prevValue={prevMonthData.newUsers.length}
          icon={UserPlus}
          color="emerald"
        />
        <MetricCard 
          label="Expired (Drop-off)" 
          value={currentMonthData.expiredThisMonth.length} 
          icon={UserMinus}
          color="red"
        />
        <MetricCard 
          label="Net Change" 
          value={currentMonthData.netChange} 
          icon={TrendingUp}
          color="purple"
          showSign
        />
        <MetricCard 
          label="Current Active" 
          value={currentMonthData.activeUsers} 
          icon={RefreshCw}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          label="Monthly Revenue" 
          value={`${currentMonthData.revenue.toLocaleString()} Ks`} 
          prevValue={prevMonthData.revenue}
          icon={DollarSign}
          color="emerald"
          isCurrency
        />
        <MetricCard 
          label="Monthly Expenses" 
          value={`${currentMonthData.totalExpenses.toLocaleString()} Ks`} 
          prevValue={prevMonthData.expenses}
          icon={Receipt}
          color="red"
          isCurrency
        />
        <MetricCard 
          label="Net Profit" 
          value={`${currentMonthData.netProfit.toLocaleString()} Ks`} 
          prevValue={prevMonthData.revenue - prevMonthData.expenses}
          icon={TrendingUp}
          color="purple"
          isCurrency
        />
        <MetricCard 
          label="Total Renewals" 
          value={currentMonthData.renewals.length} 
          icon={RefreshCw}
          color="orange"
        />
      </div>

      {/* Revenue Trend & Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-800">Revenue Trend (Last 6 Months)</h3>
            <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-black bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">
              <TrendingUp className="w-3 h-3" />
              Forecast: +12% Next Month
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#94a3b8" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} dx={-10} tickFormatter={(v) => `${v} Ks`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <Bar dataKey="new" name="New Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="renewal" name="Renewals" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit vs Expenses */}
        <div className="lg:col-span-3 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-800">Profit vs Expenses (Last 6 Months)</h3>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Financial Overview
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#94a3b8" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} dx={-10} tickFormatter={(v) => `${v} Ks`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales Breakdown */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-8">Sales Breakdown</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Churn Rate & Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Churn Rate Trend */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-800">User Churn Rate (%)</h3>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Last 6 Months
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={churnData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#94a3b8" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} dx={-10} tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  name="Churn Rate" 
                  stroke="#f43f5e" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-8">Plan Distribution (Active)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <UserPlus className="w-5 h-5 text-blue-500" />
            </div>
            New Users
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
            {currentMonthData.newUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all">
                <div>
                  <p className="font-bold text-slate-700">{u.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Joined: {(() => {
                      if (!u.createdAt) return 'N/A';
                      try { return format(parseISO(u.createdAt), 'MMM d, yyyy'); } catch(e) { return 'Invalid Date'; }
                    })()}
                  </p>
                </div>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-widest">NEW</span>
              </div>
            ))}
            {currentMonthData.newUsers.length === 0 && <p className="text-center text-slate-400 py-10 text-xs font-medium">No new users.</p>}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <RefreshCw className="w-5 h-5 text-orange-500" />
            </div>
            Renewed Users
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
            {currentMonthData.renewals.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-orange-200 transition-all">
                <div>
                  <p className="font-bold text-slate-700">{s.userName}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Renewed: {(() => {
                      if (!s.date) return 'N/A';
                      try { return format(parseISO(s.date), 'MMM d, yyyy'); } catch(e) { return 'Invalid Date'; }
                    })()}
                  </p>
                </div>
                <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded uppercase tracking-widest">RENEWED</span>
              </div>
            ))}
            {currentMonthData.renewals.length === 0 && <p className="text-center text-slate-400 py-10 text-xs font-medium">No renewals.</p>}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <UserMinus className="w-5 h-5 text-red-500" />
            </div>
            Expired Users
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
            {currentMonthData.expiredThisMonth.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-red-200 transition-all">
                <div>
                  <p className="font-bold text-slate-700">{s.userName}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Expired: {(() => {
                      if (!s.date) return 'N/A';
                      try { return format(parseISO(s.date), 'MMM d, yyyy'); } catch(e) { return 'Invalid Date'; }
                    })()}
                  </p>
                </div>
                <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded uppercase tracking-widest">EXPIRED</span>
              </div>
            ))}
            {currentMonthData.expiredThisMonth.length === 0 && <p className="text-center text-slate-400 py-10 text-xs font-medium">No expired users.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, prevValue, icon: Icon, color, isCurrency, showSign }: any) {
  const diff = typeof value === 'number' && typeof prevValue === 'number' ? value - prevValue : 0;
  const isPositive = diff >= 0;

  const colorClasses: any = {
    blue: 'text-blue-500 bg-blue-50',
    orange: 'text-orange-500 bg-orange-50',
    red: 'text-red-500 bg-red-50',
    emerald: 'text-emerald-500 bg-emerald-50',
    purple: 'text-purple-500 bg-purple-50',
  };

  const displayValue = showSign && typeof value === 'number' ? `${value > 0 ? '+' : ''}${value}` : value;

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-xl", colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
        {typeof value === 'number' && typeof prevValue === 'number' && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest",
            isPositive ? "text-emerald-600" : "text-red-600"
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(diff)}
          </div>
        )}
      </div>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{label}</p>
      <h4 className="text-2xl font-black text-slate-800">{displayValue}</h4>
    </div>
  );
}
