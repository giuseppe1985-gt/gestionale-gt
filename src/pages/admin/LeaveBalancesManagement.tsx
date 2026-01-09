import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, Save, User } from 'lucide-react';
import { Database } from '../../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type LeaveBalance = Database['public']['Tables']['leave_balances']['Row'] & {
  worker: Profile;
};

export default function LeaveBalancesManagement() {
  const { profile } = useAuth();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, { vacation: number; rol: number }>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: workersData } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .eq('organization_id', profile?.organization_id)
        .order('full_name');

      const { data: balancesData } = await supabase
        .from('leave_balances')
        .select('*, worker:profiles!leave_balances_worker_id_fkey(*)')
        .eq('organization_id', profile?.organization_id);

      setWorkers(workersData || []);
      setBalances(balancesData || []);

      const initialValues: Record<string, { vacation: number; rol: number }> = {};
      workersData?.forEach(worker => {
        const balance = balancesData?.find(b => b.worker_id === worker.id);
        initialValues[worker.id] = {
          vacation: balance?.vacation_hours || 0,
          rol: balance?.rol_hours || 0,
        };
      });
      setEditValues(initialValues);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBalanceForWorker = (workerId: string) => {
    return balances.find(b => b.worker_id === workerId);
  };

  const handleSaveBalance = async (workerId: string, vacation: number, rol: number) => {
    setSaving(workerId);
    try {
      const existingBalance = getBalanceForWorker(workerId);

      if (existingBalance) {
        const { error } = await supabase
          .from('leave_balances')
          .update({
            vacation_hours: vacation,
            rol_hours: rol,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingBalance.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('leave_balances')
          .insert({
            worker_id: workerId,
            vacation_hours: vacation,
            rol_hours: rol,
            organization_id: profile?.organization_id,
          });

        if (error) throw error;
      }

      await loadData();
    } catch (error) {
      console.error('Error saving balance:', error);
      alert('Errore durante il salvataggio del monte ore');
    } finally {
      setSaving(null);
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
        <h1 className="text-3xl font-bold text-gray-900">Gestione Monte Ore</h1>
        <p className="text-gray-600 mt-1">Configura le ore disponibili per ferie e ROL</p>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-900 to-blue-700 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Utente</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Ferie (ore)</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">ROL (ore)</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {workers.map((worker) => {
                const values = editValues[worker.id] || { vacation: 0, rol: 0 };

                return (
                  <tr key={worker.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {worker.full_name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{worker.full_name}</p>
                          <p className="text-sm text-gray-600">{worker.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={values.vacation}
                        onChange={(e) => setEditValues({
                          ...editValues,
                          [worker.id]: { ...values, vacation: Number(e.target.value) }
                        })}
                        className="w-24 px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:16px] cursor-pointer"
                        style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.25rem center" }}
                      >
                        {Array.from({ length: 1000 }, (_, i) => i).map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={values.rol}
                        onChange={(e) => setEditValues({
                          ...editValues,
                          [worker.id]: { ...values, rol: Number(e.target.value) }
                        })}
                        className="w-24 px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right bg-[length:16px] cursor-pointer"
                        style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.25rem center" }}
                      >
                        {Array.from({ length: 1000 }, (_, i) => i).map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleSaveBalance(worker.id, values.vacation, values.rol)}
                        disabled={saving === worker.id}
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving === worker.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Salvataggio...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Salva</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {workers.length === 0 && (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nessun utente trovato</p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Note importanti:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Il monte ore può essere impostato da 0 a 999 ore</li>
              <li>1 giorno di ferie = 8 ore</li>
              <li>Le ore verranno automaticamente scalate quando le richieste vengono approvate</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
