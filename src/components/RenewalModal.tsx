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
        status: 'Active',
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
        durationDays: renewalMode === 'plan' ? plans.find(p => p.id === selectedPlanId)?.durationDays : undefined,
        startDate: (getStatus(user.expiryDate, user.subscriptionStartDate) === 'Expired' ? now : parseISO(user.expiryDate)).toISOString(),
        endDate: newExpiry.toISOString(),
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
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md clay-card border-none shadow-clay overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-8 border-b border-brand-border bg-brand-bg/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-primary/10 rounded-2xl">
              <RefreshCw className="w-6 h-6 text-brand-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-brand-text tracking-tight">Renew Subscription</h3>
              <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mt-0.5">{user.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-bg rounded-xl transition-colors">
            <X className="w-6 h-6 text-brand-text-muted" />
          </button>
        </div>

        <form onSubmit={handleRenew} className="p-8 space-y-6">
          <div>
            <div className="flex gap-2 mb-8 bg-brand-bg/50 p-1 rounded-xl border border-brand-border shadow-sm">
              <button
                type="button"
                onClick={() => setRenewalMode('plan')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  renewalMode === 'plan' 
                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                    : 'text-brand-text-muted hover:text-brand-text'
                }`}
              >
                Select Plan
              </button>
              <button
                type="button"
                onClick={() => setRenewalMode('custom')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  renewalMode === 'custom' 
                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                    : 'text-brand-text-muted hover:text-brand-text'
                }`}
              >
                Custom Date
              </button>
            </div>

            {renewalMode === 'plan' ? (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Select Renewal Plan</label>
                <select
                  required={renewalMode === 'plan'}
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="clay-input w-full py-4 text-sm appearance-none"
                >
                  <option value="" disabled>Choose a plan...</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - {plan.durationDays} Days ({plan.price.toLocaleString()} Ks)
                    </option>
                  ))}
                </select>
                {plans.length === 0 && (
                  <p className="text-[10px] font-bold text-red-500 mt-2 ml-1 uppercase tracking-widest">No plans available. Please create a plan first.</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">New Expiry Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-muted opacity-50" />
                    <input
                      type="date"
                      required={renewalMode === 'custom'}
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="clay-input w-full pl-12 pr-6 py-4 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Amount (Optional)</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-muted opacity-50" />
                    <input
                      type="number"
                      min="0"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(Number(e.target.value))}
                      className="clay-input w-full pl-12 pr-6 py-4 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Renewal Notes (Optional)</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment confirmation, discount applied, etc."
              rows={3}
              className="clay-input w-full py-4 text-sm resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || (renewalMode === 'plan' && plans.length === 0)}
            className="clay-btn-primary w-full flex items-center justify-center gap-2 py-4 px-6 text-sm font-bold shadow-lg shadow-brand-primary/20 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Renewal'}
          </button>
        </form>
      </div>
    </div>
  );
}
