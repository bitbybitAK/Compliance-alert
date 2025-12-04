export type AlertType = 
  | 'Market Manipulation'
  | 'Wash Trading'
  | 'Spoofing'
  | 'Insider Trading'
  | 'Position Limit Breach';

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export type Status = 'New' | 'In Review' | 'Escalated' | 'Dismissed' | 'Resolved';

export interface Trader {
  id: string;
  name: string;
  email: string;
  firm: string;
  registrationDate: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  notes?: string;
}

export interface ComplianceAlert {
  id: string;
  type: AlertType;
  severity: Severity;
  status: Status;
  trader: Trader;
  timestamp: string;
  description: string;
  detectedBy: string;
  investigationNotes: string;
  timeline: TimelineEvent[];
}

export interface Metrics {
  totalAlerts: number;
  pendingReview: number;
  falsePositiveRate: number;
  avgInvestigationTime: number;
}

