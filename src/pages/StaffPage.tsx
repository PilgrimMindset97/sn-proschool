import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { useToast, LoadingSpinner, EmptyState } from '../components/ui';
import type { StaffAttendance } from '../types';
import { Plus, Search } from 'lucide-react';

const FONCTIONS = ['Enseignant', 'Responsable', 'Directeur', 'Personnel administratif'];
const STATUTS = ['Présent', 'Absent', 'En retard'];

export default function StaffPage() {
  const { profile } = useAuth();
  const { showToast, toastEl } = useToast();
  const [records, setRecords] = useState<StaffAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState({ nom: '', fonction: 'Enseignant', date_presence: new Date().toISOString().slice(0, 10), heure_arrivee: '', statut: 'Présent', motif: '' });
  const [modalOpen, setModalOpen] = useState(false);

  const estId = profile?.establishment_id;
  const canEdit = profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'directeur' || profile?.role === 'censeur' || profile?.role === 'surveillant_general' || profile?.role === 'secretaire';

  useEffect(() => { loadRecords(); }, [estId, filterDate, search]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      let q = supabase.from('staff_attendance').select('*').order('created_at', { ascending: false });
      if (estId && profile?.role !== 'super_admin') q = q.eq('establishment_id', estId);
      if (filterDate) q = q.eq('date_presence', filterDate);
      if (search) q = q.ilike('nom', `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      setRecords(data || []);
    } catch (e: unknown) { showToast('Erreur: ' + (e as Error).message, 'error'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('staff_attendance').insert({
        establishment_id: estId, nom: form.nom, fonction: form.fonction, date_presence: form.date_presence,
        heure_arrivee: form.heure_arrivee || null, statut: form.statut, motif: form.motif || null,
      });
      if (error) throw error;
      showToast('Pointage enregistré');
      setModalOpen(false);
      setForm({ nom: '', fonction: 'Enseignant', date_presence: new Date().toISOString().slice(0, 10), heure_arrivee: '', statut: 'Présent', motif: '' });
      loadRecords();
    } catch (e: unknown) { showToast('Erreur: ' + (e as Error).message, 'error'); }
  };

  return (
    <div className="space-y-4">
      {toastEl}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="input max-w-[180px]" />
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
          </div>
        </div>
        {canEdit && <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Pointer un membre</button>}
      </div>

      {loading ? <LoadingSpinner /> : records.length === 0 ? (
        <div className="card p-6"><EmptyState message="Aucun pointage enregistré pour cette date" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Nom</th><th>Fonction</th><th>Date</th><th>Arrivée</th><th>Statut</th><th>Motif</th></tr></thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.nom}</td>
                  <td>{r.fonction}</td>
                  <td>{new Date(r.date_presence).toLocaleDateString('fr-FR')}</td>
                  <td>{r.heure_arrivee || '-'}</td>
                  <td><span className={`badge ${r.statut === 'Présent' ? 'bg-green-100 text-green-700' : r.statut === 'Absent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{r.statut}</span></td>
                  <td>{r.motif || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="card p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Pointer un membre du personnel</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="label">Nom *</label><input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="input" /></div>
              <div><label className="label">Fonction</label><select value={form.fonction} onChange={(e) => setForm({ ...form, fonction: e.target.value })} className="input">{FONCTIONS.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
              <div><label className="label">Date</label><input type="date" value={form.date_presence} onChange={(e) => setForm({ ...form, date_presence: e.target.value })} className="input" /></div>
              <div><label className="label">Heure d'arrivée</label><input type="time" value={form.heure_arrivee} onChange={(e) => setForm({ ...form, heure_arrivee: e.target.value })} className="input" /></div>
              <div><label className="label">Statut</label><select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })} className="input">{STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className="label">Motif (optionnel)</label><input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} className="input" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
                <button type="submit" className="btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
