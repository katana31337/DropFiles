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
import { useAppStore } from '../store/appStore';
import { RetentionDays, MaxDownloads } from '../types';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function UploadPage() {
  const addFile = useAppStore((s) => s.addFile);
  const maxFileSizeMB = useAppStore((s) => s.maxFileSizeMB);
  const updateSessionActivity = useAppStore((s) => s.updateSessionActivity);

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
        updateSessionActivity();
      }
    },
    [maxFileSizeMB, updateSessionActivity]
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
      // Имитация прогресса (в реальности — XMLHttpRequest с onprogress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      // TODO: Заменить на реальный API вызов
      // const formData = new FormData();
      // formData.append('file', selectedFile);
      // formData.append('retentionDays', retentionDays.toString());
      // formData.append('maxDownloads', maxDownloads.toString());
      // if (usePassword && password) formData.append('password', password);
      //
      // const response = await fetch('/api/files/upload', {
      //   method: 'POST',
      //   body: formData,
      //   credentials: 'include',
      // });
      // const data = await response.json();

      // Симуляция загрузки
      await new Promise((resolve) => setTimeout(resolve, 1500));
      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = addFile({
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        retentionDays,
        maxDownloads,
        password: usePassword ? password : undefined,
      });

      setUploadedLink(result.shortLink);
      setSelectedFile(null);
      setPassword('');
      setUsePassword(false);
      updateSessionActivity();
    } catch (err) {
      setError('Ошибка при загрузке файла. Попробуйте ещё раз.');
      console.error('Upload error:', err);
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
        <h1 className="text-3xl font-bold text-white mb-2">Анонимная загрузка файлов</h1>
        <p className="text-white/60">
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
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Файл загружен!</h2>
              <p className="text-white/60 mb-6">Поделитесь этой ссылкой:</p>

              <div className="flex items-center gap-2 bg-black/30 rounded-lg p-3 mb-6">
                <Link2 className="w-4 h-4 text-purple-400 shrink-0" />
                <code className="text-white/90 text-sm flex-1 truncate">
                  {window.location.origin}/download/{uploadedLink}
                </code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-white/60" />
                  )}
                </button>
              </div>

              <button
                onClick={handleReset}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
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
                  ? 'border-purple-400 bg-purple-500/10'
                  : 'border-white/20 hover:border-white/40 bg-white/5'
              }`}
            >
              <input {...getInputProps()} />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileIcon className="w-10 h-10 text-purple-400" />
                  <div className="text-left">
                    <p className="text-white font-medium">{selectedFile.name}</p>
                    <p className="text-white/50 text-sm">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
                  <p className="text-white/70 mb-2">
                    Перетащите файл сюда или нажмите для выбора
                  </p>
                  <p className="text-white/40 text-sm">Максимум {maxFileSizeMB} MB</p>
                </>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-red-400 bg-red-500/10 rounded-lg p-3"
              >
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Retention */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span className="text-white text-sm font-medium">Хранить</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {retentionOptions.map((days) => (
                    <button
                      key={days}
                      onClick={() => setRetentionDays(days)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        retentionDays === days
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                    >
                      {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Downloads */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Download className="w-4 h-4 text-purple-400" />
                  <span className="text-white text-sm font-medium">Скачиваний</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {downloadOptions.map((opt) => (
                    <button
                      key={String(opt)}
                      onClick={() => setMaxDownloads(opt)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        maxDownloads === opt
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                    >
                      {opt === 'unlimited' ? '∞' : opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span className="text-white text-sm font-medium">Пароль</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Lock className={`w-4 h-4 ${usePassword ? 'text-green-400' : 'text-white/30'}`} />
                  <input
                    type="checkbox"
                    checked={usePassword}
                    onChange={(e) => setUsePassword(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-8 h-4 rounded-full transition-colors ${
                      usePassword ? 'bg-purple-600' : 'bg-white/20'
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
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-400"
                />
              )}
            </div>

            {/* Upload Button */}
            <motion.button
              whileHover={!isUploading ? { scale: 1.02 } : {}}
              whileTap={!isUploading ? { scale: 0.98 } : {}}
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className={`w-full py-4 rounded-xl font-medium text-lg transition-all relative overflow-hidden ${
                selectedFile && !isUploading
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/25'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              {/* Progress bar background */}
              {isUploading && (
                <motion.div
                  className="absolute inset-0 bg-white/10"
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
