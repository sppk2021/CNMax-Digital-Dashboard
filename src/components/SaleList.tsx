import React, { useState } from 'react';
import { 
  Search, 
  CircleDollarSign, 
  Calendar,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  X,
  User,
  FileText,
  Tag
} from 'lucide-react';
import { cn } from '../utils';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface SaleListProps {
  sales: any[];
}

export function SaleList({ sales }: SaleListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'New' | 'Renewal' | 'Expired'>('All');
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.userName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'All' || sale.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.amount, 0);

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Events & Sales History</h2>
          <p className="text-slate-500">Track all transactions and subscription lifecycle events.</p>
        </div>
        <div className="bg-white px-8 py-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6">
          <div className="p-4 bg-emerald-50 rounded-2xl">
            <CircleDollarSign className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total Revenue</p>
            <p className="text-2xl font-black text-slate-800">{totalRevenue.toLocaleString()} Ks</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-brand-sidebar transition-colors text-slate-700"
          />
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          {['All', 'New', 'Renewal', 'Expired'].map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f as any)}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                typeFilter === f ? "bg-white text-brand-sidebar shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSales.map((sale) => (
                <tr 
                  key={sale.id} 
                  onClick={() => setSelectedSale(sale)}
                  className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-sidebar/10 flex items-center justify-center text-brand-sidebar font-bold text-sm border border-brand-sidebar/5">
                        {sale.userName.charAt(0)}
                      </div>
                      <p className="font-bold text-slate-700 group-hover:text-brand-sidebar transition-colors">{sale.userName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="w-4 h-4 text-slate-300" />
                      {(() => {
                        if (!sale.date) return 'N/A';
                        try {
                          return format(parseISO(sale.date), 'MMM d, yyyy HH:mm');
                        } catch(e) {
                          return 'Invalid Date';
                        }
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                      sale.type === 'New' && "bg-blue-50 text-blue-600 border-blue-100",
                      sale.type === 'Renewal' && "bg-orange-50 text-orange-600 border-orange-100",
                      sale.type === 'Expired' && "bg-red-50 text-red-600 border-red-100"
                    )}>
                      {sale.type === 'New' && <ArrowUpRight className="w-3 h-3" />}
                      {sale.type === 'Renewal' && <RefreshCw className="w-3 h-3" />}
                      {sale.type === 'Expired' && <ArrowDownRight className="w-3 h-3" />}
                      {sale.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className={cn(
                      "text-sm font-black",
                      sale.type === 'Expired' ? "text-slate-400" : "text-emerald-600"
                    )}>
                      {sale.amount.toLocaleString()} Ks
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest",
                      sale.type === 'Expired' ? "text-slate-400 bg-slate-100" : "text-emerald-600 bg-emerald-50"
                    )}>
                      {sale.type === 'Expired' ? 'Logged' : 'Completed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredSales.length === 0 && (
          <div className="text-center py-20 bg-slate-50/30">
            <CircleDollarSign className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No sales records found.</p>
          </div>
        )}
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <CircleDollarSign className="w-6 h-6 text-brand-sidebar" />
                Sale Details
              </h3>
              <button 
                onClick={() => setSelectedSale(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 rounded-xl bg-brand-sidebar/10 flex items-center justify-center text-brand-sidebar font-bold text-lg border border-brand-sidebar/5">
                  {selectedSale.userName.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Customer</p>
                  <p className="text-lg font-bold text-slate-800">{selectedSale.userName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Tag className="w-3 h-3" /> Type
                  </p>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                    selectedSale.type === 'New' && "bg-blue-50 text-blue-600 border-blue-100",
                    selectedSale.type === 'Renewal' && "bg-orange-50 text-orange-600 border-orange-100",
                    selectedSale.type === 'Expired' && "bg-red-50 text-red-600 border-red-100"
                  )}>
                    {selectedSale.type}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <CircleDollarSign className="w-3 h-3" /> Amount
                  </p>
                  <p className={cn(
                    "text-lg font-black",
                    selectedSale.type === 'Expired' ? "text-slate-400" : "text-emerald-600"
                  )}>
                    {selectedSale.amount.toLocaleString()} Ks
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date & Time</p>
                    <p className="text-sm font-medium text-slate-700">
                      {(() => {
                        if (!selectedSale.date) return 'N/A';
                        try {
                          return format(parseISO(selectedSale.date), 'MMMM d, yyyy HH:mm');
                        } catch(e) {
                          return 'Invalid Date';
                        }
                      })()}
                    </p>
                  </div>
                </div>

                {selectedSale.planName && (
                  <div className="flex items-start gap-3">
                    <Tag className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plan</p>
                      <p className="text-sm font-medium text-slate-700">{selectedSale.planName}</p>
                    </div>
                  </div>
                )}

                {selectedSale.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notes</p>
                      <p className="text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-1">
                        {selectedSale.notes}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">User ID Reference</p>
                    <p className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 mt-1">
                      {selectedSale.userId}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedSale(null)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
