/**
 * API клиент с поддержкой прогресса загрузки.
 * Использует XMLHttpRequest вместо fetch для отслеживания прогресса.
 */

interface UploadOptions {
  file: File;
  retentionDays: number;
  maxDownloads: number | 'unlimited';
  password?: string;
  onProgress?: (percent: number) => void;
}

interface UploadResponse {
  id: string;
  shortLink: string;
  name: string;
  size: number;
  downloadUrl: string;
  expiresAt: string;
  maxDownloads: number | null;
  hasPassword: boolean;
}

export async function uploadFile(options: UploadOptions): Promise<UploadResponse> {
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

    // Прогресс загрузки
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

    xhr.onerror = () => {
      reject(new Error('Network error'));
    };

    xhr.onabort = () => {
      reject(new Error('Upload aborted'));
    };

    xhr.open('POST', '/api/files/upload');
    xhr.withCredentials = true; // Для отправки cookie
    xhr.send(formData);
  });
}

/**
 * Получить информацию о файле
 */
export async function getFileInfo(shortLink: string) {
  const response = await fetch(`/api/files/${shortLink}/info`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to get file info`);
  }

  return response.json();
}

/**
 * Проверить пароль для файла
 */
export async function verifyPassword(shortLink: string, password: string) {
  const response = await fetch(`/api/files/${shortLink}/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to verify password`);
  }

  return response.json();
}

/**
 * Получить историю файлов
 */
export async function getHistory() {
  const response = await fetch('/api/files/history', {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to get history`);
  }

  return response.json();
}

/**
 * Удалить файл
 */
export async function deleteFile(fileId: string) {
  const response = await fetch(`/api/files/${fileId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to delete file`);
  }

  return response.json();
}

/**
 * Получить настройки
 */
export async function getSettings() {
  const response = await fetch('/api/settings', {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to get settings`);
  }

  return response.json();
}
