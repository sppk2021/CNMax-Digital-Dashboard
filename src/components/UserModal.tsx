import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { addDays } from 'date-fns';
import { handleFirestoreError, OperationType } from '../utils';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: any[];
}

export function UserModal({ isOpen, onClose, plans }: UserModalProps) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedPlanId || !password.trim()) return;

    const plan = plans.find(p => p.id === selectedPlanId);
    if (!plan) return;

    setLoading(true);
    try {
      const now = new Date();
      const expiry = addDays(now, plan.durationDays);
      
      const userDoc = {
        name: name.trim(),
        // SECURITY WARNING: Storing passwords in plaintext is insecure.
        // In a production environment, use Firebase Authentication or hash the password.
        password: password.trim(),
        subscriptionStartDate: now.toISOString(),
        expiryDate: expiry.toISOString(),
        status: 'Active',
        createdAt: now.toISOString(),
        planName: plan.name,
        notes: notes.trim()
      };

      const docRef = await addDoc(collection(db, 'users'), userDoc)
        .catch(e => handleFirestoreError(e, OperationType.CREATE, 'users'));

      if (docRef) {
        // Create initial sale record
        await addDoc(collection(db, 'sales'), {
          userId: docRef.id,
          userName: name.trim(),
          date: now.toISOString(),
          amount: plan.price,
          type: 'New',
          planName: plan.name,
          notes: notes.trim()
        }).catch(e => handleFirestoreError(e, OperationType.CREATE, 'sales'));
      }

      onClose();
      setName('');
      setPassword('');
      setSelectedPlanId('');
      setNotes('');
    } catch (error) {
      console.error("Failed to add user:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-8 border-b border-slate-100">
          <h3 className="text-2xl font-bold text-slate-800">Add New User</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Facebook / Viber Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe (FB)"
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-sidebar/20 transition-all text-slate-800"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-sidebar/20 transition-all text-slate-800"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Select Subscription Plan</label>
            <select
              required
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-sidebar/20 transition-all text-slate-800 appearance-none"
            >
              <option value="" disabled>Choose a plan...</option>
              {plans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - {plan.durationDays} Days ({plan.price.toLocaleString()} Ks)
                </option>
              ))}
            </select>
            {plans.length === 0 && (
              <p className="text-xs text-red-500 mt-2 ml-1">No plans available. Please create a plan first.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Notes (Optional)</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment method, special requests, etc."
              rows={3}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-sidebar/20 transition-all resize-none text-slate-800"
            />
          </div>

          <div className="bg-brand-sidebar/5 border border-brand-sidebar/10 p-5 rounded-2xl">
            <p className="text-xs text-brand-sidebar font-bold uppercase tracking-wider mb-2">Subscription Details</p>
            <p className="text-sm text-slate-600 font-medium">
              {selectedPlanId 
                ? `New users will start with a ${plans.find(p => p.id === selectedPlanId)?.durationDays}-day active subscription.`
                : 'Select a plan to see subscription details.'}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || plans.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-brand-sidebar hover:bg-brand-blue disabled:opacity-50 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-xl shadow-brand-sidebar/20 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create User & Sale'}
          </button>
        </form>
      </div>
    </div>
  );
}
