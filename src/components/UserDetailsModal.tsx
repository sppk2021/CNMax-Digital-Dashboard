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
}

export function UserDetailsModal({ isOpen, onClose, user, sales }: UserDetailsModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  if (!user) return null;

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
            className="bg-white w-full max-w-2xl rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="relative h-32 bg-gradient-to-r from-brand-sidebar/10 to-brand-blue/10 flex items-end p-8">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 bg-white/50 hover:bg-white/80 rounded-full transition-colors text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-xl flex items-center justify-center text-3xl font-bold text-brand-sidebar">
                  {user.name.charAt(0)}
                </div>
                <div className="mb-2">
                  <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
                  <p className="text-slate-500 text-sm font-medium">ID: {user.id}</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest font-bold mb-3">
                    <User className="w-4 h-4" />
                    Status
                  </div>
                  <span className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border",
                    status === 'Active' && "bg-emerald-100 text-emerald-600 border-emerald-200",
                    status === 'Expired' && "bg-red-100 text-red-600 border-red-200",
                    status === 'Upcoming' && "bg-blue-100 text-blue-600 border-blue-200"
                  )}>
                    {status}
                  </span>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest font-bold mb-3">
                    <Calendar className="w-4 h-4" />
                    Start Date
                  </div>
                  <p className="text-slate-800 font-bold">
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
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest font-bold mb-3">
                    <User className="w-4 h-4" />
                    Password
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-slate-800 font-bold">
                      {showPassword ? (user.password || 'N/A') : '••••••••'}
                    </p>
                    <button onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest font-bold mb-3">
                    <Clock className="w-4 h-4" />
                    Expiry Date
                  </div>
                  <p className={cn(
                    "font-bold",
                    status === 'Expired' ? "text-red-500" : "text-slate-800"
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
              </div>

              {/* Sales History */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-brand-sidebar" />
                  Recent Sales History
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {userSales.length > 0 ? (
                    userSales.map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold",
                            sale.type === 'New' ? "bg-blue-50 text-blue-600" : "bg-brand-sidebar/10 text-brand-sidebar"
                          )}>
                            {sale.type === 'New' ? 'N' : 'R'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{sale.planName}</p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
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
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{sale.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No sales history found for this user.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-700 transition-colors font-bold"
              >
                Close
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-6 py-3 bg-brand-sidebar hover:bg-brand-blue rounded-2xl text-white transition-all font-bold shadow-lg shadow-brand-sidebar/20"
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
