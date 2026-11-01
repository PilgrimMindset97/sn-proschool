import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { useToast } from '../components/ui';
import { Lock, User } from 'lucide-react';
import { ROLE_LABELS } from '../types';

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { showToast, toastEl } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [changingPassword, setChangingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { showToast('Les mots de passe ne correspondent pas', 'error'); return; }
    if (newPassword.length < 6) { showToast('Le mot de passe doit contenir au moins 6 caractères', 'error'); return; }
    setChangingPassword(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      showToast('Mot de passe modifié avec succès');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e: unknown) { showToast('Erreur: ' + (e as Error).message, 'error'); }
    finally { setChangingPassword(false); }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile!.id);
      if (error) throw error;
      showToast('Profil mis à jour');
      refreshProfile();
    } catch (e: unknown) { showToast('Erreur: ' + (e as Error).message, 'error'); }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {toastEl}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><User className="w-5 h-5" /> Mon profil</h3>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div><label className="label">Nom complet</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" /></div>
          <div><label className="label">E-mail</label><input value={profile?.email || ''} disabled className="input bg-slate-50" /></div>
          <div><label className="label">Rôle</label><input value={profile ? ROLE_LABELS[profile.role as keyof typeof ROLE_LABELS] : ''} disabled className="input bg-slate-50" /></div>
          <button type="submit" className="btn-primary">Enregistrer</button>
        </form>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><Lock className="w-5 h-5" /> Modifier mon mot de passe</h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div><label className="label">Nouveau mot de passe</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="input" placeholder="••••••••" /></div>
          <div><label className="label">Confirmer le nouveau mot de passe</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} className="input" placeholder="••••••••" /></div>
          <button type="submit" disabled={changingPassword} className="btn-primary">{changingPassword ? 'En cours...' : 'Modifier le mot de passe'}</button>
        </form>
      </div>
    </div>
  );
}
