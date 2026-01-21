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
  target_workers?: { id: string; full_name: string }[];
  grouped_ids?: string[];
};
type Worksite = Database['public']['Tables']['worksites']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export default function AnnouncementsManagement() {
  const { user, profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);

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

      const { data: workersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'active')
        .order('full_name');

      // Raggruppa annunci inviati a più lavoratori contemporaneamente
      const groupedMap = new Map<string, Announcement>();
      
      (announcementsData || []).forEach(announcement => {
        const createdAtMinute = announcement.created_at?.substring(0, 16) || '';
        const groupKey = `${announcement.title}|${announcement.message}|${announcement.created_by}|${createdAtMinute}|${announcement.priority}`;
        
        const creator = workersData?.find(w => w.id === announcement.created_by);
        const targetWorker = announcement.target_worker_id 
          ? workersData?.find(w => w.id === announcement.target_worker_id)
          : null;
        
        if (groupedMap.has(groupKey) && announcement.target_audience === 'worker') {
          const existing = groupedMap.get(groupKey)!;
          if (targetWorker) {
            existing.target_workers = existing.target_workers || [];
            existing.target_workers.push({ id: targetWorker.id, full_name: targetWorker.full_name });
          }
          existing.grouped_ids = existing.grouped_ids || [existing.id];
          existing.grouped_ids.push(announcement.id);
        } else {
          const newAnnouncement: Announcement = {
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

      setAnnouncements(Array.from(groupedMap.values()));
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

    try {
      setUploading(true);

      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user!.id}_${Date.now()}.${fileExt}`;
        const filePath = `announcements/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('announcement-attachments')
          .upload(filePath, selectedFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          alert('Errore durante il caricamento del file');
          setUploading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('announcement-attachments')
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
        attachmentName = selectedFile.name;
      }

      const expiresAtEndOfDay = formData.expires_at
        ? `${formData.expires_at}T23:59:59`
        : null;

      // Se target_audience è 'workers', crea un annuncio per ogni lavoratore selezionato
      if (formData.target_audience === 'workers' && formData.target_worker_ids.length > 0) {
        const announcements = formData.target_worker_ids.map(workerId => ({
          title: formData.title,
          message: formData.message,
          priority: formData.priority,
          target_audience: 'worker' as const,
          target_worker_id: workerId,
          created_by: user!.id,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
          expires_at: expiresAtEndOfDay,
        }));

        const { error } = await supabase
          .from('announcements')
          .insert(announcements);

        if (error) throw error;

        // Notifica tutti i lavoratori selezionati
        await notifyNewAnnouncement(formData.target_worker_ids, formData.title);
      } else {
        // Comportamento originale per altri target_audience
        const { data: newAnnouncement, error } = await supabase
          .from('announcements')
          .insert({
            title: formData.title,
            message: formData.message,
            priority: formData.priority,
            target_audience: formData.target_audience === 'workers' ? 'worker' : formData.target_audience,
            target_worksite_id: formData.target_audience === 'specific' ? formData.target_worksite_id : null,
            target_worker_id: formData.target_audience === 'worker' ? formData.target_worker_id : null,
            created_by: user!.id,
            attachment_url: attachmentUrl,
            attachment_name: attachmentName,
            expires_at: expiresAtEndOfDay,
          })
          .select()
          .single();

        if (error) throw error;

        // Notifiche
        if (formData.target_audience === 'all') {
          const workerIds = workers.map(w => w.id);
          await notifyNewAnnouncement(workerIds, formData.title);
        } else if (formData.target_audience === 'worker' && formData.target_worker_id) {
          await notifyNewAnnouncement([formData.target_worker_id], formData.title);
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

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo annuncio?')) return;

    try {
      const announcement = announcements.find(a => a.id === id);
      const idsToDelete = announcement?.grouped_ids || [id];

      const { error } = await supabase
        .from('announcements')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      loadData();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Errore durante l\'eliminazione');
    }
  };

  const handleDownloadAttachment = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Errore durante il download del file');
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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      case 'important':
        return <Bell className="w-6 h-6 text-yellow-500" />;
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 border-red-300 text-red-900';
      case 'important':
        return 'bg-yellow-50 border-yellow-300 text-yellow-900';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-900';
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

  const getTargetLabel = (announcement: Announcement) => {
    if (announcement.target_audience === 'all') {
      return 'Tutti i lavoratori';
    } else if (announcement.target_audience === 'worker') {
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

  const toggleWorkerSelection = (workerId: string) => {
    setFormData(prev => ({
      ...prev,
      target_worker_ids: prev.target_worker_ids.includes(workerId)
        ? prev.target_worker_ids.filter(id => id !== workerId)
        : [...prev.target_worker_ids, workerId]
    }));
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
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Gestione Annunci</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Crea e gestisci le comunicazioni per i lavoratori</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Nuovo Annuncio</span>
        </button>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-8 sm:py-12 bg-white rounded-xl shadow-md">
            <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nessun annuncio pubblicato</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`border-2 rounded-xl p-4 sm:p-6 ${getPriorityColor(announcement.priority)}`}
            >
              <div className="flex justify-between items-start mb-4 sm:mb-4">
                <div className="flex items-start space-x-2 sm:space-x-3 min-w-0 flex-1">
                  {getPriorityIcon(announcement.priority)}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-lg sm:text-xl font-semibold truncate">{announcement.title}</h3>
                      <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded whitespace-nowrap">
                        {getPriorityLabel(announcement.priority)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm opacity-75">
                      {formatDate(announcement.created_at)}
                    </p>
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
                        <span className="text-xs sm:text-sm opacity-75">
                          Pubblicato da <strong>{announcement.creator.full_name}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(announcement.id)}
                  className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm sm:text-base mb-4 whitespace-pre-wrap">{announcement.message}</p>

              {announcement.attachment_url && announcement.attachment_name && (
                <div className="mb-4">
                  <button
                    onClick={() => handleDownloadAttachment(announcement.attachment_url!, announcement.attachment_name!)}
                    className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-white bg-opacity-50 rounded-lg hover:bg-opacity-70 transition-colors text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="font-medium truncate max-w-[150px] sm:max-w-none">{announcement.attachment_name}</span>
                    <Download className="w-4 h-4 flex-shrink-0" />
                  </button>
                </div>
              )}

              <div className="flex items-center text-xs sm:text-sm">
                <span className="px-3 py-1 bg-white bg-opacity-50 rounded">
                  {getTargetLabel(announcement)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg sm:max-w-2xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Nuovo Annuncio</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Messaggio *
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  required
                  placeholder="Scrivi il messaggio dell'annuncio..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allegato (Opzionale)
                </label>
                <div className="flex items-center space-x-3">
                  <label className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-center space-x-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
                      <Upload className="w-5 h-5 text-gray-600" />
                      <span className="text-sm text-gray-600 truncate">
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
                      className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Rimuovi
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="normal">Normale</option>
                  <option value="important">Importante</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tutti i lavoratori</option>
                  <option value="specific">Cantiere specifico</option>
                  <option value="worker">Lavoratore singolo</option>
                  <option value="workers">Lavoratori specifici (multipli)</option>
                </select>
              </div>

              {formData.target_audience === 'specific' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantiere *
                  </label>
                  <select
                    value={formData.target_worksite_id}
                    onChange={(e) =>
                      setFormData({ ...formData, target_worksite_id: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lavoratore *
                  </label>
                  <select
                    value={formData.target_worker_id}
                    onChange={(e) =>
                      setFormData({ ...formData, target_worker_id: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lavoratori * ({formData.target_worker_ids.length} selezionati)
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowWorkerDropdown(!showWorkerDropdown)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left flex items-center justify-between"
                    >
                      <span className="text-gray-700">
                        {formData.target_worker_ids.length === 0
                          ? 'Seleziona lavoratori...'
                          : `${formData.target_worker_ids.length} lavoratori selezionati`}
                      </span>
                      <Users className="w-4 h-4 text-gray-500" />
                    </button>
                    
                    {showWorkerDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <div className="p-2 border-b border-gray-200">
                          <button
                            type="button"
                            onClick={() => {
                              if (formData.target_worker_ids.length === workers.length) {
                                setFormData({ ...formData, target_worker_ids: [] });
                              } else {
                                setFormData({ ...formData, target_worker_ids: workers.map(w => w.id) });
                              }
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {formData.target_worker_ids.length === workers.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                          </button>
                        </div>
                        {workers.map((worker) => (
                          <div
                            key={worker.id}
                            onClick={() => toggleWorkerSelection(worker.id)}
                            className={`flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                              formData.target_worker_ids.includes(worker.id) ? 'bg-blue-50' : ''
                            }`}
                          >
                            <span className="text-sm text-gray-700">
                              {worker.full_name} {worker.position ? `(${worker.position})` : ''}
                            </span>
                            {formData.target_worker_ids.includes(worker.id) && (
                              <Check className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 order-2 sm:order-1"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={uploading || (formData.target_audience === 'workers' && formData.target_worker_ids.length === 0)}
                  className="flex-1 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all disabled:opacity-50 order-1 sm:order-2"
                >
                  {uploading ? 'Caricamento...' : 'Pubblica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
