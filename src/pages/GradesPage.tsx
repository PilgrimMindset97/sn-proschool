import { useEffect, useState } from 'react';
import { useAuth, canManageGrades } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { Modal, useToast, LoadingSpinner, EmptyState } from '../components/ui';
import type { Student, Grade, CycleType } from '../types';
import { CYCLES, CYCLE_LEVELS, DEFAULT_SUBJECTS } from '../types';
import { Plus, Search, Printer, Calculator } from 'lucide-react';

export default function GradesPage() {
  const { profile } = useAuth();
  const { showToast, toastEl } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulletinOpen, setBulletinOpen] = useState(false);
  const [form, setForm] = useState({ matiere: '', note: '', bareme: '20', coefficient: '1', periode: 'Trimestre 1', is_absent: false });

  const canEdit = canManageGrades(profile?.role);
  const estId = profile?.establishment_id;

  useEffect(() => { loadStudents(); }, [estId, search]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      let q = supabase.from('students').select('*').eq('active', true).order('nom');
      if (estId && profile?.role !== 'super_admin') q = q.eq('establishment_id', estId);
      if (search) q = q.or(`nom.ilike.%${search}%,prenom.ilike.%${search}%,matricule.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      setStudents(data || []);
    } catch (e: unknown) { showToast('Erreur: ' + (e as Error).message, 'error'); }
    finally { setLoading(false); }
  };

  const loadGrades = async (studentId: string) => {
    const { data, error } = await supabase.from('grades').select('*').eq('student_id', studentId).order('periode').order('matiere');
    if (error) { showToast('Erreur: ' + error.message, 'error'); return; }
    setGrades(data || []);
  };

  const selectStudent = (s: Student) => {
    setSelectedStudent(s);
    loadGrades(s.id);
  };

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      const { error } = await supabase.from('grades').insert({
        establishment_id: selectedStudent.establishment_id,
        student_id: selectedStudent.id,
        matiere: form.matiere,
        note: parseFloat(form.note) || 0,
        bareme: parseFloat(form.bareme) || 20,
        coefficient: parseFloat(form.coefficient) || 1,
        periode: form.periode,
        is_absent: form.is_absent,
      });
      if (error) throw error;
      showToast('Note enregistrée');
      setModalOpen(false);
      setForm({ matiere: '', note: '', bareme: '20', coefficient: '1', periode: 'Trimestre 1', is_absent: false });
      loadGrades(selectedStudent.id);
    } catch (e: unknown) { showToast('Erreur: ' + (e as Error).message, 'error'); }
  };

  const calcAverage = (studentGrades: Grade[], periode: string) => {
    const periodGrades = studentGrades.filter((g) => g.periode === periode && !g.is_absent);
    if (periodGrades.length === 0) return null;
    const totalPoints = periodGrades.reduce((sum, g) => sum + (g.note / g.bareme) * 20 * g.coefficient, 0);
    const totalCoeff = periodGrades.reduce((sum, g) => sum + g.coefficient, 0);
    return totalCoeff > 0 ? (totalPoints / totalCoeff) : null;
  };

  const subjects = selectedStudent ? DEFAULT_SUBJECTS[selectedStudent.cycle] : [];
  const periods = ['Trimestre 1', 'Trimestre 2', 'Trimestre 3'];
  const gradesByPeriod = periods.map((p) => ({
    periode: p,
    grades: grades.filter((g) => g.periode === p),
    average: calcAverage(grades, p),
  }));

  return (
    <div className="space-y-4">
      {toastEl}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Rechercher un élève..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
        </div>
        {selectedStudent && canEdit && (
          <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Ajouter une note</button>
        )}
        {selectedStudent && (
          <button onClick={() => setBulletinOpen(true)} className="btn-secondary"><Printer className="w-4 h-4" /> Bulletin</button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4 lg:col-span-1">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Élèves</h3>
          {loading ? <LoadingSpinner /> : students.length === 0 ? <EmptyState message="Aucun élève" /> : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {students.map((s) => (
                <button key={s.id} onClick={() => selectStudent(s)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${selectedStudent?.id === s.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}>
                  <span className="font-medium">{s.nom} {s.prenom}</span>
                  <span className="text-xs text-slate-500 block">{s.matricule} · {s.classe}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!selectedStudent ? (
            <div className="card p-6"><EmptyState message="Sélectionnez un élève pour voir ses notes" /></div>
          ) : (
            <>
              <div className="card p-4">
                <h3 className="text-lg font-semibold text-slate-800">{selectedStudent.nom} {selectedStudent.prenom}</h3>
                <p className="text-sm text-slate-500">{selectedStudent.matricule} · {selectedStudent.cycle} · {selectedStudent.classe}</p>
              </div>
              {gradesByPeriod.map(({ periode, grades: pGrades, average }) => (
                <div key={periode} className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-700">{periode}</h4>
                    {average !== null && (
                      <div className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-blue-600" />
                        <span className="badge bg-blue-100 text-blue-700">Moyenne: {average.toFixed(2)} / 20</span>
                      </div>
                    )}
                  </div>
                  {pGrades.length === 0 ? (
                    <p className="text-sm text-slate-400">Aucune note enregistrée</p>
                  ) : (
                    <table className="table-base">
                      <thead><tr><th>Matière</th><th>Note</th><th>Sur</th><th>Coeff.</th><th>Absent</th></tr></thead>
                      <tbody>
                        {pGrades.map((g) => (
                          <tr key={g.id}>
                            <td className="font-medium">{g.matiere}</td>
                            <td>{g.is_absent ? 'ABS' : g.note.toFixed(2)}</td>
                            <td>{g.bareme}</td>
                            <td>{g.coefficient}</td>
                            <td>{g.is_absent ? 'Oui' : 'Non'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Ajouter une note">
        <form onSubmit={handleAddGrade} className="space-y-4">
          <div>
            <label className="label">Matière *</label>
            <select required value={form.matiere} onChange={(e) => setForm({ ...form, matiere: e.target.value })} className="input">
              <option value="">Sélectionner...</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Note *</label><input type="number" step="0.25" min="0" required value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input" disabled={form.is_absent} /></div>
            <div><label className="label">Barème</label><input type="number" value={form.bareme} onChange={(e) => setForm({ ...form, bareme: e.target.value })} className="input" disabled={form.is_absent} /></div>
            <div><label className="label">Coefficient</label><input type="number" step="0.5" min="0.5" value={form.coefficient} onChange={(e) => setForm({ ...form, coefficient: e.target.value })} className="input" /></div>
          </div>
          <div>
            <label className="label">Période</label>
            <select value={form.periode} onChange={(e) => setForm({ ...form, periode: e.target.value })} className="input">
              {periods.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_absent} onChange={(e) => setForm({ ...form, is_absent: e.target.checked })} />
            Élève absent à cette évaluation (la note ne sera pas comptée dans la moyenne)
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary">Enregistrer</button>
          </div>
        </form>
      </Modal>

      <Modal open={bulletinOpen} onClose={() => setBulletinOpen(false)} title="Bulletin de notes" size="lg">
        {selectedStudent && (
          <div className="space-y-4 print-area">
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold">Bulletin de notes</h2>
              <p className="text-sm mt-1">{selectedStudent.nom} {selectedStudent.prenom} — {selectedStudent.matricule}</p>
              <p className="text-sm text-slate-500">{selectedStudent.cycle} · {selectedStudent.classe}</p>
            </div>
            {gradesByPeriod.map(({ periode, grades: pGrades, average }) => (
              <div key={periode}>
                <h3 className="font-semibold text-slate-700 mb-2">{periode} — Moyenne: {average !== null ? average.toFixed(2) + '/20' : 'N/A'}</h3>
                <table className="table-base">
                  <thead><tr><th>Matière</th><th>Note</th><th>/20</th><th>Coeff.</th></tr></thead>
                  <tbody>
                    {pGrades.length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-slate-400">Aucune note</td></tr>
                    ) : pGrades.map((g) => (
                      <tr key={g.id}>
                        <td className="font-medium">{g.matiere}</td>
                        <td>{g.is_absent ? 'ABS' : g.note.toFixed(2)}</td>
                        <td>{g.bareme}</td>
                        <td>{g.coefficient}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            <button onClick={() => window.print()} className="btn-secondary no-print"><Printer className="w-4 h-4" /> Imprimer</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
