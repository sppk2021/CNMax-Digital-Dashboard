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
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedPlanId) return;

    const plan = plans.find(p => p.id === selectedPlanId);
    if (!plan) return;

    setLoading(true);
    try {
      const now = new Date();
      const expiry = addDays(now, plan.durationDays);
      
      const userDoc = {
        name: name.trim(),
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h3 className="text-xl font-bold">Add New User</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Facebook / Viber Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe (FB)"
              className="w-full bg-[#111111] border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Select Subscription Plan</label>
            <select
              required
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full bg-[#111111] border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-orange-500/50 transition-colors text-white"
            >
              <option value="" disabled>Choose a plan...</option>
              {plans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - {plan.durationDays} Days ({plan.price.toLocaleString()} Ks)
                </option>
              ))}
            </select>
            {plans.length === 0 && (
              <p className="text-xs text-red-400 mt-2">No plans available. Please create a plan first.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Notes (Optional)</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment method, special requests, etc."
              rows={3}
              className="w-full bg-[#111111] border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-orange-500/50 transition-colors resize-none"
            />
          </div>

          <div className="bg-orange-500/5 border border-orange-500/10 p-4 rounded-xl">
            <p className="text-xs text-orange-500/80 font-medium uppercase tracking-wider mb-1">Subscription Details</p>
            <p className="text-sm text-gray-300">
              {selectedPlanId 
                ? `New users will start with a ${plans.find(p => p.id === selectedPlanId)?.durationDays}-day active subscription.`
                : 'Select a plan to see subscription details.'}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || plans.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-orange-500/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create User & Sale'}
          </button>
        </form>
      </div>
    </div>
  );
}
