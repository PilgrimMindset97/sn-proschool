import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS, type AppRole } from '../types';
import { LayoutDashboard, Users, GraduationCap, CreditCard, CalendarCheck, FileText, ShieldCheck, Settings, UserCog, School, BookOpen, LogOut, Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

export interface NavItem {
  key: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: AppRole[];
}

const ALL_ROLES: AppRole[] = [
  'super_admin', 'admin', 'directeur', 'directeur_etudes', 'surveillant_general',
  'surveillant_general_adjoint', 'personnel_administratif', 'comptable', 'secretaire',
  'censeur', 'enseignant',
];

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: ALL_ROLES },
  { key: 'students', label: 'Élèves', icon: Users, roles: ['super_admin','admin','directeur','directeur_etudes','secretaire','censeur'] },
  { key: 'grades', label: 'Notes & Bulletins', icon: GraduationCap, roles: ['super_admin','admin','directeur','directeur_etudes','censeur','enseignant'] },
  { key: 'attendance', label: 'Présences', icon: CalendarCheck, roles: ['super_admin','admin','directeur','directeur_etudes','surveillant_general','surveillant_general_adjoint','censeur','enseignant'] },
  { key: 'payments', label: 'Finances', icon: CreditCard, roles: ['super_admin','admin','directeur','comptable'] },
  { key: 'staff', label: 'Personnel', icon: UserCog, roles: ['super_admin','admin','directeur','censeur','surveillant_general'] },
  { key: 'teachers', label: 'Enseignants', icon: BookOpen, roles: ['super_admin','admin','directeur','directeur_etudes','censeur'] },
  { key: 'classes', label: 'Classes & Matières', icon: School, roles: ['super_admin','admin','directeur','directeur_etudes','censeur'] },
  { key: 'reports', label: 'Rapports', icon: FileText, roles: ['super_admin','admin','directeur','directeur_etudes','comptable','surveillant_general'] },
  { key: 'audit', label: "Journal d'audit", icon: ShieldCheck, roles: ['super_admin'] },
  { key: 'admins', label: 'Administrateurs', icon: UserCog, roles: ['super_admin'] },
  { key: 'establishments', label: 'Établissements', icon: School, roles: ['super_admin'] },
  { key: 'settings', label: 'Paramètres', icon: Settings, roles: ALL_ROLES },
];

interface LayoutProps {
  activePage: string;
  onPageChange: (key: string) => void;
  children: ReactNode;
}

export default function Layout({ activePage, onPageChange, children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role: AppRole = (profile?.role || 'parent') as AppRole;
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const activeItem = visibleItems.find((item) => item.key === activePage) || visibleItems[0];

  const handleNav = (key: string) => {
    onPageChange(key);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - desktop */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">SN ProSchool</p>
              <p className="text-xs text-slate-400">Gestion scolaire</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-160px)]">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNav(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-sm font-medium">
              {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name || 'Utilisateur'}</p>
              <p className="text-xs text-slate-400 truncate">{ROLE_LABELS[role]}</p>
            </div>
          </div>
          <button onClick={signOut} className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-600">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-slate-800">{activeItem?.label || 'Tableau de bord'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-slate-500">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
