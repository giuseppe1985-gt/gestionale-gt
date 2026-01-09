import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Building2, Users, Calendar, MessageSquare, LayoutDashboard, Clock, Truck, FileText, CalendarCheck, CalendarClock, CreditCard, UserCheck, BookOpen, Receipt, Bell, ClipboardList, Archive } from 'lucide-react';
import NotificationBell from './NotificationBell';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export default function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const { profile, signOut, isAdmin } = useAuth();

  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'workers', label: 'Lavoratori', icon: Users },
    { id: 'worksites', label: 'Cantieri', icon: Building2 },
    { id: 'vehicles', label: 'Furgoni', icon: Truck },
    { id: 'clients', label: 'Clienti', icon: UserCheck },
    { id: 'assignments', label: 'Assegnazioni', icon: Calendar },
    { id: 'time-entries', label: 'Timbrature', icon: Clock },
    { id: 'daily-reports', label: 'Rapportini', icon: ClipboardList },
    { id: 'leave-balances', label: 'Monte Ore', icon: CalendarClock },
    { id: 'leave-requests', label: 'Richieste Permessi', icon: FileText },
    { id: 'availability', label: 'Disponibilità', icon: CalendarCheck },
    { id: 'announcements', label: 'Annunci', icon: MessageSquare },
    { id: 'cards', label: 'Carte', icon: CreditCard },
    { id: 'accounting', label: 'Contabilità', icon: Receipt },
    { id: 'deadlines', label: 'Scadenze', icon: Bell },
    { id: 'regulations', label: 'Regolamento', icon: BookOpen },
    { id: 'archive', label: 'Archivio', icon: Archive },
  ];

  const workerMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'time-tracking', label: 'Timbratura', icon: Clock },
    { id: 'daily-reports-worker', label: 'Rapportini', icon: ClipboardList },
    { id: 'assignments', label: 'Assegnazioni', icon: Calendar },
    { id: 'leave-requests', label: 'Permessi', icon: FileText },
    { id: 'deadlines', label: 'Scadenze', icon: Bell },
    { id: 'announcements', label: 'Annunci', icon: MessageSquare },
    { id: 'regulations', label: 'Regolamento', icon: BookOpen },
  ];

  const salesManagerMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'time-tracking', label: 'Timbratura', icon: Clock },
    { id: 'daily-reports', label: 'Rapportini', icon: ClipboardList },
    { id: 'assignments', label: 'Assegnazioni', icon: Calendar },
    { id: 'leave-requests', label: 'Permessi', icon: FileText },
    { id: 'clients', label: 'Clienti', icon: UserCheck },
    { id: 'deadlines', label: 'Scadenze', icon: Bell },
    { id: 'announcements', label: 'Annunci', icon: MessageSquare },
    { id: 'regulations', label: 'Regolamento', icon: BookOpen },
  ];

  const orgManagerMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'workers', label: 'Lavoratori', icon: Users },
    { id: 'worksites', label: 'Cantieri', icon: Building2 },
    { id: 'vehicles', label: 'Furgoni', icon: Truck },
    { id: 'clients', label: 'Clienti', icon: UserCheck },
    { id: 'assignments', label: 'Assegnazioni', icon: Calendar },
    { id: 'time-tracking', label: 'Timbratura', icon: Clock },
    { id: 'daily-reports', label: 'Rapportini', icon: ClipboardList },
    { id: 'leave-balances', label: 'Monte Ore', icon: CalendarClock },
    { id: 'leave-requests', label: 'Richieste Permessi', icon: FileText },
    { id: 'availability', label: 'Disponibilità', icon: CalendarCheck },
    { id: 'announcements', label: 'Annunci', icon: MessageSquare },
    { id: 'cards', label: 'Carte', icon: CreditCard },
    { id: 'deadlines', label: 'Scadenze', icon: Bell },
    { id: 'regulations', label: 'Regolamento', icon: BookOpen },
  ];

  const administratorMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'workers', label: 'Lavoratori', icon: Users },
    { id: 'worksites', label: 'Cantieri', icon: Building2 },
    { id: 'vehicles', label: 'Furgoni', icon: Truck },
    { id: 'clients', label: 'Clienti', icon: UserCheck },
    { id: 'assignments', label: 'Assegnazioni', icon: Calendar },
    { id: 'time-entries', label: 'Timbrature', icon: Clock },
    { id: 'daily-reports', label: 'Rapportini', icon: ClipboardList },
    { id: 'leave-balances', label: 'Monte Ore', icon: CalendarClock },
    { id: 'leave-requests', label: 'Richieste Permessi', icon: FileText },
    { id: 'availability', label: 'Disponibilità', icon: CalendarCheck },
    { id: 'announcements', label: 'Annunci', icon: MessageSquare },
    { id: 'cards', label: 'Carte', icon: CreditCard },
    { id: 'accounting', label: 'Contabilità', icon: Receipt },
    { id: 'deadlines', label: 'Scadenze', icon: Bell },
    { id: 'regulations', label: 'Regolamento', icon: BookOpen },
    { id: 'archive', label: 'Archivio', icon: Archive },
  ];

  const getMenuItems = () => {
    switch (profile?.role) {
      case 'admin':
        return adminMenuItems;
      case 'administrator':
        return administratorMenuItems;
      case 'org_manager':
        return orgManagerMenuItems;
      case 'sales_manager':
        return salesManagerMenuItems;
      default:
        return workerMenuItems;
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md p-1">
                <img src="/logo.jpg" alt="GT Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Gestione Cantieri</h1>
                <p className="text-xs text-blue-200">
                  {profile?.role === 'admin' ? 'Pannello Amministratore' :
                   profile?.role === 'administrator' ? 'Portale Amministratore' :
                   profile?.role === 'org_manager' ? 'Responsabile Organizzazione' :
                   profile?.role === 'sales_manager' ? 'Responsabile Commerciale' :
                   'Portale Lavoratore'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <NotificationBell />
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{profile?.full_name}</p>
                <p className="text-xs text-blue-200">{profile?.position || profile?.role}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center space-x-2 bg-blue-800 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Esci</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    currentPage === item.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
