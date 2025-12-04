import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Search, Download, AlertTriangle, Clock, TrendingUp, 
  BarChart3, ChevronDown, SortAsc, SortDesc, Settings, RefreshCw, ExternalLink
} from 'lucide-react';
import { ComplianceAlert, Severity, Status } from './types';
import { generateMockAlerts } from './mockData';
import AlertDetailModal from './components/AlertDetailModal';
import SettingsModal from './components/SettingsModal';
import { fetchMultipleStocks, fetchIntradayData, StockData } from './services/alphaVantage';
import { generateAlertsFromStockData } from './services/alertGenerator';
import toast from 'react-hot-toast';

const STOCK_SYMBOLS = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'];
const REFRESH_INTERVAL = 60000; // 60 seconds

function App() {
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('alphaVantageApiKey') || '';
  });
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [isUsingRealData, setIsUsingRealData] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<ComplianceAlert | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
  const [sortBy, setSortBy] = useState<'time' | 'severity'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const previousDataRef = useRef<Map<string, StockData>>(new Map());
  const intradayDataRef = useRef<Map<string, { price: number; volume: number; timestamp: string }[]>>(new Map());

  // Initialize with mock data if no API key
  useEffect(() => {
    if (!apiKey) {
      setAlerts(generateMockAlerts());
      setIsUsingRealData(false);
    }
  }, [apiKey]);

  // Fetch real data when API key is available
  const fetchRealData = useCallback(async () => {
    if (!apiKey) return;

    setIsRefreshing(true);
    try {
      // Fetch current stock quotes
      const stockData = await fetchMultipleStocks(apiKey, STOCK_SYMBOLS);
      
      if (stockData.length === 0) {
        toast.error('Failed to fetch stock data. Using demo data.');
        setAlerts(generateMockAlerts());
        setIsUsingRealData(false);
        setIsRefreshing(false);
        return;
      }

      // We'll fetch intraday data for first stock only to avoid rate limits
      if (stockData.length > 0) {
        const intraday = await fetchIntradayData(apiKey, stockData[0].symbol);
        if (intraday.length > 0) {
          intradayDataRef.current.set(stockData[0].symbol, intraday);
        }
      }

      // Generate alerts from stock data
      const newAlerts = generateAlertsFromStockData(
        stockData,
        previousDataRef.current,
        intradayDataRef.current
      );

      // Update previous data for next comparison
      stockData.forEach(stock => {
        previousDataRef.current.set(stock.symbol, stock);
      });

      // Merge with existing alerts (keep old alerts, add new ones)
      setAlerts(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const newUniqueAlerts = newAlerts.filter(a => !existingIds.has(a.id));
        return [...prev, ...newUniqueAlerts].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      });

      setIsUsingRealData(true);
      setLastUpdated(new Date());
      toast.success(`Updated ${stockData.length} stocks, generated ${newAlerts.length} alerts`);
    } catch (error) {
      console.error('Error fetching real data:', error);
      toast.error('Error fetching market data. Using demo data.');
      setAlerts(generateMockAlerts());
      setIsUsingRealData(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [apiKey]);

  // Auto-refresh every 60 seconds when using real data
  useEffect(() => {
    if (!apiKey) return;

    // Initial fetch
    fetchRealData();

    // Set up interval
    const interval = setInterval(() => {
      fetchRealData();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [apiKey, fetchRealData]);

  const handleApiKeySet = (key: string) => {
    setApiKey(key);
    if (key) {
      fetchRealData();
    } else {
      setAlerts(generateMockAlerts());
      setIsUsingRealData(false);
      previousDataRef.current.clear();
      intradayDataRef.current.clear();
    }
  };

  const handleManualRefresh = () => {
    if (apiKey) {
      fetchRealData();
    } else {
      toast('Add API key to fetch live market data', { icon: 'ℹ️' });
    }
  };

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
    
    const investigatedAlerts = alerts.filter(a => 
      a.status === 'Resolved' || a.status === 'Dismissed' || a.status === 'Escalated'
    );
    const avgInvestigationTime = investigatedAlerts.length > 0
      ? Math.round(
          investigatedAlerts.reduce((sum, alert) => {
            if (alert.timeline.length > 1) {
              const start = new Date(alert.timeline[0].timestamp).getTime();
              const end = new Date(alert.timeline[alert.timeline.length - 1].timestamp).getTime();
              return sum + (end - start) / (1000 * 60 * 60);
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

  const getTimeAgo = (date: Date | null) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hours ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* API Key Banner */}
      {!apiKey && (
        <div className="bg-blue-600 text-white py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm">
                Get your free API key at{' '}
                <a
                  href="https://www.alphavantage.co/support/#api-key"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold hover:text-blue-200"
                >
                  alphavantage.co
                </a>
                {' '}(takes 30 seconds, no credit card)
              </span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-sm underline hover:text-blue-200"
            >
              Add API Key →
            </button>
          </div>
        </div>
      )}

      {/* Demo Data Banner */}
      {!isUsingRealData && apiKey && (
        <div className="bg-yellow-50 border-b border-yellow-200 py-2 px-4">
          <div className="max-w-7xl mx-auto text-sm text-yellow-800">
            Using demo data - add API key for live market data
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Compliance Alert Triage System</h1>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-sm text-gray-500">Eventus Systems - Regulatory Technology Platform</p>
                {isUsingRealData && lastUpdated && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>Last updated: {getTimeAgo(lastUpdated)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isUsingRealData && (
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              )}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
            </div>
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

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onApiKeySet={handleApiKeySet}
      />

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
