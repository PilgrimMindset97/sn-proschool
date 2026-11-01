import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useToast, LoadingSpinner, EmptyState } from '../components/ui';
import type { Profile, AppRole } from '../types';
import { ROLE_LABELS } from '../types';
import { Search, RefreshCw, Lock, Unlock } from 'lucide-react';

const STAFF_ROLES: AppRole[] = ['admin', 'directeur', 'directeur_etudes', 'surveillant_general', 'surveillant_general_adjoint', 'personnel_administratif', 'comptable', 'secretaire', 'censeur', 'enseignant'];

export default function AdminsPage() {
  const { showToast, toastEl } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => { loadProfiles(); }, [search, roleFilter]);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      let q = supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (search) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      let filtered = data || [];
      if (roleFilter) filtered = filtered.filter((p) => p.role === roleFilter);
      setProfiles(filtered);
    } catch (e: unknown) { showToast('Erreur: ' + (e as Error).message, 'error'); }
    finally { setLoading(false); }
  };

  const toggleBlock = async (profile: Profile) => {
    if (profile.role === 'super_admin') { showToast('Les comptes Super Admin sont protégés', 'error'); return; }
    try {
      const { error } = await supabase.from('profiles').update({ active: !profile.active }).eq('id', profile.id);
      if (error) throw error;
      showToast(profile.active ? 'Compte bloqué' : 'Compte débloqué');
      loadProfiles();
    } catch (e: unknown) { showToast('Erreur: ' + (e as Error).message, 'error'); }
  };

  const resetPassword = async (profile: Profile) => {
    if (profile.role === 'super_admin') { showToast('Action protégée pour les Super Admin', 'error'); return; }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email);
      if (error) throw error;
      showToast('E-mail de réinitialisation envoyé à ' + profile.email);
    } catch (e: unknown) { showToast('Erreur: ' + (e as Error).message, 'error'); }
  };

  const staffProfiles = profiles.filter((p) => STAFF_ROLES.includes(p.role) || p.role === 'super_admin');

  return (
    <div className="space-y-4">
      {toastEl}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Rechercher par nom ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input max-w-[200px]">
          <option value="">Tous les rôles</option>
          <option value="super_admin">Super Admin</option>
          {STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4"><p className="text-sm text-slate-500">Total comptes</p><p className="text-2xl font-bold text-slate-800">{staffProfiles.length}</p></div>
        <div className="card p-4"><p className="text-sm text-slate-500">Actifs</p><p className="text-2xl font-bold text-green-600">{staffProfiles.filter((p) => p.active).length}</p></div>
        <div className="card p-4"><p className="text-sm text-slate-500">Bloqués</p><p className="text-2xl font-bold text-red-600">{staffProfiles.filter((p) => !p.active).length}</p></div>
      </div>

      {loading ? <LoadingSpinner /> : staffProfiles.length === 0 ? (
        <div className="card p-6"><EmptyState message="Aucun compte du personnel trouvé" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Nom</th><th>E-mail</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {staffProfiles.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.full_name || '-'}</td>
                  <td className="text-sm">{p.email || '-'}</td>
                  <td><span className="badge bg-blue-100 text-blue-700">{ROLE_LABELS[p.role]}</span></td>
                  <td><span className={`badge ${p.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.active ? 'Actif' : 'Bloqué'}</span></td>
                  <td>
                    <div className="flex gap-1">
                      {p.role !== 'super_admin' && (
                        <>
                          <button onClick={() => toggleBlock(p)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title={p.active ? 'Bloquer' : 'Débloquer'}>
                            {p.active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button onClick={() => resetPassword(p)} className="p-1.5 hover:bg-slate-100 rounded text-amber-600" title="Réinitialiser le mot de passe"><RefreshCw className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
