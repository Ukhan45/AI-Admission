'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Briefcase, Users, FileText, Send, CheckCircle2 } from 'lucide-react';

export default function ConsultantDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [generations, setGenerations] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists() || userDoc.data().role !== 'consultant') {
          router.push('/dashboard');
          return;
        }
        await fetchAssignedStudents(user.uid);
      } catch (e) {
        console.error(e);
        router.push('/dashboard');
      }
    });
    return () => unsub();
  }, [router]);

  const fetchAssignedStudents = async (consultantId: string) => {
    try {
      const q = query(collection(db, 'users'), where('assignedConsultant', '==', consultantId));
      const snap = await getDocs(q);
      const studs: any[] = [];
      snap.forEach(d => studs.push({ id: d.id, ...d.data() }));
      setStudents(studs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setFeedbackText(student.consultantNotes || '');
    // Fetch this student's generations
    try {
      const q = query(collection(db, 'generations'), where('user_id', '==', student.id));
      const snap = await getDocs(q);
      const gens: any[] = [];
      snap.forEach(d => gens.push({ id: d.id, ...d.data() }));
      setGenerations(gens);
    } catch (e) {
      console.error(e);
    }
  };

  const submitFeedback = async () => {
    if (!selectedStudent) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', selectedStudent.id), {
        consultantNotes: feedbackText
      });
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, consultantNotes: feedbackText } : s));
      alert('Feedback sent to student!');
    } catch (e) {
      console.error(e);
      alert('Failed to send feedback.');
    } finally {
      setSubmitting(false);
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
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 shadow-sm">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-['Bricolage_Grotesque',sans-serif]">Consultant Portal</h1>
            <p className="text-sm text-slate-500 font-semibold">Review your assigned students and provide guidance.</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* STUDENT LIST */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-indigo-500" />
              Assigned Students ({students.length})
            </h2>
            
            <div className="flex flex-col gap-2">
              {students.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSelectStudent(s)}
                  className={`text-left p-4 rounded-xl border transition-all ${selectedStudent?.id === s.id ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200'}`}
                >
                  <p className="font-bold text-slate-800">{s.fullName}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.email}</p>
                </button>
              ))}
              {students.length === 0 && (
                <p className="text-sm text-slate-500 italic text-center py-4">No students assigned yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* STUDENT DETAILS & FEEDBACK */}
        <div className="col-span-1 md:col-span-2 flex flex-col gap-6">
          {selectedStudent ? (
            <>
              {/* Profile Overview */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 font-['Bricolage_Grotesque',sans-serif]">{selectedStudent.fullName}</h2>
                    <p className="text-slate-500 font-semibold">{selectedStudent.email}</p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
                    Active Student
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Generated Documents ({generations.length})</h3>
                  {generations.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {generations.map(gen => (
                        <div key={gen.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-800 truncate">{gen.type.toUpperCase()} - {gen.university || 'General'}</p>
                            <p className="text-xs text-slate-500">{new Date(gen.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No documents generated yet.</p>
                  )}
                </div>

                {/* Feedback Section */}
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Consultant Feedback</h3>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Leave notes and guidance for the student here. They will see this on their dashboard..."
                    className="w-full h-32 p-4 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-700 font-medium resize-none mb-4"
                  />
                  <button 
                    onClick={submitFeedback}
                    disabled={submitting}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Sending...' : (
                      <>
                        <Send className="w-4 h-4" /> Save Feedback
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">No Student Selected</h3>
              <p className="text-slate-500 max-w-sm">Select a student from the list to view their profile, generated documents, and provide personalized feedback.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
