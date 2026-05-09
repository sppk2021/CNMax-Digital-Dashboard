import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
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
  Legend,
  ComposedChart
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
  Receipt,
  Loader2
} from 'lucide-react';
import { cn, getStatus, isInMonth, getNow, safeFormat } from '../utils';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isBefore, isAfter, parseISO, differenceInDays, addDays, min, max } from 'date-fns';

interface AnalyticsProps {
}

export function Analytics({ }: AnalyticsProps) {
  const [selectedMonth, setSelectedMonth] = useState(getNow());
  const selectedMonthKey = format(selectedMonth, 'yyyy-MM');
  
  // Local state for optimized monthly metrics fetching
  const [fetchedSales, setFetchedSales] = useState<any[]>([]);
  const [fetchedExpenses, setFetchedExpenses] = useState<any[]>([]);
  const [fetchedNewUsers, setFetchedNewUsers] = useState<any[]>([]);
  const [fetchedActiveUsers, setFetchedActiveUsers] = useState<any[]>([]);
  const [fetchedPlans, setFetchedPlans] = useState<any[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    setLoadingMetrics(true);
    
    // We fetch a 12-month window ending at the selected month to catch spanning subscriptions
    const startOfWindow = startOfMonth(subMonths(selectedMonth, 5));
    const startOfSalesFetch = startOfMonth(subMonths(selectedMonth, 18)); // Fetch longer history for revenue recognition
    const endOfWindow = endOfMonth(selectedMonth);
    
    const startISO = startOfWindow.toISOString();
    const endISO = endOfWindow.toISOString();

    // Queries
    const salesQ = query(
      collection(db, 'sales'), 
      where('date', '>=', startOfSalesFetch.toISOString())
    );
    
    const expensesQ = query(
      collection(db, 'expenses'), 
      where('date', '>=', startOfWindow.toISOString()), 
      where('date', '<=', endOfWindow.toISOString())
    );
    
    const newUsersQ = query(collection(db, 'users'));
    const activeUsersQ = query(collection(db, 'users'));
    const plansQ = query(collection(db, 'plans'));

    let salesLoaded = false;
    let expensesLoaded = false;
    let newUsersLoaded = false;
    let activeUsersLoaded = false;
    let plansLoaded = false;

    const checkLoading = () => {
      if (salesLoaded && expensesLoaded && newUsersLoaded && activeUsersLoaded && plansLoaded) {
        setLoadingMetrics(false);
      }
    };

    const unsubSales = onSnapshot(salesQ, snapshot => {
      setFetchedSales(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
      salesLoaded = true;
      checkLoading();
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'sales'));
    
    const unsubExpenses = onSnapshot(expensesQ, snapshot => {
      setFetchedExpenses(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
      expensesLoaded = true;
      checkLoading();
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'expenses'));
    
    const unsubNewUsers = onSnapshot(newUsersQ, snapshot => {
      setFetchedNewUsers(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
      newUsersLoaded = true;
      checkLoading();
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
    
    const unsubActiveUsers = onSnapshot(activeUsersQ, snapshot => {
      setFetchedActiveUsers(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
      activeUsersLoaded = true;
      checkLoading();
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    const unsubPlans = onSnapshot(plansQ, snapshot => {
      setFetchedPlans(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
      plansLoaded = true;
      checkLoading();
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'plans'));

    return () => {
      unsubSales();
      unsubExpenses();
      unsubNewUsers();
      unsubActiveUsers();
      unsubPlans();
    };
  }, [selectedMonthKey]);

  const prevMonth = subMonths(selectedMonth, 1);
  
  const getMonthData = useCallback((month: Date) => {
    const endOfCurrent = endOfMonth(month);
    
    // Deduplicate by ID
    const uniqueSalesList = Array.from(new Map(fetchedSales.map(s => [s.id, s])).values());
    
    const monthlySales = uniqueSalesList.filter(s => isInMonth(s.date, month) && (s.type === 'New' || s.type === 'Renewal'));
    const monthlyExpenses = fetchedExpenses.filter(e => isInMonth(e.date, month));
    const newUsers = fetchedNewUsers.filter(u => isInMonth(u.createdAt, month));
    
    // Monthly events (not sales)
    const monthlyEvents = uniqueSalesList.filter(s => isInMonth(s.date, month));
    
    const revenue = monthlySales.reduce((acc, s) => acc + Number(s.amount || 0), 0);
    const revenueNew = monthlySales.filter(s => s.type === 'New').reduce((acc, s) => acc + Number(s.amount || 0), 0);
    const revenueRenewal = monthlySales.filter(s => s.type === 'Renewal').reduce((acc, s) => acc + Number(s.amount || 0), 0);
    
    const renewalSales = monthlySales.filter(s => s.type === 'Renewal');
    const renewedUserIds = new Set(renewalSales.map(s => s.userId));
    
    const expiredSales = monthlyEvents.filter(s => s.type === 'Expired');
    const expiredThisMonth = expiredSales.filter(s => !renewedUserIds.has(s.userId));
    
    const activeUsers = fetchedActiveUsers.filter(u => {
      if (!u.createdAt || !u.expiryDate) return false;
      try {
        const createdDate = parseISO(u.createdAt);
        if (createdDate > endOfCurrent) return false;

        // Exclude users who expired this month and did not renew
        if (expiredThisMonth.some(s => s.userId === u.id)) {
          return false;
        }

        // Include users who renewed this month
        if (renewedUserIds.has(u.id)) {
          return true;
        }

        // Include previously active users whose expiry date extends beyond this month
        const expiryDate = parseISO(u.expiryDate);
        return expiryDate >= endOfCurrent;
      } catch (e) {
        return false;
      }
    });

    const totalExpenses = monthlyExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    
    return { 
      newUsers, 
      renewals: renewalSales, 
      totalSales: monthlySales, 
      revenue: revenue, 
      cashSales: revenue,
      revenueNew,
      revenueRenewal,
      totalExpenses,
      netProfit: revenue - totalExpenses,
      expiredThisMonth,
      activeUsers: activeUsers.length,
      netChange: newUsers.length - expiredThisMonth.length
    };
  }, [fetchedSales, fetchedExpenses, fetchedNewUsers, fetchedActiveUsers]);

  const currentMonthData = useMemo(() => getMonthData(selectedMonth), [getMonthData, selectedMonth]);
  const prevMonthData = useMemo(() => getMonthData(prevMonth), [getMonthData, prevMonth]);

  const monthlyHistory = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => subMonths(selectedMonth, i));
    return months.map(m => ({
      month: m,
      data: getMonthData(m)
    }));
  }, [getMonthData, selectedMonth]);

  const handleDownloadReport = () => {
    const monthStr = format(selectedMonth, 'MMMM_yyyy');
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Summary Section
    csvContent += `Monthly Report: ${format(selectedMonth, 'MMMM yyyy')}\n\n`;
    csvContent += "Metric,Value\n";
    csvContent += `New Users,${currentMonthData.newUsers.length}\n`;
    csvContent += `Renewals,${currentMonthData.renewals.length}\n`;
    csvContent += `Expired Users,${currentMonthData.expiredThisMonth.length}\n`;
    csvContent += `Active Users,${currentMonthData.activeUsers}\n`;
    csvContent += `Monthly Revenue,${currentMonthData.revenue} Ks\n`;
    csvContent += `Monthly Expenses,${currentMonthData.totalExpenses} Ks\n`;
    csvContent += `Net Profit,${currentMonthData.netProfit} Ks\n\n`;

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
    csvContent += "RENEWED USERS\nName,Renewal Date,Plan\n";
    currentMonthData.renewals.forEach(s => {
      let dateStr = 'N/A';
      if (s.date) {
        try { dateStr = format(parseISO(s.date), 'yyyy-MM-dd'); } catch(e) {}
      }
      csvContent += `"${s.userName}","${dateStr}","${s.planName || 'N/A'}"\n`;
    });
    csvContent += "\n";

    // Expired Users Section
    csvContent += "EXPIRED USERS\nName,Expiry Date,Plan\n";
    currentMonthData.expiredThisMonth.forEach(s => {
      let dateStr = 'N/A';
      if (s.date) {
        try { dateStr = format(parseISO(s.date), 'yyyy-MM-dd'); } catch(e) {}
      }
      csvContent += `"${s.userName}","${dateStr}","${s.planName || 'N/A'}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Monthly_Report_${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const revenueData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }).map((_, i) => subMonths(selectedMonth, 5 - i));
    return last6Months.map(month => {
      const { revenue, revenueNew, revenueRenewal, totalExpenses } = getMonthData(month);
      return {
        name: format(month, 'MMM'),
        revenue,
        expenses: totalExpenses,
        profit: revenue - totalExpenses,
        new: revenueNew,
        renewal: revenueRenewal,
      };
    });
  }, [getMonthData, selectedMonth]);

  const pieData = [
    { name: 'New', value: currentMonthData.totalSales.filter(s => s.type === 'New').length },
    { name: 'Renewal', value: currentMonthData.renewals.length },
  ];

  const planDistribution = useMemo(() => {
    const active = fetchedActiveUsers.filter(u => getStatus(u.expiryDate, u.subscriptionStartDate) === 'Active');
    const counts: Record<string, number> = {};
    active.forEach(u => {
      const plan = u.planName || 'Unknown';
      counts[plan] = (counts[plan] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [fetchedActiveUsers]);

  const expiredData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }).map((_, i) => subMonths(selectedMonth, 5 - i));
    return last6Months.map(month => {
      const expiredSales = fetchedSales.filter(s => s.type === 'Expired' && isInMonth(s.date, month));
      const renewalSales = fetchedSales.filter(s => s.type === 'Renewal' && isInMonth(s.date, month));
      const renewedUserIds = new Set(renewalSales.map(s => s.userId));
      
      const trulyExpired = expiredSales.filter(s => !renewedUserIds.has(s.userId));

      return {
        name: format(month, 'MMM'),
        expired: trulyExpired.length,
      };
    });
  }, [fetchedSales, selectedMonth]);

  const COLORS = ['#3b82f6', '#f97316', '#10b981', '#a855f7', '#f43f5e'];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-brand-text mb-1 tracking-tight">Analytics & Reports</h2>
          <p className="text-brand-text-muted text-sm font-medium">Deep dive into your monthly performance metrics.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadReport}
            className="clay-btn flex items-center gap-2 text-sm font-bold shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
          <div className="flex items-center gap-2 bg-brand-card p-1.5 rounded-xl border border-brand-border shadow-clay">
            <button 
              onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
              className="p-1.5 hover:bg-brand-primary/10 rounded-lg transition-colors text-brand-text-muted hover:text-brand-primary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-3 text-[10px] font-bold text-brand-text uppercase tracking-widest">
              <Calendar className="w-4 h-4 text-brand-primary" />
              {format(selectedMonth, 'MMMM yyyy')}
            </div>
            <button 
              onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
              className="p-1.5 hover:bg-brand-primary/10 rounded-lg transition-colors text-brand-text-muted hover:text-brand-primary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {loadingMetrics ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
          <p className="text-brand-text-muted text-sm font-medium">Loading monthly metrics...</p>
        </div>
      ) : (
        <>
          {/* Comparison Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <MetricCard 
          label="New Users" 
          value={currentMonthData.newUsers.length} 
          prevValue={prevMonthData.newUsers.length}
          icon={UserPlus}
          color="emerald"
        />
        <MetricCard 
          label="Renewals" 
          value={currentMonthData.renewals.length} 
          prevValue={prevMonthData.renewals.length}
          icon={RefreshCw}
          color="blue"
        />
        <MetricCard 
          label="Expired" 
          value={currentMonthData.expiredThisMonth.length} 
          prevValue={prevMonthData.expiredThisMonth.length}
          icon={UserMinus}
          color="red"
        />
        <MetricCard 
          label="Active Users" 
          value={currentMonthData.activeUsers} 
          prevValue={prevMonthData.activeUsers}
          icon={Users}
          color="brand"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <MetricCard 
          label="Total Collected" 
          value={`${currentMonthData.cashSales.toLocaleString()} Ks`} 
          prevValue={prevMonthData.cashSales}
          icon={DollarSign}
          color="blue"
          isCurrency
        />
        <MetricCard 
          label="Monthly Revenue" 
          value={`${Math.round(currentMonthData.revenue).toLocaleString()} Ks`} 
          prevValue={prevMonthData.revenue}
          icon={TrendingUp}
          color="emerald"
          isCurrency
        />
        <MetricCard 
          label="Net Profits" 
          value={`${Math.round(currentMonthData.netProfit).toLocaleString()} Ks`} 
          prevValue={prevMonthData.revenue - prevMonthData.totalExpenses}
          icon={TrendingUp}
          color="purple"
          isCurrency
        />
      </div>

      {/* Revenue Trend & Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 clay-card p-6 md:p-8 border-none shadow-clay bg-brand-card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-brand-text tracking-tight">Revenue Trend (Last 6 Months)</h3>
            <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-widest">
              <TrendingUp className="w-3 h-3" />
              Forecast: +12% Next Month
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-brand-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-brand-text-muted)" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} dy={10} />
                <YAxis yAxisId="left" stroke="var(--color-brand-text-muted)" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} dx={-10} tickFormatter={(v) => `${v}`} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} dx={10} tickFormatter={(v) => `${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-brand-card)', border: '1px solid var(--color-brand-border)', borderRadius: '12px', boxShadow: 'var(--shadow-medium)', padding: '10px' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 600 }}
                  labelStyle={{ color: 'var(--color-brand-text-muted)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', fontSize: '9px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <Bar yAxisId="left" dataKey="new" name="New Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="renewal" name="Renewals" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales Breakdown */}
        <div className="clay-card p-6 md:p-8 border-none shadow-clay bg-brand-card">
          <h3 className="text-lg font-bold text-brand-text tracking-tight mb-8">Sales Breakdown</h3>
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
                  contentStyle={{ backgroundColor: 'var(--color-brand-card)', border: '1px solid var(--color-brand-border)', borderRadius: '12px', boxShadow: 'var(--shadow-medium)', padding: '10px' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit vs Expenses */}
        <div className="lg:col-span-3 clay-card p-6 md:p-8 border-none shadow-clay bg-brand-card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-brand-text tracking-tight">Profit vs Expenses (Last 6 Months)</h3>
            <div className="flex items-center gap-2 text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-brand-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-brand-text-muted)" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--color-brand-text-muted)" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} dx={-10} tickFormatter={(v) => `${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-brand-card)', border: '1px solid var(--color-brand-border)', borderRadius: '12px', boxShadow: 'var(--shadow-medium)', padding: '10px' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 600 }}
                  labelStyle={{ color: 'var(--color-brand-text-muted)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', fontSize: '9px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Expired Users Trend & Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Expired Users Trend */}
        <div className="lg:col-span-2 clay-card p-6 md:p-8 border-none shadow-clay bg-brand-card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-brand-text tracking-tight">Expired Users Trend</h3>
            <div className="flex items-center gap-2 text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">
              Last 6 Months
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={expiredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-brand-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-brand-text-muted)" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--color-brand-text-muted)" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} dx={-10} tickFormatter={(v) => `${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-brand-card)', border: '1px solid var(--color-brand-border)', borderRadius: '12px', boxShadow: 'var(--shadow-medium)', padding: '10px' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 600 }}
                  labelStyle={{ color: 'var(--color-brand-text-muted)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', fontSize: '9px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <Line 
                  type="monotone" 
                  dataKey="expired" 
                  name="Expired Users" 
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
        <div className="clay-card p-6 md:p-8 border-none shadow-clay bg-brand-card">
          <h3 className="text-lg font-bold text-brand-text tracking-tight mb-8">Plan Distribution (Active)</h3>
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
                  contentStyle={{ backgroundColor: 'var(--color-brand-card)', border: '1px solid var(--color-brand-border)', borderRadius: '12px', boxShadow: 'var(--shadow-medium)', padding: '10px' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="clay-card p-6 md:p-8 border-none shadow-clay bg-brand-card">
          <h3 className="text-lg font-bold text-brand-text tracking-tight mb-6 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <UserPlus className="w-5 h-5 text-blue-500" />
            </div>
            New Users
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
            {currentMonthData.newUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-brand-bg rounded-2xl border border-brand-border group hover:border-blue-500/30 transition-all shadow-sm">
                <div>
                  <p className="text-sm font-bold text-brand-text">{u.name}</p>
                  <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mt-0.5">
                    Joined: {(() => {
                      if (!u.createdAt) return 'N/A';
                      try { return format(parseISO(u.createdAt), 'MMM d, yyyy'); } catch(e) { return 'Invalid Date'; }
                    })()}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 px-2 py-1 rounded uppercase tracking-widest">NEW</span>
              </div>
            ))}
            {currentMonthData.newUsers.length === 0 && <p className="text-center text-brand-text-muted py-10 text-[10px] font-bold uppercase tracking-widest">No new users</p>}
          </div>
        </div>

        <div className="clay-card p-6 md:p-8 border-none shadow-clay bg-brand-card">
          <h3 className="text-lg font-bold text-brand-text tracking-tight mb-6 flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <RefreshCw className="w-5 h-5 text-orange-500" />
            </div>
            Renewed Users
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
            {currentMonthData.renewals.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-brand-bg rounded-2xl border border-brand-border group hover:border-orange-500/30 transition-all shadow-sm">
                <div>
                  <p className="text-sm font-bold text-brand-text">{s.userName}</p>
                  <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mt-0.5">
                    Renewed: {(() => {
                      if (!s.date) return 'N/A';
                      try { return format(parseISO(s.date), 'MMM d, yyyy'); } catch(e) { return 'Invalid Date'; }
                    })()}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-orange-600 bg-orange-500/10 px-2 py-1 rounded uppercase tracking-widest">RENEWED</span>
              </div>
            ))}
            {currentMonthData.renewals.length === 0 && <p className="text-center text-brand-text-muted py-10 text-[10px] font-bold uppercase tracking-widest">No renewals</p>}
          </div>
        </div>

        <div className="clay-card p-6 md:p-8 border-none shadow-clay bg-brand-card">
          <h3 className="text-lg font-bold text-brand-text tracking-tight mb-6 flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <UserMinus className="w-5 h-5 text-red-500" />
            </div>
            Expired Users
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
            {currentMonthData.expiredThisMonth.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-brand-bg rounded-2xl border border-brand-border group hover:border-red-500/30 transition-all shadow-sm">
                <div>
                  <p className="text-sm font-bold text-brand-text">{s.userName}</p>
                  <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mt-0.5">
                    Expired: {(() => {
                      if (!s.date) return 'N/A';
                      try { return format(parseISO(s.date), 'MMM d, yyyy'); } catch(e) { return 'Invalid Date'; }
                    })()}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-red-600 bg-red-500/10 px-2 py-1 rounded uppercase tracking-widest">EXPIRED</span>
              </div>
            ))}
            {currentMonthData.expiredThisMonth.length === 0 && <p className="text-center text-brand-text-muted py-10 text-[10px] font-bold uppercase tracking-widest">No expired users</p>}
          </div>
        </div>
      </div>

      {/* Monthly Summary Table */}
      <div className="clay-card p-6 md:p-8 border-none shadow-clay bg-brand-card mt-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold text-brand-text tracking-tight">Monthly Summary (Last 6 Months)</h3>
          <div className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">
            Historical Overview
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="pb-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Month</th>
                <th className="pb-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest text-center">New</th>
                <th className="pb-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest text-center">Renewals</th>
                <th className="pb-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest text-center">Expired</th>
                <th className="pb-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest text-center">Active</th>
                <th className="pb-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest text-right">Revenue</th>
                <th className="pb-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest text-right">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/50">
              {monthlyHistory.map(({ month, data }) => (
                <tr key={month.toISOString()} className="group hover:bg-brand-bg/50 transition-colors">
                  <td className="py-4 text-sm font-bold text-brand-text">{format(month, 'MMMM yyyy')}</td>
                  <td className="py-4 text-sm font-bold text-brand-text text-center">{data.newUsers.length}</td>
                  <td className="py-4 text-sm font-bold text-brand-text text-center">{data.renewals.length}</td>
                  <td className="py-4 text-sm font-bold text-brand-text text-center">{data.expiredThisMonth.length}</td>
                  <td className="py-4 text-sm font-bold text-brand-text text-center">{data.activeUsers}</td>
                  <td className="py-4 text-sm font-bold text-brand-text text-right">{data.revenue.toLocaleString()} Ks</td>
                  <td className="py-4 text-sm font-bold text-emerald-600 text-right">{data.netProfit.toLocaleString()} Ks</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}
</div>
  );
}

function MetricCard({ label, value, prevValue, icon: Icon, color, isCurrency, showSign }: any) {
  const diff = typeof value === 'number' && typeof prevValue === 'number' ? value - prevValue : 0;
  const isPositive = diff >= 0;

  const colorClasses: any = {
    blue: 'text-blue-500 bg-blue-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
    red: 'text-red-500 bg-red-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
  };

  const displayValue = showSign && typeof value === 'number' ? `${value > 0 ? '+' : ''}${value}` : value;

  return (
    <div className="clay-card p-5 border-none shadow-clay bg-brand-card group">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2.5 rounded-xl shadow-inner", colorClasses[color])}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        {typeof value === 'number' && typeof prevValue === 'number' && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest",
            isPositive ? "text-emerald-600" : "text-red-600"
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(diff)}
          </div>
        )}
      </div>
      <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest mb-1">{label}</p>
      <h4 className="text-xl font-bold text-brand-text tracking-tight">{displayValue}</h4>
    </div>
  );
}
