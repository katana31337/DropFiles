import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Eye,
  Lock,
  Link2,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { createSnippet } from '../api/client';
import { RetentionDays, MaxDownloads } from '../types';
import { retentionLabel, downloadLabel } from '../utils/format';

export default function SnippetPage() {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('');
  const [retentionDays, setRetentionDays] = useState<RetentionDays>(7);
  const [maxViews, setMaxViews] = useState<MaxDownloads>('unlimited');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const retentionOptions: RetentionDays[] = [1, 3, 5, 7, 20, 30];
  const viewOptions: MaxDownloads[] = [1, 2, 5, 7, 'unlimited'];

  const languages = [
    '', 'javascript', 'typescript', 'python', 'java', 'cpp', 'c',
    'go', 'rust', 'php', 'ruby', 'html', 'css', 'sql', 'bash', 'json', 'xml',
  ];

  const handleCreate = async () => {
    if (!content.trim()) {
      setError('Контент обязателен');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await createSnippet({
        content,
        title: title || undefined,
        language: language || undefined,
        retentionDays,
        maxViews,
        password: usePassword ? password : undefined,
      });

      setCreatedLink(data.shortLink);
      setContent('');
      setTitle('');
      setPassword('');
      setUsePassword(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (createdLink) {
      const url = `${window.location.origin}/text/${createdLink}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setCreatedLink(null);
    setError(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Поделиться текстом</h1>
        <p className="text-slate-500">
          Создайте ссылку на текстовый сниппет с настройками доступа
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {createdLink ? (
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
              <h2 className="text-xl font-bold text-slate-800 mb-2">Сниппет создан!</h2>
              <p className="text-slate-500 mb-6">Поделитесь этой ссылкой:</p>

              <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-3 mb-6">
                <Link2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <code className="text-slate-700 text-sm flex-1 truncate">
                  {window.location.origin}/text/{createdLink}
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
                Создать ещё
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Content */}
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <label className="block text-slate-700 text-sm font-medium mb-2">
                Текст сниппета
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Вставьте или введите текст..."
                className="w-full h-48 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              />
              <div className="flex justify-between mt-2">
                <span className="text-slate-400 text-xs">
                  {content.length.toLocaleString()} / 100,000 символов
                </span>
              </div>
            </div>

            {/* Title & Language */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <label className="block text-slate-700 text-sm font-medium mb-2">
                  Заголовок (опционально)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Мой сниппет"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <label className="block text-slate-700 text-sm font-medium mb-2">
                  Язык (опционально)
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:border-slate-400 transition-colors"
                >
                  <option value="">Не указан</option>
                  {languages.filter(l => l).map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Options — выпадающие списки */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Retention */}
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <label htmlFor="snippet-retention" className="text-slate-700 text-sm font-medium">
                    Срок хранения
                  </label>
                </div>
                <select
                  id="snippet-retention"
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

              {/* Max Views */}
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <label htmlFor="snippet-views" className="text-slate-700 text-sm font-medium">
                    Максимум просмотров
                  </label>
                </div>
                <select
                  id="snippet-views"
                  value={maxViews}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMaxViews(val === 'unlimited' ? 'unlimited' : parseInt(val) as MaxDownloads);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:border-slate-400 transition-colors"
                >
                  {viewOptions.map((opt) => (
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
                  <Lock className="w-4 h-4 text-indigo-600" />
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
                  placeholder="Введите пароль для просмотра"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
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

            {/* Create Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleCreate}
              disabled={!content.trim() || loading}
              className={`w-full py-4 rounded-xl font-medium text-lg transition-all ${
                content.trim() && !loading
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {loading ? 'Создание...' : 'Создать сниппет'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
