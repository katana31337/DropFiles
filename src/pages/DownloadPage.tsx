import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Lock, FileIcon, AlertTriangle, Clock, Eye, Loader2 } from 'lucide-react';
import { getFileInfo, verifyFilePassword } from '../api/client';
import { formatFileSize, formatExpiry } from '../utils/format';
import type { FileInfo } from '../api/client';

export default function DownloadPage() {
  const { link } = useParams<{ link: string }>();
  const [file, setFile] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (link) {
      loadFileInfo();
    }
  }, [link]);

  const loadFileInfo = async () => {
    try {
      const data = await getFileInfo(link!);
      setFile(data);
      
      // Если нет пароля — сразу разрешаем скачивание
      if (!data.hasPassword) {
        setUnlocked(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    try {
      const result = await verifyFilePassword(link!, passwordInput);
      if (result.valid) {
        setUnlocked(true);
        setPasswordError(false);
      } else {
        setPasswordError(true);
      }
    } catch (err) {
      setError('Ошибка проверки пароля');
    }
  };

  const handleDownload = () => {
    setDownloading(true);
    // Открываем ссылку для скачивания
    window.open(`/api/files/${link}/download`, '_blank');
    setTimeout(() => setDownloading(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto text-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="max-w-md mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm"
        >
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Файл не найден</h2>
          <p className="text-slate-500">{error || 'Ссылка недействительна или файл был удалён.'}</p>
        </motion.div>
      </div>
    );
  }

  if (file.status === 'expired' || file.status === 'max_downloads_reached') {
    return (
      <div className="max-w-md mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm"
        >
          <Clock className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {file.status === 'expired' ? 'Срок хранения истёк' : 'Лимит скачиваний исчерпан'}
          </h2>
          <p className="text-slate-500">
            {file.status === 'expired'
              ? 'Файл был удалён по истечении срока хранения.'
              : `Файл был скачан ${file.downloadCount} раз(а) из ${file.maxDownloads} возможных.`}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm"
      >
        {/* File info */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileIcon className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1 truncate">{file.name}</h2>
          <p className="text-slate-500 text-sm">{formatFileSize(file.size)}</p>
        </div>

        {/* File details */}
        <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Осталось:</span>
            <span className="text-slate-700 font-medium">{formatExpiry(file.expiresAt)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Скачиваний:</span>
            <span className="text-slate-700 font-medium">
              {file.downloadCount} / {file.maxDownloads === null ? '∞' : file.maxDownloads}
            </span>
          </div>
          {file.hasPassword && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Защита:</span>
              <span className="text-green-600 flex items-center gap-1 font-medium">
                <Lock className="w-3 h-3" /> Пароль
              </span>
            </div>
          )}
        </div>

        {/* Password gate */}
        {file.hasPassword && !unlocked ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-600 text-sm">
              <Eye className="w-4 h-4" />
              <span>Файл защищён паролем</span>
            </div>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="Введите пароль"
              className={`w-full bg-white border rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                passwordError ? 'border-red-400' : 'border-slate-300'
              }`}
            />
            {passwordError && (
              <p className="text-red-600 text-xs">Неверный пароль</p>
            )}
            <button
              onClick={handlePasswordSubmit}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Подтвердить
            </button>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-lg transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {downloading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Скачивание...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Скачать файл
              </>
            )}
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
