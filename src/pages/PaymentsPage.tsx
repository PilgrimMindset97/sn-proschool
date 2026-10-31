import { useEffect, useState } from 'react';
import { useAuth, canManagePayments } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { Modal, useToast, LoadingSpinner, EmptyState } from '../components/ui';
import type { Student, Payment } from '../types';
import { Plus, Search, Printer } from 'lucide-react';

const PAYMENT_MODES = ['Espèces', 'Chèque', 'Virement', 'Mobile Money', 'Carte'];
const PAYMENT_MOTIFS = ['Frais d\'inscription', 'Frais de scolarité', 'Frais d\'examen', 'Uniforme', 'Autres frais'];

function generateReference() {
  const d = new Date();
  const ymd = d.getFullYear().toString() + (d.getMonth() + 1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PAY-${ymd}-${rand}`;
}

export default function PaymentsPage() {
  const { profile } = useAuth();
  const { showToast, toastEl } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const [form, setForm] = useState({ student_id: '', motif: PAYMENT_MOTIFS[0], montant: '', mode: PAYMENT_MODES[0], date_paiement: new Date().toISOString().slice(0, 10) });

  const canEdit = canManagePayments(profile?.role);
  const estId = profile?.establishment_id;

  useEffect(() => { loadPayments(); loadStudents(); }, [estId, search]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      let q = supabase.from('payments').select('*').order('created_at', { ascending: false });
      if (estId && profile?.role !== 'super_admin') q = q.eq('establishment_id', estId);
      if (search) {
        const matchingStudents = students.filter((s) => s.nom.includes(search) || s.prenom.includes(search) || s.matricule.includes(search));
        if (matchingStudents.length > 0) {
          q = q.in('student_id', matchingStudents.map((s) => s.id));
        }
      }
      const { data, error } = await q;
      if (error) throw error;
      setPayments(data || []);
    } catch (e: unknown) { showToast('Erreur: ' + (e as Error).message, 'error'); }
    finally { setLoading(false); }
  };

  const loadStudents = async () => {
    let q = supabase.from('students').select('*').eq('active', true).order('nom');
    if (estId && profile?.role !== 'super_admin') q = q.eq('establishment_id', estId);
    const { data } = await q;
    setStudents(data || []);
  };

  const getStudentName = (id: string) => {
    const s = students.find((s) => s.id === id);
    return s ? `${s.nom} ${s.prenom} (${s.matricule})` : 'Élève inconnu';
  };

  const totalAmount = payments.filter((p) => p.status === 'validé').reduce((sum, p) => sum + Number(p.montant), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const student = students.find((s) => s.id === form.student_id);
      if (!student) { showToast('Sélectionnez un élève', 'error'); return; }
      const reference = generateReference();
      const { error } = await supabase.from('payments').insert({
        establishment_id: student.establishment_id,
        student_id: form.student_id,
        motif: form.motif,
        montant: parseFloat(form.montant),
        mode: form.mode,
        date_paiement: form.date_paiement,
        reference,
        status: 'validé',
      });
      if (error) throw error;
      showToast('Paiement enregistré: ' + reference);
      setModalOpen(false);
      setForm({ student_id: '', motif: PAYMENT_MOTIFS[0], montant: '', mode: PAYMENT_MODES[0], date_paiement: new Date().toISOString().slice(0, 10) });
      loadPayments();
    } catch (e: unknown) { showToast('Erreur: ' + (e as Error).message, 'error'); }
  };

  return (
    <div className="space-y-4">
      {toastEl}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4"><p className="text-sm text-slate-500">Total encaissé</p><p className="text-2xl font-bold text-green-600">{totalAmount.toLocaleString('fr-FR')} FCFA</p></div>
        <div className="card p-4"><p className="text-sm text-slate-500">Transactions</p><p className="text-2xl font-bold text-slate-700">{payments.length}</p></div>
        <div className="card p-4"><p className="text-sm text-slate-500">Validées</p><p className="text-2xl font-bold text-blue-600">{payments.filter((p) => p.status === 'validé').length}</p></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
        </div>
        {canEdit && <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Nouveau paiement</button>}
      </div>

      {loading ? <LoadingSpinner /> : payments.length === 0 ? (
        <div className="card p-6"><EmptyState message="Aucun paiement enregistré" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Référence</th><th>Élève</th><th>Motif</th><th>Montant</th><th>Mode</th><th>Date</th><th>Statut</th><th className="no-print">Reçu</th></tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.reference}</td>
                  <td className="font-medium">{getStudentName(p.student_id)}</td>
                  <td>{p.motif}</td>
                  <td className="font-semibold">{Number(p.montant).toLocaleString('fr-FR')} FCFA</td>
                  <td>{p.mode}</td>
                  <td>{new Date(p.date_paiement).toLocaleDateString('fr-FR')}</td>
                  <td><span className={`badge ${p.status === 'validé' ? 'bg-green-100 text-green-700' : p.status === 'annulé' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span></td>
                  <td className="no-print"><button onClick={() => setReceiptPayment(p)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><Printer className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau paiement">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Élève *</label>
            <select required value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className="input">
              <option value="">Sélectionner...</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.nom} {s.prenom} — {s.matricule}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Motif *</label>
            <select value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} className="input">
              {PAYMENT_MOTIFS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Montant (FCFA) *</label><input type="number" required min="1" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} className="input" /></div>
            <div><label className="label">Mode *</label><select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="input">{PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
          </div>
          <div><label className="label">Date</label><input type="date" value={form.date_paiement} onChange={(e) => setForm({ ...form, date_paiement: e.target.value })} className="input" /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary">Enregistrer</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!receiptPayment} onClose={() => setReceiptPayment(null)} title="Reçu de paiement" size="md">
        {receiptPayment && (
          <div className="space-y-4 print-area">
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold">Reçu de paiement</h2>
              <p className="text-sm text-slate-500 mt-1">Référence: {receiptPayment.reference}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Élève:</span> <span className="font-medium">{getStudentName(receiptPayment.student_id)}</span></div>
              <div><span className="text-slate-500">Date:</span> <span className="font-medium">{new Date(receiptPayment.date_paiement).toLocaleDateString('fr-FR')}</span></div>
              <div><span className="text-slate-500">Motif:</span> <span className="font-medium">{receiptPayment.motif}</span></div>
              <div><span className="text-slate-500">Mode:</span> <span className="font-medium">{receiptPayment.mode}</span></div>
              <div className="col-span-2 border-t pt-2"><span className="text-slate-500">Montant:</span> <span className="text-xl font-bold text-green-600 ml-2">{Number(receiptPayment.montant).toLocaleString('fr-FR')} FCFA</span></div>
            </div>
            <button onClick={() => window.print()} className="btn-secondary no-print"><Printer className="w-4 h-4" /> Imprimer</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
