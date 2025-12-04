import { useState, useMemo } from 'react';
import { 
  Search, Download, AlertTriangle, Clock, TrendingUp, 
  BarChart3, ChevronDown, SortAsc, SortDesc 
} from 'lucide-react';
import { ComplianceAlert, Severity, Status } from './types';
import { generateMockAlerts } from './mockData';
import AlertDetailModal from './components/AlertDetailModal';
import toast from 'react-hot-toast';

function App() {
  const [alerts, setAlerts] = useState<ComplianceAlert[]>(generateMockAlerts());
  const [selectedAlert, setSelectedAlert] = useState<ComplianceAlert | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
  const [sortBy, setSortBy] = useState<'time' | 'severity'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedAlerts = useMemo(() => {
    let filtered = alerts.filter(alert => {
      const matchesSearch = 
        alert.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.trader.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.trader.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSeverity = severityFilter === 'All' || alert.severity === severityFilter;
      const matchesStatus = statusFilter === 'All' || alert.status === statusFilter;
      
      return matchesSearch && matchesSeverity && matchesStatus;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'time') {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      } else {
        const severityOrder: Record<Severity, number> = {
          'Critical': 4,
          'High': 3,
          'Medium': 2,
          'Low': 1,
        };
        const orderA = severityOrder[a.severity];
        const orderB = severityOrder[b.severity];
        return sortOrder === 'asc' ? orderA - orderB : orderB - orderA;
      }
    });

    return filtered;
  }, [alerts, searchQuery, severityFilter, statusFilter, sortBy, sortOrder]);

  const metrics = useMemo(() => {
    const totalAlerts = alerts.length;
    const pendingReview = alerts.filter(a => a.status === 'New' || a.status === 'In Review').length;
    const falsePositiveRate = totalAlerts > 0 
      ? Math.round((alerts.filter(a => a.status === 'Dismissed').length / totalAlerts) * 100)
      : 0;
    
    // Calculate average investigation time (simulated)
    const investigatedAlerts = alerts.filter(a => 
      a.status === 'Resolved' || a.status === 'Dismissed' || a.status === 'Escalated'
    );
    const avgInvestigationTime = investigatedAlerts.length > 0
      ? Math.round(
          investigatedAlerts.reduce((sum, alert) => {
            if (alert.timeline.length > 1) {
              const start = new Date(alert.timeline[0].timestamp).getTime();
              const end = new Date(alert.timeline[alert.timeline.length - 1].timestamp).getTime();
              return sum + (end - start) / (1000 * 60 * 60); // hours
            }
            return sum;
          }, 0) / investigatedAlerts.length
        )
      : 0;

    return {
      totalAlerts,
      pendingReview,
      falsePositiveRate,
      avgInvestigationTime,
    };
  }, [alerts]);

  const handleUpdateAlert = (alertId: string, updates: Partial<ComplianceAlert>) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, ...updates } : alert
    ));
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(filteredAndSortedAlerts, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compliance-alerts-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Alerts exported successfully');
  };

  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low': return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'In Review': return 'bg-yellow-100 text-yellow-800';
      case 'Escalated': return 'bg-red-100 text-red-800';
      case 'Dismissed': return 'bg-gray-100 text-gray-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Compliance Alert Triage System</h1>
              <p className="text-sm text-gray-500 mt-1">Eventus Systems - Regulatory Technology Platform</p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Total Alerts</h3>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.totalAlerts}</p>
            <p className="text-xs text-gray-500 mt-1">All time alerts</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Pending Review</h3>
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-3xl font-bold text-orange-600">{metrics.pendingReview}</p>
            <p className="text-xs text-gray-500 mt-1">Requires attention</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">False Positive Rate</h3>
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{metrics.falsePositiveRate}%</p>
            <p className="text-xs text-gray-500 mt-1">Dismissed alerts</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Avg Investigation Time</h3>
              <Clock className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-green-600">{metrics.avgInvestigationTime}h</p>
            <p className="text-xs text-gray-500 mt-1">Average resolution time</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by alert ID, trader name, or trader ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="relative">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as Severity | 'All')}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer"
              >
                <option value="All">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as Status | 'All')}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="New">New</option>
                <option value="In Review">In Review</option>
                <option value="Escalated">Escalated</option>
                <option value="Dismissed">Dismissed</option>
                <option value="Resolved">Resolved</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (sortBy === 'time') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('time');
                    setSortOrder('desc');
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  sortBy === 'time' 
                    ? 'bg-blue-50 border-blue-300 text-blue-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                Time
              </button>
              <button
                onClick={() => {
                  if (sortBy === 'severity') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('severity');
                    setSortOrder('desc');
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  sortBy === 'severity' 
                    ? 'bg-blue-50 border-blue-300 text-blue-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                Severity
              </button>
            </div>
          </div>
        </div>

        {/* Alerts Grid */}
        {filteredAndSortedAlerts.length === 0 ? (
          <div className="card p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No alerts found</h3>
            <p className="text-gray-500">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedAlerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className="card card-hover p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{alert.id}</h3>
                    <p className="text-sm text-gray-500">{alert.type}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-semibold border ${getSeverityColor(alert.severity)}`}>
                    {alert.severity}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Trader:</span>
                    <span className="font-medium text-gray-900">{alert.trader.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Firm:</span>
                    <span className="text-gray-900">{alert.trader.firm}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">
                      {new Date(alert.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(alert.status)}`}>
                    {alert.status}
                  </span>
                  <p className="text-xs text-gray-500">{alert.trader.id}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onUpdate={handleUpdateAlert}
        />
      )}
    </div>
  );
}

export default App;

