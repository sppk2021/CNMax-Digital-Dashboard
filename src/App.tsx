/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs,
  where,
  doc,
  setDoc,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { UserList } from './components/UserList';
import { SaleList } from './components/SaleList';
import { Analytics } from './components/Analytics';
import { PlanManagement } from './components/PlanManagement';
import { ExpenseList } from './components/ExpenseList';
import { ServerManagement } from './components/ServerManagement';
import { Settings } from './components/Settings';
import { LogIn, Loader2, Mail, Lock } from 'lucide-react';
import { handleFirestoreError, OperationType } from './utils';
import bcrypt from 'bcryptjs';

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'sales' | 'analytics' | 'plans' | 'settings' | 'expenses' | 'servers'>('dashboard');
  const [users, setUsers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('adminUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const salesQuery = query(collection(db, 'sales'), orderBy('date', 'desc'));
    const plansQuery = query(collection(db, 'plans'), orderBy('createdAt', 'desc'));
    const expensesQuery = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    const serversQuery = query(collection(db, 'servers'), orderBy('createdAt', 'desc'));

    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    const unsubscribeSales = onSnapshot(salesQuery, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sales');
    });

    const unsubscribePlans = onSnapshot(plansQuery, (snapshot) => {
      setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'plans');
    });

    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'expenses');
    });

    const unsubscribeServers = onSnapshot(serversQuery, (snapshot) => {
      setServers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'servers');
    });

    return () => {
      unsubscribeUsers();
      unsubscribeSales();
      unsubscribePlans();
      unsubscribeExpenses();
      unsubscribeServers();
    };
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    
    try {
      const adminsRef = collection(db, 'admins');
      
      // Bootstrap check: are there any admins at all?
      const allAdminsSnapshot = await getDocs(query(adminsRef, limit(1)));
      if (allAdminsSnapshot.empty) {
        // Bootstrap the first admin
        const hashedPassword = await bcrypt.hash(password, 10);
        await setDoc(doc(db, 'admins', email.toLowerCase()), {
          email: email.toLowerCase(),
          password: hashedPassword,
          role: 'admin',
          createdAt: serverTimestamp(),
          addedBy: 'system'
        });
        const userData = { email: email.toLowerCase(), role: 'admin' };
        setUser(userData);
        localStorage.setItem('adminUser', JSON.stringify(userData));
        setLoading(false);
        return;
      }

      // Normal login flow
      const q = query(adminsRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // Auto-seed the requested default admin if it doesn't exist
        if (email.toLowerCase() === 'admin@example.com' && password === 'adminpassword123') {
          const hashedPassword = await bcrypt.hash(password, 10);
          await setDoc(doc(db, 'admins', email.toLowerCase()), {
            email: email.toLowerCase(),
            password: hashedPassword,
            role: 'admin',
            createdAt: serverTimestamp(),
            addedBy: 'system'
          });
          const userData = { email: email.toLowerCase(), role: 'admin' };
          setUser(userData);
          localStorage.setItem('adminUser', JSON.stringify(userData));
          setLoading(false);
          return;
        }

        setLoginError('Invalid email or password.');
        setLoading(false);
        return;
      }

      const adminData = querySnapshot.docs[0].data();
      
      // Check bcrypt hash
      let isPasswordValid = false;
      try {
        isPasswordValid = await bcrypt.compare(password, adminData.password);
      } catch (e) {
        isPasswordValid = false;
      }

      // Fallback for plain text passwords (if they were saved before bcrypt was added)
      const isPlainTextFallback = password === adminData.password;

      if (isPasswordValid || isPlainTextFallback) {
        // Upgrade plain text password to bcrypt hash securely
        if (!isPasswordValid && isPlainTextFallback) {
          const hashedPassword = await bcrypt.hash(password, 10);
          await setDoc(doc(db, 'admins', adminData.email || email.toLowerCase()), {
            ...adminData,
            password: hashedPassword
          });
        }

        const userData = { email: adminData.email, role: adminData.role };
        setUser(userData);
        localStorage.setItem('adminUser', JSON.stringify(userData));
      } else {
        setLoginError('Invalid email or password.');
      }
    } catch (error) {
      console.error("Login Error:", error);
      setLoginError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('adminUser');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-brand-sidebar animate-spin" />
        <p className="mt-4 text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-12 shadow-2xl shadow-brand-sidebar/10 border border-slate-100 text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-3">Welcome Back</h1>
          <p className="text-slate-500 mb-10 leading-relaxed">Sign in with your credentials to access the management dashboard.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-brand-sidebar focus:ring-2 focus:ring-brand-sidebar/20 outline-none transition-all"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-brand-sidebar focus:ring-2 focus:ring-brand-sidebar/20 outline-none transition-all"
                required
              />
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-brand-sidebar hover:bg-brand-blue text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-xl shadow-brand-sidebar/20 group"
            >
              <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <Layout 
        user={user} 
        onLogout={handleLogout} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        servers={servers}
        users={users}
      >
        {activeTab === 'dashboard' && <Dashboard users={users} sales={sales} expenses={expenses} setActiveTab={setActiveTab} />}
        {activeTab === 'users' && <UserList users={users} plans={plans} sales={sales} />}
        {activeTab === 'sales' && <SaleList sales={sales} />}
        {activeTab === 'expenses' && <ExpenseList expenses={expenses} />}
        {activeTab === 'servers' && <ServerManagement servers={servers} />}
        {activeTab === 'analytics' && <Analytics users={users} sales={sales} expenses={expenses} />}
        {activeTab === 'plans' && <PlanManagement plans={plans} />}
        {activeTab === 'settings' && <Settings currentUser={user} />}
      </Layout>
    </>
  );
}
