import { collection, addDoc, serverTimestamp, updateDoc, doc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { subMonths, addDays } from 'date-fns';

export const clearAllData = async () => {
  console.log("clearAllData started");
  try {
    const collectionsToClear = ['users', 'servers', 'sales', 'expenses', 'plans'];
    
    for (const collectionName of collectionsToClear) {
      console.log(`Clearing ${collectionName}...`);
      const querySnapshot = await getDocs(collection(db, collectionName));
      const deletePromises = querySnapshot.docs.map(docSnapshot => deleteDoc(doc(db, collectionName, docSnapshot.id)));
      await Promise.all(deletePromises);
      console.log(`${collectionName} cleared.`);
    }
    
    console.log("All data cleared successfully.");
  } catch (error) {
    console.error("Error clearing data:", error);
    throw error;
  }
};

export const seedSampleData = async () => {
  console.log("seedSampleData started");
  try {
    // 1. Plans
    console.log("Seeding plans...");
    const plans = [
      { name: '1 Month', price: 5000, durationDays: 30, createdAt: new Date().toISOString() },
      { name: '3 Months', price: 14000, durationDays: 90, createdAt: new Date().toISOString() }
    ];
    for (const plan of plans) {
      await addDoc(collection(db, 'plans'), plan);
    }
    console.log("Plans seeded.");

    // 2. Servers
    console.log("Seeding servers...");
    const servers = [
      { name: 'Server A', location: 'Singapore', status: 'Online', provider: 'AWS', createdAt: new Date().toISOString(), url: 'https://server-a.com' },
      { name: 'Server B', location: 'US-East', status: 'Online', provider: 'GCP', createdAt: new Date().toISOString(), url: 'https://server-b.com' }
    ];
    for (const server of servers) {
      await addDoc(collection(db, 'servers'), server);
    }
    console.log("Servers seeded.");

    // 3. Users & Sales
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();

    let activeUsers: any[] = [];
    let userCounter = 1;

    // Generate data from January up to the current month
    for (let m = 0; m <= currentMonthIndex; m++) {
      const monthDate = new Date(currentYear, m, 15); // Middle of the month
      
      if (m === 0) {
        // January: 50 new users, 1-month plan
        for (let i = 0; i < 50; i++) {
          const user = {
            name: `User ${userCounter++}`,
            createdAt: monthDate.toISOString(),
            expiryDate: addDays(monthDate, 30).toISOString(),
            subscriptionStartDate: monthDate.toISOString(),
            status: 'Active',
            planName: '1 Month'
          };
          const docRef = await addDoc(collection(db, 'users'), user);
          activeUsers.push({ id: docRef.id, ...user });
          
          await addDoc(collection(db, 'sales'), {
            userId: docRef.id,
            userName: user.name,
            amount: 5000,
            date: monthDate.toISOString(),
            type: 'New',
            planName: '1 Month'
          });
        }
        
        // Add a couple of 3-month plan users to demonstrate the multi-month logic
        for (let i = 0; i < 5; i++) {
          const user = {
            name: `Pro User ${i + 1}`,
            createdAt: monthDate.toISOString(),
            expiryDate: addDays(monthDate, 90).toISOString(),
            subscriptionStartDate: monthDate.toISOString(),
            status: 'Active',
            planName: '3 Months'
          };
          const docRef = await addDoc(collection(db, 'users'), user);
          activeUsers.push({ id: docRef.id, ...user });
          
          await addDoc(collection(db, 'sales'), {
            userId: docRef.id,
            userName: user.name,
            amount: 14000,
            date: monthDate.toISOString(), // Full amount recorded in January
            type: 'New',
            planName: '3 Months'
          });
        }
      } else {
        // Subsequent months
        // 10 users expire
        const expiredThisMonth = activeUsers.splice(0, 10);
        for (const user of expiredThisMonth) {
          await updateDoc(doc(db, 'users', user.id), { status: 'Expired' });
          await addDoc(collection(db, 'sales'), {
            userId: user.id,
            userName: user.name,
            amount: 0,
            date: monthDate.toISOString(),
            type: 'Expired'
          });
        }

        // Remaining users renew (only if their expiry date is within or before this month)
        for (const user of activeUsers) {
          const expiryDate = new Date(user.expiryDate);
          if (expiryDate <= addDays(monthDate, 15)) { // If expiring around this month
            const planDuration = user.planName === '3 Months' ? 90 : 30;
            const planPrice = user.planName === '3 Months' ? 14000 : 5000;
            const newExpiry = addDays(monthDate, planDuration).toISOString();
            
            await updateDoc(doc(db, 'users', user.id), {
              expiryDate: newExpiry,
              lastRenewedAt: monthDate.toISOString(),
              status: 'Active'
            });
            user.expiryDate = newExpiry; // update local state

            await addDoc(collection(db, 'sales'), {
              userId: user.id,
              userName: user.name,
              amount: planPrice,
              date: monthDate.toISOString(),
              type: 'Renewal',
              planName: user.planName
            });
          }
        }

        // 10 new users join
        for (let i = 0; i < 10; i++) {
          const user = {
            name: `User ${userCounter++}`,
            createdAt: monthDate.toISOString(),
            expiryDate: addDays(monthDate, 30).toISOString(),
            subscriptionStartDate: monthDate.toISOString(),
            status: 'Active',
            planName: '1 Month'
          };
          const docRef = await addDoc(collection(db, 'users'), user);
          activeUsers.push({ id: docRef.id, ...user });
          
          await addDoc(collection(db, 'sales'), {
            userId: docRef.id,
            userName: user.name,
            amount: 5000,
            date: monthDate.toISOString(),
            type: 'New',
            planName: '1 Month'
          });
        }
      }
    }

    console.log("Sample data seeded successfully.");
  } catch (error) {
    console.error("Error seeding data:", error);
    throw error;
  }
};
