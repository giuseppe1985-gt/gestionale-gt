import { useState } from 'react';
import { Clock, Users } from 'lucide-react';
import TimeTracking from '../worker/TimeTracking';
import TimeEntriesView from '../admin/TimeEntriesView';

export default function CombinedTimeTracking() {
  const [activeTab, setActiveTab] = useState<'tracking' | 'view'>('tracking');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestione Timbrature</h1>
        <p className="text-gray-600 mt-1">Timbratura personale e resoconto ore lavoratori</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('tracking')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'tracking'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              Mia Timbratura
            </button>
            <button
              onClick={() => setActiveTab('view')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'view'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4" />
              Resoconto Lavoratori
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'tracking' ? <TimeTracking /> : <TimeEntriesView />}
        </div>
      </div>
    </div>
  );
}
