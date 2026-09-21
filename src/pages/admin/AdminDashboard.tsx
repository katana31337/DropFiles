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

interface Settings {
  files: {
    maxFileSizeMB: number;
    retentionDays: number[];
    maxDownloadsOptions: (number | null)[];
  };
  session: {
    durationDays: number;
  };
  rateLimit: {
    uploadPerMinute: number;
    apiPerMinute: number;
  };
}

interface Stats {
  activeSessions: number;
  totalFiles: number;
  activeFiles: number;
  totalSizeBytes: number;
  totalDownloads: number;
  totalSnippets: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');

  // Form state
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(100);
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
    loadSettings();
    loadStats();
  }, [navigate]);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/panel/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/admin/login');
        return;
      }

      const data = await response.json();
      setSettings(data);
      setMaxFileSizeMB(data.files.maxFileSizeMB);
      setSessionDurationDays(data.session.durationDays);
      setUploadRateLimit(data.rateLimit.uploadPerMinute);
      setApiRateLimit(data.rateLimit.apiPerMinute);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/panel/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/panel/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          max_file_size_mb: maxFileSizeMB,
          session_duration_days: sessionDurationDays,
          upload_rate_limit: uploadRateLimit,
          api_rate_limit: apiRateLimit,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setMessage('Settings saved successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to save settings');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-purple-400" />
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/60 text-sm">{username}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 text-sm transition-colors"
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
            <StatCard
              icon={<BarChart3 className="w-5 h-5" />}
              label="Active Sessions"
              value={stats.activeSessions}
            />
            <StatCard
              icon={<FileText className="w-5 h-5" />}
              label="Total Files"
              value={stats.totalFiles}
            />
            <StatCard
              icon={<FileText className="w-5 h-5" />}
              label="Active Files"
              value={stats.activeFiles}
            />
            <StatCard
              icon={<FileText className="w-5 h-5" />}
              label="Total Size"
              value={formatBytes(stats.totalSizeBytes)}
            />
            <StatCard
              icon={<BarChart3 className="w-5 h-5" />}
              label="Downloads"
              value={stats.totalDownloads}
            />
            <StatCard
              icon={<FileText className="w-5 h-5" />}
              label="Text Snippets"
              value={stats.totalSnippets}
            />
          </div>
        )}

        {/* Settings */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Settings</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white/80 text-sm mb-2">
                Max File Size (MB)
              </label>
              <input
                type="number"
                value={maxFileSizeMB}
                onChange={(e) => setMaxFileSizeMB(parseInt(e.target.value))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                min={1}
                max={10000}
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">
                Session Duration (days)
              </label>
              <input
                type="number"
                value={sessionDurationDays}
                onChange={(e) => setSessionDurationDays(parseInt(e.target.value))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                min={1}
                max={365}
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">
                Upload Rate Limit (per minute)
              </label>
              <input
                type="number"
                value={uploadRateLimit}
                onChange={(e) => setUploadRateLimit(parseInt(e.target.value))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                min={1}
                max={1000}
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">
                API Rate Limit (per minute)
              </label>
              <input
                type="number"
                value={apiRateLimit}
                onChange={(e) => setApiRateLimit(parseInt(e.target.value))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                min={1}
                max={10000}
              />
            </div>
          </div>

          {message && (
            <div
              className={`mt-4 flex items-center gap-2 rounded-lg p-3 ${
                message.includes('success')
                  ? 'text-green-400 bg-green-500/10'
                  : 'text-red-400 bg-red-500/10'
              }`}
            >
              {message.includes('success') ? (
                <Check className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm">{message}</span>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-6 flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
      <div className="flex items-center gap-2 text-purple-400 mb-2">{icon}</div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-white/50 text-xs">{label}</div>
    </div>
  );
}
