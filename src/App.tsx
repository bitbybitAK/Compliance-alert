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
      // Search filter
      const matchesSearch = 
        alert.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.trader.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.trader.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Severity filter - exact string match
      const matchesSeverity = severityFilter === 'All' 
        ? true 
        : alert.severity.trim() === severityFilter.trim();
      
      // Status filter - exact string match
      const matchesStatus = statusFilter === 'All' 
        ? true 
        : alert.status.trim() === statusFilter.trim();
      
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
    
    // False Positive Rate: (Dismissed alerts / Total processed alerts) × 100
    // Processed alerts = all alerts that are NOT "New" (i.e., have been processed)
    const processedAlerts = alerts.filter(a => a.status !== 'New');
    const dismissedAlerts = alerts.filter(a => a.status === 'Dismissed').length;
    const falsePositiveRate = processedAlerts.length > 0
      ? parseFloat(((dismissedAlerts / processedAlerts.length) * 100).toFixed(1))
      : null;
    
    // Average Investigation Time: Time from creation to resolution in minutes
    // Only for resolved alerts (not dismissed)
    // Calculation: (resolution timestamp - creation timestamp) in minutes
    const resolvedAlerts = alerts.filter(a => a.status === 'Resolved');
    const avgInvestigationTime = resolvedAlerts.length > 0
      ? Math.round(
          resolvedAlerts.reduce((sum, alert) => {
            // Creation timestamp is the alert's original timestamp
            const creationTime = new Date(alert.timestamp).getTime();
            
            // Resolution timestamp is the timestamp of the "Resolved" or "Mark Resolved" action in timeline
            const resolutionEvent = alert.timeline.find(event => 
              event.action === 'Resolved' || event.action === 'Mark Resolved'
            );
            
            if (resolutionEvent) {
              const resolutionTime = new Date(resolutionEvent.timestamp).getTime();
              const timeDiffMinutes = (resolutionTime - creationTime) / (1000 * 60);
              return sum + timeDiffMinutes;
            }
            
            // Fallback: if no resolution event found, use last timeline event
            if (alert.timeline.length > 0) {
              const lastEventTime = new Date(alert.timeline[alert.timeline.length - 1].timestamp).getTime();
              const timeDiffMinutes = (lastEventTime - creationTime) / (1000 * 60);
              return sum + timeDiffMinutes;
            }
            
            return sum;
          }, 0) / resolvedAlerts.length
        )
      : null;

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
      case 'Critical': return 'badge-critical';
      case 'High': return 'badge-high';
      case 'Medium': return 'badge-medium';
      case 'Low': return 'badge-low';
    }
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'New': return 'status-new';
      case 'In Review': return 'status-review';
      case 'Escalated': return 'status-escalated';
      case 'Dismissed': return 'status-dismissed';
      case 'Resolved': return 'status-resolved';
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
    <div className="min-h-screen">
      {/* API Key Banner */}
      {!apiKey && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm font-medium">
                Get your free API key at{' '}
                <a
                  href="https://www.alphavantage.co/support/#api-key"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold hover:text-blue-200 transition-colors"
                >
                  alphavantage.co
                </a>
                {' '}(takes 30 seconds, no credit card)
              </span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-sm font-semibold underline hover:text-blue-200 transition-colors"
            >
              Add API Key →
            </button>
          </div>
        </div>
      )}

      {/* Demo Data Banner */}
      {!isUsingRealData && apiKey && (
        <div className="bg-yellow-500/20 backdrop-blur-sm border-b border-yellow-400/30 py-2 px-4">
          <div className="max-w-7xl mx-auto text-sm text-yellow-200 font-medium">
            Using demo data - add API key for live market data
          </div>
        </div>
      )}

      {/* Header */}
      <header className="glass border-b border-white/10 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                Compliance Alert Triage System
              </h1>
              {isUsingRealData && lastUpdated && (
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Clock className="w-4 h-4" />
                  <span>Last updated: {getTimeAgo(lastUpdated)}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isUsingRealData && (
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              )}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="btn-secondary"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
              <button
                onClick={handleExport}
                className="btn-primary"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="metric-card animate-slide-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">Total Alerts</h3>
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-4xl font-bold text-white mb-1">{metrics.totalAlerts}</p>
            <p className="text-xs text-white/50">All time alerts</p>
          </div>

          <div className="metric-card animate-slide-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">Pending Review</h3>
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-4xl font-bold text-white mb-1">{metrics.pendingReview}</p>
            <p className="text-xs text-white/50">Requires attention</p>
          </div>

          <div className="metric-card animate-slide-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">False Positive Rate</h3>
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {metrics.falsePositiveRate !== null ? `${metrics.falsePositiveRate.toFixed(1)}%` : '---%'}
            </p>
            <p className="text-xs text-white/50">Dismissed / Processed</p>
          </div>

          <div className="metric-card animate-slide-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">Avg Investigation Time</h3>
              <Clock className="w-5 h-5 text-teal-400" />
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {metrics.avgInvestigationTime !== null ? `${metrics.avgInvestigationTime} min` : '-- min'}
            </p>
            <p className="text-xs text-white/50">Resolution time</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="card p-6 mb-6 animate-fade-in">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="text"
                placeholder="Search by alert ID, trader name, or trader ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-modern pl-12"
              />
            </div>

            <div className="relative">
              <select
                value={severityFilter}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'All' || value === 'Critical' || value === 'High' || value === 'Medium' || value === 'Low') {
                    setSeverityFilter(value as Severity | 'All');
                  }
                }}
                className="select-modern pr-10"
              >
                <option value="All" className="bg-slate-900">All Severities</option>
                <option value="Critical" className="bg-slate-900">Critical</option>
                <option value="High" className="bg-slate-900">High</option>
                <option value="Medium" className="bg-slate-900">Medium</option>
                <option value="Low" className="bg-slate-900">Low</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as Status | 'All')}
                className="select-modern pr-10"
              >
                <option value="All" className="bg-slate-900">All Statuses</option>
                <option value="New" className="bg-slate-900">New</option>
                <option value="In Review" className="bg-slate-900">In Review</option>
                <option value="Escalated" className="bg-slate-900">Escalated</option>
                <option value="Dismissed" className="bg-slate-900">Dismissed</option>
                <option value="Resolved" className="bg-slate-900">Resolved</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
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
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
                  sortBy === 'time' 
                    ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-white border border-blue-400/50' 
                    : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
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
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
                  sortBy === 'severity' 
                    ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-white border border-blue-400/50' 
                    : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
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
          <div className="card p-12 text-center animate-fade-in">
            <AlertTriangle className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No alerts found</h3>
            <p className="text-white/60">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedAlerts.map((alert, index) => (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className="card card-hover p-6 animate-slide-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{alert.id}</h3>
                    <p className="text-sm text-white/60">{alert.type}</p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${getSeverityColor(alert.severity)}`}>
                    {alert.severity}
                  </div>
                </div>

                <div className="space-y-2.5 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white/50">Trader:</span>
                    <span className="font-semibold text-white">{alert.trader.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white/50">Firm:</span>
                    <span className="text-white/80">{alert.trader.firm}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-white/40" />
                    <span className="text-white/60">
                      {new Date(alert.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${getStatusColor(alert.status)}`}>
                    {alert.status}
                  </span>
                  <p className="text-xs text-white/40">{alert.trader.id}</p>
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
