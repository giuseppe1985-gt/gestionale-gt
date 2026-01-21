import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, Plus, Trash2, AlertCircle, Info, Bell, FileText, Download, Upload, User, Users, Check } from 'lucide-react';
import { Database } from '../../lib/database.types';
import { notifyNewAnnouncement } from '../../lib/notifications';

type Announcement = Database['public']['Tables']['announcements']['Row'] & {
  worksite?: { name: string } | null;
  target_worker?: { full_name: string } | null;
  creator?: { full_name: string; avatar_url: string | null } | null;
};

// Tipo per annunci raggruppati (quando inviati a multipli lavoratori)
type GroupedAnnouncement = Announcement & {
  target_workers?: { id: string; full_name: string }[];
  grouped_ids?: string[]; // IDs degli annunci raggruppati per eliminazione multipla
};

type Worksite = Database['public']['Tables']['worksites']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export default function AnnouncementsManagement() {
  const { user, profile } = useAuth();
  const [announcements, setAnnouncements] = useState<GroupedAnnouncement[]>([]);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Gestionale GT non ha sistema piani - sempre attivo
  const canPerformActions = true;

  // Ruoli che vedono tutti gli annunci raggruppati
  const canSeeAllAnnouncements = profile?.role === 'admin' || profile?.role === 'administrator' || profile?.role === 'org_manager';
  
  // Ruoli che possono creare annunci (tutti tranne operai)
  const canCreateAnnouncements = profile?.role !== 'worker';

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'normal' as 'normal' | 'important' | 'urgent',
    target_audience: 'all' as 'all' | 'specific' | 'worker' | 'workers',
    target_worksite_id: '',
    target_worker_id: '',
    target_worker_ids: [] as string[],
    expires_at: new Date().toISOString().split('T')[0],
  });

  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (announcementsError) {
        console.error('Error loading announcements:', announcementsError);
      }

      const { data: worksitesData } = await supabase
        .from('worksites')
        .select('*')
        .order('name');

      // Carica tutti i lavoratori (tutti i ruoli)
      const { data: workersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'active')
        .order('full_name');

      // Ruoli che vedono tutti gli annunci raggruppati
      const isFullAccessRole = profile?.role === 'admin' || profile?.role === 'administrator' || profile?.role === 'org_manager';
      
      let processedAnnouncements: GroupedAnnouncement[] = [];

      if (isFullAccessRole) {
        // Admin/Amministratore/Org Manager: raggruppa annunci multipli
        const groupedMap = new Map<string, GroupedAnnouncement>();
        
        (announcementsData || []).forEach(announcement => {
          // Crea chiave di raggruppamento: titolo + messaggio + created_by + minuto creazione
          const createdAtMinute = announcement.created_at?.substring(0, 16) || ''; // YYYY-MM-DDTHH:MM
          const groupKey = `${announcement.title}|${announcement.message}|${announcement.created_by}|${createdAtMinute}|${announcement.priority}`;
          
          const creator = workersData?.find(w => w.id === announcement.created_by);
          const targetWorker = announcement.target_worker_id 
            ? workersData?.find(w => w.id === announcement.target_worker_id)
            : null;
          
          if (groupedMap.has(groupKey) && announcement.target_audience === 'worker') {
            // Aggiungi al gruppo esistente
            const existing = groupedMap.get(groupKey)!;
            if (targetWorker) {
              existing.target_workers = existing.target_workers || [];
              existing.target_workers.push({ id: targetWorker.id, full_name: targetWorker.full_name });
            }
            existing.grouped_ids = existing.grouped_ids || [existing.id];
            existing.grouped_ids.push(announcement.id);
          } else {
            // Nuovo annuncio o primo del gruppo
            const newAnnouncement: GroupedAnnouncement = {
              ...announcement,
              worksite: announcement.target_worksite_id
                ? worksitesData?.find(w => w.id === announcement.target_worksite_id)
                : null,
              target_worker: targetWorker ? { full_name: targetWorker.full_name } : null,
              creator: creator ? { full_name: creator.full_name, avatar_url: creator.avatar_url } : null,
              target_workers: targetWorker ? [{ id: targetWorker.id, full_name: targetWorker.full_name }] : undefined,
              grouped_ids: [announcement.id],
            };
            groupedMap.set(groupKey, newAnnouncement);
          }
        });
        
        processedAnnouncements = Array.from(groupedMap.values());
      } else {
        // Altri ruoli: vedono solo i propri annunci
        const filteredAnnouncements = (announcementsData || []).filter(announcement => {
          // Annunci per tutti
          if (announcement.target_audience === 'all') {
            return true;
          }
          // Annunci destinati a loro
          if (announcement.target_audience === 'worker' && announcement.target_worker_id === user?.id) {
            return true;
          }
          // Annunci per un cantiere specifico
          if (announcement.target_audience === 'specific') {
            return true;
          }
          return false;
        });

        processedAnnouncements = filteredAnnouncements.map(announcement => {
          const creator = workersData?.find(w => w.id === announcement.created_by);
          return {
            ...announcement,
            worksite: announcement.target_worksite_id
              ? worksitesData?.find(w => w.id === announcement.target_worksite_id)
              : null,
            target_worker: announcement.target_worker_id
              ? { full_name: workersData?.find(w => w.id === announcement.target_worker_id)?.full_name || '' }
              : null,
            creator: creator ? { full_name: creator.full_name, avatar_url: creator.avatar_url } : null,
            grouped_ids: [announcement.id],
          };
        });
      }

      setAnnouncements(processedAnnouncements);
      setWorksites(worksitesData || []);
      setWorkers(workersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let attachmentUrl = null;
      let attachmentName = null;

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${profile?.organization_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('announcements')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        attachmentUrl = filePath;
        attachmentName = selectedFile.name;
      }

      const expiresAt = new Date(formData.expires_at);
      expiresAt.setHours(23, 59, 59, 999);

      // Se sono selezionati multipli lavoratori, crea un annuncio per ognuno
      if (formData.target_audience === 'workers' && formData.target_worker_ids.length > 0) {
        const announcementsToCreate = formData.target_worker_ids.map(workerId => ({
          title: formData.title,
          message: formData.message,
          priority: formData.priority,
          target_audience: 'worker' as const,
          target_worksite_id: null,
          target_worker_id: workerId,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
          created_by: user?.id || '',
          organization_id: profile?.organization_id,
          expires_at: expiresAt.toISOString(),
        }));

        const { data: newAnnouncements, error } = await supabase
          .from('announcements')
          .insert(announcementsToCreate)
          .select();

        if (error) throw error;

        // Invia notifiche a tutti i lavoratori selezionati
        if (newAnnouncements && profile?.organization_id) {
          for (const announcement of newAnnouncements) {
            await notifyNewAnnouncement({
              announcementId: announcement.id,
              title: formData.title,
              organizationId: profile.organization_id,
              targetAudience: 'worker',
              targetWorkerId: announcement.target_worker_id,
              targetWorksiteId: null,
            });
          }
        }
      } else {
        // Comportamento originale per singolo lavoratore o altri destinatari
        const { data: newAnnouncement, error } = await supabase.from('announcements').insert({
          title: formData.title,
          message: formData.message,
          priority: formData.priority,
          target_audience: formData.target_audience === 'workers' ? 'worker' : formData.target_audience,
          target_worksite_id: formData.target_audience === 'specific' ? formData.target_worksite_id : null,
          target_worker_id: formData.target_audience === 'worker' ? formData.target_worker_id : null,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
          created_by: user?.id || '',
          organization_id: profile?.organization_id,
          expires_at: expiresAt.toISOString(),
        }).select().single();

        if (error) throw error;

        if (newAnnouncement && profile?.organization_id) {
          await notifyNewAnnouncement({
            announcementId: newAnnouncement.id,
            title: formData.title,
            organizationId: profile.organization_id,
            targetAudience: formData.target_audience,
            targetWorkerId: formData.target_audience === 'worker' ? formData.target_worker_id : null,
            targetWorksiteId: formData.target_audience === 'specific' ? formData.target_worksite_id : null,
          });
        }
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert('Errore durante la creazione dell\'annuncio');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (announcementId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo annuncio?')) return;

    try {
      const announcement = announcements.find(a => a.id === announcementId);

      if (announcement?.attachment_url) {
        await supabase.storage
          .from('announcements')
          .remove([announcement.attachment_url]);
      }

      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId);

      if (error) throw error;

      loadData();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Errore durante l\'eliminazione dell\'annuncio');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      priority: 'normal',
      target_audience: 'all',
      target_worksite_id: '',
      target_worker_id: '',
      target_worker_ids: [],
      expires_at: new Date().toISOString().split('T')[0],
    });
    setSelectedFile(null);
    setShowWorkerDropdown(false);
  };

  const handleDownloadAttachment = async (attachmentUrl: string, attachmentName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('announcements')
        .download(attachmentUrl);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachmentName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Errore durante il download del file');
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="w-5 h-5" />;
      case 'important':
        return <Bell className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-900/30 border-red-500/50 text-red-400';
      case 'important':
        return 'bg-white border-blue-400 text-blue-500';
      default:
        return 'bg-white border-gray-300 text-gray-900';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Urgente';
      case 'important':
        return 'Importante';
      default:
        return 'Normale';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTargetLabel = (announcement: GroupedAnnouncement) => {
    if (announcement.target_audience === 'all') {
      return 'Tutti i lavoratori';
    } else if (announcement.target_audience === 'worker') {
      // Controlla se ci sono più lavoratori destinatari (raggruppati)
      if (announcement.target_workers && announcement.target_workers.length > 1) {
        const names = announcement.target_workers.map(w => w.full_name).join(', ');
        return `Lavoratori: ${names}`;
      } else if (announcement.target_worker) {
        return `Lavoratore: ${announcement.target_worker.full_name}`;
      }
    } else if (announcement.target_audience === 'specific' && announcement.worksite) {
      return `Cantiere: ${announcement.worksite.name}`;
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestione Annunci</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Crea e gestisci le comunicazioni per i lavoratori</p>
        </div>
        {/* Operai non possono creare annunci */}
        {canCreateAnnouncements && (
          <button
            onClick={() => {
              if (!canPerformActions) return;
              resetForm();
              setShowModal(true);
            }}
            disabled={!canPerformActions}
            className={`flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg transition-all w-full sm:w-auto ${!canPerformActions ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gradient-to-r from-blue-900 to-blue-700-hover'}`}
          >
            <Plus className="w-5 h-5" />
            <span>Nuovo Annuncio</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nessun annuncio pubblicato</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`border-2 rounded-xl p-6 ${getPriorityColor(announcement.priority)}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start space-x-3">
                  {getPriorityIcon(announcement.priority)}
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg sm:text-xl font-semibold">{announcement.title}</h3>
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                        {getPriorityLabel(announcement.priority)}
                      </span>
                    </div>
                    <p className="text-sm opacity-75">
                      {formatDate(announcement.created_at)}
                    </p>
                    {/* FIX: Mostra l'autore dell'annuncio */}
                    {announcement.creator && (
                      <div className="flex items-center gap-2 mt-2">
                        {announcement.creator.avatar_url ? (
                          <img 
                            src={announcement.creator.avatar_url} 
                            alt={announcement.creator.full_name}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 opacity-75" />
                        )}
                        <span className="text-sm opacity-75">
                          Pubblicato da <strong>{announcement.creator.full_name}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Solo admin può eliminare tutto, gli altri solo i propri */}
                {(profile?.role === 'admin' || announcement.created_by === user?.id) && (
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={!canPerformActions}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <p className="text-base mb-4 whitespace-pre-wrap">{announcement.message}</p>

              {announcement.attachment_url && announcement.attachment_name && (
                <div className="mb-4">
                  <button
                    onClick={() => handleDownloadAttachment(announcement.attachment_url!, announcement.attachment_name!)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">{announcement.attachment_name}</span>
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center space-x-4 text-sm">
                <span className="px-3 py-1 bg-gray-100 rounded">
                  {getTargetLabel(announcement)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg sm:max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuovo Annuncio</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Titolo *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  placeholder="Oggetto dell'annuncio"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Messaggio *
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={5}
                  required
                  placeholder="Scrivi il messaggio dell'annuncio..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Allegato (Opzionale)
                </label>
                <div className="flex items-center space-x-3">
                  <label className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-center space-x-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors">
                      <Upload className="w-5 h-5 text-gray-600" />
                      <span className="text-sm text-gray-600">
                        {selectedFile ? selectedFile.name : 'Carica PDF o altro file'}
                      </span>
                    </div>
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.txt"
                    />
                  </label>
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      Rimuovi
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Formati supportati: PDF, DOC, DOCX, TXT (max 10MB)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Priorità *
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: e.target.value as 'normal' | 'important' | 'urgent',
                    })
                  }
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                >
                  <option value="normal">Normale</option>
                  <option value="important">Importante</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Destinatari *
                </label>
                <select
                  value={formData.target_audience}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      target_audience: e.target.value as 'all' | 'specific' | 'worker' | 'workers',
                      target_worksite_id: '',
                      target_worker_id: '',
                      target_worker_ids: [],
                    });
                    setShowWorkerDropdown(false);
                  }}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                >
                  <option value="all">Tutti i lavoratori</option>
                  <option value="specific">Cantiere specifico</option>
                  <option value="worker">Lavoratore singolo</option>
                  <option value="workers">Lavoratori specifici (multipli)</option>
                </select>
              </div>

              {formData.target_audience === 'specific' && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Cantiere *
                  </label>
                  <select
                    value={formData.target_worksite_id}
                    onChange={(e) =>
                      setFormData({ ...formData, target_worksite_id: e.target.value })
                    }
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                    required
                  >
                    <option value="">Seleziona cantiere</option>
                    {worksites.map((worksite) => (
                      <option key={worksite.id} value={worksite.id}>
                        {worksite.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.target_audience === 'worker' && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Lavoratore *
                  </label>
                  <select
                    value={formData.target_worker_id}
                    onChange={(e) =>
                      setFormData({ ...formData, target_worker_id: e.target.value })
                    }
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                    required
                  >
                    <option value="">Seleziona lavoratore</option>
                    {workers.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {worker.full_name} {worker.position ? `(${worker.position})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.target_audience === 'workers' && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Lavoratori * ({formData.target_worker_ids.length} selezionati)
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowWorkerDropdown(!showWorkerDropdown)}
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                    >
                      {formData.target_worker_ids.length === 0
                        ? 'Seleziona lavoratori...'
                        : `${formData.target_worker_ids.length} lavoratori selezionati`}
                    </button>
                    
                    {showWorkerDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <div className="p-2 border-b border-gray-300">
                          <button
                            type="button"
                            onClick={() => {
                              if (formData.target_worker_ids.length === workers.length) {
                                setFormData({ ...formData, target_worker_ids: [] });
                              } else {
                                setFormData({ ...formData, target_worker_ids: workers.map(w => w.id) });
                              }
                            }}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {formData.target_worker_ids.length === workers.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                          </button>
                        </div>
                        {workers.map((worker) => (
                          <label
                            key={worker.id}
                            className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.target_worker_ids.includes(worker.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    target_worker_ids: [...formData.target_worker_ids, worker.id],
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    target_worker_ids: formData.target_worker_ids.filter(id => id !== worker.id),
                                  });
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-3 text-sm text-gray-900">
                              {worker.full_name} {worker.position ? `(${worker.position})` : ''}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.target_worker_ids.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {formData.target_worker_ids.slice(0, 5).map(id => {
                        const worker = workers.find(w => w.id === id);
                        return worker ? (
                          <span
                            key={id}
                            className="inline-flex items-center px-2 py-1 text-xs bg-gradient-to-r from-blue-900 to-blue-700/20 text-blue-600 rounded-full"
                          >
                            {worker.full_name}
                            <button
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                target_worker_ids: formData.target_worker_ids.filter(wid => wid !== id),
                              })}
                              className="ml-1 hover:text-red-400"
                            >
                              ×
                            </button>
                          </span>
                        ) : null;
                      })}
                      {formData.target_worker_ids.length > 5 && (
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded-full">
                          +{formData.target_worker_ids.length - 5} altri
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Data di Scadenza
                </label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-600 mt-1">
                  L'annuncio scadrà alla fine del giorno selezionato (23:59:59)
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-gray-100 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 py-2 rounded-lg hover:bg-gradient-to-r from-blue-900 to-blue-700-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Caricamento in corso...' : 'Pubblica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
