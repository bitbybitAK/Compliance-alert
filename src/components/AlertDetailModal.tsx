import { useState } from 'react';
import { X, Clock, User, Building, Mail, Calendar, FileText, AlertCircle } from 'lucide-react';
import { ComplianceAlert, Status } from '../types';
import toast from 'react-hot-toast';

interface AlertDetailModalProps {
  alert: ComplianceAlert;
  onClose: () => void;
  onUpdate: (alertId: string, updates: Partial<ComplianceAlert>) => void;
}

export default function AlertDetailModal({ alert, onClose, onUpdate }: AlertDetailModalProps) {
  const [notes, setNotes] = useState(alert.investigationNotes);
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (newStatus: Status, actionName: string) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const timelineEvent = {
      id: `${alert.id}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: actionName,
      user: 'Current User',
      notes: notes || undefined,
    };

    onUpdate(alert.id, {
      status: newStatus,
      investigationNotes: notes,
      timeline: [...alert.timeline, timelineEvent],
    });

    setIsLoading(false);
    toast.success(`${actionName} completed successfully`);
    
    if (newStatus === 'Resolved' || newStatus === 'Dismissed') {
      setTimeout(onClose, 500);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'In Review': return 'bg-yellow-100 text-yellow-800';
      case 'Escalated': return 'bg-red-100 text-red-800';
      case 'Dismissed': return 'bg-gray-100 text-gray-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${getSeverityColor(alert.severity)}`}>
              {alert.severity}
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(alert.status)}`}>
              {alert.status}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{alert.id}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Alert Information */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Alert Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Alert Type</label>
                <p className="text-gray-900 font-medium">{alert.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Detected By</label>
                <p className="text-gray-900">{alert.detectedBy}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-900">{alert.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Timestamp
                </label>
                <p className="text-gray-900">
                  {new Date(alert.timestamp).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </section>

          {/* Trader Details */}
          <section className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Trader Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Trader ID</label>
                <p className="text-gray-900 font-medium">{alert.trader.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-900">{alert.trader.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <Building className="w-4 h-4" />
                  Firm
                </label>
                <p className="text-gray-900">{alert.trader.firm}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <p className="text-gray-900">{alert.trader.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Registration Date
                </label>
                <p className="text-gray-900">
                  {new Date(alert.trader.registrationDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </section>

          {/* Action Timeline */}
          <section className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Action Timeline
            </h3>
            <div className="space-y-4">
              {alert.timeline.map((event, index) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${index === alert.timeline.length - 1 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                    {index < alert.timeline.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900">{event.action}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(event.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">By {event.user}</p>
                    {event.notes && (
                      <p className="text-sm text-gray-500 mt-1">{event.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Investigation Notes */}
          <section className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Investigation Notes
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add investigation notes here..."
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </section>

          {/* Action Buttons */}
          <section className="border-t border-gray-200 pt-6 flex flex-wrap gap-3">
            {alert.status === 'New' && (
              <button
                onClick={() => handleAction('In Review', 'Start Investigation')}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isLoading ? 'Processing...' : 'Start Investigation'}
              </button>
            )}
            {alert.status !== 'Escalated' && alert.status !== 'Resolved' && alert.status !== 'Dismissed' && (
              <button
                onClick={() => handleAction('Escalated', 'Escalate')}
                disabled={isLoading}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isLoading ? 'Processing...' : 'Escalate'}
              </button>
            )}
            {alert.status !== 'Resolved' && alert.status !== 'Dismissed' && (
              <button
                onClick={() => handleAction('Dismissed', 'Dismiss')}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isLoading ? 'Processing...' : 'Dismiss'}
              </button>
            )}
            {alert.status !== 'Resolved' && alert.status !== 'Dismissed' && (
              <button
                onClick={() => handleAction('Resolved', 'Mark Resolved')}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isLoading ? 'Processing...' : 'Mark Resolved'}
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

