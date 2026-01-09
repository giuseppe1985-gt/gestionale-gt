import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, Plus, Trash2, AlertCircle, Info, Bell, FileText, Download, Upload } from 'lucide-react';
import { Database } from '../../lib/database.types';
import { notifyNewAnnouncement } from '../../lib/notifications';

type Announcement = Database['public']['Tables']['announcements']['Row'] & {
  worksite?: { name: string } | null;
};
type Worksite = Database['public']['Tables']['worksites']['Row'];

export default function AnnouncementsManagement() {
  const { user, profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'normal' as 'normal' | 'important' | 'urgent',
    target_audience: 'all' as 'all' | 'specific',
    target_worksite_id: '',
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

      const announcementsWithWorksites = (announcementsData || []).map(announcement => ({
        ...announcement,
        worksite: announcement.target_worksite_id
          ? worksitesData?.find(w => w.id === announcement.target_worksite_id)
          : null,
      }));

      setAnnouncements(announcementsWithWorksites);
      setWorksites(worksitesData || []);
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

      const { data: newAnnouncement, error } = await supabase.from('announcements').insert({
        title: formData.title,
        message: formData.message,
        priority: formData.priority,
        target_audience: formData.target_audience,
        target_worksite_id: formData.target_audience === 'specific' ? formData.target_worksite_id : null,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        created_by: user?.id || '',
        organization_id: profile?.organization_id,
        expires_at: expiresAt.toISOString(),
      }).select().single();

      if (error) throw error;

      if (newAnnouncement && profile?.organization_id) {
        await notifyNewAnnouncement(
          newAnnouncement.id,
          formData.title,
          profile.organization_id
        );
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
      expires_at: new Date().toISOString().split('T')[0],
    });
    setSelectedFile(null);
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
        return 'bg-red-100 border-red-300 text-red-900';
      case 'important':
        return 'bg-orange-100 border-orange-300 text-orange-900';
      default:
        return 'bg-blue-100 border-blue-300 text-blue-900';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestione Annunci</h1>
          <p className="text-gray-600 mt-1">Crea e gestisci le comunicazioni per i lavoratori</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Nuovo Annuncio</span>
        </button>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
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
                      <h3 className="text-xl font-semibold">{announcement.title}</h3>
                      <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded">
                        {getPriorityLabel(announcement.priority)}
                      </span>
                    </div>
                    <p className="text-sm opacity-75">
                      {formatDate(announcement.created_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(announcement.id)}
                  className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-base mb-4 whitespace-pre-wrap">{announcement.message}</p>

              {announcement.attachment_url && announcement.attachment_name && (
                <div className="mb-4">
                  <button
                    onClick={() => handleDownloadAttachment(announcement.attachment_url!, announcement.attachment_name!)}
                    className="flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-50 rounded-lg hover:bg-opacity-70 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">{announcement.attachment_name}</span>
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center space-x-4 text-sm">
                <span className="px-3 py-1 bg-white bg-opacity-50 rounded">
                  {announcement.target_audience === 'all'
                    ? 'Tutti i lavoratori'
                    : `Cantiere: ${announcement.worksite?.name || 'N/A'}`}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-screen overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuovo Annuncio</h2>
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
                  rows={5}
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
                      className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Rimuovi
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Formati supportati: PDF, DOC, DOCX, TXT (max 10MB)
                </p>
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
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      target_audience: e.target.value as 'all' | 'specific',
                    })
                  }
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
                >
                  <option value="all">Tutti i lavoratori</option>
                  <option value="specific">Cantiere specifico</option>
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
                <p className="text-xs text-gray-500 mt-1">
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
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
