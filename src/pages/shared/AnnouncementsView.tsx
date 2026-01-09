import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, AlertCircle, Info, Bell, FileText, Download } from 'lucide-react';
import { Database } from '../../lib/database.types';

type Announcement = Database['public']['Tables']['announcements']['Row'] & {
  worksite?: { name: string } | null;
};

export default function AnnouncementsView() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const { data } = await supabase
        .from('announcements')
        .select('*, worksite:worksites!announcements_worksite_id_fkey(*)')
        .order('created_at', { ascending: false });

      setAnnouncements(data || []);

      if (user) {
        data?.forEach(async (announcement) => {
          await supabase.from('announcement_reads').upsert({
            announcement_id: announcement.id,
            worker_id: user.id,
          });
        });
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Annunci</h1>
        <p className="text-gray-600 mt-1">Comunicazioni e aggiornamenti importanti</p>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nessun annuncio disponibile</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`border-2 rounded-xl p-6 ${getPriorityColor(announcement.priority)}`}
            >
              <div className="flex items-start space-x-3 mb-4">
                {getPriorityIcon(announcement.priority)}
                <div className="flex-1">
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

              {announcement.worksite && (
                <div className="text-sm">
                  <span className="px-3 py-1 bg-white bg-opacity-50 rounded">
                    Cantiere: {announcement.worksite.name}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
