import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  RefreshCw, 
  Calendar,
  Filter,
  Download,
  Facebook,
  MessageCircle,
  Loader2,
  Users,
  X,
  UserMinus
} from 'lucide-react';
import { cn, getStatus, handleFirestoreError, OperationType, isInMonth, getNow } from '../utils';
import { addDoc, collection, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { addDays, format, parseISO, startOfMonth } from 'date-fns';
import { UserModal } from './UserModal';
import { RenewalModal } from './RenewalModal';
import { UserDetailsModal } from './UserDetailsModal';

interface UserListProps {
  users: any[];
  plans: any[];
  sales: any[];
}

export function UserList({ users, plans, sales }: UserListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Expired' | 'Upcoming' | 'New This Month' | 'Renewed This Month'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  const now = getNow();
  const currentMonthStart = startOfMonth(now);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase());
    const status = getStatus(user.expiryDate, user.subscriptionStartDate);
    
    let matchesStatus = true;
    if (statusFilter === 'All') matchesStatus = true;
    else if (statusFilter === 'Active') matchesStatus = status === 'Active';
    else if (statusFilter === 'Expired') matchesStatus = status === 'Expired';
    else if (statusFilter === 'Upcoming') matchesStatus = status === 'Upcoming';
    else if (statusFilter === 'New This Month') {
      matchesStatus = isInMonth(user.createdAt, now);
    } else if (statusFilter === 'Renewed This Month') {
      matchesStatus = sales.some(s => s.userId === user.id && s.type === 'Renewal' && isInMonth(s.date, now));
    }

    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const toggleSelectUser = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedUserIds(newSelected);
  };

  const openRenewal = (user: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUser(user);
    setIsRenewalModalOpen(true);
  };

  const openDetails = (user: any) => {
    setSelectedUser(user);
    setIsDetailsModalOpen(true);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Plan', 'Start Date', 'Expiry Date', 'Status'];
    const rows = filteredUsers.map(u => {
      let startDateStr = 'N/A';
      if (u.subscriptionStartDate) {
        try { startDateStr = format(parseISO(u.subscriptionStartDate), 'yyyy-MM-dd'); } catch(e) {}
      }
      let expiryDateStr = 'N/A';
      if (u.expiryDate) {
        try { expiryDateStr = format(parseISO(u.expiryDate), 'yyyy-MM-dd'); } catch(e) {}
      }
      return [
        u.name,
        u.planName || 'N/A',
        startDateStr,
        expiryDateStr,
        getStatus(u.expiryDate, u.subscriptionStartDate)
      ];
    });
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `users_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">User Management</h2>
          <p className="text-slate-500">Manage your customers and their subscriptions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-sm transition-all text-sm font-bold text-slate-700"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2 bg-brand-sidebar hover:bg-brand-blue rounded-xl text-white transition-all text-sm font-bold shadow-lg shadow-brand-sidebar/20"
          >
            <Plus className="w-4 h-4" />
            Add New User
          </button>
        </div>
      </div>

      <UserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} plans={plans} />
      <RenewalModal 
        isOpen={isRenewalModalOpen} 
        onClose={() => setIsRenewalModalOpen(false)} 
        user={selectedUser} 
        plans={plans} 
      />
      <UserDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        user={selectedUser}
        sales={sales}
      />

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by Facebook/Viber name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-brand-sidebar transition-colors text-slate-700"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 whitespace-nowrap">
            {['All', 'Active', 'Expired', 'Upcoming', 'New This Month', 'Renewed This Month'].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f as any)}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  statusFilter === f ? "bg-white text-brand-sidebar shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUserIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-brand-sidebar text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 z-40 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-sm font-bold">{selectedUserIds.size} users selected</span>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                const selectedUsers = users.filter(u => selectedUserIds.has(u.id));
                // Logic for bulk renewal could go here
                alert(`Bulk renewal for ${selectedUserIds.size} users initiated.`);
              }}
              className="text-sm font-bold hover:underline flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Bulk Renew
            </button>
            <button 
              onClick={() => {
                // Logic for bulk delete could go here
                alert(`Bulk delete for ${selectedUserIds.size} users initiated.`);
              }}
              className="text-sm font-bold hover:underline flex items-center gap-2 text-white/80"
            >
              <UserMinus className="w-4 h-4" />
              Bulk Delete
            </button>
          </div>
          <button 
            onClick={() => setSelectedUserIds(new Set())}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/50">
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 bg-white text-brand-sidebar focus:ring-brand-sidebar/50"
                  />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Plan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Subscription</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Expiry</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((user) => {
                const status = getStatus(user.expiryDate, user.subscriptionStartDate);
                const isSelected = selectedUserIds.has(user.id);
                return (
                  <tr 
                    key={user.id} 
                    onClick={() => openDetails(user)}
                    className={cn(
                      "hover:bg-slate-50/50 transition-colors group cursor-pointer",
                      isSelected && "bg-brand-sidebar/5"
                    )}
                  >
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onClick={(e) => toggleSelectUser(user.id, e)}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-slate-300 bg-white text-brand-sidebar focus:ring-brand-sidebar/50"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-sidebar/10 flex items-center justify-center text-brand-sidebar font-bold text-sm border border-brand-sidebar/5">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-700">{user.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {user.name.toLowerCase().includes('fb') || user.name.toLowerCase().includes('facebook') ? (
                              <Facebook className="w-3 h-3 text-blue-500" />
                            ) : (
                              <MessageCircle className="w-3 h-3 text-emerald-500" />
                            )}
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID: {user.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-600">
                        {user.planName || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar className="w-4 h-4 text-slate-300" />
                        {(() => {
                          if (!user.subscriptionStartDate) return 'N/A';
                          try {
                            return format(parseISO(user.subscriptionStartDate), 'MMM d, yyyy');
                          } catch (e) {
                            return 'Invalid Date';
                          }
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                        status === 'Active' && "bg-emerald-50 text-emerald-600 border-emerald-100",
                        status === 'Expired' && "bg-red-50 text-red-600 border-red-100",
                        status === 'Upcoming' && "bg-blue-50 text-blue-600 border-blue-100"
                      )}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className={cn(
                        "text-sm font-bold",
                        status === 'Expired' ? "text-red-500" : "text-slate-600"
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
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => openRenewal(user, e)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all",
                            status === 'Expired'
                              ? "bg-brand-sidebar text-white hover:bg-brand-blue shadow-md shadow-brand-sidebar/20"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          )}
                        >
                          <RefreshCw className="w-3 h-3" />
                          Renew
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); }}
                          className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="text-center py-20 bg-slate-50/30">
            <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No users found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
