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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-brand-text mb-1">Events & Sales History</h2>
          <p className="text-brand-text-muted text-sm">Track all transactions and subscription lifecycle events.</p>
        </div>
        <div className="clay-card px-5 py-3 flex items-center gap-4 border-none shadow-medium bg-brand-bg/50">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl">
            <CircleDollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest mb-0.5">Total Revenue</p>
            <p className="text-lg font-bold text-brand-text">{totalRevenue.toLocaleString()} Ks</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted opacity-50" />
          <input 
            type="text" 
            placeholder="Search by customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="clay-input w-full pl-11 py-2.5"
          />
        </div>
        <div className="flex bg-brand-bg p-1 rounded-xl border border-brand-border gap-1">
          {['All', 'New', 'Renewal', 'Expired'].map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f as any)}
              className={cn(
                "px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider",
                typeFilter === f 
                  ? "bg-brand-primary text-white shadow-sm" 
                  : "text-brand-text-muted hover:text-brand-text hover:bg-brand-primary/5"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="clay-card overflow-hidden border-none shadow-medium">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-bg border-b border-brand-border">
                <th className="px-6 py-3 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Customer</th>
                <th className="px-6 py-3 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Date</th>
                <th className="px-6 py-3 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Type</th>
                <th className="px-6 py-3 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Amount</th>
                <th className="px-6 py-3 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredSales.map((sale) => (
                <tr 
                  key={sale.id} 
                  onClick={() => setSelectedSale(sale)}
                  className="hover:bg-brand-bg/50 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-xs">
                        {sale.userName.charAt(0)}
                      </div>
                      <p className="text-sm font-bold text-brand-text group-hover:text-brand-primary transition-colors">{sale.userName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-brand-text-muted">
                      <Calendar className="w-3.5 h-3.5 opacity-50" />
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
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                      sale.type === 'New' && "bg-blue-500/10 text-blue-600",
                      sale.type === 'Renewal' && "bg-brand-primary/10 text-brand-primary",
                      sale.type === 'Expired' && "bg-red-500/10 text-red-600"
                    )}>
                      {sale.type === 'New' && <ArrowUpRight className="w-3 h-3" />}
                      {sale.type === 'Renewal' && <RefreshCw className="w-3 h-3" />}
                      {sale.type === 'Expired' && <ArrowDownRight className="w-3 h-3" />}
                      {sale.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className={cn(
                      "text-sm font-bold",
                      sale.type === 'Expired' ? "text-brand-text-muted" : "text-emerald-600"
                    )}>
                      {sale.amount.toLocaleString()} Ks
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "text-[10px] font-bold px-2.5 py-0.5 rounded-lg uppercase tracking-widest",
                      sale.type === 'Expired' ? "text-brand-text-muted bg-brand-bg" : "text-emerald-600 bg-emerald-500/10"
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
          <div className="text-center py-20">
            <CircleDollarSign className="w-12 h-12 text-brand-text-muted/20 mx-auto mb-4" />
            <p className="text-brand-text-muted font-medium">No sales records found.</p>
          </div>
        )}
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="clay-card w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border-none shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-brand-border bg-brand-bg/50">
              <h3 className="text-lg font-bold text-brand-text flex items-center gap-3">
                <div className="p-2 bg-brand-primary/10 rounded-xl">
                  <CircleDollarSign className="w-5 h-5 text-brand-primary" />
                </div>
                Sale Details
              </h3>
              <button 
                onClick={() => setSelectedSale(null)}
                className="p-2 text-brand-text-muted hover:text-brand-text hover:bg-brand-bg rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-brand-bg rounded-xl border border-brand-border">
                <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-lg">
                  {selectedSale.userName.charAt(0)}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-0.5">Customer</p>
                  <p className="text-base font-bold text-brand-text">{selectedSale.userName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest flex items-center gap-1.5">
                    <Tag className="w-3 h-3" /> Type
                  </p>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                    selectedSale.type === 'New' && "bg-blue-500/10 text-blue-600",
                    selectedSale.type === 'Renewal' && "bg-brand-primary/10 text-brand-primary",
                    selectedSale.type === 'Expired' && "bg-red-500/10 text-red-600"
                  )}>
                    {selectedSale.type}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest flex items-center gap-1.5">
                    <CircleDollarSign className="w-3 h-3" /> Amount
                  </p>
                  <p className={cn(
                    "text-lg font-bold",
                    selectedSale.type === 'Expired' ? "text-brand-text-muted" : "text-emerald-600"
                  )}>
                    {selectedSale.amount.toLocaleString()} Ks
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-brand-border">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-brand-bg rounded-lg border border-brand-border">
                    <Calendar className="w-4 h-4 text-brand-text-muted" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Date & Time</p>
                    <p className="text-sm font-bold text-brand-text">
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
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-brand-bg rounded-lg border border-brand-border">
                      <Tag className="w-4 h-4 text-brand-text-muted" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Plan</p>
                      <p className="text-sm font-bold text-brand-text">{selectedSale.planName}</p>
                    </div>
                  </div>
                )}

                {selectedSale.notes && (
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-brand-bg rounded-lg border border-brand-border">
                      <FileText className="w-4 h-4 text-brand-text-muted" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Notes</p>
                      <p className="text-sm font-medium text-brand-text-muted bg-brand-bg p-3 rounded-xl border border-brand-border mt-2">
                        {selectedSale.notes}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-brand-bg rounded-lg border border-brand-border">
                    <User className="w-4 h-4 text-brand-text-muted" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">User ID Reference</p>
                    <p className="text-[10px] font-mono font-bold text-brand-text-muted bg-brand-bg px-2 py-1 rounded-lg border border-brand-border mt-2 truncate max-w-[200px]">
                      {selectedSale.userId}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-brand-bg border-t border-brand-border flex justify-end">
              <button 
                onClick={() => setSelectedSale(null)}
                className="clay-btn px-6 py-2"
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
