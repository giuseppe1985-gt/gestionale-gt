import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Layout from './components/Layout';
import AdminDashboard from './pages/admin/AdminDashboard';
import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkersManagement from './pages/admin/WorkersManagement';
import WorksitesManagement from './pages/admin/WorksitesManagement';
import VehiclesManagement from './pages/admin/VehiclesManagement';
import ClientsManagement from './pages/admin/ClientsManagement';
import AssignmentsManagement from './pages/admin/AssignmentsManagement';
import TimeEntriesView from './pages/admin/TimeEntriesView';
import AnnouncementsManagement from './pages/admin/AnnouncementsManagement';
import LeaveBalancesManagement from './pages/admin/LeaveBalancesManagement';
import LeaveRequestsApproval from './pages/admin/LeaveRequestsApproval';
import AvailabilityCalendar from './pages/admin/AvailabilityCalendar';
import CardsManagement from './pages/admin/CardsManagement';
import TimeTracking from './pages/worker/TimeTracking';
import WorkerAssignments from './pages/worker/WorkerAssignments';
import LeaveRequests from './pages/worker/LeaveRequests';
import DailyReports from './pages/worker/DailyReports';
import AnnouncementsView from './pages/shared/AnnouncementsView';
import AllDailyReports from './pages/shared/AllDailyReports';
import CompanyRegulations from './pages/admin/CompanyRegulations';
import CompanyRegulationsView from './pages/shared/CompanyRegulationsView';
import AccountingManagement from './pages/admin/AccountingManagement';
import DeadlinesNotifications from './pages/shared/DeadlinesNotifications';
import CombinedTimeTracking from './pages/administrator/CombinedTimeTracking';
import CombinedLeaveRequests from './pages/administrator/CombinedLeaveRequests';
import Archive from './pages/admin/Archive';
import NotificationPermissionModal from './components/NotificationPermissionModal';

function AppContent() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showRegister, setShowRegister] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingUserId, setOnboardingUserId] = useState('');
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  useEffect(() => {
    if (user && profile && profile.organization_id) {
      const hasAskedPermission = localStorage.getItem('notificationPermissionAsked');
      if (!hasAskedPermission) {
        const timer = setTimeout(() => {
          setShowNotificationModal(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [user, profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    if (showRegister) {
      return (
        <Register
          onBackToLogin={() => setShowRegister(false)}
          onRegisterSuccess={(userId) => {
            setOnboardingUserId(userId);
            setNeedsOnboarding(true);
            setShowRegister(false);
          }}
        />
      );
    }
    return <Login onShowRegister={() => setShowRegister(true)} />;
  }

  if (user && (!profile || !profile.organization_id || needsOnboarding)) {
    return (
      <Onboarding
        userId={onboardingUserId || user.id}
        userEmail={user.email || ''}
        userFullName={user.user_metadata?.full_name || 'Utente'}
        onComplete={async () => {
          setNeedsOnboarding(false);
          // Small delay to ensure database is updated
          await new Promise(resolve => setTimeout(resolve, 500));
          await refreshProfile();
        }}
      />
    );
  }

  if (!profile) {
    return <Login onShowRegister={() => setShowRegister(true)} />;
  }

  const renderPage = () => {
    switch (profile.role) {
      case 'admin':
        switch (currentPage) {
          case 'dashboard':
            return <AdminDashboard />;
          case 'workers':
            return <WorkersManagement />;
          case 'worksites':
            return <WorksitesManagement />;
          case 'vehicles':
            return <VehiclesManagement />;
          case 'clients':
            return <ClientsManagement />;
          case 'assignments':
            return <AssignmentsManagement />;
          case 'time-entries':
            return <TimeEntriesView />;
          case 'daily-reports':
            return <AllDailyReports />;
          case 'leave-balances':
            return <LeaveBalancesManagement />;
          case 'leave-requests':
            return <LeaveRequestsApproval />;
          case 'availability':
            return <AvailabilityCalendar />;
          case 'announcements':
            return <AnnouncementsManagement />;
          case 'cards':
            return <CardsManagement />;
          case 'accounting':
            return <AccountingManagement />;
          case 'deadlines':
            return <DeadlinesNotifications />;
          case 'regulations':
            return <CompanyRegulations />;
          case 'archive':
            return <Archive />;
          default:
            return <AdminDashboard />;
        }

      case 'administrator':
        switch (currentPage) {
          case 'dashboard':
            return <AdminDashboard />;
          case 'workers':
            return <WorkersManagement />;
          case 'worksites':
            return <WorksitesManagement />;
          case 'vehicles':
            return <VehiclesManagement />;
          case 'clients':
            return <ClientsManagement />;
          case 'assignments':
            return <AssignmentsManagement />;
          case 'time-entries':
            return <CombinedTimeTracking />;
          case 'daily-reports':
            return <AllDailyReports />;
          case 'leave-balances':
            return <LeaveBalancesManagement />;
          case 'leave-requests':
            return <CombinedLeaveRequests />;
          case 'availability':
            return <AvailabilityCalendar />;
          case 'announcements':
            return <AnnouncementsManagement />;
          case 'cards':
            return <CardsManagement />;
          case 'accounting':
            return <AccountingManagement />;
          case 'deadlines':
            return <DeadlinesNotifications />;
          case 'regulations':
            return <CompanyRegulations />;
          case 'archive':
            return <Archive />;
          default:
            return <AdminDashboard />;
        }

      case 'org_manager':
        switch (currentPage) {
          case 'dashboard':
            return <AdminDashboard />;
          case 'workers':
            return <WorkersManagement />;
          case 'worksites':
            return <WorksitesManagement />;
          case 'vehicles':
            return <VehiclesManagement />;
          case 'clients':
            return <ClientsManagement />;
          case 'assignments':
            return <AssignmentsManagement />;
          case 'time-tracking':
            return <CombinedTimeTracking />;
          case 'daily-reports':
            return <AllDailyReports />;
          case 'leave-balances':
            return <LeaveBalancesManagement />;
          case 'leave-requests':
            return <CombinedLeaveRequests />;
          case 'availability':
            return <AvailabilityCalendar />;
          case 'announcements':
            return <AnnouncementsManagement />;
          case 'cards':
            return <CardsManagement />;
          case 'deadlines':
            return <DeadlinesNotifications />;
          case 'regulations':
            return <CompanyRegulationsView />;
          default:
            return <AdminDashboard />;
        }

      case 'sales_manager':
        switch (currentPage) {
          case 'dashboard':
            return <WorkerDashboard />;
          case 'time-tracking':
            return <TimeTracking />;
          case 'daily-reports':
            return <AllDailyReports />;
          case 'assignments':
            return <WorkerAssignments />;
          case 'leave-requests':
            return <LeaveRequests />;
          case 'clients':
            return <ClientsManagement />;
          case 'deadlines':
            return <DeadlinesNotifications />;
          case 'announcements':
            return <AnnouncementsManagement />;
          case 'regulations':
            return <CompanyRegulationsView />;
          default:
            return <WorkerDashboard />;
        }

      default:
        switch (currentPage) {
          case 'dashboard':
            return <WorkerDashboard />;
          case 'time-tracking':
            return <TimeTracking />;
          case 'daily-reports-worker':
            return <DailyReports />;
          case 'assignments':
            return <WorkerAssignments />;
          case 'leave-requests':
            return <LeaveRequests />;
          case 'deadlines':
            return <DeadlinesNotifications />;
          case 'announcements':
            return <AnnouncementsView />;
          case 'regulations':
            return <CompanyRegulationsView />;
          default:
            return <WorkerDashboard />;
        }
    }
  };

  return (
    <>
      <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
        {renderPage()}
      </Layout>
      {showNotificationModal && user && (
        <NotificationPermissionModal
          userId={user.id}
          onClose={() => setShowNotificationModal(false)}
        />
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
