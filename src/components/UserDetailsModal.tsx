import React from 'react';
import { X, Calendar, DollarSign, History, User, Clock, Download } from 'lucide-react';
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
  if (!user) return null;

  const userSales = sales
    .filter(s => s.userId === user.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const status = getStatus(user.expiryDate, user.subscriptionStartDate);

  const exportToCSV = () => {
    const userData = [
      ["User Details Report"],
      ["Name", user.name],
      ["ID", user.id],
      ["Status", status],
      ["Start Date", format(parseISO(user.subscriptionStartDate), 'yyyy-MM-dd')],
      ["Expiry Date", format(parseISO(user.expiryDate), 'yyyy-MM-dd')],
      ["Plan", user.planName || 'N/A'],
      ["Created At", format(parseISO(user.createdAt), 'yyyy-MM-dd HH:mm:ss')],
      [],
      ["Sales History"],
      ["Sale ID", "Date", "Type", "Plan", "Amount (Ks)"]
    ];

    const salesData = userSales.map(s => [
      s.id,
      format(parseISO(s.date), 'yyyy-MM-dd HH:mm:ss'),
      s.type,
      s.planName,
      s.amount
    ]);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[#111111] w-full max-w-2xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="relative h-32 bg-gradient-to-r from-orange-500/20 to-purple-500/20 flex items-end p-6">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-[#111111] border-4 border-[#111111] shadow-xl flex items-center justify-center text-3xl font-bold text-orange-500">
                  {user.name.charAt(0)}
                </div>
                <div className="mb-2">
                  <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                  <p className="text-gray-400 text-sm">ID: {user.id}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Subscription Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">
                    <User className="w-3 h-3" />
                    Status
                  </div>
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                    status === 'Active' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                    status === 'Expired' && "bg-red-500/10 text-red-500 border-red-500/20",
                    status === 'Upcoming' && "bg-blue-500/10 text-blue-500 border-blue-500/20"
                  )}>
                    {status}
                  </span>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">
                    <Calendar className="w-3 h-3" />
                    Start Date
                  </div>
                  <p className="text-white font-medium">{format(parseISO(user.subscriptionStartDate), 'MMM d, yyyy')}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">
                    <Clock className="w-3 h-3" />
                    Expiry Date
                  </div>
                  <p className={cn(
                    "font-medium",
                    status === 'Expired' ? "text-red-400" : "text-white"
                  )}>
                    {format(parseISO(user.expiryDate), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              {/* Sales History */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-orange-500" />
                  Recent Sales History
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {userSales.length > 0 ? (
                    userSales.map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/5 hover:bg-white/[0.04] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                            sale.type === 'New' ? "bg-blue-500/20 text-blue-500" : "bg-orange-500/20 text-orange-500"
                          )}>
                            {sale.type === 'New' ? 'N' : 'R'}
                          </div>
                          <div>
                            <p className="font-medium text-white">{sale.planName}</p>
                            <p className="text-xs text-gray-500">{sale.type} • {format(parseISO(sale.date), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-500">+{sale.amount.toLocaleString()} Ks</p>
                          <p className="text-[10px] text-gray-600 uppercase tracking-tighter">{sale.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                      <DollarSign className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No sales history found for this user.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-white/[0.02] border-t border-white/5 flex justify-end gap-3">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-xl text-white transition-all text-sm font-bold shadow-lg shadow-orange-500/20"
              >
                <Download className="w-4 h-4" />
                Export Report
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
