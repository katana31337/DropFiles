import { motion } from 'framer-motion';
import { FileIcon, Clock, Download, Trash2, Link2, Copy, Check, Lock } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../store/appStore';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatExpiry(date: Date): string {
  const now = new Date();
  const diff = new Date(date).getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Истёк';
  if (days === 1) return '1 день';
  if (days < 5) return `${days} дня`;
  return `${days} дней`;
}

export default function HistoryPage() {
  const files = useAppStore((s) => s.files);
  const removeFile = useAppStore((s) => s.removeFile);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (link: string, id: string) => {
    const url = `${window.location.origin}/download/${link}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (files.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20"
        >
          <FileIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">История пуста</h2>
          <p className="text-white/60">
            Здесь будут отображаться ваши загруженные файлы
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-white mb-6">История загрузок</h1>

        <div className="space-y-3">
          {files.map((file, index) => {
            const isExpired = new Date(file.expiresAt) < new Date();
            const maxReached = file.status === 'max_downloads_reached';
            const isActive = !isExpired && !maxReached;

            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white/5 backdrop-blur-sm rounded-xl p-4 border transition-all ${
                  isActive ? 'border-white/10' : 'border-red-500/20 opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* File icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-purple-500/20' : 'bg-red-500/20'
                  }`}>
                    <FileIcon className={`w-5 h-5 ${isActive ? 'text-purple-400' : 'text-red-400'}`} />
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium truncate">{file.name}</h3>
                      {file.hasPassword && <Lock className="w-3 h-3 text-green-400 shrink-0" />}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50">
                      <span>{formatFileSize(file.size)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {isActive ? formatExpiry(file.expiresAt) : 'Истёк'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {file.downloadCount}/{file.maxDownloads === 'unlimited' ? '∞' : file.maxDownloads}
                      </span>
                      <span>{formatDate(file.uploadDate)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopy(file.shortLink, file.id)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Копировать ссылку"
                    >
                      {copiedId === file.id ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Link2 className="w-4 h-4 text-white/50" />
                      )}
                    </button>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4 text-white/50 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
