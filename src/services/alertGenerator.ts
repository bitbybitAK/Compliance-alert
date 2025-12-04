import { ComplianceAlert, AlertType, Severity } from '../types';
import { StockData } from './alphaVantage';

export interface AlertGenerationContext {
  currentData: StockData;
  previousData?: StockData;
  intradayData?: { price: number; volume: number; timestamp: string }[];
  averageVolume?: number;
}

export function generateAlertsFromStockData(
  stockData: StockData[],
  previousData: Map<string, StockData>,
  intradayDataMap: Map<string, { price: number; volume: number; timestamp: string }[]>
): ComplianceAlert[] {
  const alerts: ComplianceAlert[] = [];
  const now = new Date();

  stockData.forEach((current) => {
    const previous = previousData.get(current.symbol);
    const intraday = intradayDataMap.get(current.symbol) || [];
    
    // Calculate average volume from intraday data
    const volumes = intraday.map(d => d.volume);
    const averageVolume = volumes.length > 0
      ? volumes.reduce((sum, v) => sum + v, 0) / volumes.length
      : current.volume;

    const context: AlertGenerationContext = {
      currentData: current,
      previousData: previous,
      intradayData: intraday,
      averageVolume,
    };

    // Check for price spike > 5% in 15 minutes
    if (intraday.length >= 2) {
      const recent = intraday[intraday.length - 1];
      const previous = intraday[intraday.length - 2];
      const priceChangePercent = ((recent.price - previous.price) / previous.price) * 100;

      if (Math.abs(priceChangePercent) > 5) {
        alerts.push(createAlert(
          'Market Manipulation',
          priceChangePercent > 5 ? 'Critical' : 'High',
          current,
          `Significant price movement detected: ${priceChangePercent.toFixed(2)}% change in 15 minutes`,
          context
        ));
      }
    }

    // Check for volume spike > 200% of average
    if (averageVolume && current.volume > averageVolume * 2) {
      const volumeIncrease = ((current.volume - averageVolume) / averageVolume) * 100;
      alerts.push(createAlert(
        'Unusual Activity',
        volumeIncrease > 300 ? 'Critical' : volumeIncrease > 200 ? 'High' : 'Medium',
        current,
        `Unusual trading volume detected: ${volumeIncrease.toFixed(0)}% above average (${current.volume.toLocaleString()} vs ${Math.round(averageVolume).toLocaleString()} avg)`,
        context
      ));
    }

    // Check for after-hours large trades (if current time is outside market hours)
    const hour = now.getHours();
    const isAfterHours = hour < 9 || hour >= 16;
    if (isAfterHours && current.volume > 1000000) {
      alerts.push(createAlert(
        'Suspicious Trading Pattern',
        'High',
        current,
        `Large after-hours trade detected: ${current.volume.toLocaleString()} shares traded outside market hours`,
        context
      ));
    }

    // Check for rapid price changes
    if (previous && Math.abs(current.changePercent) > 3) {
      alerts.push(createAlert(
        'Market Manipulation',
        Math.abs(current.changePercent) > 5 ? 'Critical' : 'High',
        current,
        `Rapid price change: ${current.changePercent > 0 ? '+' : ''}${current.changePercent.toFixed(2)}%`,
        context
      ));
    }
  });

  return alerts;
}

function createAlert(
  type: AlertType | 'Unusual Activity' | 'Suspicious Trading Pattern',
  severity: Severity,
  stockData: StockData,
  description: string,
  _context: AlertGenerationContext
): ComplianceAlert {
  const alertTypes: AlertType[] = [
    'Market Manipulation',
    'Wash Trading',
    'Spoofing',
    'Insider Trading',
    'Position Limit Breach',
  ];

  const alertType = alertTypes.includes(type as AlertType)
    ? (type as AlertType)
    : 'Market Manipulation';

  // Generate trader name from symbol (for demo purposes)
  const traderNames = [
    'James Mitchell', 'Sarah Chen', 'Michael Rodriguez', 'Emily Johnson',
    'David Kim', 'Lisa Anderson', 'Robert Taylor', 'Jennifer Martinez',
  ];
  const traderIndex = stockData.symbol.charCodeAt(0) % traderNames.length;

  return {
    id: `ALT${Date.now()}-${stockData.symbol}`,
    type: alertType,
    severity,
    status: 'New',
    trader: {
      id: `TRD${stockData.symbol}`,
      name: traderNames[traderIndex],
      email: `${traderNames[traderIndex].toLowerCase().replace(' ', '.')}@trading.com`,
      firm: 'Market Participant',
      registrationDate: new Date(2020, 0, 1).toISOString(),
    },
    timestamp: stockData.timestamp,
    description: `${stockData.symbol}: ${description}`,
    detectedBy: 'Real-Time Market Monitoring System',
    investigationNotes: '',
    timeline: [
      {
        id: `timeline-${Date.now()}`,
        timestamp: stockData.timestamp,
        action: 'Alert Created',
        user: 'Automated System',
        notes: `Detected from live market data - Price: $${stockData.price.toFixed(2)}, Volume: ${stockData.volume.toLocaleString()}`,
      },
    ],
  };
}

