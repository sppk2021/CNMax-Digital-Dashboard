import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Receipt, 
  Calendar, 
  Tag, 
  MoreVertical, 
  Trash2, 
  Edit2,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  X
} from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { cn } from '../utils';

interface ExpenseListProps {
  expenses: any[];
}

export function ExpenseList({ expenses }: ExpenseListProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'Marketing',
    notes: ''
  });

  const categories = ['All', 'Marketing', 'Server', 'Salary', 'Office', 'Other'];

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || expense.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      amount: Number(formData.amount),
      createdAt: new Date().toISOString()
    };

    try {
      if (editingExpense) {
        await updateDoc(doc(db, 'expenses', editingExpense.id), data);
      } else {
        await addDoc(collection(db, 'expenses'), data);
      }
      setIsAddModalOpen(false);
      setEditingExpense(null);
      setFormData({
        title: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        category: 'Marketing',
        notes: ''
      });
    } catch (error) {
      console.error("Error saving expense:", error);
    }
  };

  const handleDelete = (id: string) => {
    setExpenseToDelete(id);
  };

  const confirmDelete = async () => {
    if (expenseToDelete) {
      try {
        await deleteDoc(doc(db, 'expenses', expenseToDelete));
        setExpenseToDelete(null);
      } catch (error) {
        console.error("Error deleting expense:", error);
      }
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-brand-text mb-1">Expenses</h2>
          <p className="text-brand-text-muted text-sm">Track and manage your business expenditures.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="clay-btn-primary flex items-center gap-2 text-xs font-bold"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="clay-card p-5 border-none shadow-medium">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-red-500/10 rounded-xl text-red-500">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">Total Expenses</p>
              <h3 className="text-lg font-bold text-brand-text">{totalExpenses.toLocaleString()} Ks</h3>
            </div>
          </div>
        </div>
        <div className="clay-card p-5 border-none shadow-medium">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">Transaction Count</p>
              <h3 className="text-lg font-bold text-brand-text">{filteredExpenses.length}</h3>
            </div>
          </div>
        </div>
        <div className="clay-card p-5 border-none shadow-medium">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">Top Category</p>
              <h3 className="text-lg font-bold text-brand-text">
                {selectedCategory === 'All' ? 'Mixed' : selectedCategory}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted w-4 h-4 opacity-50" />
          <input 
            type="text" 
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="clay-input w-full pl-11 py-2.5 text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all border uppercase tracking-widest",
                selectedCategory === cat 
                  ? "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20" 
                  : "bg-brand-bg text-brand-text-muted border-brand-border hover:border-brand-primary/30"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Expense Table */}
      <div className="clay-card overflow-hidden border-none shadow-medium">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-primary/5 border-b border-brand-border">
                <th className="px-6 py-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Expense Details</th>
                <th className="px-6 py-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-brand-primary/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-bold text-brand-text">{expense.title}</p>
                      {expense.notes && <p className="text-[10px] font-bold text-brand-text-muted mt-0.5">{expense.notes}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-brand-bg text-brand-text-muted rounded-lg text-[9px] font-bold uppercase tracking-wider border border-brand-border">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-brand-text-muted text-[11px] font-bold">
                      <Calendar className="w-3.5 h-3.5 opacity-50" />
                      {(() => {
                        if (!expense.date) return 'N/A';
                        try {
                          return format(parseISO(expense.date), 'MMM dd, yyyy');
                        } catch (e) {
                          return 'Invalid Date';
                        }
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-bold text-red-500">-{expense.amount.toLocaleString()} Ks</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingExpense(expense);
                          setFormData({
                            title: expense.title,
                            amount: expense.amount.toString(),
                            date: expense.date,
                            category: expense.category,
                            notes: expense.notes || ''
                          });
                          setIsAddModalOpen(true);
                        }}
                        className="p-2 text-brand-text-muted hover:text-brand-primary hover:bg-brand-bg rounded-lg transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(expense.id)}
                        className="p-2 text-brand-text-muted hover:text-red-500 hover:bg-brand-bg rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 bg-brand-bg rounded-xl flex items-center justify-center border border-brand-border">
                        <Receipt className="w-6 h-6 text-brand-text-muted/20" />
                      </div>
                      <p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-widest">No expenses found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative clay-card w-full max-w-md p-8 animate-in zoom-in-95 duration-200 border-none shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-brand-text">{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="p-2 text-brand-text-muted hover:text-brand-text hover:bg-brand-bg rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Expense Title</label>
                <input 
                  required
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Server Hosting"
                  className="clay-input w-full py-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Amount (Ks)</label>
                  <input 
                    required
                    type="number" 
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="0"
                    className="clay-input w-full py-2.5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="clay-input w-full appearance-none py-2.5"
                  >
                    {categories.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Date</label>
                <input 
                  required
                  type="date" 
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="clay-input w-full py-2.5"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">Notes (Optional)</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional details..."
                  className="clay-input w-full h-24 resize-none py-2.5"
                />
              </div>

              <button 
                type="submit"
                className="clay-btn-primary w-full py-3 mt-4 text-xs font-bold"
              >
                {editingExpense ? 'Update Expense' : 'Save Expense'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative clay-card w-full max-w-sm p-8 animate-in zoom-in-95 duration-200 border-none shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-2">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-brand-text">Delete Expense?</h3>
              <p className="text-brand-text-muted text-sm">
                Are you sure you want to permanently delete this expense? This action cannot be undone.
              </p>
              
              <div className="flex gap-3 w-full mt-6">
                <button 
                  onClick={() => setExpenseToDelete(null)}
                  className="clay-btn flex-1 py-2.5 text-xs font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
