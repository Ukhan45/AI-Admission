'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Users, ShieldAlert, CheckCircle2, ChevronDown } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [consultants, setConsultants] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      // Check if admin
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists() || userDoc.data().role !== 'admin') {
          router.push('/dashboard');
          return;
        }
        await fetchData();
      } catch (e) {
        console.error(e);
        router.push('/dashboard');
      }
    });
    return () => unsub();
  }, [router]);

  const fetchData = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const allUsers: any[] = [];
      const cons: any[] = [];
      const studs: any[] = [];
      
      snap.forEach(d => {
        const data = d.data();
        allUsers.push({ id: d.id, ...data });
        if (data.role === 'consultant') cons.push({ id: d.id, ...data });
        if (data.role === 'student' || !data.role) studs.push({ id: d.id, ...data });
      });
      
      setUsers(allUsers);
      setConsultants(cons);
      setStudents(studs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const assignConsultant = async (studentId: string, consultantId: string) => {
    try {
      await updateDoc(doc(db, 'users', studentId), {
        assignedConsultant: consultantId || null
      });
      // update local state
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, assignedConsultant: consultantId || null } : s));
    } catch (e) {
      console.error('Failed to assign consultant:', e);
      alert('Failed to assign consultant');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5]">
        <div className="animate-spin h-8 w-8 border-4 border-[#1D9E75] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-['Nunito',sans-serif]">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500 border border-red-100 shadow-sm">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-['Bricolage_Grotesque',sans-serif]">Admin Control Center</h1>
            <p className="text-sm text-slate-500 font-semibold">Manage system users and assignments</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 flex flex-col gap-8">
        
        {/* STATS */}
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: 'Total Users', value: users.length, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
            { label: 'Total Students', value: students.length, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'Total Consultants', value: consultants.length, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' }
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-6 border ${s.border} bg-white shadow-sm flex items-center gap-4`}>
              <div className={`w-14 h-14 rounded-full ${s.bg} flex items-center justify-center ${s.color}`}>
                <Users className="w-7 h-7" />
              </div>
              <div>
                <p className="text-3xl font-black text-slate-800">{s.value}</p>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ASSIGNMENTS */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">Student Assignments</h2>
            <p className="text-sm text-slate-500">Assign verified consultants to students.</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 border-b border-slate-200">Student Name</th>
                  <th className="p-4 border-b border-slate-200">Email</th>
                  <th className="p-4 border-b border-slate-200">Joined</th>
                  <th className="p-4 border-b border-slate-200">Assigned Consultant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{s.fullName || 'No Name'}</p>
                      <p className="text-xs text-slate-400">UID: {s.id.slice(0, 8)}...</p>
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-600">{s.email}</td>
                    <td className="p-4 text-sm font-medium text-slate-500">
                      {s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                    </td>
                    <td className="p-4">
                      <div className="relative">
                        <select 
                          className="appearance-none w-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
                          value={s.assignedConsultant || ''}
                          onChange={(e) => assignConsultant(s.id, e.target.value)}
                        >
                          <option value="">-- Unassigned --</option>
                          {consultants.map(c => (
                            <option key={c.id} value={c.id}>{c.fullName} ({c.email})</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500 font-medium">
                      No students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
