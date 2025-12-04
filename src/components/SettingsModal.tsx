import { useState, useEffect } from 'react';
import { X, Key, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeySet: (apiKey: string) => void;
}

export default function SettingsModal({ isOpen, onClose, onApiKeySet }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('alphaVantageApiKey');
      if (stored) {
        setApiKey(stored);
      }
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setIsLoading(true);
    
    // Test the API key with a simple request
    try {
      const testUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${apiKey.trim()}`;
      const response = await fetch(testUrl);
      const data = await response.json();

      if (data['Error Message']) {
        toast.error('Invalid API key. Please check and try again.');
        setIsLoading(false);
        return;
      }

      if (data['Note']) {
        toast.error('API rate limit reached. Please try again later.');
        setIsLoading(false);
        return;
      }

      // Save to localStorage
      localStorage.setItem('alphaVantageApiKey', apiKey.trim());
      onApiKeySet(apiKey.trim());
      toast.success('API key saved successfully!');
      setIsLoading(false);
      onClose();
    } catch (error) {
      toast.error('Failed to validate API key. Please check your connection.');
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    localStorage.removeItem('alphaVantageApiKey');
    setApiKey('');
    onApiKeySet('');
    toast.success('API key removed. Using demo data.');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="glass rounded-2xl shadow-2xl max-w-md w-full animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg">
              <Key className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">API Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">
              Alpha Vantage API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="input-modern"
            />
            <p className="mt-2 text-sm text-white/60">
              Get your free API key at{' '}
              <a
                href="https://www.alphavantage.co/support/#api-key"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline font-medium transition-colors"
              >
                alphavantage.co
              </a>
              {' '}(takes 30 seconds, no credit card)
            </p>
          </div>

          <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-sm text-blue-200">
              <strong className="font-semibold">Note:</strong> The free tier allows 5 API calls per minute. 
              The app will automatically manage rate limits.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-white/10">
          {apiKey && (
            <button
              onClick={handleRemove}
              className="px-4 py-2 text-red-400 hover:bg-red-500/20 rounded-xl transition-colors font-semibold"
            >
              Remove API Key
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !apiKey.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

