import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, FileText, AlertCircle, Calendar, Clock, User, MapPin, Bell } from 'lucide-react';

type TabType = 'leave_requests' | 'announcements' | 'notifications' | 'daily_reports' | 'assignments' | 'time_entries' | 'vehicle_services';

interface LeaveRequest {
  id: string;
  worker: { full_name: string };
  request_type: string;
  start_date: string | null;
  end_date: string | null;
  hours_requested: number;
  reason: string | null;
  status: string;
  certificate_url: string | null;
  reviewed_by_profile: { full_name: string } | null;
  reviewed_at: string | null;
  created_at: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: string;
  target_audience: string;
  attachment_url: string | null;
  attachment_name: string | null;
  expires_at: string | null;
  creator: { full_name: string };
  worksite: { name: string } | null;
  created_at: string;
}

interface NotificationLog {
  id: string;
  notification_type: string;
  entity_type: string;
  title: string;
  body: string;
  days_before: number;
  sent_at: string;
  user: { full_name: string; email: string };
  created_at: string;
}

interface DailyReport {
  id: string;
  worker: { full_name: string };
  worksite: { name: string };
  report_date: string;
  report_time: string;
  description: string;
  notes: string | null;
  hours_worked: number | null;
  created_at: string;
}

interface Assignment {
  id: string;
  worker: { full_name: string };
  worksite: { name: string };
  assigned_date: string;
  start_time: string | null;
  end_time: string | null;
  instructions: string | null;
  confirmed: boolean;
  confirmed_at: string | null;
  vehicle: { plate: string } | null;
  created_at: string;
}

interface TimeEntry {
  id: string;
  worker: { full_name: string };
  worksite: { name: string } | null;
  entry_type: string;
  timestamp: string;
  notes: string | null;
  created_at: string;
}

interface VehicleService {
  id: string;
  vehicle: { plate: string; details: string | null };
  service_date: string;
  kilometers: number;
  notes: string | null;
  creator: { full_name: string } | null;
  created_at: string;
}

export default function Archive() {
  const [activeTab, setActiveTab] = useState<TabType>('leave_requests');
  const [loading, setLoading] = useState(true);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [vehicleServices, setVehicleServices] = useState<VehicleService[]>([]);

  useEffect(() => {
    loadArchiveData();
  }, []);

  const loadArchiveData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) return;

      const [
        leaveRequestsData,
        announcementsData,
        notificationsData,
        dailyReportsData,
        assignmentsData,
        timeEntriesData,
        vehicleServicesData
      ] = await Promise.all([
        supabase
          .from('leave_requests')
          .select(`
            *,
            worker:worker_id(full_name),
            reviewed_by_profile:reviewed_by(full_name)
          `)
          .eq('organization_id', profile.organization_id)
          .in('status', ['approved', 'rejected'])
          .order('created_at', { ascending: false }),

        supabase
          .from('announcements')
          .select(`
            *,
            creator:created_by(full_name),
            worksite:target_worksite_id(name)
          `)
          .eq('organization_id', profile.organization_id)
          .not('expires_at', 'is', null)
          .lt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false }),

        supabase
          .from('notification_logs')
          .select(`
            *,
            user:user_id(full_name, email)
          `)
          .eq('organization_id', profile.organization_id)
          .order('sent_at', { ascending: false }),

        supabase
          .from('daily_reports')
          .select(`
            *,
            worker:worker_id(full_name),
            worksite:worksite_id(name)
          `)
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false }),

        supabase
          .from('assignments')
          .select(`
            *,
            worker:worker_id(full_name),
            worksite:worksite_id(name),
            vehicle:vehicle_id(plate)
          `)
          .lt('assigned_date', new Date().toISOString().split('T')[0])
          .order('created_at', { ascending: false }),

        supabase
          .from('time_entries')
          .select(`
            *,
            worker:worker_id(full_name),
            worksite:worksite_id(name)
          `)
          .order('created_at', { ascending: false }),

        supabase
          .from('vehicle_services')
          .select(`
            *,
            vehicle:vehicle_id(plate, details),
            creator:created_by(full_name)
          `)
          .order('created_at', { ascending: false })
      ]);

      setLeaveRequests(leaveRequestsData.data || []);
      setAnnouncements(announcementsData.data || []);
      setNotifications(notificationsData.data || []);
      setDailyReports(dailyReportsData.data || []);
      setAssignments(assignmentsData.data || []);
      setTimeEntries(timeEntriesData.data || []);
      setVehicleServices(vehicleServicesData.data || []);
    } catch (error) {
      console.error('Errore nel caricamento archivio:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/D';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/D';
    return new Date(dateString).toLocaleString('it-IT');
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vacation: 'Ferie',
      rol: 'ROL',
      sick_leave: 'Malattia'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    const labels: Record<string, string> = {
      approved: 'Approvato',
      rejected: 'Rifiutato'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      normal: 'bg-blue-100 text-blue-800',
      important: 'bg-yellow-100 text-yellow-800',
      urgent: 'bg-red-100 text-red-800'
    };
    const labels: Record<string, string> = {
      normal: 'Normale',
      important: 'Importante',
      urgent: 'Urgente'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[priority]}`}>
        {labels[priority]}
      </span>
    );
  };

  const getEntryTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      work_start: 'Inizio Lavoro',
      lunch_start: 'Inizio Pausa',
      lunch_end: 'Fine Pausa',
      work_end: 'Fine Lavoro'
    };
    return labels[type] || type;
  };

  const tabs = [
    { id: 'leave_requests', label: 'Richieste Ferie', count: leaveRequests.length },
    { id: 'announcements', label: 'Annunci Scaduti', count: announcements.length },
    { id: 'notifications', label: 'Notifiche Inviate', count: notifications.length },
    { id: 'daily_reports', label: 'Report Giornalieri', count: dailyReports.length },
    { id: 'assignments', label: 'Assegnazioni', count: assignments.length },
    { id: 'time_entries', label: 'Registrazioni Tempo', count: timeEntries.length },
    { id: 'vehicle_services', label: 'Servizi Veicoli', count: vehicleServices.length }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Caricamento archivio...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Archivio</h1>
        <p className="mt-2 text-gray-600">Visualizza tutti i dati storici dell'organizzazione</p>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'leave_requests' && (
        <div className="space-y-4">
          {leaveRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nessuna richiesta di ferie archiviata</div>
          ) : (
            leaveRequests.map((request) => (
              <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <User className="w-5 h-5 text-gray-400" />
                      <span className="font-semibold text-gray-900">{request.worker.full_name}</span>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Tipo:</span>
                        <span className="ml-2 font-medium">{getRequestTypeLabel(request.request_type)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Ore richieste:</span>
                        <span className="ml-2 font-medium">{request.hours_requested}h</span>
                      </div>
                      {request.start_date && (
                        <div>
                          <span className="text-gray-500">Data inizio:</span>
                          <span className="ml-2 font-medium">{formatDate(request.start_date)}</span>
                        </div>
                      )}
                      {request.end_date && (
                        <div>
                          <span className="text-gray-500">Data fine:</span>
                          <span className="ml-2 font-medium">{formatDate(request.end_date)}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Creato il:</span>
                        <span className="ml-2 font-medium">{formatDateTime(request.created_at)}</span>
                      </div>
                      {request.reviewed_at && (
                        <div>
                          <span className="text-gray-500">Revisionato il:</span>
                          <span className="ml-2 font-medium">{formatDateTime(request.reviewed_at)}</span>
                        </div>
                      )}
                      {request.reviewed_by_profile && (
                        <div>
                          <span className="text-gray-500">Revisionato da:</span>
                          <span className="ml-2 font-medium">{request.reviewed_by_profile.full_name}</span>
                        </div>
                      )}
                    </div>
                    {request.reason && (
                      <div className="mt-3 text-sm">
                        <span className="text-gray-500">Motivo:</span>
                        <p className="mt-1 text-gray-700">{request.reason}</p>
                      </div>
                    )}
                  </div>
                  {request.certificate_url && (
                    <a
                      href={request.certificate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Certificato
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nessun annuncio scaduto</div>
          ) : (
            announcements.map((announcement) => (
              <div key={announcement.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{announcement.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getPriorityBadge(announcement.priority)}
                      <span className="text-sm text-gray-500">
                        da {announcement.creator.full_name}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 mb-3">{announcement.message}</p>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Creato: {formatDateTime(announcement.created_at)}
                  </div>
                  {announcement.expires_at && (
                    <div>
                      <AlertCircle className="w-4 h-4 inline mr-2" />
                      Scaduto: {formatDateTime(announcement.expires_at)}
                    </div>
                  )}
                  {announcement.worksite && (
                    <div>
                      <MapPin className="w-4 h-4 inline mr-2" />
                      Cantiere: {announcement.worksite.name}
                    </div>
                  )}
                  <div>
                    Destinatari: {announcement.target_audience === 'all' ? 'Tutti' : 'Specifico'}
                  </div>
                </div>
                {announcement.attachment_url && (
                  <div className="mt-3">
                    <a
                      href={announcement.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      {announcement.attachment_name || 'Allegato'}
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nessuna notifica inviata</div>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-blue-500 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                    <p className="text-gray-700 mt-1">{notification.body}</p>
                    <div className="grid grid-cols-3 gap-4 mt-3 text-sm text-gray-600">
                      <div>
                        <User className="w-4 h-4 inline mr-2" />
                        {notification.user.full_name}
                      </div>
                      <div>
                        <span className="font-medium">Tipo:</span> {notification.notification_type}
                      </div>
                      <div>
                        <span className="font-medium">Entità:</span> {notification.entity_type}
                      </div>
                      <div>
                        <Clock className="w-4 h-4 inline mr-2" />
                        Inviata: {formatDateTime(notification.sent_at)}
                      </div>
                      <div>
                        <span className="font-medium">Giorni prima:</span> {notification.days_before}
                      </div>
                      <div>
                        <span className="font-medium">Email:</span> {notification.user.email}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'daily_reports' && (
        <div className="space-y-4">
          {dailyReports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nessun report giornaliero</div>
          ) : (
            dailyReports.map((report) => (
              <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{report.worker.full_name}</h3>
                    <p className="text-sm text-gray-600">{report.worksite.name}</p>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div>{formatDate(report.report_date)}</div>
                    <div>{report.report_time}</div>
                  </div>
                </div>
                <p className="text-gray-700 mb-2">{report.description}</p>
                {report.notes && (
                  <p className="text-sm text-gray-600 mb-2">Note: {report.notes}</p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  {report.hours_worked && (
                    <span>Ore lavorate: {report.hours_worked}h</span>
                  )}
                  <span>Creato: {formatDateTime(report.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nessuna assegnazione passata</div>
          ) : (
            assignments.map((assignment) => (
              <div key={assignment.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <User className="w-5 h-5 text-gray-400" />
                      <span className="font-semibold text-gray-900">{assignment.worker.full_name}</span>
                      {assignment.confirmed && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          Confermato
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <MapPin className="w-4 h-4 inline mr-2 text-gray-400" />
                        {assignment.worksite.name}
                      </div>
                      <div>
                        <Calendar className="w-4 h-4 inline mr-2 text-gray-400" />
                        {formatDate(assignment.assigned_date)}
                      </div>
                      {assignment.start_time && (
                        <div>Inizio: {assignment.start_time}</div>
                      )}
                      {assignment.end_time && (
                        <div>Fine: {assignment.end_time}</div>
                      )}
                      {assignment.vehicle && (
                        <div>Veicolo: {assignment.vehicle.plate}</div>
                      )}
                      <div>Creato: {formatDateTime(assignment.created_at)}</div>
                      {assignment.confirmed_at && (
                        <div>Confermato: {formatDateTime(assignment.confirmed_at)}</div>
                      )}
                    </div>
                    {assignment.instructions && (
                      <div className="mt-3 text-sm">
                        <span className="text-gray-500">Istruzioni:</span>
                        <p className="mt-1 text-gray-700">{assignment.instructions}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'time_entries' && (
        <div className="space-y-4">
          {timeEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nessuna registrazione tempo</div>
          ) : (
            timeEntries.map((entry) => (
              <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <span className="font-semibold text-gray-900">{entry.worker.full_name}</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {getEntryTypeLabel(entry.entry_type)}
                      </span>
                    </div>
                    {entry.worksite && (
                      <div className="mt-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 inline mr-2" />
                        {entry.worksite.name}
                      </div>
                    )}
                    {entry.notes && (
                      <p className="mt-2 text-sm text-gray-600">Note: {entry.notes}</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div className="font-medium">{formatDateTime(entry.timestamp)}</div>
                    <div className="text-xs mt-1">Creato: {formatDateTime(entry.created_at)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'vehicle_services' && (
        <div className="space-y-4">
          {vehicleServices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nessun servizio veicolo</div>
          ) : (
            vehicleServices.map((service) => (
              <div key={service.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{service.vehicle.plate}</h3>
                    {service.vehicle.details && (
                      <p className="text-sm text-gray-600">{service.vehicle.details}</p>
                    )}
                    <div className="grid grid-cols-2 gap-4 mt-3 text-sm text-gray-600">
                      <div>
                        <Calendar className="w-4 h-4 inline mr-2" />
                        Data servizio: {formatDate(service.service_date)}
                      </div>
                      <div>Chilometri: {service.kilometers.toLocaleString('it-IT')}</div>
                      {service.creator && (
                        <div>
                          <User className="w-4 h-4 inline mr-2" />
                          {service.creator.full_name}
                        </div>
                      )}
                      <div>Creato: {formatDateTime(service.created_at)}</div>
                    </div>
                    {service.notes && (
                      <div className="mt-3 text-sm">
                        <span className="text-gray-500">Note:</span>
                        <p className="mt-1 text-gray-700">{service.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
