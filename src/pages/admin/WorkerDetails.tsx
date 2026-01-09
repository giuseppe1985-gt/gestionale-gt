import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  GraduationCap,
  Stethoscope,
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  X,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { Database } from '../../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Course = Database['public']['Tables']['worker_courses']['Row'];
type MedicalCheckup = Database['public']['Tables']['worker_medical_checkups']['Row'];

interface WorkerDetailsProps {
  worker: Profile;
  onClose: () => void;
}

export default function WorkerDetails({ worker, onClose }: WorkerDetailsProps) {
  const [activeTab, setActiveTab] = useState<'courses' | 'medical' | 'card'>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [medicalCheckups, setMedicalCheckups] = useState<MedicalCheckup[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showMedicalForm, setShowMedicalForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingMedical, setEditingMedical] = useState<MedicalCheckup | null>(null);

  const [courseForm, setCourseForm] = useState({
    course_name: '',
    completion_date: '',
    notes: '',
  });

  const [medicalForm, setMedicalForm] = useState({
    checkup_date: '',
    expiry_date: '',
    notes: '',
  });

  const [paymentCard, setPaymentCard] = useState({
    payment_card_number: worker.payment_card_number || '',
    payment_card_assigned_date: worker.payment_card_assigned_date || '',
  });

  useEffect(() => {
    loadData();
  }, [worker.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [coursesRes, medicalRes] = await Promise.all([
        supabase
          .from('worker_courses')
          .select('*')
          .eq('worker_id', worker.id)
          .order('completion_date', { ascending: false }),
        supabase
          .from('worker_medical_checkups')
          .select('*')
          .eq('worker_id', worker.id)
          .order('expiry_date', { ascending: false }),
      ]);

      setCourses(coursesRes.data || []);
      setMedicalCheckups(medicalRes.data || []);
    } catch (error) {
      console.error('Error loading worker details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', worker.id)
        .single();

      if (editingCourse) {
        await supabase
          .from('worker_courses')
          .update({
            course_name: courseForm.course_name,
            completion_date: courseForm.completion_date,
            notes: courseForm.notes,
          })
          .eq('id', editingCourse.id);
      } else {
        await supabase.from('worker_courses').insert({
          worker_id: worker.id,
          course_name: courseForm.course_name,
          completion_date: courseForm.completion_date,
          notes: courseForm.notes,
          organization_id: profile?.organization_id,
        });
      }

      setCourseForm({ course_name: '', completion_date: '', notes: '' });
      setShowCourseForm(false);
      setEditingCourse(null);
      loadData();
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Errore nel salvataggio del corso');
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo corso?')) return;
    try {
      await supabase.from('worker_courses').delete().eq('id', id);
      loadData();
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      course_name: course.course_name,
      completion_date: course.completion_date,
      notes: course.notes || '',
    });
    setShowCourseForm(true);
  };

  const handleAddMedical = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', worker.id)
        .single();

      if (editingMedical) {
        await supabase
          .from('worker_medical_checkups')
          .update({
            checkup_date: medicalForm.checkup_date,
            expiry_date: medicalForm.expiry_date,
            notes: medicalForm.notes,
          })
          .eq('id', editingMedical.id);
      } else {
        await supabase.from('worker_medical_checkups').insert({
          worker_id: worker.id,
          checkup_date: medicalForm.checkup_date,
          expiry_date: medicalForm.expiry_date,
          notes: medicalForm.notes,
          organization_id: profile?.organization_id,
        });
      }

      setMedicalForm({ checkup_date: '', expiry_date: '', notes: '' });
      setShowMedicalForm(false);
      setEditingMedical(null);
      loadData();
    } catch (error) {
      console.error('Error saving medical checkup:', error);
      alert('Errore nel salvataggio della visita medica');
    }
  };

  const handleDeleteMedical = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa visita medica?')) return;
    try {
      await supabase.from('worker_medical_checkups').delete().eq('id', id);
      loadData();
    } catch (error) {
      console.error('Error deleting medical checkup:', error);
    }
  };

  const handleEditMedical = (medical: MedicalCheckup) => {
    setEditingMedical(medical);
    setMedicalForm({
      checkup_date: medical.checkup_date,
      expiry_date: medical.expiry_date,
      notes: medical.notes || '',
    });
    setShowMedicalForm(true);
  };

  const handleSavePaymentCard = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          payment_card_number: paymentCard.payment_card_number || null,
          payment_card_assigned_date: paymentCard.payment_card_assigned_date || null,
        })
        .eq('id', worker.id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Carta aggiornata con successo:', data);
      alert('Carta acquisti aggiornata con successo!');
    } catch (error) {
      console.error('Error saving payment card:', error);
      alert('Errore nel salvataggio della carta acquisti: ' + (error instanceof Error ? error.message : 'Errore sconosciuto'));
    }
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{worker.full_name}</h2>
                <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-xs font-medium">
                  {worker.role === 'worker' && 'Operaio'}
                  {worker.role === 'administrator' && 'Amministratore'}
                  {worker.role === 'org_manager' && 'Responsabile Organizzazione'}
                  {worker.role === 'sales_manager' && 'Responsabile Commerciale'}
                </span>
              </div>
              <p className="text-blue-100 mt-1">{worker.email}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'courses'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <GraduationCap className="w-5 h-5 inline-block mr-2" />
            Corsi
          </button>
          <button
            onClick={() => setActiveTab('medical')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'medical'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Stethoscope className="w-5 h-5 inline-block mr-2" />
            Visite Mediche
          </button>
          <button
            onClick={() => setActiveTab('card')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'card'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <CreditCard className="w-5 h-5 inline-block mr-2" />
            Carta Acquisti
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'courses' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Corsi Completati</h3>
                <button
                  onClick={() => {
                    setShowCourseForm(!showCourseForm);
                    if (showCourseForm) {
                      setEditingCourse(null);
                      setCourseForm({ course_name: '', completion_date: '', notes: '' });
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Aggiungi Corso</span>
                </button>
              </div>

              {showCourseForm && (
                <form onSubmit={handleAddCourse} className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Corso
                    </label>
                    <input
                      type="text"
                      required
                      value={courseForm.course_name}
                      onChange={(e) => setCourseForm({ ...courseForm, course_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Completamento
                    </label>
                    <input
                      type="date"
                      required
                      value={courseForm.completion_date}
                      onChange={(e) => setCourseForm({ ...courseForm, completion_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Note (opzionale)
                    </label>
                    <textarea
                      value={courseForm.notes}
                      onChange={(e) => setCourseForm({ ...courseForm, notes: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {editingCourse ? 'Aggiorna' : 'Salva'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCourseForm(false);
                        setEditingCourse(null);
                        setCourseForm({ course_name: '', completion_date: '', notes: '' });
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Annulla
                    </button>
                  </div>
                </form>
              )}

              {courses.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <GraduationCap className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p>Nessun corso registrato</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {courses.map((course) => (
                    <div key={course.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{course.course_name}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Completato il {new Date(course.completion_date).toLocaleDateString('it-IT')}
                          </p>
                          {course.notes && (
                            <p className="text-sm text-gray-500 mt-2">{course.notes}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditCourse(course)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(course.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Visite Mediche</h3>
                <button
                  onClick={() => {
                    setShowMedicalForm(!showMedicalForm);
                    if (showMedicalForm) {
                      setEditingMedical(null);
                      setMedicalForm({ checkup_date: '', expiry_date: '', notes: '' });
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Aggiungi Visita</span>
                </button>
              </div>

              {showMedicalForm && (
                <form onSubmit={handleAddMedical} className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Visita
                    </label>
                    <input
                      type="date"
                      required
                      value={medicalForm.checkup_date}
                      onChange={(e) => setMedicalForm({ ...medicalForm, checkup_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Scadenza
                    </label>
                    <input
                      type="date"
                      required
                      value={medicalForm.expiry_date}
                      onChange={(e) => setMedicalForm({ ...medicalForm, expiry_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Note (opzionale)
                    </label>
                    <textarea
                      value={medicalForm.notes}
                      onChange={(e) => setMedicalForm({ ...medicalForm, notes: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {editingMedical ? 'Aggiorna' : 'Salva'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMedicalForm(false);
                        setEditingMedical(null);
                        setMedicalForm({ checkup_date: '', expiry_date: '', notes: '' });
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Annulla
                    </button>
                  </div>
                </form>
              )}

              {medicalCheckups.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Stethoscope className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p>Nessuna visita medica registrata</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {medicalCheckups.map((medical) => (
                    <div
                      key={medical.id}
                      className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                        isExpiringSoon(medical.expiry_date)
                          ? 'bg-orange-50 border-orange-300'
                          : 'bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {isExpiringSoon(medical.expiry_date) && (
                            <div className="flex items-center space-x-2 mb-2">
                              <AlertTriangle className="w-5 h-5 text-orange-600" />
                              <span className="text-sm font-semibold text-orange-600">
                                Scade tra {getDaysUntilExpiry(medical.expiry_date)} giorni
                              </span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2 mb-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              Visita del {new Date(medical.checkup_date).toLocaleDateString('it-IT')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">
                              Scadenza: {new Date(medical.expiry_date).toLocaleDateString('it-IT')}
                            </span>
                          </div>
                          {medical.notes && (
                            <p className="text-sm text-gray-500 mt-2">{medical.notes}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditMedical(medical)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMedical(medical.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'card' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Carta Acquisti</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  Disponibile per tutti i ruoli
                </span>
              </div>

              <div className="bg-white border rounded-lg p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numero Carta
                  </label>
                  <input
                    type="text"
                    placeholder="Nessuna"
                    value={paymentCard.payment_card_number}
                    onChange={(e) => setPaymentCard({ ...paymentCard, payment_card_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Lascia vuoto per indicare "Nessuna carta assegnata"
                  </p>
                </div>

                {paymentCard.payment_card_number && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Assegnazione
                    </label>
                    <input
                      type="date"
                      value={paymentCard.payment_card_assigned_date}
                      onChange={(e) => setPaymentCard({ ...paymentCard, payment_card_assigned_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                <button
                  onClick={handleSavePaymentCard}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Salva Modifiche
                </button>

                <div className="mt-6 pt-6 border-t">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          {paymentCard.payment_card_number ? 'Carta Assegnata' : 'Nessuna Carta Assegnata'}
                        </p>
                        {paymentCard.payment_card_number && (
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-blue-700">
                              Numero: {paymentCard.payment_card_number}
                            </p>
                            {paymentCard.payment_card_assigned_date && (
                              <p className="text-sm text-blue-700">
                                Assegnata il: {new Date(paymentCard.payment_card_assigned_date).toLocaleDateString('it-IT')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
