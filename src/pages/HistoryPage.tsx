import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileIcon, Clock, Download, Trash2, Link2, Copy, Check, Lock, Loader2 } from 'lucide-react';
import { getFileHistory, deleteFile, FileHistoryItem } from '../api/client';
import { formatFileSize, formatDate, formatExpiry, isExpired } from '../utils/format';

export default function HistoryPage() {
  const [files, setFiles] = useState<FileHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await getFileHistory();
      setFiles(data.files);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (link: string, id: string) => {
    const url = `${window.location.origin}/download/${link}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить файл?')) return;
    
    try {
      await deleteFile(id);
      setFiles(files.filter(f => f.id !== id));
    } catch (err: any) {
      alert(`Ошибка: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error}
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm"
        >
          <FileIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">История пуста</h2>
          <p className="text-slate-500">
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
        <h1 className="text-2xl font-bold text-slate-800 mb-6">История загрузок</h1>

        <div className="space-y-3">
          {files.map((file, index) => {
            const expired = isExpired(file.expiresAt);
            const maxReached = file.status === 'max_downloads_reached';
            const isActive = !expired && !maxReached;

            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white rounded-xl p-4 border transition-all ${
                  isActive ? 'border-slate-200 shadow-sm' : 'border-red-200 bg-red-50 opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* File icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-indigo-100' : 'bg-red-100'
                  }`}>
                    <FileIcon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-red-500'}`} />
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-slate-800 font-medium truncate">{file.name}</h3>
                      {file.hasPassword && <Lock className="w-3 h-3 text-green-600 shrink-0" />}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>{formatFileSize(file.size)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {isActive ? formatExpiry(file.expiresAt) : 'Истёк'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {file.downloadCount}/{file.maxDownloads === null ? '∞' : file.maxDownloads}
                      </span>
                      <span>{formatDate(file.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopy(file.shortLink, file.id)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Копировать ссылку"
                    >
                      {copiedId === file.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Link2 className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
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
