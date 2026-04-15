import React from 'react';
import { X, Calendar, DollarSign, History, User, Clock, Download, Info, CreditCard, Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn, getStatus } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  sales: any[];
  plans: any[];
}

export function UserDetailsModal({ isOpen, onClose, user, sales, plans }: UserDetailsModalProps) {
  if (!user) return null;

  const userPlan = plans?.find(p => p.name === user.planName);

  const userSales = sales
    .filter(s => s.userId === user.id)
    .sort((a, b) => {
      if (!a.date || !b.date) return 0;
      try {
        return parseISO(b.date).getTime() - parseISO(a.date).getTime();
      } catch (e) {
        return 0;
      }
    });

  const status = getStatus(user.expiryDate, user.subscriptionStartDate);

  const exportToCSV = () => {
    let startDateStr = 'N/A';
    if (user.subscriptionStartDate) {
      try { startDateStr = format(parseISO(user.subscriptionStartDate), 'yyyy-MM-dd'); } catch(e) {}
    }
    let expiryDateStr = 'N/A';
    if (user.expiryDate) {
      try { expiryDateStr = format(parseISO(user.expiryDate), 'yyyy-MM-dd'); } catch(e) {}
    }
    let createdAtStr = 'N/A';
    if (user.createdAt) {
      try { createdAtStr = format(parseISO(user.createdAt), 'yyyy-MM-dd HH:mm:ss'); } catch(e) {}
    }

    const userData = [
      ["User Details Report"],
      ["Name", user.name],
      ["ID", user.id],
      ["Status", status],
      ["Start Date", startDateStr],
      ["Expiry Date", expiryDateStr],
      ["Plan", user.planName || 'N/A'],
      ["Created At", createdAtStr],
      [],
      ["Sales History"],
      ["Sale ID", "Date", "Type", "Plan", "Amount (Ks)"]
    ];

    const salesData = userSales.map(s => {
      let saleDateStr = 'N/A';
      if (s.date) {
        try { saleDateStr = format(parseISO(s.date), 'yyyy-MM-dd HH:mm:ss'); } catch(e) {}
      }
      return [
        s.id,
        saleDateStr,
        s.type,
        s.planName,
        s.amount
      ];
    });

    const csvContent = [
      ...userData.map(row => row.map(cell => `"${cell}"`).join(",")),
      ...salesData.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const userName = user.name || 'user';
    link.setAttribute("download", `user_report_${userName.replace(/\s+/g, '_').toLowerCase()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="clay-card w-full max-w-3xl border-none overflow-hidden shadow-clay bg-brand-card my-auto"
          >
            {/* Header */}
            <div className="relative h-40 bg-brand-bg/50 border-b border-brand-border flex items-end p-6 md:p-8">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 md:top-6 md:right-6 p-2.5 bg-brand-bg/50 hover:bg-brand-bg rounded-xl transition-all text-brand-text-muted hover:text-brand-text border border-brand-border shadow-sm z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 w-full">
                <div className={cn(
                  "w-24 h-24 rounded-3xl bg-brand-card border-4 border-brand-bg shadow-clay flex items-center justify-center text-4xl font-black shrink-0",
                  status === 'Expired' ? "text-red-500" : "text-brand-primary"
                )}>
                  {user.name.charAt(0)}
                </div>
                <div className="mb-2 text-center md:text-left flex-1">
                  <h2 className="text-2xl md:text-3xl font-black text-brand-text tracking-tight leading-tight">{user.name}</h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                    <span className="text-brand-text-muted text-[10px] font-bold uppercase tracking-widest bg-brand-bg/80 px-2 py-1 rounded-md border border-brand-border">ID: {user.id.slice(0, 12)}...</span>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                      status === 'Active' ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"
                    )}>
                      {status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-brand-bg/50 p-5 rounded-2xl border border-brand-border shadow-sm group hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 text-brand-text-muted text-[10px] uppercase tracking-widest font-black mb-3 opacity-60">
                    <Activity className="w-4 h-4 text-brand-primary" />
                    Current Status
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      status === 'Active' ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                    )} />
                    <span className={cn(
                      "text-sm font-black uppercase tracking-wider",
                      status === 'Active' ? "text-emerald-600" : "text-red-500"
                    )}>
                      {status}
                    </span>
                  </div>
                </div>

                <div className="bg-brand-bg/50 p-5 rounded-2xl border border-brand-border shadow-sm group hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 text-brand-text-muted text-[10px] uppercase tracking-widest font-black mb-3 opacity-60">
                    <Calendar className="w-4 h-4 text-brand-primary" />
                    Subscription Start
                  </div>
                  <p className="text-sm font-black text-brand-text">
                    {(() => {
                      if (!user.subscriptionStartDate) return 'N/A';
                      try {
                        return format(parseISO(user.subscriptionStartDate), 'MMM d, yyyy');
                      } catch (e) {
                        return 'Invalid Date';
                      }
                    })()}
                  </p>
                </div>

                <div className="bg-brand-bg/50 p-5 rounded-2xl border border-brand-border shadow-sm group hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 text-brand-text-muted text-[10px] uppercase tracking-widest font-black mb-3 opacity-60">
                    <Clock className="w-4 h-4 text-brand-primary" />
                    Expiration Date
                  </div>
                  <p className={cn(
                    "text-sm font-black",
                    status === 'Expired' ? "text-red-500" : "text-brand-text"
                  )}>
                    {(() => {
                      if (!user.expiryDate) return 'N/A';
                      try {
                        return format(parseISO(user.expiryDate), 'MMM d, yyyy');
                      } catch (e) {
                        return 'Invalid Date';
                      }
                    })()}
                  </p>
                </div>

                <div className="bg-brand-bg/50 p-6 rounded-2xl border border-brand-border shadow-sm sm:col-span-2 lg:col-span-3">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-brand-text-muted text-[10px] uppercase tracking-widest font-black opacity-60">
                      <CreditCard className="w-4 h-4 text-brand-primary" />
                      Plan Details
                    </div>
                    <span className="bg-brand-primary/10 text-brand-primary text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">
                      {user.planName || 'No Plan'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xl font-black text-brand-text">{user.planName || 'N/A'}</p>
                      {userPlan && (
                        <p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">
                          {userPlan.durationDays} Days Access • Full Premium Features
                        </p>
                      )}
                    </div>
                    {userPlan && (
                      <div className="bg-brand-bg px-6 py-3 rounded-xl border border-brand-border shadow-inner text-center sm:text-right">
                        <p className="text-brand-primary font-black text-2xl">{userPlan.price.toLocaleString()} Ks</p>
                        <p className="text-[9px] text-brand-text-muted font-bold uppercase tracking-tighter">Total Paid Amount</p>
                      </div>
                    )}
                  </div>
                </div>

                {user.notes && (
                  <div className="bg-brand-bg/50 p-5 rounded-2xl border border-brand-border shadow-sm sm:col-span-2 lg:col-span-3">
                    <div className="flex items-center gap-2 text-brand-text-muted text-[10px] uppercase tracking-widest font-black mb-3 opacity-60">
                      <Info className="w-4 h-4 text-brand-primary" />
                      Additional Notes
                    </div>
                    <p className="text-sm font-medium text-brand-text leading-relaxed italic">"{user.notes}"</p>
                  </div>
                )}
              </div>

              {/* Sales History */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-brand-text flex items-center gap-3">
                    <div className="p-2 bg-brand-primary/10 rounded-xl shadow-inner">
                      <History className="w-5 h-5 text-brand-primary" />
                    </div>
                    Transaction History
                  </h3>
                  <span className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest bg-brand-bg px-2 py-1 rounded border border-brand-border">
                    {userSales.length} Records
                  </span>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {userSales.length > 0 ? (
                    userSales.map((sale) => (
                      <div key={sale.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-brand-bg/30 rounded-2xl border border-brand-border shadow-sm hover:shadow-md hover:bg-brand-bg/50 transition-all gap-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shadow-clay shrink-0",
                            sale.type === 'New' ? "bg-emerald-500 text-white" : "bg-brand-primary text-white"
                          )}>
                            {sale.type === 'New' ? 'N' : 'R'}
                          </div>
                          <div>
                            <p className="font-black text-brand-text text-sm">{sale.planName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                                sale.type === 'New' ? "bg-emerald-500/10 text-emerald-600" : "bg-brand-primary/10 text-brand-primary"
                              )}>{sale.type}</span>
                              <span className="text-[9px] text-brand-text-muted font-bold uppercase tracking-widest">
                                {(() => {
                                  if (!sale.date) return 'N/A';
                                  try {
                                    return format(parseISO(sale.date), 'MMM d, yyyy');
                                  } catch (e) {
                                    return 'Invalid Date';
                                  }
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1">
                          <p className="font-black text-emerald-600 text-lg">+{sale.amount.toLocaleString()} Ks</p>
                          <p className="text-[9px] text-brand-text-muted font-bold uppercase tracking-widest opacity-40">Ref: {sale.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16 bg-brand-bg/30 rounded-3xl border border-dashed border-brand-border">
                      <DollarSign className="w-12 h-12 text-brand-text-muted/10 mx-auto mb-4" />
                      <p className="text-brand-text-muted font-black text-xs uppercase tracking-widest">No transaction history found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 bg-brand-bg/50 border-t border-brand-border flex flex-col sm:flex-row justify-end gap-3 md:gap-4">
              <button
                onClick={onClose}
                className="clay-btn w-full sm:w-auto px-8 py-3.5 text-xs font-black uppercase tracking-widest"
              >
                Close Details
              </button>
              <button
                onClick={exportToCSV}
                className="clay-btn-primary w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-primary/20"
              >
                <Download className="w-4 h-4" />
                Export Report
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
