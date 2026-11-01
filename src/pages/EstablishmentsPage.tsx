import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Modal, useToast, LoadingSpinner, EmptyState } from '../components/ui';
import type { Establishment } from '../types';
import { Plus, Edit, School } from 'lucide-react';

export default function EstablishmentsPage() {
  const { showToast, toastEl } = useToast();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Establishment | null>(null);
  const [form, setForm] = useState({ name: '', code: '', address: '', phone: '', email: '', active: true });

  useEffect(() => { loadEstablishments(); }, []);

  const loadEstablishments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('establishments').select('*').order('name');
      if (error) throw error;
      setEstablishments(data || []);
    } catch (e: unknown) { showToast('Erreur: ' + (e as Error).message, 'error'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm({ name: '', code: '', address: '', phone: '', email: '', active: true }); setModalOpen(true); };
  const openEdit = (e: Establishment) => { setEditing(e); setForm({ name: e.name, code: e.code, address: e.address, phone: e.phone, email: e.email, active: e.active }); setModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const { error } = await supabase.from('establishments').update({ name: form.name, code: form.code, address: form.address, phone: form.phone, email: form.email, active: form.active }).eq('id', editing.id);
        if (error) throw error;
        showToast('Établissement modifié');
      } else {
        const { error } = await supabase.from('establishments').insert({ name: form.name, code: form.code, address: form.address, phone: form.phone, email: form.email, active: form.active });
        if (error) throw error;
        showToast('Établissement créé');
      }
      setModalOpen(false);
      loadEstablishments();
    } catch (e: unknown) { showToast('Erreur: ' + (e as Error).message, 'error'); }
  };

  return (
    <div className="space-y-4">
      {toastEl}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-700">Établissements scolaires</h3>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nouvel établissement</button>
      </div>

      {loading ? <LoadingSpinner /> : establishments.length === 0 ? (
        <div className="card p-6"><EmptyState message="Aucun établissement enregistré" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {establishments.map((est) => (
            <div key={est.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center"><School className="w-6 h-6 text-blue-600" /></div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{est.name}</h4>
                    <p className="text-xs text-slate-500 font-mono">{est.code}</p>
                  </div>
                </div>
                <span className={`badge ${est.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{est.active ? 'Actif' : 'Inactif'}</span>
              </div>
              <div className="mt-3 text-sm text-slate-600 space-y-1">
                {est.address && <p>{est.address}</p>}
                {est.phone && <p>Tél: {est.phone}</p>}
                {est.email && <p>{est.email}</p>}
              </div>
              <button onClick={() => openEdit(est)} className="btn-secondary mt-4 w-full"><Edit className="w-4 h-4" /> Modifier</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier un établissement' : 'Nouvel établissement'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Nom *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></div>
          <div><label className="label">Code unique *</label><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input" placeholder="EST001" /></div>
          <div><label className="label">Adresse</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Téléphone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></div>
            <div><label className="label">E-mail</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Établissement actif</label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary">{editing ? 'Enregistrer' : 'Créer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
