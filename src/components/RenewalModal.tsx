import React, { useState } from 'react';
import { X, Loader2, RefreshCw, Calendar, CreditCard } from 'lucide-react';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { addDays, parseISO } from 'date-fns';
import { handleFirestoreError, OperationType, getStatus } from '../utils';

interface RenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  plans: any[];
}

export function RenewalModal({ isOpen, onClose, user, plans }: RenewalModalProps) {
  const [renewalMode, setRenewalMode] = useState<'plan' | 'custom'>('plan');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [customPrice, setCustomPrice] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user) return null;

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (renewalMode === 'plan' && !selectedPlanId) return;
    if (renewalMode === 'custom' && !customDate) return;

    setLoading(true);
    try {
      const now = new Date();
      let newExpiry: Date;
      let planName: string;
      let amount: number;

      if (renewalMode === 'plan') {
        const plan = plans.find(p => p.id === selectedPlanId);
        if (!plan) throw new Error("Plan not found");
        
        let currentExpiry = new Date();
        if (user.expiryDate) {
          try {
            currentExpiry = parseISO(user.expiryDate);
          } catch (e) {
            console.error("Invalid expiry date, using current date");
          }
        }
        
        // If already expired, start from now. If active, extend from expiry.
        const baseDate = getStatus(user.expiryDate, user.subscriptionStartDate) === 'Expired' ? now : currentExpiry;
        newExpiry = addDays(baseDate, plan.durationDays);
        planName = plan.name;
        amount = plan.price;
      } else {
        newExpiry = parseISO(customDate);
        planName = 'Manual Renewal';
        amount = customPrice;
      }
      
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        expiryDate: newExpiry.toISOString(),
        planName: planName,
        lastRenewedAt: now.toISOString(),
        notes: notes.trim() || (user.notes || '')
      }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${user.id}`));

      // Create sale record
      await addDoc(collection(db, 'sales'), {
        userId: user.id,
        userName: user.name,
        planName: planName,
        date: now.toISOString(),
        amount: amount,
        type: 'Renewal',
        notes: notes.trim()
      }).catch(e => handleFirestoreError(e, OperationType.CREATE, 'sales'));

      onClose();
      setSelectedPlanId('');
      setCustomDate('');
      setCustomPrice(0);
      setNotes('');
    } catch (error) {
      console.error("Renewal failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <RefreshCw className="w-5 h-5 text-orange-500" />
            </div>
            <h3 className="text-xl font-bold">Renew Subscription</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleRenew} className="p-6 space-y-6">
          <div>
            <p className="text-sm text-gray-400 mb-4">
              Renewing subscription for <span className="text-white font-bold">{user.name}</span>.
            </p>

            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setRenewalMode('plan')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  renewalMode === 'plan' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Select Plan
              </button>
              <button
                type="button"
                onClick={() => setRenewalMode('custom')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  renewalMode === 'custom' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Custom Date
              </button>
            </div>

            {renewalMode === 'plan' ? (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Select Renewal Plan</label>
                <select
                  required={renewalMode === 'plan'}
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
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">New Expiry Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="date"
                      required={renewalMode === 'custom'}
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-full bg-[#111111] border border-white/5 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-orange-500/50 transition-colors text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Amount (Optional)</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      min="0"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(Number(e.target.value))}
                      className="w-full bg-[#111111] border border-white/5 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-orange-500/50 transition-colors text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Renewal Notes (Optional)</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment confirmation, discount applied, etc."
              rows={3}
              className="w-full bg-[#111111] border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-orange-500/50 transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || (renewalMode === 'plan' && plans.length === 0)}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-orange-500/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Renewal'}
          </button>
        </form>
      </div>
    </div>
  );
}
