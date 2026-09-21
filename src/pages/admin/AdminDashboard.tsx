import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  Settings,
  BarChart3,
  FileText,
  LogOut,
  Save,
  AlertCircle,
  Check,
} from 'lucide-react';
import { getAdminSettings, updateAdminSettings, getAdminStats } from '../../api/client';
import type { AdminSettings, AdminStats } from '../../api/client';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');

  const [maxFileSizeMB, setMaxFileSizeMB] = useState(100);
  const [retentionDays, setRetentionDays] = useState('1,3,5,7,20,30');
  const [maxDownloadsOptions, setMaxDownloadsOptions] = useState('1,2,5,7,unlimited');
  const [sessionDurationDays, setSessionDurationDays] = useState(7);
  const [uploadRateLimit, setUploadRateLimit] = useState(5);
  const [apiRateLimit, setApiRateLimit] = useState(60);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const savedUsername = localStorage.getItem('admin_username');

    if (!token) {
      navigate('/admin/login');
      return;
    }

    setUsername(savedUsername || 'admin');
    loadSettings(token);
    loadStats(token);
  }, [navigate]);

  const loadSettings = async (token: string) => {
    try {
      const data = await getAdminSettings(token);
      setSettings(data);
      setMaxFileSizeMB(data.files.maxFileSizeMB);
      setRetentionDays(data.files.retentionDays.join(','));
      setMaxDownloadsOptions(
        data.files.maxDownloadsOptions.map(opt => opt === null ? 'unlimited' : opt).join(',')
      );
      setSessionDurationDays(data.session.durationDays);
      setUploadRateLimit(data.rateLimit.uploadPerMinute);
      setApiRateLimit(data.rateLimit.apiPerMinute);
    } catch (err: any) {
      if (err.message.includes('401')) {
        localStorage.removeItem('admin_token');
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (token: string) => {
    try {
      const data = await getAdminStats(token);
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSaving(true);
    setMessage('');

    try {
      const data = await updateAdminSettings(token, {
        max_file_size_mb: maxFileSizeMB,
        retention_days: retentionDays,
        max_downloads_options: maxDownloadsOptions,
        session_duration_days: sessionDurationDays,
        upload_rate_limit: uploadRateLimit,
        api_rate_limit: apiRateLimit,
      } as any);

      setSettings(data);
      setMessage('Settings saved successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    navigate('/admin/login');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-800">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-500 text-sm">{username}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StatCard icon={<BarChart3 className="w-5 h-5" />} label="Active Sessions" value={stats.activeSessions} />
            <StatCard icon={<FileText className="w-5 h-5" />} label="Total Files" value={stats.totalFiles} />
            <StatCard icon={<FileText className="w-5 h-5" />} label="Active Files" value={stats.activeFiles} />
            <StatCard icon={<FileText className="w-5 h-5" />} label="Total Size" value={formatBytes(stats.totalSizeBytes)} />
            <StatCard icon={<BarChart3 className="w-5 h-5" />} label="Downloads" value={stats.totalDownloads} />
            <StatCard icon={<FileText className="w-5 h-5" />} label="Text Snippets" value={stats.totalSnippets} />
          </div>
        )}

        {/* Settings */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-800">Settings</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-slate-700 text-sm mb-2">Max File Size (MB)</label>
              <input
                type="number"
                value={maxFileSizeMB}
                onChange={(e) => setMaxFileSizeMB(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                min={1}
                max={10000}
              />
            </div>

            <div>
              <label className="block text-slate-700 text-sm mb-2">Session Duration (days)</label>
              <input
                type="number"
                value={sessionDurationDays}
                onChange={(e) => setSessionDurationDays(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                min={1}
                max={365}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 text-sm mb-2">
                Retention Days (диапазоны хранения файлов)
              </label>
              <input
                type="text"
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                placeholder="1,3,5,7,20,30"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
              />
              <p className="text-slate-400 text-xs mt-1">
                Формат: число,число,число (например: 1,3,7,14,30). Числа от 1 до 365.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 text-sm mb-2">
                Max Downloads Options (опции лимита скачиваний)
              </label>
              <input
                type="text"
                value={maxDownloadsOptions}
                onChange={(e) => setMaxDownloadsOptions(e.target.value)}
                placeholder="1,2,5,7,unlimited"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
              />
              <p className="text-slate-400 text-xs mt-1">
                Формат: число,число,unlimited (например: 1,5,10,unlimited). Числа от 1 до 10000.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 text-sm mb-2">Upload Rate Limit (per minute)</label>
              <input
                type="number"
                value={uploadRateLimit}
                onChange={(e) => setUploadRateLimit(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                min={1}
                max={1000}
              />
            </div>

            <div>
              <label className="block text-slate-700 text-sm mb-2">API Rate Limit (per minute)</label>
              <input
                type="number"
                value={apiRateLimit}
                onChange={(e) => setApiRateLimit(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                min={1}
                max={10000}
              />
            </div>
          </div>

          {message && (
            <div className={`mt-4 flex items-center gap-2 rounded-lg p-3 border ${
              message.includes('success') ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'
            }`}>
              {message.includes('success') ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span className="text-sm">{message}</span>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-6 flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 text-indigo-600 mb-2">{icon}</div>
      <div className="text-2xl font-bold text-slate-800 mb-1">{value}</div>
      <div className="text-slate-500 text-xs">{label}</div>
    </div>
  );
}
