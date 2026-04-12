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

interface SettingsProps {
  currentUser: any;
}

export function Settings({ currentUser }: SettingsProps) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isClearingData, setIsClearingData] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
      alert('Please type "CLEAR ALL DATA" to confirm.');
      return;
    }

    setIsClearingData(true);
    try {
      const collectionsToClear = ['users', 'servers', 'sales', 'expenses', 'plans'];
      
      for (const collectionName of collectionsToClear) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const deletePromises = querySnapshot.docs.map(document => deleteDoc(doc(db, collectionName, document.id)));
        await Promise.all(deletePromises);
      }
      
      setShowClearConfirm(false);
      setClearConfirmText('');
      alert('Data successfully cleared.');
    } catch (error) {
      console.error("Error clearing data:", error);
      alert('An error occurred while clearing data.');
    } finally {
      setIsClearingData(false);
    }
  };

  const filteredAdmins = admins.filter(a => 
    (a.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Admin Management Section */}
      <section className="clay-card p-6 md:p-8 border-none shadow-medium">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-primary/10 rounded-xl">
              <Shield className="w-6 h-6 text-brand-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-text">User Management</h2>
              <p className="text-brand-text-muted text-sm">Control who has access to this dashboard.</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsAddingAdmin(true)}
            className="clay-btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        {isAddingAdmin && (
          <form onSubmit={handleAddAdmin} className="mb-8 p-6 bg-brand-bg rounded-2xl border border-brand-border animate-in fade-in slide-in-from-top-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted opacity-50" />
                <input 
                  type="text" 
                  placeholder="Enter username..."
                  value={newAdminUsername}
                  onChange={(e) => setNewAdminUsername(e.target.value)}
                  className="clay-input w-full pl-11 py-3"
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button 
                type="button"
                onClick={() => setIsAddingAdmin(false)}
                className="clay-btn px-6 py-2.5"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="clay-btn-primary px-8 py-2.5"
              >
                Confirm Add
              </button>
            </div>
          </form>
        )}

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted opacity-50" />
          <input 
            type="text" 
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="clay-input w-full pl-11 py-3"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-brand-border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-bg border-b border-brand-border">
                <th className="px-6 py-3 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Username</th>
                <th className="px-6 py-3 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Added Date</th>
                <th className="px-6 py-3 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredAdmins.map((admin) => (
                <tr key={admin.id} className="hover:bg-brand-bg/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-xs">
                        {(admin.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-brand-text text-sm">{admin.username || 'Unknown'}</span>
                      {(currentUser && (admin.username === currentUser.displayName || admin.username === currentUser.email)) && (
                        <span className="text-[10px] bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-md font-bold uppercase">You</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-brand-text-muted">
                      <Calendar className="w-3.5 h-3.5 opacity-50" />
                      {admin.createdAt ? format(admin.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleRemoveAdmin(admin.id, admin.username || '')}
                      disabled={currentUser && (admin.username === currentUser.displayName || admin.username === currentUser.email)}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        (currentUser && (admin.username === currentUser.displayName || admin.username === currentUser.email))
                          ? "text-brand-text-muted/30 cursor-not-allowed" 
                          : "text-brand-text-muted hover:text-red-500 hover:bg-brand-bg"
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
                  <td colSpan={3} className="px-6 py-12 text-center text-brand-text-muted text-sm italic">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Danger Zone Section */}
      <section className="clay-card p-6 md:p-8 border-none shadow-medium">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-red-500/10 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-brand-text">Danger Zone</h2>
            <p className="text-brand-text-muted text-sm">Irreversible and destructive actions.</p>
          </div>
        </div>

        <div className="bg-red-500/5 p-6 rounded-xl border border-red-500/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-brand-text mb-1">Clear All Application Data</h3>
            <p className="text-xs text-brand-text-muted">Permanently delete all users, servers, sales, expenses, and plans.</p>
          </div>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all whitespace-nowrap border-none"
          >
            Clear Data
          </button>
        </div>

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
