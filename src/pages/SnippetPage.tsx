import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Clock,
  Eye,
  Lock,
  Link2,
  Copy,
  Check,
  AlertCircle,
  Code,
} from 'lucide-react';
import { RetentionDays, MaxDownloads } from '../types';

export default function SnippetPage() {
  const navigate = useNavigate();
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
      setError('Content is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content,
          title: title || undefined,
          language: language || undefined,
          retentionDays,
          maxViews,
          password: usePassword ? password : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create snippet');
      }

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
        <h1 className="text-3xl font-bold text-white mb-2">Поделиться текстом</h1>
        <p className="text-white/60">
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
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Сниппет создан!</h2>
              <p className="text-white/60 mb-6">Поделитесь этой ссылкой:</p>

              <div className="flex items-center gap-2 bg-black/30 rounded-lg p-3 mb-6">
                <Link2 className="w-4 h-4 text-purple-400 shrink-0" />
                <code className="text-white/90 text-sm flex-1 truncate">
                  {window.location.origin}/text/{createdLink}
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
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <label className="block text-white text-sm font-medium mb-2">
                Текст сниппета
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Вставьте или введите текст..."
                className="w-full h-48 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm font-mono focus:outline-none focus:border-purple-400 resize-none"
              />
              <div className="flex justify-between mt-2">
                <span className="text-white/40 text-xs">
                  {content.length} / 100,000 символов
                </span>
              </div>
            </div>

            {/* Title & Language */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <label className="block text-white text-sm font-medium mb-2">
                  Заголовок (опционально)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Мой сниппет"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <label className="block text-white text-sm font-medium mb-2">
                  Язык (опционально)
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400"
                >
                  <option value="">Не указан</option>
                  {languages.filter(l => l).map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>

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

              {/* Max Views */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-purple-400" />
                  <span className="text-white text-sm font-medium">Просмотров</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {viewOptions.map((opt) => (
                    <button
                      key={String(opt)}
                      onClick={() => setMaxViews(opt)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        maxViews === opt
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
                  <Lock className="w-4 h-4 text-purple-400" />
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
                  placeholder="Введите пароль для просмотра"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-400"
                />
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

            {/* Create Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreate}
              disabled={!content.trim() || loading}
              className={`w-full py-4 rounded-xl font-medium text-lg transition-all ${
                content.trim() && !loading
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/25'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
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
