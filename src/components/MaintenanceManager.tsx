import { useEffect } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getStatus, handleFirestoreError, OperationType, getNow } from '../utils';

interface MaintenanceManagerProps {
  users: any[];
  sales: any[];
}

export function MaintenanceManager({ users, sales }: MaintenanceManagerProps) {
  useEffect(() => {
    const runMaintenance = async () => {
      const now = getNow();
      
      for (const user of users) {
        const currentStatus = getStatus(user.expiryDate, user.subscriptionStartDate);
        
        // If user is expired according to logic but active in Firestore
        if (currentStatus === 'Expired' && user.status === 'Active') {
          try {
            // 1. Update user status in Firestore
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, {
              status: 'Expired'
            }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${user.id}`));

            // 2. Check if an EXPIRED event already exists for this expiry cycle
            // We look for any 'Expired' event for this user that happened after their expiry date
            const hasExpiredEvent = sales.some(s => 
              s.userId === user.id && 
              s.type === 'Expired' && 
              new Date(s.date) >= new Date(user.expiryDate)
            );

            if (!hasExpiredEvent) {
              // 3. Log EXPIRED event
              await addDoc(collection(db, 'sales'), {
                userId: user.id,
                userName: user.name,
                date: user.expiryDate, // Log it at the exact expiry time
                amount: 0,
                type: 'Expired',
                notes: 'System auto-expiry'
              }).catch(e => handleFirestoreError(e, OperationType.CREATE, 'sales'));
              
              console.log(`Logged EXPIRED event for user: ${user.name}`);
            }
          } catch (error) {
            console.error(`Maintenance failed for user ${user.name}:`, error);
          }
        }
      }
    };

    if (users.length > 0) {
      runMaintenance();
    }
  }, [users, sales]);

  return null; // This component doesn't render anything
}
