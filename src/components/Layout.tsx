import { ReactNode, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Building2, Users, Calendar, MessageSquare, LayoutDashboard, Clock, Truck, FileText, CalendarCheck, CalendarClock, CreditCard, UserCheck, BookOpen, Receipt, Bell, ClipboardList, Archive, Camera, X, Menu } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export default function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const { profile, signOut, isAdmin, refreshProfile } = useAuth();
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile?.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile?.id);

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(publicUrl);
      setShowAvatarModal(false);
      
      if (refreshProfile) {
        await refreshProfile();
      }
      
      alert('Immagine profilo aggiornata!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Errore nel caricamento dell\'immagine');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setUploading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', profile?.id);

      if (error) throw error;

      setAvatarUrl(null);
      setShowAvatarModal(false);
      
      if (refreshProfile) {
        await refreshProfile();
      }
      
      alert('Immagine profilo rimossa!');
    } catch (error) {
      console.error('Error removing avatar:', error);
      alert('Errore nella rimozione dell\'immagine');
    } finally {
      setUploading(false);
    }
  };

  const handlePageChange = (page: string) => {
    onPageChange(page);
    setShowMobileMenu(false);
  };

  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'announcements', label: 'Annunci', icon: MessageSquare },
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
    { id: 'cards', label: 'Carte', icon: CreditCard },
    { id: 'accounting', label: 'Contabilità', icon: Receipt },
    { id: 'deadlines', label: 'Scadenze', icon: Bell },
    { id: 'regulations', label: 'Regolamento', icon: BookOpen },
    { id: 'archive', label: 'Archivio', icon: Archive },
  ];

  const workerMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'announcements', label: 'Annunci', icon: MessageSquare },
    { id: 'time-tracking', label: 'Timbratura', icon: Clock },
    { id: 'daily-reports-worker', label: 'Rapportini', icon: ClipboardList },
    { id: 'assignments', label: 'Assegnazioni', icon: Calendar },
    { id: 'leave-requests', label: 'Permessi', icon: FileText },
    { id: 'deadlines', label: 'Scadenze', icon: Bell },
    { id: 'regulations', label: 'Regolamento', icon: BookOpen },
  ];

  const salesManagerMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'announcements', label: 'Annunci', icon: MessageSquare },
    { id: 'time-tracking', label: 'Timbratura', icon: Clock },
    { id: 'daily-reports', label: 'Rapportini', icon: ClipboardList },
    { id: 'assignments', label: 'Assegnazioni', icon: Calendar },
    { id: 'leave-requests', label: 'Permessi', icon: FileText },
    { id: 'clients', label: 'Clienti', icon: UserCheck },
    { id: 'deadlines', label: 'Scadenze', icon: Bell },
    { id: 'regulations', label: 'Regolamento', icon: BookOpen },
  ];

  const orgManagerMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'announcements', label: 'Annunci', icon: MessageSquare },
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
    { id: 'cards', label: 'Carte', icon: CreditCard },
    { id: 'deadlines', label: 'Scadenze', icon: Bell },
    { id: 'regulations', label: 'Regolamento', icon: BookOpen },
  ];

  const administratorMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'announcements', label: 'Annunci', icon: MessageSquare },
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
  const currentMenuItem = menuItems.find(item => item.id === currentPage);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center shadow-md p-1 flex-shrink-0">
                <img src="/logo.jpg" alt="GT Logo" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold truncate">Gestione Cantieri</h1>
                <p className="text-[10px] sm:text-xs text-blue-200 truncate">
                  {profile?.role === 'admin' ? 'Pannello Amministratore' :
                   profile?.role === 'administrator' ? 'Portale Amministratore' :
                   profile?.role === 'org_manager' ? 'Resp. Organizzazione' :
                   profile?.role === 'sales_manager' ? 'Resp. Commerciale' :
                   'Portale Lavoratore'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <NotificationBell />
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium">{profile?.full_name}</p>
                <p className="text-xs text-blue-200">{profile?.position || profile?.role}</p>
              </div>
              <button
                onClick={() => setShowAvatarModal(true)}
                className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-blue-400 hover:border-white transition-colors cursor-pointer flex-shrink-0"
                title="Cambia foto profilo"
              >
                {avatarUrl || profile?.avatar_url ? (
                  <img 
                    src={avatarUrl || profile?.avatar_url || ''} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm sm:text-lg">
                    {profile?.full_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </button>
              <button
                onClick={() => signOut()}
                className="flex items-center space-x-2 bg-blue-800 hover:bg-blue-700 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Esci</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Button + Current Page Indicator */}
      <div className="md:hidden bg-white border-b border-gray-200 shadow-sm">
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <div className="flex items-center space-x-2">
            {currentMenuItem && <currentMenuItem.icon className="w-5 h-5 text-blue-600" />}
            <span className="font-medium text-gray-900">{currentMenuItem?.label || 'Menu'}</span>
          </div>
          <Menu className="w-5 h-5 text-gray-500" />
        </button>
        
        {/* Mobile Dropdown Menu */}
        {showMobileMenu && (
          <div className="absolute left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-40 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-1 p-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handlePageChange(item.id)}
                    className={`flex items-center space-x-2 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === item.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`flex items-center space-x-2 px-3 lg:px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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

      {/* Overlay for mobile menu */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-30 md:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </main>

      {showAvatarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Foto Profilo</h2>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex flex-col items-center space-y-4">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-gray-200">
                {avatarUrl || profile?.avatar_url ? (
                  <img 
                    src={avatarUrl || profile?.avatar_url || ''} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-3xl sm:text-4xl">
                    {profile?.full_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
              
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base"
                >
                  <Camera className="w-4 h-4" />
                  {uploading ? 'Caricamento...' : 'Carica Foto'}
                </button>
                
                {(avatarUrl || profile?.avatar_url) && (
                  <button
                    onClick={handleRemoveAvatar}
                    disabled={uploading}
                    className="flex items-center gap-2 bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm sm:text-base"
                  >
                    Rimuovi
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
