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
  Lock
} from 'lucide-react';
import { collection, onSnapshot, query, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { cn, handleFirestoreError, OperationType } from '../utils';
import { format } from 'date-fns';
import bcrypt from 'bcryptjs';

interface SettingsProps {
  currentUser: any;
}

export function Settings({ currentUser }: SettingsProps) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
    if (!newAdminEmail || !newAdminPassword) return;

    const email = newAdminEmail.toLowerCase();
    const hashedPassword = await bcrypt.hash(newAdminPassword, 10);
    try {
      await setDoc(doc(db, 'admins', email), {
        email: email,
        password: hashedPassword,
        addedBy: currentUser.email,
        createdAt: serverTimestamp(),
        role: 'admin'
      });
      setNewAdminEmail('');
      setNewAdminPassword('');
      setIsAddingAdmin(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `admins/${email}`);
    }
  };

  const handleRemoveAdmin = async (id: string, email: string) => {
    if (email === currentUser.email) {
      alert("You cannot remove yourself.");
      return;
    }
    if (!confirm(`Are you sure you want to remove ${email} as an admin?`)) return;

    try {
      await deleteDoc(doc(db, 'admins', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `admins/${id}`);
    }
  };

  const filteredAdmins = admins.filter(a => 
    a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* Admin Management Section */}
      <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-brand-sidebar/10 rounded-2xl">
              <Shield className="w-8 h-8 text-brand-sidebar" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
              <p className="text-slate-500">Control who has access to this dashboard.</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsAddingAdmin(true)}
            className="flex items-center gap-2 bg-brand-sidebar text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-blue transition-colors shadow-lg shadow-brand-sidebar/20"
          >
            <Plus className="w-5 h-5" />
            Add New User
          </button>
        </div>

        {isAddingAdmin && (
          <form onSubmit={handleAddAdmin} className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="email" 
                  placeholder="Enter email address..."
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-sidebar transition-colors"
                  required
                />
              </div>
              <div className="flex-1 relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password" 
                  placeholder="Enter password..."
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-sidebar transition-colors"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                type="submit"
                className="bg-brand-sidebar text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-blue transition-colors"
              >
                Confirm Add
              </button>
              <button 
                type="button"
                onClick={() => setIsAddingAdmin(false)}
                className="px-4 py-3 text-slate-500 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search users by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-sidebar transition-colors"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">User Email</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Added Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAdmins.map((admin) => (
                <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-sidebar/10 flex items-center justify-center text-brand-sidebar font-bold text-xs">
                        {admin.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-700">{admin.email}</span>
                      {admin.email === currentUser.email && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">You</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="w-4 h-4 opacity-40" />
                      {admin.createdAt ? format(admin.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                      disabled={admin.email === currentUser.email}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        admin.email === currentUser.email 
                          ? "text-slate-200 cursor-not-allowed" 
                          : "text-slate-300 hover:text-red-500 hover:bg-red-50"
                      )}
                      title="Remove User"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
