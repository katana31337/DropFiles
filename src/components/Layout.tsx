import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, History, FileUp, FileText } from 'lucide-react';

export default function Layout() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Загрузить', icon: Upload },
    { path: '/snippet', label: 'Текст', icon: FileText },
    { path: '/history', label: 'История', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-800 font-bold text-xl">
            <FileUp className="w-7 h-7 text-indigo-600" />
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
                    isActive ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-indigo-50 rounded-lg"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center text-slate-400 text-sm">
          FileDrop — Анонимный обмен файлами
        </div>
      </footer>
    </div>
  );
}
