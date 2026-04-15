import { collection, addDoc, updateDoc, doc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { addDays, format, startOfMonth, addMonths, subDays } from 'date-fns';

export const clearAllData = async () => {
  console.log("clearAllData started");
  try {
    const collectionsToClear = ['users', 'servers', 'sales', 'expenses', 'plans', 'admins'];
    
    for (const collectionName of collectionsToClear) {
      if (collectionName === 'admins') continue; // Keep admins so we don't lock ourselves out
      
      console.log(`Clearing ${collectionName}...`);
      const querySnapshot = await getDocs(collection(db, collectionName));
      
      // Use batches for efficiency
      const chunks = [];
      for (let i = 0; i < querySnapshot.docs.length; i += 500) {
        chunks.push(querySnapshot.docs.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(docSnapshot => {
          batch.delete(doc(db, collectionName, docSnapshot.id));
        });
        await batch.commit();
      }
      console.log(`${collectionName} cleared.`);
    }
    
    console.log("All data cleared successfully.");
  } catch (error) {
    console.error("Error clearing data:", error);
    throw error;
  }
};

const NAMES = [
  'Aung Aung', 'Kyaw Kyaw', 'Mya Mya', 'Hla Hla', 'Zaw Zaw', 
  'Thida', 'Phyu Phyu', 'Wai Yan', 'Min Min', 'Su Su',
  'Tun Tun', 'Aye Aye', 'Nilar', 'Zarni', 'Thet Thet',
  'Ko Ko', 'Ma Ma', 'Bo Bo', 'Lin Lin', 'Nan Nan',
  'Facebook User', 'Messenger Client', 'Viber User', 'Telegram User',
  'Premium Client', 'VIP User', 'Business Partner', 'Regular User'
];

const getRandomName = (index: number) => {
  const baseName = NAMES[index % NAMES.length];
  const suffix = Math.floor(index / NAMES.length);
  return suffix > 0 ? `${baseName} ${suffix + 1}` : baseName;
};

export const seedSampleData = async () => {
  console.log("seedSampleData started");
  try {
    // 1. Plans
    console.log("Seeding plans...");
    const planData = [
      { name: '1 Month', price: 5000, durationDays: 30, createdAt: new Date().toISOString() },
      { name: '3 Months', price: 14000, durationDays: 90, createdAt: new Date().toISOString() }
    ];
    const planRefs: Record<string, string> = {};
    for (const plan of planData) {
      const docRef = await addDoc(collection(db, 'plans'), plan);
      planRefs[plan.name] = docRef.id;
    }
    console.log("Plans seeded.");

    // 2. Servers
    console.log("Seeding servers...");
    const servers = [
      { name: 'Premium SG-1', location: 'Singapore', status: 'Online', provider: 'DigitalOcean', createdAt: new Date().toISOString(), url: 'sg1.cnmax.net' },
      { name: 'Premium SG-2', location: 'Singapore', status: 'Online', provider: 'Linode', createdAt: new Date().toISOString(), url: 'sg2.cnmax.net' },
      { name: 'US-West VIP', location: 'USA', status: 'Online', provider: 'AWS', createdAt: new Date().toISOString(), url: 'us1.cnmax.net' }
    ];
    for (const server of servers) {
      await addDoc(collection(db, 'servers'), server);
    }
    console.log("Servers seeded.");

    // 3. Users & Sales Flow
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();

    let activeUsers: any[] = [];
    let userCounter = 0;

    // Generate data from January up to the current month
    for (let m = 0; m <= currentMonthIndex; m++) {
      const monthDate = new Date(currentYear, m, 1); // Start of the month
      const saleDate = new Date(currentYear, m, 5); // Sale happened on the 5th
      
      if (m === 0) {
        // JANUARY: 50 new users
        // 40 users with 1-month plan
        // 10 users with 3-month plan
        for (let i = 0; i < 50; i++) {
          const isThreeMonth = i >= 40;
          const planName = isThreeMonth ? '3 Months' : '1 Month';
          const planPrice = isThreeMonth ? 14000 : 5000;
          const durationDays = isThreeMonth ? 90 : 30;
          
          const user = {
            name: getRandomName(userCounter++),
            createdAt: monthDate.toISOString(),
            expiryDate: addDays(monthDate, durationDays).toISOString(),
            subscriptionStartDate: monthDate.toISOString(),
            status: 'Active',
            planName: planName
          };
          const docRef = await addDoc(collection(db, 'users'), user);
          activeUsers.push({ id: docRef.id, ...user });
          
          await addDoc(collection(db, 'sales'), {
            userId: docRef.id,
            userName: user.name,
            amount: planPrice, // Full amount recorded in the month of purchase
            date: saleDate.toISOString(),
            type: 'New',
            planName: planName
          });
        }
      } else {
        // SUBSEQUENT MONTHS (Feb onwards)
        
        // 1. Handle Expirations (10 users expire every month)
        // We take 10 users who are due to expire and mark them as expired
        const expiredThisMonth = activeUsers.splice(0, 10);
        for (const user of expiredThisMonth) {
          await updateDoc(doc(db, 'users', user.id), { 
            status: 'Expired',
            expiryDate: monthDate.toISOString() 
          });
        }

        // 2. Handle Renewals (Remaining users who are expiring this month or already expired renew)
        for (const user of activeUsers) {
          const currentExpiry = new Date(user.expiryDate);
          const endOfMonth = new Date(currentYear, m + 1, 0);
          
          // If their expiry is before the end of this month, they renew
          if (currentExpiry <= endOfMonth) {
            const isThreeMonth = user.planName === '3 Months';
            const planDuration = isThreeMonth ? 90 : 30;
            const planPrice = isThreeMonth ? 14000 : 5000;
            
            const newExpiry = addDays(currentExpiry, planDuration).toISOString();
            
            await updateDoc(doc(db, 'users', user.id), {
              expiryDate: newExpiry,
              lastRenewedAt: monthDate.toISOString(),
              status: 'Active'
            });
            user.expiryDate = newExpiry; // update local state for next month's loop

            await addDoc(collection(db, 'sales'), {
              userId: user.id,
              userName: user.name,
              amount: planPrice,
              date: saleDate.toISOString(),
              type: 'Renewal',
              planName: user.planName
            });
          }
        }

        // 3. Handle New Users (10 new users join every month)
        for (let i = 0; i < 10; i++) {
          const user = {
            name: getRandomName(userCounter++),
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
            date: saleDate.toISOString(),
            type: 'New',
            planName: '1 Month'
          });
        }
      }
    }

    // 4. Expenses (Add some sample expenses)
    console.log("Seeding expenses...");
    const expenseCategories = ['Server Cost', 'Marketing', 'API Fees', 'Maintenance'];
    for (let m = 0; m <= currentMonthIndex; m++) {
      const monthDate = new Date(currentYear, m, 20);
      await addDoc(collection(db, 'expenses'), {
        category: expenseCategories[m % expenseCategories.length],
        amount: 25000 + (Math.random() * 10000),
        date: monthDate.toISOString(),
        description: `Monthly ${expenseCategories[m % expenseCategories.length]}`
      });
    }

    console.log("Sample data seeded successfully.");
  } catch (error) {
    console.error("Error seeding data:", error);
    throw error;
  }
};
