'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Link from 'next/link';

export default function MakeMeAdmin() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [status, setStatus] = useState('Checking...');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (userDoc.exists()) {
            await updateDoc(doc(db, 'users', u.uid), { role: 'admin' });
            setStatus('Success! You are now an Admin.');
          } else {
            setStatus('User document not found in Firestore.');
          }
        } catch (e: any) {
          setStatus('Error: ' + e.message);
        }
      } else {
        setStatus('You are not logged in.');
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5]">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-[#E1F5EE] text-center">
        <h1 className="text-2xl font-bold text-[#085041] mb-4">Admin Elevation</h1>
        <p className="text-gray-600 mb-6">{status}</p>
        
        {loading ? (
          <div className="animate-spin h-6 w-6 border-4 border-[#1D9E75] border-t-transparent rounded-full mx-auto" />
        ) : (
          <Link href="/admin" className="inline-block bg-[#1D9E75] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#0F6E56]">
            Go to Admin Dashboard
          </Link>
        )}
      </div>
    </div>
  );
}
