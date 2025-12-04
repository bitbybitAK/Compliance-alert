const API_BASE_URL = 'https://www.alphavantage.co/query';

export interface StockData {
  symbol: string;
  price: number;
  volume: number;
  change: number;
  changePercent: number;
  timestamp: string;
  previousClose?: number;
  averageVolume?: number;
}

export interface StockQuote {
  '01. symbol': string;
  '02. open': string;
  '03. high': string;
  '04. low': string;
  '05. price': string;
  '06. volume': string;
  '07. latest trading day': string;
  '08. previous close': string;
  '09. change': string;
  '10. change percent': string;
}

export interface AlphaVantageResponse {
  'Global Quote'?: StockQuote;
  'Note'?: string;
  'Error Message'?: string;
}

export async function fetchStockQuote(apiKey: string, symbol: string): Promise<StockData | null> {
  try {
    const url = `${API_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    const response = await fetch(url);
    const data: AlphaVantageResponse = await response.json();

    if (data['Error Message']) {
      console.error(`Error fetching ${symbol}:`, data['Error Message']);
      return null;
    }

    if (data['Note']) {
      console.warn(`API Note for ${symbol}:`, data['Note']);
      return null;
    }

    const quote = data['Global Quote'];
    if (!quote) {
      return null;
    }

    const price = parseFloat(quote['05. price']);
    const previousClose = parseFloat(quote['08. previous close']);
    const change = parseFloat(quote['09. change']);
    const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
    const volume = parseInt(quote['06. volume']);

    return {
      symbol: quote['01. symbol'],
      price,
      volume,
      change,
      changePercent,
      timestamp: new Date().toISOString(),
      previousClose,
    };
  } catch (error) {
    console.error(`Error fetching stock data for ${symbol}:`, error);
    return null;
  }
}

export async function fetchMultipleStocks(
  apiKey: string,
  symbols: string[]
): Promise<StockData[]> {
  // Alpha Vantage free tier allows 5 API calls per minute
  // We'll fetch sequentially with delays to respect rate limits
  const results: StockData[] = [];
  
  for (let i = 0; i < symbols.length; i++) {
    if (i > 0) {
      // Wait 12 seconds between calls to stay under 5 calls/minute limit
      await new Promise(resolve => setTimeout(resolve, 12000));
    }
    
    const data = await fetchStockQuote(apiKey, symbols[i]);
    if (data) {
      results.push(data);
    }
  }

  return results;
}

export async function fetchIntradayData(
  apiKey: string,
  symbol: string
): Promise<{ price: number; volume: number; timestamp: string }[]> {
  try {
    const url = `${API_BASE_URL}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=15min&apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data['Error Message'] || data['Note']) {
      return [];
    }

    const timeSeries = data[`Time Series (15min)`];
    if (!timeSeries) {
      return [];
    }

    const entries = Object.entries(timeSeries).slice(0, 10); // Last 10 15-min intervals
    return entries.map(([timestamp, values]: [string, any]) => ({
      price: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume']),
      timestamp,
    }));
  } catch (error) {
    console.error(`Error fetching intraday data for ${symbol}:`, error);
    return [];
  }
}

