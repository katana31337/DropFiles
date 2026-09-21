import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Lock, AlertTriangle, Clock, Eye, Copy, Check } from 'lucide-react';

interface SnippetData {
  content: string;
  title: string | null;
  language: string | null;
  hasPassword: boolean;
  maxViews: number | null;
  viewCount: number;
  expiresAt: string;
}

export default function ViewSnippetPage() {
  const { link } = useParams<{ link: string }>();
  const [snippet, setSnippet] = useState<SnippetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (link) {
      loadSnippet();
    }
  }, [link]);

  const loadSnippet = async () => {
    try {
      const response = await fetch(`/api/snippets/${link}`);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Not found' }));
        throw new Error(data.error || 'Snippet not found');
      }

      const data = await response.json();
      setSnippet(data);

      // Если нет пароля — сразу показываем
      if (!data.hasPassword) {
        setUnlocked(true);
        // Увеличиваем счётчик просмотров
        fetch(`/api/snippets/${link}/view`, { method: 'POST' });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    try {
      const response = await fetch(`/api/snippets/${link}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });

      const data = await response.json();

      if (data.valid) {
        setUnlocked(true);
        setPasswordError(false);
        // Увеличиваем счётчик просмотров
        fetch(`/api/snippets/${link}/view`, { method: 'POST' });
      } else {
        setPasswordError(true);
      }
    } catch (err) {
      setError('Verification failed');
    }
  };

  const handleCopy = () => {
    if (snippet) {
      navigator.clipboard.writeText(snippet.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatExpiry = (date: string) => {
    const now = new Date();
    const expiry = new Date(date);
    const diff = expiry.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Истёк';
    if (days === 1) return '1 день';
    if (days < 5) return `${days} дня`;
    return `${days} дней`;
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto text-center">
        <div className="text-white/60">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20"
        >
          <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Сниппет не найден</h2>
          <p className="text-white/60">{error}</p>
        </motion.div>
      </div>
    );
  }

  if (!snippet) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {snippet.title || 'Без названия'}
              </h2>
              {snippet.language && (
                <span className="text-white/40 text-xs">{snippet.language}</span>
              )}
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 text-sm transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                Скопировано
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Копировать
              </>
            )}
          </button>
        </div>

        {/* Info */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs text-white/50">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Осталось: {formatExpiry(snippet.expiresAt)}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Просмотры: {snippet.viewCount} / {snippet.maxViews === null ? '∞' : snippet.maxViews}
          </span>
          {snippet.hasPassword && (
            <span className="flex items-center gap-1 text-green-400">
              <Lock className="w-3 h-3" />
              Защищено паролем
            </span>
          )}
        </div>

        {/* Password gate */}
        {snippet.hasPassword && !unlocked ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Lock className="w-4 h-4" />
              <span>Сниппет защищён паролем</span>
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
              className={`w-full bg-black/30 border rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none transition-colors ${
                passwordError ? 'border-red-400' : 'border-white/10 focus:border-purple-400'
              }`}
            />
            {passwordError && (
              <p className="text-red-400 text-xs">Неверный пароль</p>
            )}
            <button
              onClick={handlePasswordSubmit}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Подтвердить
            </button>
          </div>
        ) : (
          /* Content */
          <div className="bg-black/30 rounded-lg p-4 overflow-x-auto">
            <pre className="text-white/90 text-sm font-mono whitespace-pre-wrap">
              {snippet.content}
            </pre>
          </div>
        )}
      </motion.div>
    </div>
  );
}
