import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { addDays, format, parseISO } from 'date-fns';
import { handleFirestoreError, OperationType, getNow, cn } from '../utils';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: any[];
}

export function UserModal({ isOpen, onClose, plans }: UserModalProps) {
  const [name, setName] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [platform, setPlatform] = useState<'Facebook' | 'Viber' | 'Others'>('Facebook');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const generateRefId = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedPlanId) return;

    const plan = plans.find(p => p.id === selectedPlanId);
    if (!plan) return;

    setLoading(true);
    try {
      const now = getNow();
      const start = parseISO(startDate);
      const expiry = addDays(start, plan.durationDays);
      
      const userDoc = {
        name: name.trim(),
        refId: generateRefId(),
        platform,
        subscriptionStartDate: start.toISOString(),
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
      setPlatform('Facebook');
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
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
      <div className="relative w-full max-w-md clay-card border-none shadow-clay overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-8 border-b border-brand-border bg-brand-bg/50">
          <h3 className="text-2xl font-bold text-brand-text tracking-tight">Add New User</h3>
          <button onClick={onClose} className="p-2 hover:bg-brand-bg rounded-xl transition-colors">
            <X className="w-6 h-6 text-brand-text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Facebook / Viber Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe (FB)"
              className="clay-input w-full py-4 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Platform Label</label>
            <div className="flex gap-2">
              {(['Facebook', 'Viber', 'Others'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                    platform === p 
                      ? "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20" 
                      : "bg-brand-bg text-brand-text-muted border-brand-border hover:border-brand-primary/50"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Select Subscription Plan</label>
            <select
              required
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

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Subscription Start Date</label>
            <input 
              type="date" 
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="clay-input w-full py-4 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Notes (Optional)</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment method, special requests, etc."
              rows={3}
              className="clay-input w-full py-4 text-sm resize-none"
            />
          </div>

          <div className="bg-brand-primary/5 border border-brand-primary/10 p-5 rounded-2xl">
            <p className="text-[10px] text-brand-primary font-bold uppercase tracking-widest mb-2">Subscription Details</p>
            <div className="space-y-1">
              <p className="text-xs text-brand-text-muted font-medium leading-relaxed">
                {selectedPlanId 
                  ? `New users will start with a ${plans.find(p => p.id === selectedPlanId)?.durationDays}-day active subscription.`
                  : 'Select a plan to see subscription details.'}
              </p>
              {selectedPlanId && (
                <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest opacity-60">
                  Expires on: {format(addDays(parseISO(startDate), plans.find(p => p.id === selectedPlanId)!.durationDays), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || plans.length === 0}
            className="clay-btn-primary w-full flex items-center justify-center gap-2 py-4 px-6 text-sm font-bold shadow-lg shadow-brand-primary/20 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create User & Sale'}
          </button>
        </form>
      </div>
    </div>
  );
}
