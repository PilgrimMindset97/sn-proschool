import { useEffect, useState } from 'react';
import { useAuth, canManageAttendance } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { useToast, LoadingSpinner, EmptyState } from '../components/ui';
import type { Student, Attendance } from '../types';
import { Plus, Search, Printer } from 'lucide-react';

const STATUS_OPTIONS = ['Présent', 'Absent', 'En retard', 'Absence justifiée'];

export default function AttendancePage() {
  const { profile } = useAuth();
  const { showToast, toastEl } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [statutFilter, setStatutFilter] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('Présent');

  const canEdit = canManageAttendance(profile?.role);
  const estId = profile?.establishment_id;

  useEffect(() => { loadStudents(); loadRecords(); }, [estId, search, date, statutFilter]);

  const loadStudents = async () => {
    let q = supabase.from('students').select('*').eq('active', true).order('nom');
    if (estId && profile?.role !== 'super_admin') q = q.eq('establishment_id', estId);
    if (search) q = q.or(`nom.ilike.%${search}%,prenom.ilike.%${search}%,matricule.ilike.%${search}%`);
    const { data } = await q;
    setStudents(data || []);
  };

  const loadRecords = async () => {
    setLoading(true);
    let q = supabase.from('attendance').select('*').eq('date_presence', date).order('created_at', { ascending: false });
    if (estId && profile?.role !== 'super_admin') q = q.eq('establishment_id', estId);
    if (statutFilter) q = q.eq('statut', statutFilter);
    const { data } = await q;
    setRecords(data || []);
    setLoading(false);
  };

  const recordAttendance = async (studentId: string, statut: string, motif?: string) => {
    try {
      const student = students.find((s) => s.id === studentId);
      if (!student) return;
      const existing = records.find((r) => r.student_id === studentId && r.date_presence === date);
      if (existing) {
        const { error } = await supabase.from('attendance').update({ statut, motif: motif || null }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('attendance').insert({
          establishment_id: student.establishment_id, student_id: studentId, date_presence: date, statut, motif: motif || null,
        });
        if (error) throw error;
      }
      showToast('Présence enregistrée');
      loadRecords();
    } catch (e: unknown) { showToast('Erreur: ' + (e as Error).message, 'error'); }
  };

  const handleBulkPointage = async () => {
    try {
      for (const s of students) {
        await recordAttendance(s.id, bulkStatus);
      }
      showToast('Pointage en masse terminé');
    } catch (e: unknown) { showToast('Erreur: ' + (e as Error).message, 'error'); }
  };

  const getStudentStatus = (studentId: string) => {
    const rec = records.find((r) => r.student_id === studentId && r.date_presence === date);
    return rec?.statut || null;
  };

  const present = records.filter((r) => r.statut === 'Présent').length;
  const absent = records.filter((r) => r.statut === 'Absent').length;
  const late = records.filter((r) => r.statut === 'En retard').length;
  const justified = records.filter((r) => r.statut === 'Absence justifiée').length;

  return (
    <div className="space-y-4">
      {toastEl}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4"><p className="text-sm text-slate-500">Présents</p><p className="text-2xl font-bold text-green-600">{present}</p></div>
        <div className="card p-4"><p className="text-sm text-slate-500">Absents</p><p className="text-2xl font-bold text-red-600">{absent}</p></div>
        <div className="card p-4"><p className="text-sm text-slate-500">Retards</p><p className="text-2xl font-bold text-amber-600">{late}</p></div>
        <div className="card p-4"><p className="text-sm text-slate-500">Abs. justifiées</p><p className="text-2xl font-bold text-blue-600">{justified}</p></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input max-w-[180px]" />
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
          </div>
          <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)} className="input max-w-[150px]">
            <option value="">Tous</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {canEdit && (
          <button onClick={() => setBulkMode(!bulkMode)} className="btn-secondary">
            {bulkMode ? 'Fermer le pointage masse' : 'Pointage en masse'}
          </button>
        )}
      </div>

      {bulkMode && canEdit && (
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">Marquer tous les élèves comme:</span>
          <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="input max-w-[200px]">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={handleBulkPointage} className="btn-primary"><Plus className="w-4 h-4" /> Appliquer à tous</button>
        </div>
      )}

      {loading ? <LoadingSpinner /> : students.length === 0 ? (
        <div className="card p-6"><EmptyState message="Aucun élève trouvé" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Matricule</th><th>Nom</th><th>Classe</th><th>Statut du {new Date(date).toLocaleDateString('fr-FR')}</th><th className="no-print">Actions</th></tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const status = getStudentStatus(s.id);
                return (
                  <tr key={s.id}>
                    <td className="font-mono text-xs">{s.matricule}</td>
                    <td className="font-medium">{s.nom} {s.prenom}</td>
                    <td>{s.classe}</td>
                    <td>
                      {status ? (
                        <span className={`badge ${status === 'Présent' ? 'bg-green-100 text-green-700' : status === 'Absent' ? 'bg-red-100 text-red-700' : status === 'En retard' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{status}</span>
                      ) : <span className="text-slate-400 text-sm">Non pointé</span>}
                    </td>
                    <td className="no-print">
                      {canEdit && (
                        <div className="flex gap-1">
                          {STATUS_OPTIONS.map((opt) => (
                            <button key={opt} onClick={() => recordAttendance(s.id, opt)}
                              className={`px-2 py-1 rounded text-xs font-medium transition ${status === opt ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                              {opt === 'Présent' ? 'P' : opt === 'Absent' ? 'A' : opt === 'En retard' ? 'R' : 'J'}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
