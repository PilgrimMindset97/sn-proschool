import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import StudentsPage from './pages/StudentsPage';
import GradesPage from './pages/GradesPage';
import AttendancePage from './pages/AttendancePage';
import PaymentsPage from './pages/PaymentsPage';
import StaffPage from './pages/StaffPage';
import TeachersPage from './pages/TeachersPage';
import ClassesPage from './pages/ClassesPage';
import ReportsPage from './pages/ReportsPage';
import AuditPage from './pages/AuditPage';
import AdminsPage from './pages/AdminsPage';
import EstablishmentsPage from './pages/EstablishmentsPage';
import SettingsPage from './pages/SettingsPage';
import ParentPortalPage from './pages/ParentPortalPage';

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');

  useEffect(() => {
    if (profile?.role === 'parent') {
      setActivePage('parent-portal');
    } else {
      setActivePage('dashboard');
    }
  }, [profile?.role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session || !profile) {
    return <LoginPage />;
  }

  if (!profile.active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="card p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Compte bloqué</h2>
          <p className="text-slate-600 mb-4">Votre compte a été désactivé. Contactez l'administrateur de votre établissement.</p>
          <button onClick={() => useAuth().signOut()} className="btn-primary">Retour à la connexion</button>
        </div>
      </div>
    );
  }

  if (profile.role === 'parent') {
    return <ParentPortalPage />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'students': return <StudentsPage />;
      case 'grades': return <GradesPage />;
      case 'attendance': return <AttendancePage />;
      case 'payments': return <PaymentsPage />;
      case 'staff': return <StaffPage />;
      case 'teachers': return <TeachersPage />;
      case 'classes': return <ClassesPage />;
      case 'reports': return <ReportsPage />;
      case 'audit': return <AuditPage />;
      case 'admins': return <AdminsPage />;
      case 'establishments': return <EstablishmentsPage />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activePage={activePage} onPageChange={setActivePage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
