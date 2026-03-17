import React, { useState } from 'react';
import { 
  Search, 
  CircleDollarSign, 
  Calendar,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import { cn } from '../utils';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface SaleListProps {
  sales: any[];
}

export function SaleList({ sales }: SaleListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'New' | 'Renewal' | 'Expired'>('All');

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.userName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'All' || sale.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.amount, 0);

  return (
    <div className="space-y-6">
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
                <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-sidebar/10 flex items-center justify-center text-brand-sidebar font-bold text-sm border border-brand-sidebar/5">
                        {sale.userName.charAt(0)}
                      </div>
                      <p className="font-bold text-slate-700">{sale.userName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="w-4 h-4 text-slate-300" />
                      {format(parseISO(sale.date), 'MMM d, yyyy HH:mm')}
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
    </div>
  );
}
