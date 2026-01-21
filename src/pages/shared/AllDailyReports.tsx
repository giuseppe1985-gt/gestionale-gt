import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Calendar, Clock, MapPin, User, Search, Filter } from 'lucide-react';

interface DailyReport {
  id: string;
  worker_id: string;
  worksite_id: string;
  report_date: string;
  report_time: string;
  description: string;
  notes: string | null;
  hours_worked: number | null;
  materials_used: string | null;
  equipment_used: string | null;
  weather_conditions: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
  worksites: {
    name: string;
    address: string;
  };
}

export default function AllDailyReports() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [worksiteFilter, setWorksiteFilter] = useState('');
  const [workerFilter, setWorkerFilter] = useState('');

  const [worksites, setWorksites] = useState<Array<{ id: string; name: string }>>([]);
  const [workers, setWorkers] = useState<Array<{ id: string; full_name: string }>>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, searchTerm, dateFrom, dateTo, worksiteFilter, workerFilter]);

  const loadData = async () => {
    try {
      const { data: reportsData } = await supabase
        .from('daily_reports')
        .select(`
          *,
          profiles (
            full_name,
            email
          ),
          worksites (
            name,
            address
          )
        `)
        .order('report_date', { ascending: false })
        .order('report_time', { ascending: false });

      setReports(reportsData || []);
      setFilteredReports(reportsData || []);

      const { data: worksitesData } = await supabase
        .from('worksites')
        .select('id, name')
        .order('name');
      setWorksites(worksitesData || []);

      const { data: workersData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['worker', 'administrator', 'org_manager', 'sales_manager'])
        .order('full_name');
      setWorkers(workersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = [...reports];

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.worksites.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro data DA
    if (dateFrom) {
      filtered = filtered.filter((r) => r.report_date >= dateFrom);
    }

    // Filtro data A
    if (dateTo) {
      filtered = filtered.filter((r) => r.report_date <= dateTo);
    }

    if (worksiteFilter) {
      filtered = filtered.filter((r) => r.worksite_id === worksiteFilter);
    }

    if (workerFilter) {
      filtered = filtered.filter((r) => r.worker_id === workerFilter);
    }

    setFilteredReports(filtered);
  };

  const setCurrentMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Formato YYYY-MM-DD senza problemi di fuso orario
    const formatDateLocal = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    setDateFrom(formatDateLocal(firstDay));
    setDateTo(formatDateLocal(lastDay));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setWorksiteFilter('');
    setWorkerFilter('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  // Calcolo totale ore per cantiere selezionato
  const getTotalHoursForWorksite = () => {
    if (!worksiteFilter) return 0;
    return filteredReports
      .filter(r => r.worksite_id === worksiteFilter)
      .reduce((sum, r) => sum + (r.hours_worked || 0), 0);
  };

  // Calcolo totale ore per lavoratore selezionato
  const getTotalHoursForWorker = () => {
    if (!workerFilter) return 0;
    return filteredReports
      .filter(r => r.worker_id === workerFilter)
      .reduce((sum, r) => sum + (r.hours_worked || 0), 0);
  };

  // Nome cantiere selezionato
  const getSelectedWorksiteName = () => {
    const ws = worksites.find(w => w.id === worksiteFilter);
    return ws?.name || '';
  };

  // Nome lavoratore selezionato
  const getSelectedWorkerName = () => {
    const worker = workers.find(w => w.id === workerFilter);
    return worker?.full_name || '';
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
      <div>
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Tutti i Rapportini</h1>
        <p className="text-gray-600 mt-1">Visualizza e gestisci tutti i rapportini giornalieri</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Filtri</h3>
          {(searchTerm || dateFrom || dateTo || worksiteFilter || workerFilter) && (
            <button
              onClick={clearFilters}
              className="ml-auto text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Cancella filtri
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cerca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <select
              value={worksiteFilter}
              onChange={(e) => setWorksiteFilter(e.target.value)}
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
            >
              <option value="">Tutti i cantieri</option>
              {worksites.map((worksite) => (
                <option key={worksite.id} value={worksite.id}>
                  {worksite.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={workerFilter}
              onChange={(e) => setWorkerFilter(e.target.value)}
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:20px] cursor-pointer"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center" }}
            >
              <option value="">Tutti i lavoratori</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtro Date DA - A + Seleziona Mese Corrente */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Da</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">A</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">&nbsp;</label>
            <button
              onClick={setCurrentMonth}
              className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Seleziona Mese Corrente
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Visualizzando {filteredReports.length} di {reports.length} rapportini
        </div>

        {/* Box Totale Ore */}
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          {worksiteFilter || workerFilter ? (
            <div className="space-y-3">
              {worksiteFilter && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">
                    Totale ore cantiere <span className="text-blue-600 font-medium">{getSelectedWorksiteName()}</span>:
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    {getTotalHoursForWorksite().toFixed(1)} ore
                  </span>
                </div>
              )}
              {workerFilter && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">
                    Totale ore lavoratore <span className="text-blue-600 font-medium">{getSelectedWorkerName()}</span>:
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    {getTotalHoursForWorker().toFixed(1)} ore
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center">
              Per vedere il totale ore, selezionare un cantiere o un lavoratore
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nessun rapportino trovato</h3>
            <p className="text-gray-600">
              {searchTerm || dateFrom || dateTo || worksiteFilter || workerFilter
                ? 'Prova a modificare i filtri di ricerca'
                : 'Non ci sono ancora rapportini compilati'}
            </p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div key={report.id} className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5" />
                        <span className="font-semibold">{formatDate(report.report_date)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5" />
                        <span>{formatTime(report.report_time)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="w-5 h-5" />
                      <span className="font-medium">{report.profiles.full_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-5 h-5" />
                      <span className="font-medium">{report.worksites.name}</span>
                      <span className="text-blue-200">-</span>
                      <span className="text-blue-200">{report.worksites.address}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Descrizione Lavoro</h4>
                  <p className="text-gray-900 whitespace-pre-wrap">{report.description}</p>
                </div>

                {report.hours_worked && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Ore Lavorate</h4>
                    <p className="text-gray-900">{report.hours_worked} ore</p>
                  </div>
                )}

                {report.materials_used && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Materiali Utilizzati</h4>
                    <p className="text-gray-900 whitespace-pre-wrap">{report.materials_used}</p>
                  </div>
                )}

                {report.equipment_used && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Attrezzature Utilizzate</h4>
                    <p className="text-gray-900 whitespace-pre-wrap">{report.equipment_used}</p>
                  </div>
                )}

                {report.weather_conditions && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Condizioni Meteo</h4>
                    <p className="text-gray-900">{report.weather_conditions}</p>
                  </div>
                )}

                {report.notes && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Note Aggiuntive</h4>
                    <p className="text-gray-900 whitespace-pre-wrap">{report.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
