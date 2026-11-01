import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { LoadingSpinner, EmptyState } from '../components/ui';
import type { AuditLog } from '../types';
import { Search, ShieldCheck } from 'lucide-react';

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => { loadLogs(); }, [search, actionFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
      if (search) q = q.or(`entity.ilike.%${search}%,entity_id.ilike.%${search}%`);
      if (actionFilter) q = q.eq('action', actionFilter);
      const { data, error } = await q;
      if (error) throw error;
      setLogs(data || []);
    } catch (e: unknown) { console.error('Audit load error:', e); }
    finally { setLoading(false); }
  };

  const actionColors: Record<string, string> = {
    insert: 'bg-green-100 text-green-700',
    update: 'bg-amber-100 text-amber-700',
    delete: 'bg-red-100 text-red-700',
    lock: 'bg-blue-100 text-blue-700',
    unlock_for_correction: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600" />
        <p className="text-sm text-slate-600">Journal d'audit global — seules les actions sensibles sont journalisées automatiquement. Lecture réservée au Super Administrateur.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
        </div>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="input max-w-[150px]">
          <option value="">Toutes actions</option>
          <option value="insert">Création</option>
          <option value="update">Modification</option>
          <option value="delete">Suppression</option>
          <option value="lock">Verrouillage</option>
          <option value="unlock_for_correction">Déverrouillage</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : logs.length === 0 ? (
        <div className="card p-6"><EmptyState message="Aucune entrée dans le journal" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Date</th><th>Action</th><th>Entité</th><th>ID</th><th>Auteur</th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString('fr-FR')}</td>
                  <td><span className={`badge ${actionColors[log.action] || 'bg-slate-100 text-slate-600'}`}>{log.action}</span></td>
                  <td className="font-medium">{log.entity}</td>
                  <td className="font-mono text-xs">{log.entity_id?.slice(0, 8) || '-'}</td>
                  <td className="font-mono text-xs">{log.actor_id?.slice(0, 8) || 'système'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
