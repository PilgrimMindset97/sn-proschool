import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { Modal, useToast, LoadingSpinner, EmptyState } from '../components/ui';
import type { Teacher, CycleType } from '../types';
import { CYCLES } from '../types';
import { Plus, Search, Edit } from 'lucide-react';

export default function TeachersPage() {
  const { profile } = useAuth();
  const { showToast, toastEl } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ nom: '', matiere: '', classes: '', cycle: '', salle: '', active: true });

  const canEdit = profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'directeur' || profile?.role === 'censeur';
  const estId = profile?.establishment_id;

  useEffect(() => { loadTeachers(); }, [estId, search]);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      let q = supabase.from('teachers').select('*').order('nom');
      if (estId && profile?.role !== 'super_admin') q = q.eq('establishment_id', estId);
      if (search) q = q.or(`nom.ilike.%${search}%,matiere.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      setTeachers(data || []);
    } catch (e: unknown) { showToast('Erreur: ' + (e as Error).message, 'error'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm({ nom: '', matiere: '', classes: '', cycle: '', salle: '', active: true }); setModalOpen(true); };
  const openEdit = (t: Teacher) => { setEditing(t); setForm({ nom: t.nom, matiere: t.matiere, classes: t.classes, cycle: t.cycle || '', salle: t.salle || '', active: t.active }); setModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const { error } = await supabase.from('teachers').update({ nom: form.nom, matiere: form.matiere, classes: form.classes, cycle: form.cycle, salle: form.salle, active: form.active }).eq('id', editing.id);
        if (error) throw error;
        showToast('Enseignant modifié');
      } else {
        const { error } = await supabase.from('teachers').insert({ establishment_id: estId, nom: form.nom, matiere: form.matiere, classes: form.classes, cycle: form.cycle, salle: form.salle, active: form.active });
        if (error) throw error;
        showToast('Enseignant ajouté');
      }
      setModalOpen(false);
      loadTeachers();
    } catch (e: unknown) { showToast('Erreur: ' + (e as Error).message, 'error'); }
  };

  return (
    <div className="space-y-4">
      {toastEl}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Rechercher un enseignant..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
        </div>
        {canEdit && <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nouvel enseignant</button>}
      </div>

      {loading ? <LoadingSpinner /> : teachers.length === 0 ? (
        <div className="card p-6"><EmptyState message="Aucun enseignant enregistré" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Nom</th><th>Matière</th><th>Classes</th><th>Cycle</th><th>Salle</th><th>Statut</th>{canEdit && <th>Actions</th>}</tr></thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.nom}</td>
                  <td>{t.matiere}</td>
                  <td>{t.classes || '-'}</td>
                  <td>{t.cycle || '-'}</td>
                  <td>{t.salle || '-'}</td>
                  <td><span className={`badge ${t.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{t.active ? 'Actif' : 'Inactif'}</span></td>
                  {canEdit && <td><button onClick={() => openEdit(t)} className="p-1.5 hover:bg-slate-100 rounded text-blue-600"><Edit className="w-4 h-4" /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier un enseignant' : 'Nouvel enseignant'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Nom complet *</label><input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="input" /></div>
          <div><label className="label">Matière *</label><input required value={form.matiere} onChange={(e) => setForm({ ...form, matiere: e.target.value })} className="input" /></div>
          <div><label className="label">Classes (séparées par des virgules)</label><input value={form.classes} onChange={(e) => setForm({ ...form, classes: e.target.value })} className="input" placeholder="6ème, 5ème, 4ème" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Cycle</label><select value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value })} className="input"><option value="">-</option>{CYCLES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="label">Salle</label><input value={form.salle} onChange={(e) => setForm({ ...form, salle: e.target.value })} className="input" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Actif</label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary">{editing ? 'Enregistrer' : 'Ajouter'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
