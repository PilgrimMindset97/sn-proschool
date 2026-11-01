import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { Modal, useToast, LoadingSpinner, EmptyState } from '../components/ui';
import type { ClassRow, Subject, SchoolYear, CycleType } from '../types';
import { CYCLES, CYCLE_LEVELS, DEFAULT_SUBJECTS } from '../types';
import { Plus, Edit, Trash2, School, BookOpen } from 'lucide-react';

export default function ClassesPage() {
  const { profile } = useAuth();
  const { showToast, toastEl } = useToast();
  const [tab, setTab] = useState<'classes' | 'subjects' | 'years'>('classes');
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editType, setEditType] = useState<'class' | 'subject' | 'year' | null>(null);
  const [editing, setEditing] = useState<ClassRow | Subject | SchoolYear | null>(null);

  const canEdit = profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'directeur' || profile?.role === 'directeur_etudes' || profile?.role === 'censeur';
  const estId = profile?.establishment_id;

  const [classForm, setClassForm] = useState({ cycle: 'Primaire' as CycleType, niveau: '', nom: '', capacity: 0, school_year_id: '' });
  const [subjectForm, setSubjectForm] = useState({ cycle: 'Primaire' as CycleType, nom: '', coefficient: 1 });
  const [yearForm, setYearForm] = useState({ label: '', start_date: '', end_date: '', active: false });

  useEffect(() => { loadAll(); }, [estId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const filter = estId && profile?.role !== 'super_admin' ? { establishment_id: estId } : {};
      const [c, s, y] = await Promise.all([
        supabase.from('classes').select('*').match(filter).order('nom'),
        supabase.from('subjects').select('*').match(filter).order('nom'),
        supabase.from('school_years').select('*').match(filter).order('created_at', { ascending: false }),
      ]);
      setClasses(c.data || []);
      setSubjects(s.data || []);
      setYears(y.data || []);
    } catch (e: unknown) { showToast('Erreur: ' + (e as Error).message, 'error'); }
    finally { setLoading(false); }
  };

  const openCreate = (type: 'class' | 'subject' | 'year') => {
    setEditType(type); setEditing(null);
    if (type === 'class') setClassForm({ cycle: 'Primaire', niveau: '', nom: '', capacity: 0, school_year_id: '' });
    if (type === 'subject') setSubjectForm({ cycle: 'Primaire', nom: '', coefficient: 1 });
    if (type === 'year') setYearForm({ label: '', start_date: '', end_date: '', active: false });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editType === 'class') {
        if (editing) {
          const { error } = await supabase.from('classes').update({ cycle: classForm.cycle, niveau: classForm.niveau, nom: classForm.nom, capacity: classForm.capacity, school_year_id: classForm.school_year_id || null }).eq('id', (editing as ClassRow).id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('classes').insert({ establishment_id: estId, cycle: classForm.cycle, niveau: classForm.niveau, nom: classForm.nom, capacity: classForm.capacity, school_year_id: classForm.school_year_id || null });
          if (error) throw error;
        }
      } else if (editType === 'subject') {
        if (editing) {
          const { error } = await supabase.from('subjects').update({ cycle: subjectForm.cycle, nom: subjectForm.nom, coefficient: subjectForm.coefficient }).eq('id', (editing as Subject).id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('subjects').insert({ establishment_id: estId, cycle: subjectForm.cycle, nom: subjectForm.nom, coefficient: subjectForm.coefficient });
          if (error) throw error;
        }
      } else if (editType === 'year') {
        if (editing) {
          const { error } = await supabase.from('school_years').update({ label: yearForm.label, start_date: yearForm.start_date || null, end_date: yearForm.end_date || null, active: yearForm.active }).eq('id', (editing as SchoolYear).id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('school_years').insert({ establishment_id: estId, label: yearForm.label, start_date: yearForm.start_date || null, end_date: yearForm.end_date || null, active: yearForm.active });
          if (error) throw error;
        }
      }
      showToast('Enregistré avec succès');
      setModalOpen(false);
      loadAll();
    } catch (e: unknown) { showToast('Erreur: ' + (e as Error).message, 'error'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {toastEl}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
        <button onClick={() => setTab('classes')} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === 'classes' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Classes</button>
        <button onClick={() => setTab('subjects')} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === 'subjects' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Matières</button>
        <button onClick={() => setTab('years')} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === 'years' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Années scolaires</button>
      </div>

      {tab === 'classes' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">Classes de l'établissement</h3>
            {canEdit && <button onClick={() => openCreate('class')} className="btn-primary"><Plus className="w-4 h-4" /> Nouvelle classe</button>}
          </div>
          {classes.length === 0 ? <div className="card p-6"><EmptyState message="Aucune classe créée" /></div> : (
            <div className="card overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>Nom</th><th>Cycle</th><th>Niveau</th><th>Capacité</th>{canEdit && <th>Actions</th>}</tr></thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c.id}>
                      <td className="font-medium">{c.nom}</td>
                      <td>{c.cycle}</td>
                      <td>{c.niveau}</td>
                      <td>{c.capacity || '-'}</td>
                      {canEdit && <td><button onClick={() => { setEditType('class'); setEditing(c); setClassForm({ cycle: c.cycle, niveau: c.niveau, nom: c.nom, capacity: c.capacity, school_year_id: c.school_year_id || '' }); setModalOpen(true); }} className="p-1.5 hover:bg-slate-100 rounded text-blue-600"><Edit className="w-4 h-4" /></button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'subjects' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">Matières par cycle</h3>
            {canEdit && <button onClick={() => openCreate('subject')} className="btn-primary"><Plus className="w-4 h-4" /> Nouvelle matière</button>}
          </div>
          {subjects.length === 0 ? <div className="card p-6"><EmptyState message="Aucune matière créée" /></div> : (
            <div className="card overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>Matière</th><th>Cycle</th><th>Coefficient</th>{canEdit && <th>Actions</th>}</tr></thead>
                <tbody>
                  {subjects.map((s) => (
                    <tr key={s.id}>
                      <td className="font-medium">{s.nom}</td>
                      <td>{s.cycle}</td>
                      <td>{s.coefficient}</td>
                      {canEdit && <td><button onClick={() => { setEditType('subject'); setEditing(s); setSubjectForm({ cycle: s.cycle, nom: s.nom, coefficient: s.coefficient }); setModalOpen(true); }} className="p-1.5 hover:bg-slate-100 rounded text-blue-600"><Edit className="w-4 h-4" /></button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'years' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">Années scolaires</h3>
            {canEdit && <button onClick={() => openCreate('year')} className="btn-primary"><Plus className="w-4 h-4" /> Nouvelle année</button>}
          </div>
          {years.length === 0 ? <div className="card p-6"><EmptyState message="Aucune année scolaire créée" /></div> : (
            <div className="card overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>Libellé</th><th>Début</th><th>Fin</th><th>Active</th>{canEdit && <th>Actions</th>}</tr></thead>
                <tbody>
                  {years.map((y) => (
                    <tr key={y.id}>
                      <td className="font-medium">{y.label}</td>
                      <td>{y.start_date ? new Date(y.start_date).toLocaleDateString('fr-FR') : '-'}</td>
                      <td>{y.end_date ? new Date(y.end_date).toLocaleDateString('fr-FR') : '-'}</td>
                      <td>{y.active ? <span className="badge bg-green-100 text-green-700">Active</span> : '-'}</td>
                      {canEdit && <td><button onClick={() => { setEditType('year'); setEditing(y); setYearForm({ label: y.label, start_date: y.start_date || '', end_date: y.end_date || '', active: y.active }); setModalOpen(true); }} className="p-1.5 hover:bg-slate-100 rounded text-blue-600"><Edit className="w-4 h-4" /></button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier' : 'Créer'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {editType === 'class' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Cycle</label><select value={classForm.cycle} onChange={(e) => setClassForm({ ...classForm, cycle: e.target.value as CycleType, niveau: '' })} className="input">{CYCLES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="label">Niveau</label><select value={classForm.niveau} onChange={(e) => setClassForm({ ...classForm, niveau: e.target.value, nom: e.target.value })} className="input"><option value="">Sélectionner...</option>{CYCLE_LEVELS[classForm.cycle].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
              </div>
              <div><label className="label">Nom de la classe</label><input value={classForm.nom} onChange={(e) => setClassForm({ ...classForm, nom: e.target.value })} className="input" /></div>
              <div><label className="label">Capacité</label><input type="number" min="0" value={classForm.capacity} onChange={(e) => setClassForm({ ...classForm, capacity: parseInt(e.target.value) || 0 })} className="input" /></div>
            </>
          )}
          {editType === 'subject' && (
            <>
              <div><label className="label">Cycle</label><select value={subjectForm.cycle} onChange={(e) => setSubjectForm({ ...subjectForm, cycle: e.target.value as CycleType })} className="input">{CYCLES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="label">Matière</label><input required list="subject-suggestions" value={subjectForm.nom} onChange={(e) => setSubjectForm({ ...subjectForm, nom: e.target.value })} className="input" /><datalist id="subject-suggestions">{DEFAULT_SUBJECTS[subjectForm.cycle].map((s) => <option key={s} value={s} />)}</datalist></div>
              <div><label className="label">Coefficient</label><input type="number" step="0.5" min="0.5" value={subjectForm.coefficient} onChange={(e) => setSubjectForm({ ...subjectForm, coefficient: parseFloat(e.target.value) || 1 })} className="input" /></div>
            </>
          )}
          {editType === 'year' && (
            <>
              <div><label className="label">Libellé *</label><input required value={yearForm.label} onChange={(e) => setYearForm({ ...yearForm, label: e.target.value })} className="input" placeholder="2026-2027" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Date de début</label><input type="date" value={yearForm.start_date} onChange={(e) => setYearForm({ ...yearForm, start_date: e.target.value })} className="input" /></div>
                <div><label className="label">Date de fin</label><input type="date" value={yearForm.end_date} onChange={(e) => setYearForm({ ...yearForm, end_date: e.target.value })} className="input" /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={yearForm.active} onChange={(e) => setYearForm({ ...yearForm, active: e.target.checked })} /> Année active</label>
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary">{editing ? 'Enregistrer' : 'Créer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
