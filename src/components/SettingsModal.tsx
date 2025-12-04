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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Key className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">API Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alpha Vantage API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-2 text-sm text-gray-500">
              Get your free API key at{' '}
              <a
                href="https://www.alphavantage.co/support/#api-key"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                alphavantage.co
              </a>
              {' '}(takes 30 seconds, no credit card)
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The free tier allows 5 API calls per minute. 
              The app will automatically manage rate limits.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          {apiKey && (
            <button
              onClick={handleRemove}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
            >
              Remove API Key
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !apiKey.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
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

