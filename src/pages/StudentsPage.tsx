import { useEffect, useState } from 'react';
import { useAuth, canManageStudents } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { Modal, useToast, LoadingSpinner, EmptyState } from '../components/ui';
import type { Student, CycleType } from '../types';
import { CYCLES, CYCLE_LEVELS } from '../types';
import { Plus, Search, Edit, Eye, Printer } from 'lucide-react';

export default function StudentsPage() {
  const { profile } = useAuth();
  const { showToast, toastEl } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCycle, setFilterCycle] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState({ nom: '', prenom: '', cycle: 'Primaire' as CycleType, classe: '', parent_name: '', telephone: '', account_email: '', photo_url: '' });

  const canEdit = canManageStudents(profile?.role);
  const estId = profile?.establishment_id;

  useEffect(() => {
    loadStudents();
  }, [estId, search, filterCycle, filterStatus]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      let query = supabase.from('students').select('*').order('created_at', { ascending: false });
      if (estId && profile?.role !== 'super_admin') {
        query = query.eq('establishment_id', estId);
      }
      if (search) {
        query = query.or(`nom.ilike.%${search}%,prenom.ilike.%${search}%,matricule.ilike.%${search}%`);
      }
      if (filterCycle) {
        query = query.eq('cycle', filterCycle);
      }
      if (filterStatus === 'active') query = query.eq('active', true);
      if (filterStatus === 'inactive') query = query.eq('active', false);
      const { data, error } = await query;
      if (error) throw error;
      setStudents(data || []);
    } catch (e: unknown) {
      showToast('Erreur lors du chargement: ' + (e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ nom: '', prenom: '', cycle: 'Primaire', classe: '', parent_name: '', telephone: '', account_email: '', photo_url: '' });
    setModalOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    setForm({ nom: s.nom, prenom: s.prenom, cycle: s.cycle, classe: s.classe, parent_name: s.parent_name, telephone: s.telephone, account_email: s.account_email, photo_url: s.photo_url || '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const { error } = await supabase.from('students').update({
          nom: form.nom, prenom: form.prenom, cycle: form.cycle, classe: form.classe,
          parent_name: form.parent_name, telephone: form.telephone, account_email: form.account_email, photo_url: form.photo_url,
        }).eq('id', editing.id);
        if (error) throw error;
        showToast('Élève modifié avec succès');
      } else {
        const { error } = await supabase.from('students').insert({
          establishment_id: estId, nom: form.nom, prenom: form.prenom, cycle: form.cycle, classe: form.classe,
          parent_name: form.parent_name, telephone: form.telephone, account_email: form.account_email, photo_url: form.photo_url,
        });
        if (error) throw error;
        showToast('Élève inscrit avec succès');
      }
      setModalOpen(false);
      loadStudents();
    } catch (e: unknown) {
      showToast('Erreur: ' + (e as Error).message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      {toastEl}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Rechercher par nom, matricule..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
          </div>
          <select value={filterCycle} onChange={(e) => setFilterCycle(e.target.value)} className="input max-w-[150px]">
            <option value="">Tous cycles</option>
            {CYCLES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input max-w-[150px]">
            <option value="">Tous statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nouvel élève</button>
        )}
      </div>

      {loading ? <LoadingSpinner /> : students.length === 0 ? (
        <div className="card p-6"><EmptyState message="Aucun élève trouvé. Cliquez sur « Nouvel élève » pour commencer." /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Matricule</th><th>Nom</th><th>Prénom</th><th>Cycle</th><th>Classe</th><th>Parent</th><th>Téléphone</th><th>Statut</th><th className="no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono text-xs">{s.matricule}</td>
                  <td className="font-medium">{s.nom}</td>
                  <td>{s.prenom}</td>
                  <td>{s.cycle}</td>
                  <td>{s.classe}</td>
                  <td>{s.parent_name || '-'}</td>
                  <td>{s.telephone || '-'}</td>
                  <td>
                    <span className={`badge ${s.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {s.active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="no-print">
                    <div className="flex gap-1">
                      <button onClick={() => setViewStudent(s)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Voir"><Eye className="w-4 h-4" /></button>
                      {canEdit && <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-slate-100 rounded text-blue-600" title="Modifier"><Edit className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier un élève' : 'Inscrire un nouvel élève'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Nom *</label><input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="input" /></div>
            <div><label className="label">Prénom *</label><input required value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} className="input" /></div>
            <div>
              <label className="label">Cycle *</label>
              <select value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value as CycleType, classe: '' })} className="input">
                {CYCLES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Classe / Niveau *</label>
              <select required value={form.classe} onChange={(e) => setForm({ ...form, classe: e.target.value })} className="input">
                <option value="">Sélectionner...</option>
                {CYCLE_LEVELS[form.cycle].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div><label className="label">Nom du parent/tuteur</label><input value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} className="input" /></div>
            <div><label className="label">Téléphone du parent</label><input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="input" /></div>
            <div><label className="label">E-mail du compte (optionnel)</label><input type="email" value={form.account_email} onChange={(e) => setForm({ ...form, account_email: e.target.value })} className="input" /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary">{editing ? 'Enregistrer' : 'Inscrire'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!viewStudent} onClose={() => setViewStudent(null)} title="Fiche élève" size="md">
        {viewStudent && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 mb-4">
              {viewStudent.photo_url ? (
                <img src={viewStudent.photo_url} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-500">
                  {viewStudent.nom.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-lg font-semibold">{viewStudent.nom} {viewStudent.prenom}</p>
                <p className="text-sm text-slate-500 font-mono">{viewStudent.matricule}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Cycle:</span> <span className="font-medium">{viewStudent.cycle}</span></div>
              <div><span className="text-slate-500">Classe:</span> <span className="font-medium">{viewStudent.classe}</span></div>
              <div><span className="text-slate-500">Parent:</span> <span className="font-medium">{viewStudent.parent_name || '-'}</span></div>
              <div><span className="text-slate-500">Téléphone:</span> <span className="font-medium">{viewStudent.telephone || '-'}</span></div>
              <div><span className="text-slate-500">Statut:</span> <span className="font-medium">{viewStudent.active ? 'Actif' : 'Inactif'}</span></div>
              <div><span className="text-slate-500">Inscrit le:</span> <span className="font-medium">{new Date(viewStudent.created_at).toLocaleDateString('fr-FR')}</span></div>
            </div>
            <button onClick={() => window.print()} className="btn-secondary no-print mt-4"><Printer className="w-4 h-4" /> Imprimer la fiche</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
