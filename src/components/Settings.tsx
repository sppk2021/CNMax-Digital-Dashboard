import React, { useState, useEffect } from 'react';
import { 
  User, 
  Shield, 
  Mail, 
  Calendar, 
  Trash2,
  Plus,
  Search,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { collection, onSnapshot, query, doc, setDoc, deleteDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { cn, handleFirestoreError, OperationType } from '../utils';
import { format } from 'date-fns';
import { clearAllData, seedSampleData } from '../utils/seedData';

import { toast } from 'react-hot-toast';

interface SettingsProps {
  currentUser: any;
  users: any[];
  plans: any[];
  servers: any[];
  sales: any[];
  expenses: any[];
}

export function Settings({ currentUser, users, plans, servers, sales, expenses }: SettingsProps) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isClearingData, setIsClearingData] = useState(false);
  const [isSeedingData, setIsSeedingData] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'admins'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAdmins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'admins');
    });
    return () => unsubscribe();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUsername) return;

    const username = newAdminUsername.trim().toLowerCase();
    try {
      await setDoc(doc(db, 'admins', username), {
        username: username,
        addedBy: currentUser.displayName || currentUser.email,
        createdAt: serverTimestamp(),
        role: 'admin'
      });
      setNewAdminUsername('');
      setIsAddingAdmin(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `admins/${username}`);
    }
  };

  const handleRemoveAdmin = async (id: string, username: string) => {
    if (username === currentUser.displayName || username === currentUser.email) {
      alert("You cannot remove yourself.");
      return;
    }
    if (!confirm(`Are you sure you want to remove ${username} as an admin?`)) return;

    try {
      await deleteDoc(doc(db, 'admins', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `admins/${id}`);
    }
  };

  const handleClearData = async () => {
    if (clearConfirmText !== 'CLEAR ALL DATA') {
      toast.error('Please type "CLEAR ALL DATA" to confirm.');
      return;
    }

    const loadingToast = toast.loading('Clearing all application data...');
    setIsClearingData(true);
    try {
      await clearAllData();
      
      setShowClearConfirm(false);
      setClearConfirmText('');
      toast.success('All application data has been cleared.', { id: loadingToast });
    } catch (error) {
      console.error("Error clearing data:", error);
      toast.error('An error occurred while clearing data.', { id: loadingToast });
    } finally {
      setIsClearingData(false);
    }
  };

  const handleSeedData = async () => {
    const loadingToast = toast.loading('Seeding sample data...');
    setIsSeedingData(true);
    setShowSeedConfirm(false);
    try {
      await clearAllData();
      await seedSampleData();
      toast.success('Sample data seeded successfully!', { id: loadingToast });
    } catch (error) {
      console.error("Error seeding data:", error);
      toast.error('An error occurred while seeding data.', { id: loadingToast });
    } finally {
      setIsSeedingData(false);
    }
  };

  const filteredAdmins = admins.filter(a => 
    (a.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Admin Management Section */}
      <section className="clay-card p-8 border-none shadow-clay bg-brand-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className="p-3.5 bg-brand-primary/10 rounded-2xl shadow-inner">
              <Shield className="w-7 h-7 text-brand-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-brand-text tracking-tight">User Management</h2>
              <p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-widest opacity-70 mt-1">Control who has access to this dashboard.</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsAddingAdmin(true)}
            className="clay-btn-primary flex items-center gap-2 px-6 py-3 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        {isAddingAdmin && (
          <form onSubmit={handleAddAdmin} className="mb-10 p-8 bg-brand-bg/50 rounded-3xl border border-brand-border shadow-inner animate-in fade-in slide-in-from-top-4 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Username / Email</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-muted opacity-50" />
                <input 
                  type="text" 
                  placeholder="Enter username or email..."
                  value={newAdminUsername}
                  onChange={(e) => setNewAdminUsername(e.target.value)}
                  className="clay-input w-full pl-12 py-4 text-sm"
                  required
                />
              </div>
            </div>
            <div className="flex gap-4 justify-end">
              <button 
                type="button"
                onClick={() => setIsAddingAdmin(false)}
                className="clay-btn px-8 py-3 text-xs font-bold"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="clay-btn-primary px-10 py-3 text-xs font-bold"
              >
                Confirm Add
              </button>
            </div>
          </form>
        )}

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted opacity-50" />
          <input 
            type="text" 
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="clay-input w-full pl-11 py-3.5 text-sm"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-bg/30">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-bg/50 border-b border-brand-border">
                <th className="px-6 py-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Username</th>
                <th className="px-6 py-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Added Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredAdmins.map((admin) => (
                <tr key={admin.id} className="hover:bg-brand-primary/5 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-black text-sm shadow-sm">
                        {(admin.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-brand-text text-sm">{admin.username || 'Unknown'}</span>
                        {(currentUser && (admin.username === currentUser.displayName || admin.username === currentUser.email)) && (
                          <span className="text-[9px] text-brand-primary font-black uppercase tracking-widest mt-0.5">Active Session</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-brand-text-muted">
                      <Calendar className="w-4 h-4 opacity-40" />
                      {admin.createdAt ? format(admin.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button 
                      onClick={() => handleRemoveAdmin(admin.id, admin.username || '')}
                      disabled={currentUser && (admin.username === currentUser.displayName || admin.username === currentUser.email)}
                      className={cn(
                        "p-2.5 rounded-xl transition-all",
                        (currentUser && (admin.username === currentUser.displayName || admin.username === currentUser.email))
                          ? "text-brand-text-muted/20 cursor-not-allowed" 
                          : "text-brand-text-muted hover:text-red-500 hover:bg-red-500/10"
                      )}
                      title="Remove User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAdmins.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-16 text-center">
                    <User className="w-12 h-12 text-brand-text-muted/10 mx-auto mb-4" />
                    <p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-widest">No users found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Danger Zone Section */}
      <section className="clay-card p-8 border-none shadow-clay bg-brand-card">
        <div className="flex items-center gap-5 mb-10">
          <div className="p-3.5 bg-red-500/10 rounded-2xl shadow-inner">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-brand-text tracking-tight">Danger Zone</h2>
            <p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-widest opacity-70 mt-1">Irreversible and destructive actions.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-red-500/5 p-8 rounded-3xl border border-red-500/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-black text-brand-text mb-1">Clear All Application Data</h3>
              <p className="text-xs font-medium text-brand-text-muted leading-relaxed">Permanently delete all users, servers, sales, expenses, and plans. This action is final.</p>
            </div>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-8 py-3.5 bg-red-500 hover:bg-red-600 text-white text-xs font-black rounded-xl shadow-xl shadow-red-500/20 transition-all whitespace-nowrap border-none uppercase tracking-widest"
            >
              Clear Data
            </button>
          </div>

          <div className="bg-brand-primary/5 p-8 rounded-3xl border border-brand-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-black text-brand-text mb-1">Seed Sample Data & Initialize</h3>
              <p className="text-xs font-medium text-brand-text-muted leading-relaxed">Reset and populate your database with the requested monthly performance flow. This will initialize the application with sample data.</p>
            </div>
            <button
              onClick={() => setShowSeedConfirm(true)}
              disabled={isSeedingData}
              className="clay-btn-primary px-8 py-3.5 flex items-center justify-center gap-3 whitespace-nowrap text-xs font-black uppercase tracking-widest"
            >
              {isSeedingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Seed & Initialize
            </button>
          </div>
        </div>

        {/* Seed Data Confirmation Modal */}
        {showSeedConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative clay-card w-full max-w-md p-8 animate-in zoom-in-95 duration-200 border-none shadow-2xl">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-8 h-8 text-brand-primary" />
                </div>
                <h3 className="text-xl font-bold text-brand-text">Seed Sample Data?</h3>
                <p className="text-brand-text-muted text-sm leading-relaxed">
                  This will <span className="font-bold text-red-500">clear all existing data</span> (users, sales, plans, etc.) and populate the database with the requested monthly performance flow starting from January.
                </p>
                
                <div className="flex gap-4 w-full mt-6">
                  <button 
                    onClick={() => setShowSeedConfirm(false)}
                    className="clay-btn flex-1 py-3"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSeedData}
                    className="clay-btn-primary flex-1 py-3"
                  >
                    Yes, Seed Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clear Data Confirmation Modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative clay-card w-full max-w-md p-8 animate-in zoom-in-95 duration-200 border-none shadow-2xl">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-2">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-brand-text">Are you absolutely sure?</h3>
                <p className="text-brand-text-muted text-sm leading-relaxed">
                  This action cannot be undone. This will permanently delete all data in the <span className="font-bold text-red-500">users, servers, sales, expenses, and plans</span> collections.
                </p>
                
                <div className="w-full text-left mt-4">
                  <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">
                    Please type <span className="text-red-500">CLEAR ALL DATA</span> to confirm.
                  </label>
                  <input 
                    type="text" 
                    value={clearConfirmText}
                    onChange={(e) => setClearConfirmText(e.target.value)}
                    className="clay-input w-full mt-2 py-3"
                  />
                </div>

                <div className="flex gap-4 w-full mt-6">
                  <button 
                    onClick={() => {
                      setShowClearConfirm(false);
                      setClearConfirmText('');
                    }}
                    className="clay-btn flex-1 py-3"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleClearData}
                    disabled={isClearingData || clearConfirmText !== 'CLEAR ALL DATA'}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:bg-red-300 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all border-none"
                  >
                    {isClearingData ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
