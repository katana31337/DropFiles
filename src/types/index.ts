export interface FileUpload {
  id: string;
  name: string;
  size: number;
  type: string;
  shortLink: string;
  uploadDate: Date;
  expiresAt: Date;
  maxDownloads: number | 'unlimited';
  downloadCount: number;
  hasPassword: boolean;
  password?: string;
  status: 'active' | 'expired' | 'max_downloads_reached';
}

export interface Session {
  id: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
}

export interface AppSettings {
  maxFileSizeMB: number;
  retentionDays: number[];
  maxDownloadsOptions: (number | 'unlimited')[];
  sessionDurationDays: number;
}

export type RetentionDays = 1 | 3 | 5 | 7 | 20 | 30;
export type MaxDownloads = 1 | 2 | 5 | 7 | 'unlimited';

export interface UploadOptions {
  retentionDays: RetentionDays;
  maxDownloads: MaxDownloads;
  password?: string;
}
