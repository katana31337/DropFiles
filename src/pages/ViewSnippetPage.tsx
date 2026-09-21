import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Lock, AlertTriangle, Clock, Eye, Copy, Check, Loader2 } from 'lucide-react';
import { getSnippet, verifySnippetPassword, incrementSnippetView } from '../api/client';
import { formatExpiry } from '../utils/format';
import type { SnippetInfo } from '../api/client';

export default function ViewSnippetPage() {
  const { link } = useParams<{ link: string }>();
  const [snippet, setSnippet] = useState<SnippetInfo | null>(null);
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
      const data = await getSnippet(link!);
      setSnippet(data);

      if (!data.hasPassword) {
        setUnlocked(true);
        incrementSnippetView(link!).catch(() => {});
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    try {
      const result = await verifySnippetPassword(link!, passwordInput);
      if (result.valid) {
        setUnlocked(true);
        setPasswordError(false);
        incrementSnippetView(link!).catch(() => {});
      } else {
        setPasswordError(true);
      }
    } catch (err) {
      setError('Ошибка проверки пароля');
    }
  };

  const handleCopy = () => {
    if (snippet) {
      navigator.clipboard.writeText(snippet.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto text-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm"
        >
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Сниппет не найден</h2>
          <p className="text-slate-500">{error}</p>
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
        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {snippet.title || 'Без названия'}
              </h2>
              {snippet.language && (
                <span className="text-slate-400 text-xs">{snippet.language}</span>
              )}
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 text-sm transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
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
        <div className="flex flex-wrap gap-4 mb-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Осталось: {formatExpiry(snippet.expiresAt)}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Просмотры: {snippet.viewCount} / {snippet.maxViews === null ? '∞' : snippet.maxViews}
          </span>
          {snippet.hasPassword && (
            <span className="flex items-center gap-1 text-green-600">
              <Lock className="w-3 h-3" />
              Защищено паролем
            </span>
          )}
        </div>

        {/* Password gate */}
        {snippet.hasPassword && !unlocked ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-600 text-sm">
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
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-x-auto">
            <pre className="text-slate-700 text-sm font-mono whitespace-pre-wrap">
              {snippet.content}
            </pre>
          </div>
        )}
      </motion.div>
    </div>
  );
}
