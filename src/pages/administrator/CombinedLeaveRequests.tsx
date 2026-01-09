import { useState } from 'react';
import { FileText, CheckCircle } from 'lucide-react';
import LeaveRequests from '../worker/LeaveRequests';
import LeaveRequestsApproval from '../admin/LeaveRequestsApproval';

export default function CombinedLeaveRequests() {
  const [activeTab, setActiveTab] = useState<'requests' | 'approval'>('requests');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestione Permessi</h1>
        <p className="text-gray-600 mt-1">Richieste personali e approvazioni lavoratori</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'requests'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              Mie Richieste
            </button>
            <button
              onClick={() => setActiveTab('approval')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'approval'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Approva Richieste
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'requests' ? <LeaveRequests /> : <LeaveRequestsApproval />}
        </div>
      </div>
    </div>
  );
}
