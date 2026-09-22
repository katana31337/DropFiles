import { RetentionDays, MaxDownloads } from '../types';

const API_BASE = '/api';

/**
 * Универсальный fetch wrapper
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// ============================================
// FILES API
// ============================================

export interface UploadFileOptions {
  file: File;
  retentionDays: RetentionDays;
  maxDownloads: MaxDownloads;
  password?: string;
  onProgress?: (percent: number) => void;
}

export interface UploadResponse {
  id: string;
  shortLink: string;
  name: string;
  size: number;
  downloadUrl: string;
  expiresAt: string;
  maxDownloads: number | null;
  hasPassword: boolean;
}

export interface FileInfo {
  name: string;
  size: number;
  mimeType: string;
  hasPassword: boolean;
  maxDownloads: number | null;
  downloadCount: number;
  expiresAt: string;
  status: 'active' | 'expired' | 'max_downloads_reached';
  createdAt: string;
}

export interface FileHistoryItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  shortLink: string;
  maxDownloads: number | null;
  downloadCount: number;
  expiresAt: string;
  status: 'active' | 'expired' | 'max_downloads_reached';
  hasPassword: boolean;
  createdAt: string;
}

/**
 * Загрузка файла с прогрессом
 */
export function uploadFile(options: UploadFileOptions): Promise<UploadResponse> {
  const { file, retentionDays, maxDownloads, password, onProgress } = options;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append('file', file);
    formData.append('retentionDays', retentionDays.toString());
    formData.append('maxDownloads', maxDownloads.toString());
    if (password) {
      formData.append('password', password);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = (event.loaded / event.total) * 100;
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          reject(new Error('Invalid response format'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.onabort = () => reject(new Error('Upload aborted'));

    xhr.open('POST', `${API_BASE}/files/upload`);
    xhr.withCredentials = true;
    xhr.send(formData);
  });
}

/**
 * Получить информацию о файле
 */
export function getFileInfo(shortLink: string): Promise<FileInfo> {
  return apiRequest(`/files/${shortLink}/info`);
}

/**
 * Проверить пароль для файла
 */
export function verifyFilePassword(shortLink: string, password: string): Promise<{ valid: boolean }> {
  return apiRequest(`/files/${shortLink}/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}

/**
 * Получить историю файлов
 */
export function getFileHistory(): Promise<{ files: FileHistoryItem[] }> {
  return apiRequest('/files/history');
}

/**
 * Удалить файл
 */
export function deleteFile(fileId: string): Promise<{ success: boolean }> {
  return apiRequest(`/files/${fileId}`, { method: 'DELETE' });
}

// ============================================
// SNIPPETS API
// ============================================

export interface CreateSnippetOptions {
  content: string;
  title?: string;
  language?: string;
  retentionDays: RetentionDays;
  maxViews: MaxDownloads;
  password?: string;
}

export interface SnippetResponse {
  id: string;
  shortLink: string;
  title: string | null;
  language: string | null;
  viewUrl: string;
  expiresAt: string;
  maxViews: number | null;
  hasPassword: boolean;
}

export interface SnippetInfo {
  content: string;
  title: string | null;
  language: string | null;
  hasPassword: boolean;
  maxViews: number | null;
  viewCount: number;
  expiresAt: string;
}

export interface SnippetHistoryItem {
  id: string;
  shortLink: string;
  title: string | null;
  language: string | null;
  maxViews: number | null;
  viewCount: number;
  expiresAt: string;
  status: 'active' | 'expired' | 'max_views_reached';
  hasPassword: boolean;
  createdAt: string;
}

/**
 * Создать сниппет
 */
export function createSnippet(options: CreateSnippetOptions): Promise<SnippetResponse> {
  return apiRequest('/snippets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
}

/**
 * Получить сниппет
 */
export function getSnippet(shortLink: string): Promise<SnippetInfo> {
  return apiRequest(`/snippets/${shortLink}`);
}

/**
 * Проверить пароль для сниппета
 */
export function verifySnippetPassword(shortLink: string, password: string): Promise<{ valid: boolean }> {
  return apiRequest(`/snippets/${shortLink}/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}

/**
 * Увеличить счётчик просмотров
 */
export function incrementSnippetView(shortLink: string): Promise<void> {
  return apiRequest(`/snippets/${shortLink}/view`, { method: 'POST' });
}

// ============================================
// PUBLIC SETTINGS API
// ============================================

export interface PublicSettings {
  retentionDays: number[];
  maxDownloadsOptions: (number | '*')[];
  maxFileSizeMB: number;
}

/**
 * Получить публичные настройки (опции для UI)
 */
export function getPublicSettings(): Promise<PublicSettings> {
  return apiRequest('/settings/public');
}

// ============================================
// ADMIN API
// ============================================

export interface AdminStatus {
  isSetupComplete: boolean;
}

export interface AdminLoginResponse {
  success: boolean;
  token: string;
  username: string;
}

export interface AdminSettings {
  files: {
    maxFileSizeMB: number;
    retentionDays: number[];
    maxDownloadsOptions: (number | null)[];
  };
  session: {
    durationDays: number;
  };
  rateLimit: {
    uploadPerMinute: number;
    apiPerMinute: number;
  };
}

export interface AdminStats {
  activeSessions: number;
  totalFiles: number;
  activeFiles: number;
  totalSizeBytes: number;
  totalDownloads: number;
  totalSnippets: number;
}

/**
 * Проверить статус установки админки
 */
export function getAdminStatus(): Promise<AdminStatus> {
  return apiRequest('/admin/status');
}

/**
 * Создать администратора
 */
export function setupAdmin(username: string, password: string): Promise<{ success: boolean }> {
  return apiRequest('/admin/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

/**
 * Войти как админ
 */
export function adminLogin(username: string, password: string): Promise<AdminLoginResponse> {
  return apiRequest('/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

/**
 * Получить настройки (админ)
 */
export function getAdminSettings(token: string): Promise<AdminSettings> {
  return apiRequest('/admin/panel/settings', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Обновить настройки (админ)
 */
export function updateAdminSettings(token: string, settings: Partial<AdminSettings>): Promise<AdminSettings> {
  return apiRequest('/admin/panel/settings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(settings),
  });
}

/**
 * Получить статистику (админ)
 */
export function getAdminStats(token: string): Promise<AdminStats> {
  return apiRequest('/admin/panel/stats', {
    headers: { Authorization: `Bearer ${token}` },
  });
}
