import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { FileUpload, Session, RetentionDays, MaxDownloads } from '../types';

interface AppState {
  // Session
  session: Session | null;
  initSession: () => void;
  updateSessionActivity: () => void;

  // Files
  files: FileUpload[];
  addFile: (file: {
    name: string;
    size: number;
    type: string;
    retentionDays: RetentionDays;
    maxDownloads: MaxDownloads;
    password?: string;
  }) => FileUpload;
  removeFile: (id: string) => void;
  incrementDownload: (id: string) => void;

  // Settings
  maxFileSizeMB: number;
  setMaxFileSizeMB: (size: number) => void;
}

const SESSION_DURATION_DAYS = 7;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Session management
      session: null,
      initSession: () => {
        const existing = get().session;
        if (existing) {
          const now = new Date();
          if (new Date(existing.expiresAt) > now) {
            // Update last activity
            set({
              session: {
                ...existing,
                lastActivity: now,
                expiresAt: new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000),
              },
            });
            return;
          }
        }
        // Create new session
        const now = new Date();
        set({
          session: {
            id: uuidv4(),
            createdAt: now,
            lastActivity: now,
            expiresAt: new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000),
          },
        });
      },
      updateSessionActivity: () => {
        const session = get().session;
        if (session) {
          const now = new Date();
          set({
            session: {
              ...session,
              lastActivity: now,
              expiresAt: new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000),
            },
          });
        }
      },

      // Files
      files: [],
      addFile: ({ name, size, type, retentionDays, maxDownloads, password }) => {
        const now = new Date();
        const shortLink = uuidv4().slice(0, 8);
        const newFile: FileUpload = {
          id: uuidv4(),
          name,
          size,
          type,
          shortLink,
          uploadDate: now,
          expiresAt: new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000),
          maxDownloads,
          downloadCount: 0,
          hasPassword: !!password,
          password,
          status: 'active',
        };
        set((state) => ({ files: [newFile, ...state.files] }));
        return newFile;
      },
      removeFile: (id) => {
        set((state) => ({ files: state.files.filter((f) => f.id !== id) }));
      },
      incrementDownload: (id) => {
        set((state) => ({
          files: state.files.map((f) => {
            if (f.id !== id) return f;
            const newCount = f.downloadCount + 1;
            const reachedMax = f.maxDownloads !== 'unlimited' && newCount >= f.maxDownloads;
            return {
              ...f,
              downloadCount: newCount,
              status: reachedMax ? 'max_downloads_reached' : f.status,
            };
          }),
        }));
      },

      // Settings
      maxFileSizeMB: 100,
      setMaxFileSizeMB: (size) => set({ maxFileSizeMB: size }),
    }),
    {
      name: 'file-share-storage',
    }
  )
);
