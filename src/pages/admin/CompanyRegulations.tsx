import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Upload, X, FileText, Download, Trash2 } from 'lucide-react';

interface Regulation {
  id: string;
  title: string;
  content: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Attachment {
  id: string;
  regulation_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export default function CompanyRegulations() {
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [activeRegulation, setActiveRegulation] = useState<Regulation | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });

  useEffect(() => {
    loadRegulations();
  }, []);

  useEffect(() => {
    if (activeRegulation) {
      loadAttachments(activeRegulation.id);
    }
  }, [activeRegulation]);

  const loadRegulations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_regulations')
        .select('*')
        .order('version', { ascending: false });

      if (error) throw error;

      if (data) {
        setRegulations(data);
        const active = data.find(r => r.is_active);
        if (active) {
          setActiveRegulation(active);
          setFormData({
            title: active.title,
            content: active.content
          });
        }
      }
    } catch (error) {
      console.error('Error loading regulations:', error);
      alert('Errore nel caricamento del regolamento');
    } finally {
      setLoading(false);
    }
  };

  const loadAttachments = async (regulationId: string) => {
    try {
      const { data, error } = await supabase
        .from('company_regulation_attachments')
        .select('*')
        .eq('regulation_id', regulationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setAttachments(data);
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      if (activeRegulation) {
        const { error } = await supabase
          .from('company_regulations')
          .update({
            title: formData.title,
            content: formData.content,
            updated_at: new Date().toISOString()
          })
          .eq('id', activeRegulation.id);

        if (error) throw error;
        alert('Regolamento aggiornato con successo');
      } else {
        const nextVersion = regulations.length > 0
          ? Math.max(...regulations.map(r => r.version)) + 1
          : 1;

        const { error } = await supabase
          .from('company_regulations')
          .insert({
            organization_id: profile.organization_id,
            title: formData.title,
            content: formData.content,
            version: nextVersion,
            is_active: true,
            created_by: user.id
          });

        if (error) throw error;
        alert('Regolamento creato con successo');
      }

      await loadRegulations();
    } catch (error) {
      console.error('Error saving regulation:', error);
      alert('Errore nel salvataggio del regolamento');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeRegulation) return;

    try {
      setUploading(true);

      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${activeRegulation.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('regulation-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error: dbError } = await supabase
          .from('company_regulation_attachments')
          .insert({
            regulation_id: activeRegulation.id,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id
          });

        if (dbError) throw dbError;
      }

      alert('File caricati con successo');
      await loadAttachments(activeRegulation.id);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Errore nel caricamento dei file');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('regulation-files')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Errore nel download del file');
    }
  };

  const handleDeleteAttachment = async (attachment: Attachment) => {
    if (!confirm(`Eliminare il file "${attachment.file_name}"?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('regulation-files')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('company_regulation_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      alert('File eliminato con successo');
      await loadAttachments(activeRegulation!.id);
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Errore nell\'eliminazione del file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Regolamento Aziendale</h1>
        <p className="text-gray-600 mt-1">Gestisci il regolamento aziendale visibile a tutti i dipendenti</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titolo *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Es: Regolamento Aziendale 2026"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contenuto *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="Scrivi qui il contenuto del regolamento aziendale..."
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Puoi usare semplice formattazione testuale. Il testo verrà visualizzato con interruzioni di riga preservate.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvataggio...' : (activeRegulation ? 'Aggiorna Regolamento' : 'Crea Regolamento')}
            </button>

            {activeRegulation && (
              <span className="text-sm text-gray-500">
                Versione {activeRegulation.version}
              </span>
            )}
          </div>
        </form>

        {activeRegulation && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">File Allegati</h3>

            <div className="mb-4">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">
                <Upload className="w-4 h-4" />
                {uploading ? 'Caricamento...' : 'Aggiungi File'}
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                />
              </label>
              <p className="text-sm text-gray-500 mt-2">
                Formati supportati: PDF, DOC, DOCX, XLS, XLSX, immagini (JPG, PNG, GIF)
              </p>
            </div>

            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{attachment.file_name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(attachment.file_size)} • {new Date(attachment.created_at).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(attachment)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Scarica"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAttachment(attachment)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                Nessun file allegato. Carica documenti PDF, fogli Excel o immagini.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
