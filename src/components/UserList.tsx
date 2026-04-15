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
import { addDoc, collection, doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
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
  const [bulkActionState, setBulkActionState] = useState<{type: 'renew' | 'delete' | null, loading: boolean}>({ type: null, loading: false });

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
  }).sort((a, b) => {
    if (statusFilter !== 'Expired') {
      const statusA = getStatus(a.expiryDate, a.subscriptionStartDate);
      const statusB = getStatus(b.expiryDate, b.subscriptionStartDate);
      if (statusA === 'Expired' && statusB !== 'Expired') return 1;
      if (statusB === 'Expired' && statusA !== 'Expired') return -1;
    }
    return 0;
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

  const executeBulkRenew = async () => {
    setBulkActionState(prev => ({ ...prev, loading: true }));
    try {
      const selectedUsers = users.filter(u => selectedUserIds.has(u.id));
      
      for (const user of selectedUsers) {
        let currentExpiry = new Date();
        if (user.expiryDate) {
          try {
            currentExpiry = parseISO(user.expiryDate);
          } catch (e) {}
        }
        
        const baseDate = getStatus(user.expiryDate, user.subscriptionStartDate) === 'Expired' ? now : currentExpiry;
        const plan = plans.find(p => p.name === user.planName);
        const amount = plan ? plan.price : 0;
        const durationDays = plan ? plan.durationDays : 30;
        
        const newExpiry = addDays(baseDate, durationDays);
        
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          expiryDate: newExpiry.toISOString(),
          lastRenewedAt: now.toISOString(),
          status: 'Active'
        });
        
        await addDoc(collection(db, 'sales'), {
          userId: user.id,
          userName: user.name,
          planName: user.planName || 'Manual Renewal',
          date: now.toISOString(),
          amount: amount,
          type: 'Renewal',
          notes: `Bulk auto-renewal (${durationDays} days)`
        });
      }
      
      setSelectedUserIds(new Set());
      setBulkActionState({ type: null, loading: false });
    } catch (error) {
      console.error("Bulk renew failed:", error);
      setBulkActionState({ type: null, loading: false });
    }
  };

  const executeBulkDelete = async () => {
    setBulkActionState(prev => ({ ...prev, loading: true }));
    try {
      for (const userId of selectedUserIds) {
        await deleteDoc(doc(db, 'users', userId));
      }
      setSelectedUserIds(new Set());
      setBulkActionState({ type: null, loading: false });
    } catch (error) {
      console.error("Bulk delete failed:", error);
      setBulkActionState({ type: null, loading: false });
    }
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-brand-text mb-1 tracking-tight">User Management</h2>
          <p className="text-brand-text-muted text-sm font-medium">Manage your customers and their subscriptions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToCSV}
            className="clay-btn flex items-center gap-2 text-sm font-bold shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="clay-btn-primary flex items-center gap-2 text-sm font-bold shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Add User
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
        plans={plans}
      />

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted opacity-50" />
          <input 
            type="text" 
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="clay-input w-full pl-11 py-2.5"
          />
        </div>
        <div className="flex items-center gap-3 overflow-x-auto pb-2 lg:pb-0 custom-scrollbar">
          <div className="flex bg-brand-bg p-1 rounded-xl border border-brand-border whitespace-nowrap gap-1">
            {['All', 'Active', 'Expired', 'Upcoming', 'New This Month', 'Renewed This Month'].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f as any)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider",
                  statusFilter === f 
                    ? "bg-brand-primary text-white shadow-sm" 
                    : "text-brand-text-muted hover:text-brand-text hover:bg-brand-primary/5"
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
              onClick={() => setBulkActionState({ type: 'renew', loading: false })}
              className="text-sm font-bold hover:underline flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Bulk Renew
            </button>
            <button 
              onClick={() => setBulkActionState({ type: 'delete', loading: false })}
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

      {/* Bulk Action Confirmation Modal */}
      {bulkActionState.type && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !bulkActionState.loading && setBulkActionState({ type: null, loading: false })} />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-2">
              {bulkActionState.type === 'delete' ? 'Confirm Bulk Delete' : 'Confirm Bulk Renewal'}
            </h3>
            <p className="text-brand-text-muted mb-6">
              {bulkActionState.type === 'delete' 
                ? `Are you sure you want to permanently delete ${selectedUserIds.size} users?`
                : `Are you sure you want to renew ${selectedUserIds.size} users for 1 month?`}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                disabled={bulkActionState.loading}
                onClick={() => setBulkActionState({ type: null, loading: false })}
                className="px-4 py-2 text-sm font-bold text-brand-text-muted hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button 
                disabled={bulkActionState.loading}
                onClick={bulkActionState.type === 'delete' ? executeBulkDelete : executeBulkRenew}
                className={cn(
                  "px-4 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2",
                  bulkActionState.type === 'delete' ? "bg-red-500 hover:bg-red-600" : "bg-brand-primary hover:bg-brand-primary-hover"
                )}
              >
                {bulkActionState.loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="clay-card overflow-hidden border-none shadow-clay bg-brand-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-bg/50 border-b border-brand-border">
                <th className="px-6 py-3 w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary/20"
                  />
                </th>
                <th className="px-6 py-3 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">User</th>
                <th className="px-6 py-3 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Plan</th>
                <th className="px-6 py-3 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Subscription</th>
                <th className="px-6 py-3 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Status</th>
                <th className="px-6 py-3 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Expiry</th>
                <th className="px-6 py-3 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredUsers.map((user) => {
                const status = getStatus(user.expiryDate, user.subscriptionStartDate);
                const isSelected = selectedUserIds.has(user.id);
                return (
                  <tr 
                    key={user.id} 
                    onClick={() => openDetails(user)}
                    className={cn(
                      "hover:bg-brand-bg/50 transition-colors group cursor-pointer",
                      isSelected && "bg-brand-primary/5"
                    )}
                  >
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onClick={(e) => toggleSelectUser(user.id, e)}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary/20"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm",
                          status === 'Expired' ? "bg-red-500/10 text-red-500" : "bg-brand-primary/10 text-brand-primary"
                        )}>
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className={cn(
                            "text-sm font-bold",
                            status === 'Expired' ? "text-red-500" : "text-brand-text"
                          )}>{user.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {user.name.toLowerCase().includes('fb') || user.name.toLowerCase().includes('facebook') ? (
                              <Facebook className="w-3 h-3 text-blue-500" />
                            ) : (
                              <MessageCircle className="w-3 h-3 text-emerald-500" />
                            )}
                            <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">ID: {user.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-xs font-semibold",
                        status === 'Expired' ? "text-red-400" : "text-brand-text"
                      )}>
                        {user.planName || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "flex items-center gap-2 text-xs",
                        status === 'Expired' ? "text-red-400" : "text-brand-text-muted"
                      )}>
                        <Calendar className="w-3.5 h-3.5 opacity-50" />
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
                        "inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                        status === 'Active' && "bg-emerald-500/10 text-emerald-600",
                        status === 'Expired' && "bg-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse",
                        status === 'Upcoming' && "bg-blue-500/10 text-blue-600"
                      )}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className={cn(
                        "text-xs font-bold",
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
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => openRenewal(user, e)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                            status === 'Expired'
                              ? "bg-brand-primary text-white shadow-sm hover:bg-brand-primary-hover"
                              : "bg-brand-bg border border-brand-border text-brand-text-muted hover:text-brand-primary"
                          )}
                        >
                          <RefreshCw className="w-3 h-3" />
                          Renew
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); }}
                          className="p-2 text-brand-text-muted hover:text-brand-primary transition-all rounded-lg hover:bg-brand-bg"
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
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-brand-text-muted/20 mx-auto mb-4" />
            <p className="text-brand-text-muted font-medium">No users found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
