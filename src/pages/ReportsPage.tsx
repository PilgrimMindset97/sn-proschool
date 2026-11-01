import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { LoadingSpinner } from '../components/ui';
import { Printer, FileText, Users, CreditCard, CalendarCheck } from 'lucide-react';

export default function ReportsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(0);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, late: 0 });
  const [byCycle, setByCycle] = useState<Record<string, number>>({});

  const estId = profile?.establishment_id;

  useEffect(() => { loadReport(); }, [estId]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const filter = estId && profile?.role !== 'super_admin' ? { establishment_id: estId } : {};
      const [studentsRes, paymentsRes, attRes] = await Promise.all([
        supabase.from('students').select('cycle', { count: 'exact' }).match(filter),
        supabase.from('payments').select('montant').match({ ...filter, status: 'validé' }),
        supabase.from('attendance').select('statut').match(filter),
      ]);

      setStudentCount(studentsRes.count || 0);
      setPaymentTotal(paymentsRes.data?.reduce((s, p) => s + Number(p.montant || 0), 0) || 0);
      const att = attRes.data || [];
      setAttendanceStats({
        present: att.filter((a) => a.statut === 'Présent').length,
        absent: att.filter((a) => a.statut === 'Absent').length,
        late: att.filter((a) => a.statut === 'En retard').length,
      });

      const cycleCounts: Record<string, number> = {};
      (studentsRes.data || []).forEach((s) => { cycleCounts[s.cycle] = (cycleCounts[s.cycle] || 0) + 1; });
      setByCycle(cycleCounts);
    } catch (e: unknown) { console.error('Report error:', e); }
    finally { setLoading(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4 print-area">
      <div className="no-print flex justify-end">
        <button onClick={() => window.print()} className="btn-secondary"><Printer className="w-4 h-4" /> Imprimer</button>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Rapport général de l'établissement</h2>
        <p className="text-sm text-slate-500 mb-6">Généré le {new Date().toLocaleDateString('fr-FR', { dateStyle: 'full' })}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg"><Users className="w-6 h-6 text-blue-600 mb-2" /><p className="text-sm text-slate-600">Élèves inscrits</p><p className="text-2xl font-bold text-slate-800">{studentCount}</p></div>
          <div className="p-4 bg-green-50 rounded-lg"><CreditCard className="w-6 h-6 text-green-600 mb-2" /><p className="text-sm text-slate-600">Total encaissé</p><p className="text-2xl font-bold text-slate-800">{paymentTotal.toLocaleString('fr-FR')}</p></div>
          <div className="p-4 bg-amber-50 rounded-lg"><CalendarCheck className="w-6 h-6 text-amber-600 mb-2" /><p className="text-sm text-slate-600">Présences</p><p className="text-2xl font-bold text-slate-800">{attendanceStats.present}</p></div>
          <div className="p-4 bg-red-50 rounded-lg"><CalendarCheck className="w-6 h-6 text-red-600 mb-2" /><p className="text-sm text-slate-600">Absences</p><p className="text-2xl font-bold text-slate-800">{attendanceStats.absent}</p></div>
        </div>

        <h3 className="font-semibold text-slate-700 mb-3">Effectifs par cycle</h3>
        <table className="table-base">
          <thead><tr><th>Cycle</th><th>Effectif</th><th>Pourcentage</th></tr></thead>
          <tbody>
            {Object.entries(byCycle).map(([cycle, count]) => (
              <tr key={cycle}><td className="font-medium">{cycle}</td><td>{count}</td><td>{studentCount > 0 ? ((count / studentCount) * 100).toFixed(1) : 0}%</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
