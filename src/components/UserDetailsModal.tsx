import React, { useState } from 'react';
import { X, Calendar, DollarSign, History, User, Clock, Download, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
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
    link.setAttribute("download", `user_report_${user.name.replace(/\s+/g, '_').toLowerCase()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="clay-card w-full max-w-2xl border-none overflow-hidden shadow-clay bg-brand-card"
          >
            {/* Header */}
            <div className="relative h-32 bg-brand-bg/50 border-b border-brand-border flex items-end p-8">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2.5 bg-brand-bg/50 hover:bg-brand-bg rounded-xl transition-all text-brand-text-muted hover:text-brand-text border border-brand-border shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-20 h-20 rounded-2xl bg-brand-card border-4 border-brand-bg shadow-clay flex items-center justify-center text-3xl font-bold",
                  status === 'Expired' ? "text-red-500" : "text-brand-primary"
                )}>
                  {user.name.charAt(0)}
                </div>
                <div className="mb-2">
                  <h2 className="text-2xl font-bold text-brand-text tracking-tight">{user.name}</h2>
                  <p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-widest">ID: {user.id}</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-brand-bg/50 p-5 rounded-2xl border border-brand-border shadow-sm">
                  <div className="flex items-center gap-2 text-brand-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
                    <User className="w-4 h-4" />
                    Status
                  </div>
                  <span className={cn(
                    "inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                    status === 'Active' && "bg-emerald-500/10 text-emerald-600",
                    status === 'Expired' && "bg-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse",
                    status === 'Upcoming' && "bg-blue-500/10 text-blue-600"
                  )}>
                    {status}
                  </span>
                </div>
                <div className="bg-brand-bg/50 p-5 rounded-2xl border border-brand-border shadow-sm">
                  <div className="flex items-center gap-2 text-brand-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
                    <Calendar className="w-4 h-4" />
                    Start Date
                  </div>
                  <p className="text-brand-text font-bold">
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
                <div className="bg-brand-bg/50 p-5 rounded-2xl border border-brand-border shadow-sm">
                  <div className="flex items-center gap-2 text-brand-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
                    <User className="w-4 h-4" />
                    Password
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-brand-text font-bold">
                      {showPassword ? (user.password || 'N/A') : '••••••••'}
                    </p>
                    <button onClick={() => setShowPassword(!showPassword)} className="text-brand-text-muted hover:text-brand-text transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="bg-brand-bg/50 p-5 rounded-2xl border border-brand-border shadow-sm">
                  <div className="flex items-center gap-2 text-brand-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
                    <Clock className="w-4 h-4" />
                    Expiry Date
                  </div>
                  <p className={cn(
                    "font-bold",
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
                <div className="bg-brand-bg/50 p-5 rounded-2xl border border-brand-border shadow-sm md:col-span-2">
                  <div className="flex items-center gap-2 text-brand-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
                    <DollarSign className="w-4 h-4" />
                    Current Plan
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-brand-text font-bold text-lg">{user.planName || 'N/A'}</p>
                      {userPlan && (
                        <p className="text-brand-text-muted text-xs font-bold uppercase tracking-widest mt-1 opacity-70">{userPlan.durationDays} Days Duration</p>
                      )}
                    </div>
                    {userPlan && (
                      <div className="text-right">
                        <p className="text-brand-primary font-bold text-xl">{userPlan.price.toLocaleString()} Ks</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sales History */}
              <div>
                <h3 className="text-lg font-bold text-brand-text mb-4 flex items-center gap-3">
                  <div className="p-2 bg-brand-primary/10 rounded-xl">
                    <History className="w-5 h-5 text-brand-primary" />
                  </div>
                  Recent Sales History
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {userSales.length > 0 ? (
                    userSales.map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between p-4 bg-brand-bg/30 rounded-2xl border border-brand-border shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shadow-inner",
                            sale.type === 'New' ? "bg-emerald-500/10 text-emerald-600" : "bg-brand-primary/10 text-brand-primary"
                          )}>
                            {sale.type === 'New' ? 'N' : 'R'}
                          </div>
                          <div>
                            <p className="font-bold text-brand-text">{sale.planName}</p>
                            <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest mt-0.5">
                              {sale.type} • {(() => {
                                if (!sale.date) return 'N/A';
                                try {
                                  return format(parseISO(sale.date), 'MMM d, yyyy');
                                } catch (e) {
                                  return 'Invalid Date';
                                }
                              })()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-600">+{sale.amount.toLocaleString()} Ks</p>
                          <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest mt-1 opacity-50">{sale.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-brand-bg/30 rounded-2xl border border-dashed border-brand-border">
                      <DollarSign className="w-10 h-10 text-brand-text-muted/20 mx-auto mb-3" />
                      <p className="text-brand-text-muted font-bold text-sm">No sales history found for this user.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 bg-brand-bg/50 border-t border-brand-border flex justify-end gap-4">
              <button
                onClick={onClose}
                className="clay-btn px-8 py-3 text-xs font-bold"
              >
                Close
              </button>
              <button
                onClick={exportToCSV}
                className="clay-btn-primary flex items-center gap-2 px-8 py-3 text-xs font-bold shadow-lg shadow-brand-primary/20"
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
