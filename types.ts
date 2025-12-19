export interface SubmissionContent {
  subject_line: string;
  original_message: string;
  summary: string;
  topics: string[];
}

export interface SubmissionAnalysis {
  intent: 'Bug Report' | 'Feature Request' | 'General Praise' | 'Complaint' | 'Other' | 'General';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  sentiment_score: number;
  requires_developer_intervention: boolean;
}

export interface CaseHistoryItem {
  id: string;
  sender: 'USER' | 'ADMIN';
  message: string;
  timestamp: string;
}

export type CaseStatus = 'RECEIVED' | 'IN_REVIEW' | 'ACTION_REQUIRED' | 'RESOLVED';

export interface SubmissionResponse {
  submission_id: string;
  access_password?: string; // Generated client-side for user access
  content: SubmissionContent;
  analysis: SubmissionAnalysis;
  admin_preview: string;
  timestamp?: string; // Added client-side for sorting
  status: CaseStatus;
  history: CaseHistoryItem[];
}

// Navigation state
export enum View {
  FORM = 'FORM',
  DASHBOARD = 'DASHBOARD',
  CHECK_STATUS = 'CHECK_STATUS'
}