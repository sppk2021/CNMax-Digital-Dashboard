import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Clock, 
  DollarSign,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn, handleFirestoreError, OperationType } from '../utils';
import { addDoc, collection, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface PlanManagementProps {
  plans: any[];
}

export function PlanManagement({ plans }: PlanManagementProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');

  const resetForm = () => {
    setName('');
    setDuration('');
    setPrice('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const planData = {
        name,
        durationDays: parseInt(duration),
        price: parseFloat(price),
        createdAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'plans', editingId), planData)
          .catch(e => handleFirestoreError(e, OperationType.UPDATE, `plans/${editingId}`));
      } else {
        await addDoc(collection(db, 'plans'), planData)
          .catch(e => handleFirestoreError(e, OperationType.CREATE, 'plans'));
      }
      resetForm();
    } catch (error) {
      console.error("Failed to save plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'plans', deleteConfirmId))
        .catch(e => handleFirestoreError(e, OperationType.DELETE, `plans/${deleteConfirmId}`));
    } catch (error) {
      console.error("Failed to delete plan:", error);
    } finally {
      setLoading(false);
      setDeleteConfirmId(null);
    }
  };

  const startEdit = (plan: any) => {
    setName(plan.name);
    setDuration(plan.durationDays.toString());
    setPrice(plan.price.toString());
    setEditingId(plan.id);
    setIsAdding(true);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-brand-text mb-1">Plan Configuration</h2>
          <p className="text-brand-text-muted text-sm">Manage subscription durations and pricing.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="clay-btn-primary flex items-center gap-2 text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Plan
          </button>
        )}
      </div>

      {isAdding && (
        <div className="clay-card p-6 md:p-8 animate-in fade-in slide-in-from-top-4 border-none shadow-medium bg-brand-bg/50">
          <h3 className="text-lg font-bold text-brand-text mb-8">{editingId ? 'Edit Plan' : 'Create New Plan'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-2.5">Plan Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 1 Month"
                className="clay-input w-full py-2.5"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-2.5">Duration (Days)</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted opacity-50" />
                <input 
                  type="number" 
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="30"
                  className="clay-input w-full pl-11 py-2.5"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-2.5">Price (Ks)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted opacity-50" />
                <input 
                  type="number" 
                  step="1"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="25000"
                  className="clay-input w-full pl-11 py-2.5"
                />
              </div>
            </div>
            <div className="md:col-span-3 flex items-center gap-4 justify-end pt-6 border-t border-brand-border">
              <button 
                type="button"
                onClick={resetForm}
                className="clay-btn px-6 py-2 text-xs font-bold"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="clay-btn-primary px-8 py-2 flex items-center gap-2 text-xs font-bold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? 'Update Plan' : 'Save Plan')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div 
            key={plan.id}
            className="clay-card p-6 group relative border-none shadow-medium hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="p-2.5 bg-brand-primary/10 rounded-xl">
                <Clock className="w-5 h-5 text-brand-primary" />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => startEdit(plan)}
                  className="p-2 text-brand-text-muted hover:text-brand-primary hover:bg-brand-bg rounded-lg transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleDeleteClick(plan.id)}
                  className="p-2 text-brand-text-muted hover:text-red-500 hover:bg-brand-bg rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-brand-text mb-1">{plan.name}</h3>
            <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-6">{plan.durationDays} Days Duration</p>
            <div className="flex items-center justify-between pt-6 border-t border-brand-border">
              <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Price</span>
              <span className="text-lg font-bold text-emerald-600">{plan.price.toLocaleString()} Ks</span>
            </div>
          </div>
        ))}
        {plans.length === 0 && !isAdding && (
          <div className="md:col-span-3 py-24 text-center clay-card border-none shadow-medium">
            <AlertCircle className="w-12 h-12 text-brand-text-muted/20 mx-auto mb-4" />
            <p className="text-brand-text font-bold">No plans configured yet.</p>
            <p className="text-brand-text-muted text-xs mt-1">Add your first plan to get started.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative clay-card w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border-none shadow-2xl">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-brand-text mb-2">Delete Plan?</h3>
              <p className="text-brand-text-muted text-sm mb-8">
                Are you sure you want to permanently delete this plan? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="clay-btn flex-1 py-2.5 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all text-xs"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
