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
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check if user is an admin
        try {
          const adminDocRef = doc(db, 'admins', firebaseUser.email?.toLowerCase() || '');
          const adminDocSnap = await getDoc(adminDocRef);
          
          if (adminDocSnap.exists() || firebaseUser.email === 'sawpyaephyokyaw777@gmail.com') {
            setUser({
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              uid: firebaseUser.uid,
              role: 'admin'
            });
          } else {
            setLoginError('You do not have admin access.');
            await signOut(auth);
            setUser(null);
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          setLoginError('Error verifying access.');
          await signOut(auth);
          setUser(null);
        }
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

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const formattedUsername = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!formattedUsername) {
        throw new Error("Invalid username. Please use alphanumeric characters.");
      }
      const fakeEmail = `${formattedUsername}@cnmax.local`;

      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, password);
        await updateProfile(userCredential.user, { displayName: username.trim() });
        // Automatically grant admin access to newly created accounts
        await setDoc(doc(db, 'admins', fakeEmail), {
          email: fakeEmail,
          createdAt: new Date().toISOString(),
          role: 'admin'
        });
      } else {
        await signInWithEmailAndPassword(auth, fakeEmail, password);
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      setLoginError(error.message || 'An error occurred during authentication.');
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoginError('');
    setLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login Error:", error);
      setLoginError(error.message || 'An error occurred during sign in.');
      setLoading(false);
    }
  };

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
      <div className="min-h-screen bg-brand-bg flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Branding/Visual */}
        <div className="hidden md:flex md:w-1/2 bg-brand-primary p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20">
              <img 
                src="https://uploads.onecompiler.io/442aqr2uj/44gkkjfhk/CNMAXDIGITAL2.0.jpg" 
                alt="Logo" 
                className="w-10 h-10 rounded-xl object-contain brightness-0 invert"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="text-5xl font-black text-white leading-tight tracking-tighter mb-4">
              Manage your <br />
              <span className="text-white/60">Digital Empire.</span>
            </h1>
            <p className="text-white/70 text-lg max-w-md leading-relaxed">
              The all-in-one dashboard for CNMAX Digital administrators to track sales, manage users, and monitor infrastructure.
            </p>
          </div>
          
          <div className="relative z-10 flex items-center gap-4 text-white/50 text-sm font-bold uppercase tracking-widest">
            <span>© 2026 CNMAX Digital</span>
            <span className="w-1 h-1 bg-white/20 rounded-full" />
            <span>v2.0.0</span>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="flex-1 flex items-center justify-center p-8 bg-brand-bg relative">
          <button 
            onClick={toggleDarkMode}
            className="absolute top-8 right-8 p-3 bg-brand-card rounded-full shadow-soft hover:shadow-medium transition-all text-brand-text-muted hover:text-brand-primary"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="max-w-md w-full">
            <div className="md:hidden flex justify-center mb-8">
              <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center shadow-lg">
                <img 
                  src="https://uploads.onecompiler.io/442aqr2uj/44gkkjfhk/CNMAXDIGITAL2.0.jpg" 
                  alt="Logo" 
                  className="w-10 h-10 rounded-xl object-contain brightness-0 invert"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div className="mb-10">
              <h2 className="text-3xl font-bold text-brand-text mb-2">
                {isSignUp ? 'Create Admin Account' : 'Welcome Back'}
              </h2>
              <p className="text-brand-text-muted">
                {isSignUp ? 'Join the administration team.' : 'Sign in to your dashboard.'}
              </p>
            </div>
            
            {loginError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm mb-6 border border-red-100 dark:border-red-900/30 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                {loginError}
              </div>
            )}
            
            <form onSubmit={handleEmailAuth} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-2 ml-1">Username</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-muted group-focus-within:text-brand-primary transition-colors" />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="clay-input w-full pl-12 py-4"
                    placeholder="admin"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-2 ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-muted group-focus-within:text-brand-primary transition-colors" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="clay-input w-full pl-12 py-4"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="clay-btn-primary w-full py-4 text-base font-bold flex items-center justify-center gap-3"
              >
                {isSignUp ? 'Create Account' : 'Sign In'}
                <LogIn className="w-5 h-5" />
              </button>
            </form>

            <div className="relative flex items-center justify-center my-8">
              <div className="absolute inset-x-0 h-px bg-brand-border"></div>
              <span className="relative bg-brand-bg px-4 text-xs font-bold text-brand-text-muted uppercase tracking-widest">OR</span>
            </div>

            <button
              onClick={handleLogin}
              type="button"
              className="clay-btn w-full py-4 flex items-center justify-center gap-3 group"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              Sign In with Google
            </button>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setLoginError('');
                }}
                className="text-sm text-brand-text-muted hover:text-brand-primary font-bold transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </div>
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
