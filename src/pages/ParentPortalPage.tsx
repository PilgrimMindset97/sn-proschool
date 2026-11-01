import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { LoadingSpinner } from '../components/ui';
import { GraduationCap, LogOut, Search, Printer } from 'lucide-react';

interface PortalData {
  student: { id: string; matricule: string; nom: string; prenom: string; cycle: string; classe: string };
  grades: Array<{ id: string; matiere: string; note: number; bareme: number; coefficient: number; periode: string; is_absent: boolean }>;
  payments: Array<{ id: string; motif: string; montant: number; date_paiement: string; mode: string; reference: string }>;
  attendance: Array<{ id: string; date_presence: string; statut: string; motif: string | null }>;
}

export default function ParentPortalPage() {
  const { profile, signOut } = useAuth();
  const [matricule, setMatricule] = useState('');
  const [phone, setPhone] = useState('');
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setData(null);
    try {
      const { data: result, error: rpcError } = await supabase.rpc('parent_portal_lookup', {
        p_matricule: matricule, p_parent_phone: phone,
      });
      if (rpcError) throw rpcError;
      if (result?.error) {
        setError(result.error === 'not_found' ? 'Aucun élève trouvé avec ce matricule et ce numéro de téléphone.' : 'Informations invalides.');
      } else {
        setData(result as PortalData);
      }
    } catch (e: unknown) { setError('Erreur: ' + (e as Error).message); }
    finally { setLoading(false); }
  };

  // If parent is authenticated, show their linked children
  if (profile?.role === 'parent') {
    return <ParentAuthenticatedView onSignOut={signOut} profileName={profile.full_name} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-blue-900 text-white py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-8 h-8" />
          <div><h1 className="font-bold">SN ProSchool</h1><p className="text-xs text-blue-200">Portail Parent</p></div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Consulter le dossier de votre enfant</h2>
          <form onSubmit={handleLookup} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Matricule de l'élève</label><div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input required value={matricule} onChange={(e) => setMatricule(e.target.value)} className="input pl-10" placeholder="SN-2026-0001" /></div></div>
            <div><label className="label">Téléphone du parent (enregistré à l'inscription)</label><input required value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="06 12 34 56 78" /></div>
            <div className="sm:col-span-2"><button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Recherche...' : 'Consulter'}</button></div>
          </form>
          {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        </div>

        {loading && <LoadingSpinner />}

        {data && (
          <div className="space-y-4 animate-fade-in print-area">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{data.student.nom} {data.student.prenom}</h2>
                  <p className="text-sm text-slate-500">Matricule: {data.student.matricule} · {data.student.cycle} · {data.student.classe}</p>
                </div>
                <button onClick={() => window.print()} className="btn-secondary no-print"><Printer className="w-4 h-4" /> Imprimer</button>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-slate-700 mb-3">Notes</h3>
              {data.grades.length === 0 ? <p className="text-slate-400 text-sm">Aucune note enregistrée</p> : (
                <table className="table-base">
                  <thead><tr><th>Matière</th><th>Note</th><th>Sur</th><th>Coeff.</th><th>Période</th></tr></thead>
                  <tbody>
                    {data.grades.map((g) => (
                      <tr key={g.id}><td className="font-medium">{g.matiere}</td><td>{g.is_absent ? 'ABS' : g.note.toFixed(2)}</td><td>{g.bareme}</td><td>{g.coefficient}</td><td>{g.periode}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-slate-700 mb-3">Paiements</h3>
              {data.payments.length === 0 ? <p className="text-slate-400 text-sm">Aucun paiement</p> : (
                <table className="table-base">
                  <thead><tr><th>Référence</th><th>Motif</th><th>Montant</th><th>Mode</th><th>Date</th></tr></thead>
                  <tbody>
                    {data.payments.map((p) => (
                      <tr key={p.id}><td className="font-mono text-xs">{p.reference}</td><td>{p.motif}</td><td className="font-semibold">{Number(p.montant).toLocaleString('fr-FR')} FCFA</td><td>{p.mode}</td><td>{new Date(p.date_paiement).toLocaleDateString('fr-FR')}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-slate-700 mb-3">Présences et absences</h3>
              {data.attendance.length === 0 ? <p className="text-slate-400 text-sm">Aucun enregistrement</p> : (
                <table className="table-base">
                  <thead><tr><th>Date</th><th>Statut</th><th>Motif</th></tr></thead>
                  <tbody>
                    {data.attendance.map((a) => (
                      <tr key={a.id}><td>{new Date(a.date_presence).toLocaleDateString('fr-FR')}</td><td><span className={`badge ${a.statut === 'Présent' ? 'bg-green-100 text-green-700' : a.statut === 'Absent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{a.statut}</span></td><td>{a.motif || '-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ParentAuthenticatedView({ onSignOut, profileName }: { onSignOut: () => void; profileName: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-blue-900 text-white py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-8 h-8" />
          <div><h1 className="font-bold">SN ProSchool</h1><p className="text-xs text-blue-200">Espace Parent — {profileName}</p></div>
        </div>
        <button onClick={onSignOut} className="flex items-center gap-2 text-blue-200 hover:text-white"><LogOut className="w-4 h-4" /> Déconnexion</button>
      </header>
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="card p-6 text-center">
          <p className="text-slate-600">Bienvenue dans votre espace parent. Vos enfants liés à votre compte apparaîtront ici.</p>
          <p className="text-sm text-slate-400 mt-2">Contactez l'administration de l'établissement pour lier vos enfants à votre compte.</p>
        </div>
      </main>
    </div>
  );
}
