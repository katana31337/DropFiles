import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, History, FileUp } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export default function Layout() {
  const location = useLocation();
  const session = useAppStore((s) => s.session);

  const navItems = [
    { path: '/', label: 'Загрузить', icon: Upload },
    { path: '/history', label: 'История', icon: History },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl">
            <FileUp className="w-7 h-7 text-purple-400" />
            <span>FileDrop</span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                    isActive ? 'text-white' : 'text-white/60 hover:text-white/90'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-white/10 rounded-lg"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Session info */}
          {session && (
            <div className="hidden md:flex items-center gap-2 text-xs text-white/40">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>Сессия активна</span>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center text-white/30 text-sm">
          FileDrop — Анонимный обмен файлами • Прототип
        </div>
      </footer>
    </div>
  );
}
