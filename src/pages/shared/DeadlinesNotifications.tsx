import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, Calendar, FileText, CreditCard, Truck, UserCheck, Clock } from 'lucide-react';

interface Deadline {
  id: string;
  type: 'medical_checkup' | 'course' | 'riba' | 'payment_schedule' | 'invoice' | 'vehicle_inspection' | 'invoice_advance';
  title: string;
  description: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  related_entity?: string;
  worker_name?: string;
}

export default function DeadlinesNotifications() {
  const { profile, isAdmin } = useAuth();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const canViewAllDeadlines = isAdmin || profile?.role === 'administrator' || profile?.role === 'org_manager';

  useEffect(() => {
    loadDeadlines();
  }, [profile]);

  const loadDeadlines = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const allDeadlines: Deadline[] = [];
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      if (canViewAllDeadlines) {
        const [medicalRes, coursesRes, ribaRes, scheduleRes, invoicesRes, vehiclesRes] = await Promise.all([
          supabase
            .from('worker_medical_checkups')
            .select('*, profiles!worker_medical_checkups_worker_id_fkey(full_name)')
            .gte('expiry_date', today.toISOString().split('T')[0])
            .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
            .order('expiry_date', { ascending: true }),
          supabase
            .from('worker_courses')
            .select('*, profiles!worker_courses_worker_id_fkey(full_name)')
            .order('completion_date', { ascending: false }),
          supabase
            .from('supplier_riba')
            .select('*')
            .eq('payment_status', 'pending')
            .gte('due_date', today.toISOString().split('T')[0])
            .lte('due_date', thirtyDaysFromNow.toISOString().split('T')[0])
            .order('due_date', { ascending: true }),
          supabase
            .from('payment_schedule')
            .select('*')
            .eq('payment_status', 'pending')
            .gte('due_date', today.toISOString().split('T')[0])
            .lte('due_date', thirtyDaysFromNow.toISOString().split('T')[0])
            .order('due_date', { ascending: true }),
          supabase
            .from('issued_invoices')
            .select('*')
            .eq('payment_status', 'pending')
            .gte('due_date', today.toISOString().split('T')[0])
            .lte('due_date', thirtyDaysFromNow.toISOString().split('T')[0])
            .order('due_date', { ascending: true }),
          supabase
            .from('vehicles')
            .select('*')
            .not('inspection_date', 'is', null)
            .gte('inspection_date', today.toISOString().split('T')[0])
            .lte('inspection_date', thirtyDaysFromNow.toISOString().split('T')[0])
            .order('inspection_date', { ascending: true })
        ]);

        if (medicalRes.data) {
          medicalRes.data.forEach((item: any) => {
            const daysUntil = Math.ceil((new Date(item.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            allDeadlines.push({
              id: item.id,
              type: 'medical_checkup',
              title: 'Scadenza Visita Medica',
              description: `Visita medica per ${item.profiles?.full_name || 'lavoratore'}`,
              due_date: item.expiry_date,
              priority: daysUntil <= 7 ? 'urgent' : daysUntil <= 14 ? 'high' : 'medium',
              related_entity: item.profiles?.full_name || '',
              worker_name: item.profiles?.full_name || ''
            });
          });
        }

        if (coursesRes.data) {
          coursesRes.data.forEach((item: any) => {
            const completionDate = new Date(item.completion_date);
            const expiryDate = new Date(completionDate);
            expiryDate.setFullYear(completionDate.getFullYear() + 2);

            if (expiryDate >= today && expiryDate <= thirtyDaysFromNow) {
              const daysUntil = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              allDeadlines.push({
                id: item.id,
                type: 'course',
                title: 'Rinnovo Corso',
                description: `Corso "${item.course_name}" per ${item.profiles?.full_name || 'lavoratore'}`,
                due_date: expiryDate.toISOString().split('T')[0],
                priority: daysUntil <= 7 ? 'urgent' : daysUntil <= 14 ? 'high' : 'medium',
                related_entity: item.profiles?.full_name || '',
                worker_name: item.profiles?.full_name || ''
              });
            }
          });
        }

        if (ribaRes.data) {
          ribaRes.data.forEach((item: any) => {
            const daysUntil = Math.ceil((new Date(item.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            allDeadlines.push({
              id: item.id,
              type: 'riba',
              title: 'RiBa Fornitore',
              description: `RiBa ${item.riba_number} - ${item.supplier_name} (€${parseFloat(item.amount).toFixed(2)})`,
              due_date: item.due_date,
              priority: daysUntil <= 7 ? 'urgent' : daysUntil <= 14 ? 'high' : 'medium',
              related_entity: item.supplier_name
            });
          });
        }

        if (scheduleRes.data) {
          scheduleRes.data.forEach((item: any) => {
            const daysUntil = Math.ceil((new Date(item.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            allDeadlines.push({
              id: item.id,
              type: 'payment_schedule',
              title: 'Scadenza Pagamento',
              description: `${item.title} (€${parseFloat(item.amount).toFixed(2)})`,
              due_date: item.due_date,
              priority: daysUntil <= 7 ? 'urgent' : daysUntil <= 14 ? 'high' : 'medium',
              related_entity: item.title
            });
          });
        }

        if (invoicesRes.data) {
          invoicesRes.data.forEach((item: any) => {
            const daysUntil = Math.ceil((new Date(item.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            allDeadlines.push({
              id: item.id,
              type: 'invoice',
              title: 'Scadenza Fattura',
              description: `Fattura ${item.invoice_number} - ${item.client_name} (€${parseFloat(item.amount).toFixed(2)})`,
              due_date: item.due_date,
              priority: daysUntil <= 7 ? 'urgent' : daysUntil <= 14 ? 'high' : 'medium',
              related_entity: item.client_name
            });
          });
        }

        if (vehiclesRes.data) {
          vehiclesRes.data.forEach((item: any) => {
            const daysUntil = Math.ceil((new Date(item.inspection_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            allDeadlines.push({
              id: item.id,
              type: 'vehicle_inspection',
              title: 'Revisione Veicolo',
              description: `Revisione per veicolo ${item.plate}`,
              due_date: item.inspection_date,
              priority: daysUntil <= 7 ? 'urgent' : daysUntil <= 14 ? 'high' : 'medium',
              related_entity: item.plate
            });
          });
        }
      } else {
        const [medicalRes, coursesRes] = await Promise.all([
          supabase
            .from('worker_medical_checkups')
            .select('*')
            .eq('worker_id', profile.id)
            .gte('expiry_date', today.toISOString().split('T')[0])
            .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
            .order('expiry_date', { ascending: true }),
          supabase
            .from('worker_courses')
            .select('*')
            .eq('worker_id', profile.id)
            .order('completion_date', { ascending: false })
        ]);

        if (medicalRes.data) {
          medicalRes.data.forEach((item: any) => {
            const daysUntil = Math.ceil((new Date(item.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            allDeadlines.push({
              id: item.id,
              type: 'medical_checkup',
              title: 'Scadenza Visita Medica',
              description: 'La tua visita medica sta per scadere',
              due_date: item.expiry_date,
              priority: daysUntil <= 7 ? 'urgent' : daysUntil <= 14 ? 'high' : 'medium'
            });
          });
        }

        if (coursesRes.data) {
          coursesRes.data.forEach((item: any) => {
            const completionDate = new Date(item.completion_date);
            const expiryDate = new Date(completionDate);
            expiryDate.setFullYear(completionDate.getFullYear() + 2);

            if (expiryDate >= today && expiryDate <= thirtyDaysFromNow) {
              const daysUntil = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              allDeadlines.push({
                id: item.id,
                type: 'course',
                title: 'Rinnovo Corso',
                description: `Il tuo corso "${item.course_name}" necessita rinnovo`,
                due_date: expiryDate.toISOString().split('T')[0],
                priority: daysUntil <= 7 ? 'urgent' : daysUntil <= 14 ? 'high' : 'medium'
              });
            }
          });
        }
      }

      allDeadlines.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
      setDeadlines(allDeadlines);
    } catch (error) {
      console.error('Error loading deadlines:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredDeadlines = () => {
    return deadlines.filter(d => {
      if (filterPriority !== 'all' && d.priority !== filterPriority) return false;
      if (filterType !== 'all' && d.type !== filterType) return false;
      return true;
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      default: return 'Bassa';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'medical_checkup': return <UserCheck className="w-5 h-5" />;
      case 'course': return <FileText className="w-5 h-5" />;
      case 'riba': return <AlertCircle className="w-5 h-5" />;
      case 'payment_schedule': return <Calendar className="w-5 h-5" />;
      case 'invoice': return <FileText className="w-5 h-5" />;
      case 'vehicle_inspection': return <Truck className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'medical_checkup': return 'Visita Medica';
      case 'course': return 'Corso';
      case 'riba': return 'RiBa';
      case 'payment_schedule': return 'Scadenza Pagamento';
      case 'invoice': return 'Fattura';
      case 'vehicle_inspection': return 'Revisione Veicolo';
      default: return 'Altro';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getDaysUntil = (date: string) => {
    const today = new Date();
    const dueDate = new Date(date);
    const days = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const filteredDeadlines = getFilteredDeadlines();
  const urgentCount = deadlines.filter(d => d.priority === 'urgent').length;
  const highCount = deadlines.filter(d => d.priority === 'high').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Avvisi Scadenze</h1>
        <p className="text-gray-600 mt-1">
          {canViewAllDeadlines ? 'Monitora tutte le scadenze aziendali' : 'Le tue scadenze personali'}
        </p>
      </div>

      {(urgentCount > 0 || highCount > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Attenzione!</h3>
              <p className="text-sm text-red-800 mt-1">
                {urgentCount > 0 && `${urgentCount} scadenze urgenti`}
                {urgentCount > 0 && highCount > 0 && ' e '}
                {highCount > 0 && `${highCount} scadenze prioritarie`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium">Urgenti</p>
            <p className="text-3xl font-bold text-red-900 mt-1">{urgentCount}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-600 font-medium">Priorità Alta</p>
            <p className="text-3xl font-bold text-orange-900 mt-1">{highCount}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-600 font-medium">Priorità Media</p>
            <p className="text-3xl font-bold text-yellow-900 mt-1">
              {deadlines.filter(d => d.priority === 'medium').length}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Totale</p>
            <p className="text-3xl font-bold text-blue-900 mt-1">{deadlines.length}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtra per Priorità
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg appearance-none bg-no-repeat bg-right bg-[length:16px] cursor-pointer"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.25rem center" }}
            >
              <option value="all">Tutte le priorità</option>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Bassa</option>
            </select>
          </div>
          {canViewAllDeadlines && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtra per Tipo
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg appearance-none bg-no-repeat bg-right bg-[length:16px] cursor-pointer"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.25rem center" }}
              >
                <option value="all">Tutti i tipi</option>
                <option value="medical_checkup">Visite Mediche</option>
                <option value="course">Corsi</option>
                <option value="riba">RiBa</option>
                <option value="payment_schedule">Scadenziario</option>
                <option value="invoice">Fatture</option>
                <option value="vehicle_inspection">Revisioni Veicoli</option>
              </select>
            </div>
          )}
        </div>

        {filteredDeadlines.length > 0 ? (
          <div className="space-y-3">
            {filteredDeadlines.map((deadline) => {
              const daysUntil = getDaysUntil(deadline.due_date);
              return (
                <div
                  key={`${deadline.type}-${deadline.id}`}
                  className={`border-2 rounded-lg p-4 ${getPriorityColor(deadline.priority)}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getTypeIcon(deadline.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{deadline.title}</h3>
                          <p className="text-sm mt-1">{deadline.description}</p>
                          {deadline.worker_name && (
                            <p className="text-xs mt-1 font-medium">
                              Lavoratore: {deadline.worker_name}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-1">
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-white bg-opacity-50">
                            {getTypeLabel(deadline.type)}
                          </span>
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-white bg-opacity-50">
                            {getPriorityLabel(deadline.priority)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">{formatDate(deadline.due_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">
                            {daysUntil === 0 ? 'Oggi!' :
                             daysUntil === 1 ? 'Domani' :
                             daysUntil < 0 ? `Scaduto da ${Math.abs(daysUntil)} giorni` :
                             `Fra ${daysUntil} giorni`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              {deadlines.length === 0
                ? 'Nessuna scadenza nei prossimi 30 giorni'
                : 'Nessuna scadenza corrisponde ai filtri selezionati'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
