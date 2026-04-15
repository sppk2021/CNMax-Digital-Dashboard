import React, { useState, useEffect } from 'react';
import { X, Loader2, Calendar, User, Info } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { format, parseISO, addDays } from 'date-fns';
import { handleFirestoreError, OperationType, cn } from '../utils';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  plans: any[];
}

export function EditUserModal({ isOpen, onClose, user, plans }: EditUserModalProps) {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<'Facebook' | 'Viber' | 'Others'>('Facebook');
  const [startDate, setStartDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPlatform(user.platform || 'Facebook');
      setStartDate(user.subscriptionStartDate ? format(parseISO(user.subscriptionStartDate), 'yyyy-MM-dd') : '');
      setNotes(user.notes || '');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const start = parseISO(startDate);
      
      // Recalculate expiry if start date changed? 
      // For now, let's just update the fields. 
      // If they want to extend, they use renewal. 
      // But if they are fixing a start date mistake, maybe we should adjust expiry too if it was based on duration.
      // Let's find the plan used.
      const plan = plans.find(p => p.name === user.planName);
      let expiryDate = user.expiryDate;
      
      if (plan && startDate !== format(parseISO(user.subscriptionStartDate), 'yyyy-MM-dd')) {
        expiryDate = addDays(start, plan.durationDays).toISOString();
      }

      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        name: name.trim(),
        platform,
        subscriptionStartDate: start.toISOString(),
        expiryDate,
        notes: notes.trim()
      }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${user.id}`));

      onClose();
    } catch (error) {
      console.error("Failed to update user:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md clay-card border-none shadow-clay overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-8 border-b border-brand-border bg-brand-bg/50">
          <h3 className="text-2xl font-bold text-brand-text tracking-tight">Edit User</h3>
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
            <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Subscription Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-muted opacity-50" />
              <input 
                type="date" 
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="clay-input w-full pl-12 pr-6 py-4 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Notes (Optional)</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="clay-input w-full py-4 text-sm resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="clay-btn-primary w-full flex items-center justify-center gap-2 py-4 px-6 text-sm font-bold shadow-lg shadow-brand-primary/20 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
