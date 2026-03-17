import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { subMonths, addDays } from 'date-fns';

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
    const month0 = subMonths(now, 2);
    const month1 = subMonths(now, 1);

    // Month 0: 100 users
    const usersM0: any[] = [];
    for (let i = 0; i < 100; i++) {
      const user = {
        name: `User ${i + 1}`,
        createdAt: month0.toISOString(),
        expiryDate: addDays(month0, 30).toISOString(),
        subscriptionStartDate: month0.toISOString(),
        status: 'Active'
      };
      const docRef = await addDoc(collection(db, 'users'), user);
      usersM0.push({ id: docRef.id, ...user });
      
      await addDoc(collection(db, 'sales'), {
        userId: docRef.id,
        userName: user.name,
        amount: 5000,
        date: month0.toISOString(),
        type: 'New',
        planName: '1 Month'
      });
    }

    // Month 1: 95 renew, 5 expire, 10 new
    const renewed = usersM0.slice(0, 95);
    const expired = usersM0.slice(95);

    for (const user of renewed) {
      await updateDoc(doc(db, 'users', user.id), {
        expiryDate: addDays(month1, 30).toISOString(),
        lastRenewedAt: month1.toISOString()
      });
      await addDoc(collection(db, 'sales'), {
        userId: user.id,
        userName: user.name,
        amount: 5000,
        date: month1.toISOString(),
        type: 'Renewal',
        planName: '1 Month'
      });
    }
    for (const user of expired) {
      await updateDoc(doc(db, 'users', user.id), { status: 'Expired' });
      await addDoc(collection(db, 'sales'), {
        userId: user.id,
        userName: user.name,
        amount: 0,
        date: month1.toISOString(),
        type: 'Expired'
      });
    }
    for (let i = 0; i < 10; i++) {
      const user = {
        name: `New User ${i + 1}`,
        createdAt: month1.toISOString(),
        expiryDate: addDays(month1, 30).toISOString(),
        subscriptionStartDate: month1.toISOString(),
        status: 'Active'
      };
      await addDoc(collection(db, 'users'), user);
    }

    // Month 2: All active renew, 3 new
    // (Simplified for brevity, can be expanded)
    
    console.log("Sample data seeded successfully.");
  } catch (error) {
    console.error("Error seeding data:", error);
    throw error;
  }
};
