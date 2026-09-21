import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Shield,
  Clock,
  Download,
  Lock,
  Link2,
  Copy,
  Check,
  FileIcon,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { uploadFile } from '../api/client';
import { RetentionDays, MaxDownloads } from '../types';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function retentionLabel(days: RetentionDays): string {
  if (days === 1) return '1 день';
  if (days < 5) return `${days} дня`;
  return `${days} дней`;
}

function downloadLabel(opt: MaxDownloads): string {
  return opt === 'unlimited' ? 'Без ограничений' : `${opt}`;
}

export default function UploadPage() {
  const maxFileSizeMB = 100;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [retentionDays, setRetentionDays] = useState<RetentionDays>(7);
  const [maxDownloads, setMaxDownloads] = useState<MaxDownloads>('unlimited');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [uploadedLink, setUploadedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const retentionOptions: RetentionDays[] = [1, 3, 5, 7, 20, 30];
  const downloadOptions: MaxDownloads[] = [1, 2, 5, 7, 'unlimited'];

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);
      const file = acceptedFiles[0];
      if (file) {
        if (file.size > maxFileSizeMB * 1024 * 1024) {
          setError(`Файл слишком большой. Максимум: ${maxFileSizeMB} MB`);
          return;
        }
        setSelectedFile(file);
      }
    },
    [maxFileSizeMB]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: maxFileSizeMB * 1024 * 1024,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const result = await uploadFile({
        file: selectedFile,
        retentionDays,
        maxDownloads,
        password: usePassword ? password : undefined,
        onProgress: (percent) => {
          setUploadProgress(percent);
        },
      });

      setUploadedLink(result.shortLink);
      setSelectedFile(null);
      setPassword('');
      setUsePassword(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка при загрузке файла';
      setError(message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCopy = () => {
    if (uploadedLink) {
      const url = `${window.location.origin}/download/${uploadedLink}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setUploadedLink(null);
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Анонимная загрузка файлов</h1>
        <p className="text-slate-500">
          Загрузите файл и поделитесь ссылкой. Без регистрации, без слежки.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {uploadedLink ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Файл загружен!</h2>
              <p className="text-slate-500 mb-6">Поделитесь этой ссылкой:</p>

              <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-3 mb-6">
                <Link2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <code className="text-slate-700 text-sm flex-1 truncate">
                  {window.location.origin}/download/{uploadedLink}
                </code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              </div>

              <button
                onClick={handleReset}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
              >
                Загрузить ещё
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                isDragActive
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-slate-300 hover:border-indigo-300 bg-white'
              }`}
            >
              <input {...getInputProps()} />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileIcon className="w-10 h-10 text-indigo-500" />
                  <div className="text-left">
                    <p className="text-slate-800 font-medium">{selectedFile.name}</p>
                    <p className="text-slate-500 text-sm">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-2">
                    Перетащите файл сюда или нажмите для выбора
                  </p>
                  <p className="text-slate-400 text-sm">Максимум {maxFileSizeMB} MB</p>
                </>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3"
              >
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}

            {/* Options — выпадающие списки */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Retention */}
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <label htmlFor="retention" className="text-slate-700 text-sm font-medium">
                    Срок хранения
                  </label>
                </div>
                <select
                  id="retention"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(parseInt(e.target.value) as RetentionDays)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:border-slate-400 transition-colors"
                >
                  {retentionOptions.map((days) => (
                    <option key={days} value={days}>
                      {retentionLabel(days)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Max Downloads */}
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Download className="w-4 h-4 text-indigo-600" />
                  <label htmlFor="maxDownloads" className="text-slate-700 text-sm font-medium">
                    Максимум скачиваний
                  </label>
                </div>
                <select
                  id="maxDownloads"
                  value={maxDownloads}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMaxDownloads(val === 'unlimited' ? 'unlimited' : parseInt(val) as MaxDownloads);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:border-slate-400 transition-colors"
                >
                  {downloadOptions.map((opt) => (
                    <option key={String(opt)} value={String(opt)}>
                      {downloadLabel(opt)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password */}
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <span className="text-slate-700 text-sm font-medium">Пароль</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Lock className={`w-4 h-4 ${usePassword ? 'text-green-600' : 'text-slate-300'}`} />
                  <input
                    type="checkbox"
                    checked={usePassword}
                    onChange={(e) => setUsePassword(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-8 h-4 rounded-full transition-colors ${
                      usePassword ? 'bg-indigo-600' : 'bg-slate-200'
                    } relative`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                        usePassword ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </label>
              </div>
              {usePassword && (
                <motion.input
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль для скачивания"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              )}
            </div>

            {/* Upload Button */}
            <motion.button
              whileHover={!isUploading ? { scale: 1.01 } : {}}
              whileTap={!isUploading ? { scale: 0.99 } : {}}
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className={`w-full py-4 rounded-xl font-medium text-lg transition-all relative overflow-hidden ${
                selectedFile && !isUploading
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {/* Progress bar background */}
              {isUploading && (
                <motion.div
                  className="absolute inset-0 bg-indigo-700"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              )}

              <span className="relative z-10 flex items-center justify-center gap-2">
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Загрузка... {Math.round(uploadProgress)}%
                  </>
                ) : selectedFile ? (
                  'Загрузить файл'
                ) : (
                  'Выберите файл'
                )}
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
