/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  doc,
  getDocFromServer,
  addDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { UserList } from './components/UserList';
import { SaleList } from './components/SaleList';
import { Analytics } from './components/Analytics';
import { PlanManagement } from './components/PlanManagement';
import { ExpenseList } from './components/ExpenseList';
import { ServerManagement } from './components/ServerManagement';
import { MaintenanceManager } from './components/MaintenanceManager';
import { Settings } from './components/Settings';
import { LogIn, LogOut, Loader2, ShieldAlert, ShieldCheck, Mail, Lock } from 'lucide-react';
import { handleFirestoreError, OperationType } from './utils';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
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
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setIsAdmin(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const adminsRef = collection(db, 'admins');
    const q = query(adminsRef);
    
    const unsubscribeAdmins = onSnapshot(q, (snapshot) => {
      const adminList = snapshot.docs.map(doc => doc.data().email.toLowerCase());
      
      // Bootstrap: If no admins exist, the first person to log in becomes an admin
      if (snapshot.empty && user.email) {
        setDoc(doc(db, 'admins', user.email.toLowerCase()), {
          email: user.email.toLowerCase(),
          role: 'admin',
          createdAt: serverTimestamp(),
          addedBy: 'system'
        }).catch(e => {
          console.error("Bootstrap Admin Error:", e);
        });
        setIsAdmin(true);
      } else {
        setIsAdmin(adminList.includes(user.email?.toLowerCase() || ''));
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error (admins listener):", error);
      handleFirestoreError(error, OperationType.LIST, 'admins');
    });

    return () => unsubscribeAdmins();
  }, [user]);

  useEffect(() => {
    if (!user || !isAdmin) return;

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

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return () => {
      unsubscribeUsers();
      unsubscribeSales();
      unsubscribePlans();
      unsubscribeExpenses();
      unsubscribeServers();
    };
  }, [user, isAdmin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Login Error:", error);
      setLoginError('Invalid email or password.');
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-4">
        <div className="w-24 h-24 bg-brand-sidebar/10 rounded-3xl flex items-center justify-center mb-8 animate-pulse">
          <img 
            src="https://uploads.onecompiler.io/442aqr2uj/44gkkjfhk/CNMAXDIGITAL2.0.jpg" 
            alt="CNMAX DIGITAL" 
            className="h-14 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <Loader2 className="w-8 h-8 text-brand-sidebar animate-spin" />
        <p className="mt-4 text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-12 shadow-2xl shadow-brand-sidebar/10 border border-slate-100 text-center">
          <div className="w-24 h-24 bg-brand-sidebar/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <img 
              src="https://uploads.onecompiler.io/442aqr2uj/44gkkjfhk/CNMAXDIGITAL2.0.jpg" 
              alt="CNMAX DIGITAL" 
              className="h-14 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
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
          
          <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-center gap-6 opacity-40 grayscale">
            <span className="text-[10px] font-bold uppercase tracking-widest">Secure Access</span>
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-12 shadow-2xl shadow-red-500/10 border border-red-50 border-t-4 border-t-red-500 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-3">Access Restricted</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Your account (<span className="font-bold text-slate-700">{user.email}</span>) is not authorized to access this dashboard.
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-500 mb-8 text-left">
            <p className="font-bold text-slate-700 mb-1">What can I do?</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Contact a system administrator to request access.</li>
              <li>Ensure you are logged in with the correct email.</li>
            </ul>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 px-6 rounded-2xl transition-all duration-300"
          >
            <LogOut className="w-5 h-5" />
            Sign Out & Try Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <MaintenanceManager users={users} sales={sales} />
      <Layout 
        user={user} 
        onLogout={handleLogout} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
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
