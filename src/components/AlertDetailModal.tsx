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
      case 'Critical': return 'badge-critical';
      case 'High': return 'badge-high';
      case 'Medium': return 'badge-medium';
      case 'Low': return 'badge-low';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-400/50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'status-new';
      case 'In Review': return 'status-review';
      case 'Escalated': return 'status-escalated';
      case 'Dismissed': return 'status-dismissed';
      case 'Resolved': return 'status-resolved';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-400/30';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="glass rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 glass border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-4 flex-wrap">
            <div className={`px-4 py-2 rounded-lg text-sm font-bold ${getSeverityColor(alert.severity)}`}>
              {alert.severity}
            </div>
            <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${getStatusColor(alert.status)}`}>
              {alert.status}
            </div>
            <h2 className="text-2xl font-bold text-white">{alert.id}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-white/70" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Alert Information */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-400" />
              Alert Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-white/60">Alert Type</label>
                <p className="text-white font-semibold">{alert.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-white/60">Detected By</label>
                <p className="text-white/90">{alert.detectedBy}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-white/60">Description</label>
                <p className="text-white/90">{alert.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-white/60 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Timestamp
                </label>
                <p className="text-white/90">
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
          <section className="border-t border-white/10 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Trader Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-white/60">Trader ID</label>
                <p className="text-white font-semibold">{alert.trader.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-white/60">Name</label>
                <p className="text-white/90">{alert.trader.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-white/60 flex items-center gap-1">
                  <Building className="w-4 h-4" />
                  Firm
                </label>
                <p className="text-white/90">{alert.trader.firm}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-white/60 flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <p className="text-white/90">{alert.trader.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-white/60 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Registration Date
                </label>
                <p className="text-white/90">
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
          <section className="border-t border-white/10 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Action Timeline
            </h3>
            <div className="space-y-4">
              {alert.timeline.map((event, index) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${index === alert.timeline.length - 1 ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/50' : 'bg-white/30'}`} />
                    {index < alert.timeline.length - 1 && (
                      <div className="w-0.5 h-full bg-white/20 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white">{event.action}</span>
                      <span className="text-sm text-white/60">
                        {new Date(event.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-white/70">By {event.user}</p>
                    {event.notes && (
                      <p className="text-sm text-white/60 mt-1">{event.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Investigation Notes */}
          <section className="border-t border-white/10 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Investigation Notes
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add investigation notes here..."
              className="input-modern h-32 resize-none"
            />
          </section>

          {/* Action Buttons */}
          <section className="border-t border-white/10 pt-6 flex flex-wrap gap-3">
            {alert.status === 'New' && (
              <button
                onClick={() => handleAction('In Review', 'Start Investigation')}
                disabled={isLoading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Start Investigation'}
              </button>
            )}
            {alert.status !== 'Escalated' && alert.status !== 'Resolved' && alert.status !== 'Dismissed' && (
              <button
                onClick={() => handleAction('Escalated', 'Escalate')}
                disabled={isLoading}
                className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
              >
                {isLoading ? 'Processing...' : 'Escalate'}
              </button>
            )}
            {alert.status !== 'Resolved' && alert.status !== 'Dismissed' && (
              <button
                onClick={() => handleAction('Dismissed', 'Dismiss')}
                disabled={isLoading}
                className="px-4 py-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold border border-white/20"
              >
                {isLoading ? 'Processing...' : 'Dismiss'}
              </button>
            )}
            {alert.status !== 'Resolved' && alert.status !== 'Dismissed' && (
              <button
                onClick={() => handleAction('Resolved', 'Mark Resolved')}
                disabled={isLoading}
                className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
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

