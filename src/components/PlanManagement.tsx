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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'plans', id))
        .catch(e => handleFirestoreError(e, OperationType.DELETE, `plans/${id}`));
    } catch (error) {
      console.error("Failed to delete plan:", error);
    } finally {
      setLoading(false);
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Plan Configuration</h2>
          <p className="text-slate-500">Manage subscription durations and pricing.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 bg-brand-sidebar hover:bg-brand-sidebar/90 rounded-2xl text-white transition-all text-sm font-bold shadow-lg shadow-brand-sidebar/20"
          >
            <Plus className="w-5 h-5" />
            Add New Plan
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl animate-in fade-in slide-in-from-top-4">
          <h3 className="text-xl font-black text-slate-800 mb-8">{editingId ? 'Edit Plan' : 'Create New Plan'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Plan Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 1 Month"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 focus:outline-none focus:border-brand-sidebar transition-colors text-slate-700 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Duration (Days)</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="number" 
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="30"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-5 focus:outline-none focus:border-brand-sidebar transition-colors text-slate-700 font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Price (Ks)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="number" 
                  step="1"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="25000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-5 focus:outline-none focus:border-brand-sidebar transition-colors text-slate-700 font-medium"
                />
              </div>
            </div>
            <div className="md:col-span-3 flex items-center gap-4 justify-end pt-4">
              <button 
                type="button"
                onClick={resetForm}
                className="px-8 py-3.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-sm font-bold text-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-10 py-3.5 bg-brand-sidebar hover:bg-brand-sidebar/90 disabled:opacity-50 rounded-2xl text-white font-black transition-all shadow-lg shadow-brand-sidebar/20"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingId ? 'Update Plan' : 'Save Plan')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div 
            key={plan.id}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="p-4 bg-brand-sidebar/10 rounded-2xl">
                <Clock className="w-8 h-8 text-brand-sidebar" />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => startEdit(plan)}
                  className="p-2.5 text-slate-400 hover:text-brand-sidebar hover:bg-brand-sidebar/5 rounded-xl transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDelete(plan.id)}
                  className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">{plan.name}</h3>
            <p className="text-sm font-medium text-slate-400 mb-6">{plan.durationDays} Days Duration</p>
            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price</span>
              <span className="text-2xl font-black text-emerald-600">{plan.price.toLocaleString()} Ks</span>
            </div>
          </div>
        ))}
        {plans.length === 0 && !isAdding && (
          <div className="md:col-span-3 py-24 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <AlertCircle className="w-16 h-16 text-slate-200 mx-auto mb-6" />
            <p className="text-slate-400 font-bold text-lg">No plans configured yet.</p>
            <p className="text-slate-300 text-sm mt-2">Add your first plan to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
