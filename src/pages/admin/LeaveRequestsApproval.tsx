import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, XCircle, Clock, Calendar, FileText, AlertCircle, Download } from 'lucide-react';
import { Database } from '../../lib/database.types';
import { notifyLeaveResponse } from '../../lib/notifications';

type Profile = Database['public']['Tables']['profiles']['Row'];
type LeaveRequest = Database['public']['Tables']['leave_requests']['Row'] & {
  worker: Profile;
  reviewer?: Profile;
};

export default function LeaveRequestsApproval() {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    try {
      let query = supabase
        .from('leave_requests')
        .select('*, worker:profiles!leave_requests_worker_id_fkey(*), reviewer:profiles!leave_requests_reviewed_by_fkey(*)')
        .eq('organization_id', profile?.organization_id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data } = await query;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async (requestId: string, status: 'approved' | 'rejected') => {
    setProcessing(requestId);
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) {
        throw new Error('Richiesta non trovata');
      }

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      await notifyLeaveResponse(request.worker_id, status, requestId);

      await loadRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Errore durante l\'aggiornamento della richiesta');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'vacation': return 'Ferie';
      case 'rol': return 'ROL';
      case 'sick_leave': return 'Malattia';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            In Attesa
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approvata
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rifiutata
          </span>
        );
      default:
        return null;
    }
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
        <h1 className="text-3xl font-bold text-gray-900">Gestione Richieste Permessi</h1>
        <p className="text-gray-600 mt-1">Approva o rifiuta le richieste di ferie, ROL e malattia</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            In Attesa
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'approved'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Approvate
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'rejected'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Rifiutate
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tutte
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {requests.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-white rounded-xl shadow-md">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nessuna richiesta trovata</p>
          </div>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {request.worker.full_name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{request.worker.full_name}</h3>
                    <p className="text-sm text-gray-600">{request.worker.position}</p>
                  </div>
                </div>
                {getStatusBadge(request.status)}
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Tipo di Permesso</p>
                  <p className="font-semibold text-gray-900">{getRequestTypeLabel(request.request_type)}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Ore Richieste</p>
                    <p className="font-medium text-gray-900">{request.hours_requested} ore</p>
                  </div>
                </div>

                {request.start_date && request.end_date && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Periodo</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(request.start_date)} - {formatDate(request.end_date)}
                      </p>
                    </div>
                  </div>
                )}

                {request.reason && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Motivazione</p>
                    <p className="text-sm text-gray-900">{request.reason}</p>
                  </div>
                )}

                {request.certificate_url && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Certificato di Malattia</p>
                    <a
                      href={request.certificate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Download className="w-4 h-4" />
                      <span>Visualizza Certificato</span>
                    </a>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Richiesta il {formatDate(request.created_at)}
                  </p>
                  {request.reviewed_at && request.reviewer && (
                    <p className="text-xs text-gray-500 mt-1">
                      {request.status === 'approved' ? 'Approvata' : 'Rifiutata'} da {request.reviewer.full_name} il {formatDate(request.reviewed_at)}
                    </p>
                  )}
                </div>

                {request.status === 'pending' && (
                  <div className="flex space-x-3 pt-3">
                    <button
                      onClick={() => handleApproveReject(request.id, 'rejected')}
                      disabled={processing === request.id}
                      className="flex-1 flex items-center justify-center space-x-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Rifiuta</span>
                    </button>
                    <button
                      onClick={() => handleApproveReject(request.id, 'approved')}
                      disabled={processing === request.id}
                      className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approva</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Nota importante:</p>
            <p>Quando approvi una richiesta, le ore vengono automaticamente scalate dal monte ore del lavoratore. Assicurati che il lavoratore abbia abbastanza ore disponibili prima di approvare.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
