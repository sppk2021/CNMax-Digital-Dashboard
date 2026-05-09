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
  UserMinus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { cn, getStatus, handleFirestoreError, OperationType, isInMonth, getNow, safeFormat } from '../utils';
import { addDoc, collection, doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { addDays, format, parseISO, startOfMonth } from 'date-fns';
import { UserModal } from './UserModal';
import { RenewalModal } from './RenewalModal';
import { UserDetailsModal } from './UserDetailsModal';
import { EditUserModal } from './EditUserModal';

interface UserListProps {
  users: any[];
  plans: any[];
  sales: any[];
}

export function UserList({ users, plans, sales }: UserListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Expired' | 'Upcoming' | 'New This Month' | 'Renewed This Month'>('All');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkActionState, setBulkActionState] = useState<{type: 'renew' | 'delete' | null, loading: boolean}>({ type: null, loading: false });
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const now = getNow();
  const currentMonthStart = startOfMonth(now);

  const filteredUsers = users.filter(user => {
    const name = user.name || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
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
    // If explicit sort order is set for expiry date
    if (sortOrder) {
      const dateA = a.expiryDate ? parseISO(a.expiryDate).getTime() : 0;
      const dateB = b.expiryDate ? parseISO(b.expiryDate).getTime() : 0;
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }

    // Default sorting: Expired users at the bottom if not filtering by Expired
    if (statusFilter !== 'Expired') {
      const statusA = getStatus(a.expiryDate, a.subscriptionStartDate);
      const statusB = getStatus(b.expiryDate, b.subscriptionStartDate);
      if (statusA === 'Expired' && statusB !== 'Expired') return 1;
      if (statusB === 'Expired' && statusA !== 'Expired') return -1;
    }
    return 0;
  });

  const toggleSort = () => {
    if (sortOrder === null) setSortOrder('asc');
    else if (sortOrder === 'asc') setSortOrder('desc');
    else setSortOrder(null);
  };

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
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={selectedUser}
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
          
          <button
            onClick={toggleSort}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
              sortOrder 
                ? "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20" 
                : "bg-brand-bg text-brand-text-muted border-brand-border hover:border-brand-primary/50"
            )}
          >
            {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : sortOrder === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUpDown className="w-4 h-4" />}
            Sort Expiry
          </button>
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md clay-card p-8 border-none shadow-clay bg-brand-card animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-2",
                bulkActionState.type === 'delete' ? "bg-red-500/10" : "bg-brand-primary/10"
              )}>
                {bulkActionState.type === 'delete' ? <UserMinus className="w-8 h-8 text-red-500" /> : <RefreshCw className="w-8 h-8 text-brand-primary" />}
              </div>
              <h3 className="text-xl font-bold text-brand-text">
                {bulkActionState.type === 'delete' ? 'Confirm Bulk Delete' : 'Confirm Bulk Renewal'}
              </h3>
              <p className="text-brand-text-muted text-sm leading-relaxed">
                {bulkActionState.type === 'delete' 
                  ? `Are you sure you want to permanently delete ${selectedUserIds.size} users? This action cannot be undone.`
                  : `Are you sure you want to renew ${selectedUserIds.size} users for 1 month? This will generate sales records for each user.`}
              </p>
              <div className="flex gap-4 w-full mt-6">
                <button 
                  disabled={bulkActionState.loading}
                  onClick={() => setBulkActionState({ type: null, loading: false })}
                  className="clay-btn flex-1 py-3 text-xs font-bold"
                >
                  Cancel
                </button>
                <button 
                  disabled={bulkActionState.loading}
                  onClick={bulkActionState.type === 'delete' ? executeBulkDelete : executeBulkRenew}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white text-xs font-bold rounded-xl shadow-lg transition-all border-none",
                    bulkActionState.type === 'delete' ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : "bg-brand-primary hover:bg-brand-primary-hover shadow-brand-primary/20"
                  )}
                >
                  {bulkActionState.loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table / Card View */}
      <div className="clay-card overflow-hidden border-none shadow-clay bg-brand-card">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
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
                <th 
                  className="px-6 py-3 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest cursor-pointer hover:text-brand-primary transition-colors group"
                  onClick={toggleSort}
                >
                  <div className="flex items-center gap-1">
                    Expiry
                    {sortOrder === 'asc' && <ArrowUp className="w-3 h-3" />}
                    {sortOrder === 'desc' && <ArrowDown className="w-3 h-3" />}
                    {!sortOrder && <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </div>
                </th>
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
                            {user.platform === 'Facebook' ? (
                              <Facebook className="w-3 h-3 text-blue-500" />
                            ) : user.platform === 'Viber' ? (
                              <MessageCircle className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Users className="w-3 h-3 text-brand-text-muted" />
                            )}
                            <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">
                              ID: {user.refId || user.id.slice(0, 5)}
                            </span>
                            {user.platform && (
                              <span className="text-[9px] font-bold text-brand-text-muted/50 uppercase tracking-tighter">
                                • {user.platform}
                              </span>
                            )}
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
                        {safeFormat(user.subscriptionStartDate, 'MMM d, yyyy')}
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
                        {safeFormat(user.expiryDate, 'MMM d, yyyy')}
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
                        <div className="relative">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setActiveMenuId(activeMenuId === user.id ? null : user.id);
                            }}
                            className="p-2 text-brand-text-muted hover:text-brand-primary transition-all rounded-lg hover:bg-brand-bg"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {activeMenuId === user.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-brand-card border border-brand-border rounded-xl shadow-clay z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUser(user);
                                  setIsEditModalOpen(true);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-bold text-brand-text hover:bg-brand-bg transition-colors flex items-center gap-2"
                              >
                                <Calendar className="w-4 h-4 text-brand-primary" />
                                Edit User Details
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Are you sure you want to delete this user?')) {
                                    deleteDoc(doc(db, 'users', user.id));
                                  }
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                              >
                                <UserMinus className="w-4 h-4" />
                                Delete User
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-brand-border">
          {filteredUsers.map((user) => {
            const status = getStatus(user.expiryDate, user.subscriptionStartDate);
            const isSelected = selectedUserIds.has(user.id);
            return (
              <div 
                key={user.id} 
                onClick={() => openDetails(user)}
                className={cn(
                  "p-4 space-y-4 active:bg-brand-bg/50 transition-colors",
                  isSelected && "bg-brand-primary/5"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onClick={(e) => toggleSelectUser(user.id, e)}
                      onChange={() => {}}
                      className="w-4 h-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary/20"
                    />
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
                        {user.platform === 'Facebook' ? (
                          <Facebook className="w-3 h-3 text-blue-500" />
                        ) : user.platform === 'Viber' ? (
                          <MessageCircle className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Users className="w-3 h-3 text-brand-text-muted" />
                        )}
                        <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">
                          ID: {user.refId || user.id.slice(0, 5)}
                        </span>
                        {user.platform && (
                          <span className="text-[9px] font-bold text-brand-text-muted/50 uppercase tracking-tighter">
                            • {user.platform}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider",
                    status === 'Active' && "bg-emerald-500/10 text-emerald-600",
                    status === 'Expired' && "bg-red-500 text-white shadow-lg shadow-red-500/40",
                    status === 'Upcoming' && "bg-blue-500/10 text-blue-600"
                  )}>
                    {status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-brand-bg/30 p-3 rounded-xl border border-brand-border">
                  <div>
                    <p className="text-[9px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">Plan</p>
                    <p className="text-xs font-bold text-brand-text">{user.planName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">Expiry</p>
                    <p className={cn(
                      "text-xs font-bold",
                      status === 'Expired' ? "text-red-500" : "text-brand-text"
                    )}>
                      {safeFormat(user.expiryDate, 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={(e) => openRenewal(user, e)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold transition-all",
                      status === 'Expired'
                        ? "bg-brand-primary text-white shadow-sm"
                        : "bg-brand-bg border border-brand-border text-brand-text-muted"
                    )}
                  >
                    <RefreshCw className="w-3 h-3" />
                    Renew
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); }}
                    className="p-2 text-brand-text-muted hover:text-brand-primary transition-all rounded-lg bg-brand-bg border border-brand-border"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
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
