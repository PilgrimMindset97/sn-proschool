import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { StatCard, LoadingSpinner } from '../components/ui';
import { Users, GraduationCap, CreditCard, CalendarCheck, School, BookOpen } from 'lucide-react';
import type { AppRole } from '../types';
import { ROLE_LABELS } from '../types';

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ students: 0, classes: 0, teachers: 0, payments: 0, attendanceRate: 0, subjects: 0 });
  const [loading, setLoading] = useState(true);

  const role: AppRole = profile?.role || 'parent';
  const estId = profile?.establishment_id;

  useEffect(() => {
    if (!estId && role !== 'super_admin') {
      setLoading(false);
      return;
    }
    loadStats();
  }, [estId, role]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const estFilter = role === 'super_admin' ? {} : { establishment_id: estId! };
      const [students, classes, teachers, payments, subjects] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).match(estFilter),
        supabase.from('classes').select('id', { count: 'exact', head: true }).match(estFilter),
        supabase.from('teachers').select('id', { count: 'exact', head: true }).match(estFilter),
        supabase.from('payments').select('montant', { count: 'exact' }).match({ ...estFilter, status: 'validé' }),
        supabase.from('subjects').select('id', { count: 'exact', head: true }).match(estFilter),
      ]);

      const totalPayments = payments.data?.reduce((sum, p) => sum + Number(p.montant || 0), 0) || 0;

      setStats({
        students: students.count || 0,
        classes: classes.count || 0,
        teachers: teachers.count || 0,
        payments: totalPayments,
        attendanceRate: 0,
        subjects: subjects.count || 0,
      });
    } catch (e) {
      console.error('Dashboard error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const roleLabel = ROLE_LABELS[role];

  return (
    <div className="space-y-6">
      <div className="card p-6 bg-gradient-to-r from-blue-700 to-blue-900 text-white">
        <h2 className="text-2xl font-bold mb-1">Bienvenue, {profile?.full_name || 'Utilisateur'}</h2>
        <p className="text-blue-100">Vous êtes connecté en tant que {roleLabel}.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Élèves inscrits" value={stats.students} color="blue" />
        <StatCard icon={School} label="Classes" value={stats.classes} color="green" />
        <StatCard icon={BookOpen} label="Enseignants" value={stats.teachers} color="amber" />
        <StatCard icon={GraduationCap} label="Matières" value={stats.subjects} color="purple" />
        <StatCard icon={CreditCard} label="Total paiements" value={`${stats.payments.toLocaleString('fr-FR')} FCFA`} color="green" />
        <StatCard icon={CalendarCheck} label="Taux présence" value={`${stats.attendanceRate}%`} color="blue" />
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Activité récente</h3>
        <p className="text-slate-500 text-sm">
          Les tableaux de bord détaillés, statistiques par classe et rapports pédagogiques
          sont disponibles dans les modules correspondants du menu latéral.
        </p>
      </div>
    </div>
  );
}
