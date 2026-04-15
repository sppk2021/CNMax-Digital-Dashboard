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
  getDoc,
  where,
  doc,
  setDoc,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInAnonymously } from 'firebase/auth';
import { db, auth } from './firebase';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { UserList } from './components/UserList';
import { SaleList } from './components/SaleList';
import { Analytics } from './components/Analytics';
import { PlanManagement } from './components/PlanManagement';
import { ExpenseList } from './components/ExpenseList';
import { ServerManagement } from './components/ServerManagement';
import { Settings } from './components/Settings';
import { MaintenanceManager } from './components/MaintenanceManager';
import { LogIn, Loader2, User, Lock, Sun, Moon, AlertTriangle } from 'lucide-react';
import { handleFirestoreError, OperationType } from './utils';
import { clearAllData } from './utils/seedData';

import { Toaster } from 'react-hot-toast';

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'sales' | 'analytics' | 'plans' | 'settings' | 'expenses' | 'servers'>('dashboard');
  const [users, setUsers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [loginError, setLoginError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  useEffect(() => {
    // Clear data once as requested
    const clearDataOnce = async () => {
      if (localStorage.getItem('dataClearedOnce') !== 'true') {
        try {
          await clearAllData();
          localStorage.setItem('dataClearedOnce', 'true');
          console.log('All data cleared successfully as requested.');
        } catch (error) {
          console.error('Failed to clear data:', error);
        }
      }
    };
    clearDataOnce();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, username.trim(), password);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setLoginError('We couldn\'t find an account with that email and password combination. Please try again.');
        setUsername('');
        setPassword('');
      } else if (error.code === 'auth/operation-not-allowed') {
        setLoginError('Email/Password login is not enabled in Firebase Authentication.');
      } else {
        setLoginError('Failed to sign in. Please check your connection and try again.');
      }
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const email = username.trim();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: email.split('@')[0]
      });
      // Add user to Firestore users collection
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: email,
        role: 'admin',
        createdAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setLoginError('An account with this email already exists.');
      } else if (error.code === 'auth/weak-password') {
        setLoginError('Password should be at least 6 characters.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setLoginError('Email/Password signup is not enabled in Firebase Authentication.');
      } else {
        setLoginError(error.message || 'Error creating account');
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Admin',
          photoURL: firebaseUser.photoURL,
          uid: firebaseUser.uid,
          role: 'admin'
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
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
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <div className="clay-card w-full max-w-md p-10 border-none shadow-clay bg-brand-card">
          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mb-6 shadow-clay overflow-hidden p-2">
              <img 
                src="https://uploads.onecompiler.io/442aqr2uj/44gkkjfhk/CNMAXDIGITAL2.0.jpg" 
                alt="CN MAX DIGITAL" 
                className="w-full h-full object-contain rounded-2xl"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="text-3xl font-black text-brand-text tracking-tight">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-brand-text-muted text-xs font-bold uppercase tracking-widest mt-3 opacity-70">
              {isSignUp ? 'Join the VPN management platform' : 'Sign in to your dashboard'}
            </p>
          </div>

          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-6">
            {loginError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-600 text-xs font-bold leading-relaxed">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{loginError}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">
                Email Address
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-muted opacity-50" />
                <input
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="clay-input w-full pl-12 pr-4 py-4 text-sm"
                  placeholder="admin@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-muted opacity-50" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="clay-input w-full pl-12 pr-4 py-4 text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="clay-btn-primary w-full py-4 flex items-center justify-center gap-3 mt-8 text-sm font-bold shadow-lg shadow-brand-primary/20"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </>
              )}
            </button>
            
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setLoginError('');
                }}
                className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:underline"
              >
                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <MaintenanceManager users={users} sales={sales} />
      <Layout 
        user={user} 
        onLogout={handleLogout} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        servers={servers}
        users={users}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      >
        {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
        {activeTab === 'users' && <UserList users={users} plans={plans} sales={sales} />}
        {activeTab === 'sales' && <SaleList sales={sales} />}
        {activeTab === 'expenses' && <ExpenseList expenses={expenses} />}
        {activeTab === 'servers' && <ServerManagement servers={servers} />}
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'plans' && <PlanManagement plans={plans} />}
        {activeTab === 'settings' && (
          <Settings 
            currentUser={user} 
            users={users}
            plans={plans}
            servers={servers}
            sales={sales}
            expenses={expenses}
          />
        )}
      </Layout>
    </>
  );
}
