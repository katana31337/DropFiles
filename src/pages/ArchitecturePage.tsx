import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Server,
  Shield,
  Clock,
  Users,
  HardDrive,
  ChevronDown,
  ChevronRight,
  Check,
  Star,
  ArrowRight,
  Lightbulb,
  FolderTree,
  FileCode,
  Zap,
  Lock,
} from 'lucide-react';

interface ArchitectureOption {
  id: string;
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  recommended?: boolean;
}

interface ArchitectureSection {
  id: string;
  title: string;
  icon: React.ElementType;
  question: string;
  options: ArchitectureOption[];
}

const architectureSections: ArchitectureSection[] = [
  {
    id: 'backend',
    title: 'Бэкенд фреймворк',
    icon: Server,
    question: 'Какой фреймворк использовать для серверной части?',
    options: [
      {
        id: 'node-express',
        title: 'Node.js + Express ✓ ВЫБРАНО',
        description: 'Единый язык TypeScript/JavaScript. Быстрый старт, огромная экосистема.',
        pros: [
          'Единый язык (JS/TS) на фронт и бэк',
          'Огромное сообщество и готовые решения',
          'Быстрая разработка прототипа',
          'Отличная поддержка WebSocket для реального времени',
        ],
        cons: [
          'Менее производителен при тяжёлых вычислениях',
          'Нужен PM2 или подобный для продакшена',
        ],
      },
      {
        id: 'go',
        title: 'Go (Gin/Echo)',
        description: 'Высокопроизводительный, компилируемый. Идеален для микросервисов.',
        pros: ['Отличная производительность', 'Низкое потребление памяти', 'Встроенная конкурентность'],
        cons: ['Другой язык', 'Меньше готовых решений'],
      },
      {
        id: 'python-fastapi',
        title: 'Python + FastAPI',
        description: 'Современный, быстрый, с автодокументацией.',
        pros: ['Swagger из коробки', 'Async из коробки', 'Pydantic валидация'],
        cons: ['Медленнее Go и Node.js', 'GIL ограничения'],
      },
    ],
  },
  {
    id: 'session',
    title: 'Идентификация пользователя',
    icon: Users,
    question: 'Как отслеживать "анонимного" пользователя?',
    options: [
      {
        id: 'cookie-uuid',
        title: 'Cookie + UUID токен ✓ ВЫБРАНО',
        description: 'Генерируем UUID, храним в httpOnly cookie. Rolling expiration 7 дней.',
        pros: [
          'Прозрачно для пользователя',
          'Безопасно (httpOnly — недоступен из JS)',
          'Rolling expiration — продлевается при каждом визите',
          'Каскадное удаление истории при истечении',
        ],
        cons: [
          'Зависит от cookie браузера',
          'Не работает если cookie отключены',
        ],
      },
      {
        id: 'fingerprint',
        title: 'Browser Fingerprint',
        description: 'Уникальный отпечаток браузера.',
        pros: ['Работает без cookie'],
        cons: ['Менее надёжный', 'Этические вопросы'],
      },
    ],
  },
  {
    id: 'storage',
    title: 'Хранилище файлов',
    icon: HardDrive,
    question: 'Где хранить загруженные файлы?',
    options: [
      {
        id: 'local',
        title: 'Локальное /datastore ✓ ВЫБРАНО',
        description: 'Файлы на диске сервера в /datastore. S3 как опция расширения.',
        pros: [
          'Простая реализация',
          'Нет зависимости от внешних сервисов',
          'Быстрый доступ к файлам',
          'Бесплатно',
          'Легко мигрировать на S3 позже',
        ],
        cons: [
          'Ограничено размером диска',
          'Нет отказоустойчивости из коробки',
        ],
      },
      {
        id: 's3',
        title: 'S3-совместимое хранилище',
        description: 'MinIO, AWS S3, или любой S3-совместимый сервис.',
        pros: ['Неограниченное хранилище', 'Отказоустойчивость', 'CDN'],
        cons: ['Дополнительная зависимость', 'Стоимость'],
      },
    ],
  },
  {
    id: 'cleanup',
    title: 'Очистка данных',
    icon: Clock,
    question: 'Как организовать автоматическую очистку?',
    options: [
      {
        id: 'cron',
        title: 'Cron задача (каждые 15 мин) ✓ ВЫБРАНО',
        description: 'node-cron проверяет и удаляет истёкшие файлы и сессии.',
        pros: [
          'Простая реализация',
          'Надёжная',
          'Легко мониторить',
          'Отдельный от основного приложения',
        ],
        cons: [
          'Не мгновенная очистка (до 15 мин задержки)',
        ],
      },
      {
        id: 'on-access',
        title: 'Очистка при обращении',
        description: 'При каждом запросе проверяем срок.',
        pros: ['Мгновенная'],
        cons: ['Нагрузка', 'Мусор в хранилище'],
      },
    ],
  },
];

// Выбранные решения
const SELECTED = {
  backend: 'node-express',
  session: 'cookie-uuid',
  storage: 'local',
  cleanup: 'cron',
};

function OptionCard({
  option,
  isSelected,
  isChosen,
  onSelect,
}: {
  option: ArchitectureOption;
  isSelected: boolean;
  isChosen: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.div
      layout
      onClick={onSelect}
      className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
        isChosen
          ? 'border-green-500/50 bg-green-500/10'
          : isSelected
          ? 'border-purple-500 bg-purple-500/10'
          : 'border-white/10 bg-white/5 hover:border-white/20'
      }`}
    >
      {isChosen && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
          <Check className="w-3 h-3" />
          Выбрано
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
            isChosen
              ? 'border-green-500 bg-green-500'
              : isSelected
              ? 'border-purple-500 bg-purple-500'
              : 'border-white/30'
          }`}
        >
          {(isSelected || isChosen) && <Check className="w-3 h-3 text-white" />}
        </div>

        <div className="flex-1">
          <h4 className="text-white font-medium mb-1">{option.title}</h4>
          <p className="text-white/50 text-sm mb-3">{option.description}</p>

          <AnimatePresence>
            {isSelected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-green-400 text-xs font-medium mb-1">✓ Плюсы:</p>
                    <ul className="space-y-1">
                      {option.pros.map((pro, i) => (
                        <li key={i} className="text-white/60 text-xs flex items-start gap-1">
                          <span className="text-green-400 mt-0.5">•</span>
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-red-400 text-xs font-medium mb-1">✗ Минусы:</p>
                    <ul className="space-y-1">
                      {option.cons.map((con, i) => (
                        <li key={i} className="text-white/60 text-xs flex items-start gap-1">
                          <span className="text-red-400 mt-0.5">•</span>
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function ProjectTree() {
  const treeLines = [
    { indent: 0, icon: '📁', name: 'filedrop/', color: 'text-yellow-400' },
    { indent: 1, icon: '📁', name: 'frontend/', color: 'text-blue-400' },
    { indent: 2, icon: '📁', name: 'src/', color: 'text-blue-300' },
    { indent: 3, icon: '📁', name: 'pages/', color: 'text-blue-200' },
    { indent: 4, icon: '📄', name: 'UploadPage.tsx', color: 'text-white/60' },
    { indent: 4, icon: '📄', name: 'DownloadPage.tsx', color: 'text-white/60' },
    { indent: 4, icon: '📄', name: 'HistoryPage.tsx', color: 'text-white/60' },
    { indent: 3, icon: '📁', name: 'store/', color: 'text-blue-200' },
    { indent: 4, icon: '📄', name: 'appStore.ts (Zustand)', color: 'text-white/60' },
    { indent: 3, icon: '📄', name: 'App.tsx', color: 'text-white/60' },
    { indent: 1, icon: '📁', name: 'backend/', color: 'text-green-400' },
    { indent: 2, icon: '📁', name: 'src/', color: 'text-green-300' },
    { indent: 3, icon: '📄', name: 'index.js (Express)', color: 'text-white/60' },
    { indent: 3, icon: '📁', name: 'config/', color: 'text-green-200' },
    { indent: 4, icon: '📄', name: 'database.js (PostgreSQL pool)', color: 'text-white/60' },
    { indent: 3, icon: '📁', name: 'middleware/', color: 'text-green-200' },
    { indent: 4, icon: '📄', name: 'session.js (Cookie+UUID)', color: 'text-white/60' },
    { indent: 3, icon: '📁', name: 'routes/', color: 'text-green-200' },
    { indent: 4, icon: '📄', name: 'files.js (CRUD API)', color: 'text-white/60' },
    { indent: 4, icon: '📄', name: 'sessions.js', color: 'text-white/60' },
    { indent: 3, icon: '📁', name: 'services/', color: 'text-green-200' },
    { indent: 4, icon: '📁', name: 'storage/', color: 'text-green-100' },
    { indent: 5, icon: '📄', name: 'StorageInterface.js', color: 'text-white/60' },
    { indent: 5, icon: '📄', name: 'LocalStorage.js ✓', color: 'text-green-400' },
    { indent: 5, icon: '📄', name: 'S3Storage.js (future)', color: 'text-white/40' },
    { indent: 4, icon: '📄', name: 'CleanupService.js (cron)', color: 'text-white/60' },
    { indent: 3, icon: '📁', name: 'utils/', color: 'text-green-200' },
    { indent: 4, icon: '📄', name: 'shortLink.js', color: 'text-white/60' },
    { indent: 4, icon: '📄', name: 'hash.js (bcrypt)', color: 'text-white/60' },
    { indent: 2, icon: '📁', name: 'datastore/', color: 'text-orange-400' },
    { indent: 3, icon: '📄', name: '{год}/{месяц}/{день}/', color: 'text-white/40' },
    { indent: 2, icon: '📄', name: '.env', color: 'text-white/60' },
  ];

  return (
    <div className="bg-black/30 rounded-lg p-4 font-mono text-sm overflow-x-auto">
      {treeLines.map((line, i) => (
        <div
          key={i}
          className="flex items-center gap-1 leading-6"
          style={{ paddingLeft: `${line.indent * 20}px` }}
        >
          <span>{line.icon}</span>
          <span className={line.color}>{line.name}</span>
        </div>
      ))}
    </div>
  );
}

export default function ArchitecturePage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('backend');
  const [selections, setSelections] = useState<Record<string, string>>(SELECTED);
  const [showTree, setShowTree] = useState(false);

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const selectOption = (sectionId: string, optionId: string) => {
    setSelections((prev) => ({ ...prev, [sectionId]: optionId }));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Архитектура проекта</h1>
        <p className="text-white/60">
          Выбранные решения и структура проекта
        </p>
      </motion.div>

      {/* Status Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-8 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20 flex items-center gap-3"
      >
        <Zap className="w-6 h-6 text-green-400 shrink-0" />
        <div>
          <p className="text-green-400 font-medium text-sm">Архитектура определена</p>
          <p className="text-white/50 text-xs">
            Node.js + Express • Cookie/UUID сессии • Локальное хранилище /datastore • Cron очистка
          </p>
        </div>
      </motion.div>

      {/* Sections */}
      <div className="space-y-3 mb-8">
        {architectureSections.map((section, index) => {
          const Icon = section.icon;
          const isExpanded = expandedSection === section.id;

          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/5 transition-colors"
              >
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium">{section.title}</h3>
                  <p className="text-white/40 text-sm">{section.question}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                    ✓ Решено
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-white/40" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-white/40" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 space-y-3">
                      {section.options.map((option) => (
                        <OptionCard
                          key={option.id}
                          option={option}
                          isSelected={selections[section.id] === option.id}
                          isChosen={SELECTED[section.id as keyof typeof SELECTED] === option.id}
                          onSelect={() => selectOption(section.id, option.id)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Project Structure Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <button
          onClick={() => setShowTree(!showTree)}
          className="w-full bg-white/5 rounded-xl border border-white/10 p-4 flex items-center gap-3 hover:bg-white/10 transition-colors"
        >
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <FolderTree className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-white font-medium">Структура проекта</h3>
            <p className="text-white/40 text-sm">
              {showTree ? 'Скрыть' : 'Показать'} дерево файлов
            </p>
          </div>
          {showTree ? (
            <ChevronDown className="w-5 h-5 text-white/40" />
          ) : (
            <ChevronRight className="w-5 h-5 text-white/40" />
          )}
        </button>

        <AnimatePresence>
          {showTree && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3">
                <ProjectTree />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* DB Schema */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-8 bg-white/5 rounded-xl border border-white/10 p-6"
      >
        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-400" />
          Схема PostgreSQL
        </h3>
        <div className="bg-black/30 rounded-lg p-4 font-mono text-xs text-white/70 overflow-x-auto">
          <pre>{`-- Сессии (анонимные пользователи)
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token         VARCHAR(64) UNIQUE NOT NULL,  -- UUID в cookie
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),    -- обновляется при визите
  expires_at    TIMESTAMPTZ NOT NULL          -- rolling: +7 дней
);

-- Файлы
CREATE TABLE files (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID REFERENCES sessions(id) ON DELETE CASCADE,
  original_name  VARCHAR(255) NOT NULL,
  storage_path   VARCHAR(512) NOT NULL,      -- путь в /datastore
  file_size      BIGINT NOT NULL,
  mime_type      VARCHAR(128),
  short_link     VARCHAR(16) UNIQUE NOT NULL, -- 8 символов
  password_hash  VARCHAR(255),               -- bcrypt
  max_downloads  INTEGER,                    -- NULL = ∞
  download_count INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL,
  status         VARCHAR(20) DEFAULT 'active'
);

-- Настройки сервиса
CREATE TABLE settings (
  key        VARCHAR(64) PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`}</pre>
        </div>
      </motion.div>

      {/* Flow Diagram */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-8 bg-white/5 rounded-xl border border-white/10 p-6"
      >
        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Поток данных: Загрузка файла
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {[
            { label: 'Браузер', icon: '🌐' },
            { label: '→' },
            { label: 'Express + Multer', icon: '⚡' },
            { label: '→' },
            { label: 'Session Middleware', icon: '🍪' },
            { label: '→' },
            { label: 'LocalStorage.save()', icon: '💾' },
            { label: '→' },
            { label: 'PostgreSQL', icon: '🐘' },
            { label: '→' },
            { label: 'Response: short_link', icon: '🔗' },
          ].map((step, i) =>
            step.icon && step.label.length > 1 ? (
              <div
                key={i}
                className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2 flex items-center gap-1"
              >
                <span>{step.icon}</span>
                <span className="text-white/80">{step.label}</span>
              </div>
            ) : (
              <span key={i} className="text-purple-400 font-bold">
                {step.label}
              </span>
            )
          )}
        </div>
      </motion.div>

      {/* Next Steps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20"
      >
        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-purple-400" />
          Что реализовано / Что дальше
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-green-400 text-sm font-medium mb-2">✓ Реализовано:</p>
            <ul className="space-y-1.5">
              {[
                'Express сервер с API',
                'PostgreSQL подключение + миграции',
                'Cookie+UUID сессии (rolling 7 дней)',
                'Загрузка файлов (multer → /datastore)',
                'Короткие ссылки (8 символов)',
                'Пароли (bcrypt хэширование)',
                'Лимит скачиваний',
                'Cron очистка (каждые 15 мин)',
                'Storage Interface (расширяемо до S3)',
                'Фронтенд (React + Zustand)',
              ].map((item, i) => (
                <li key={i} className="text-white/60 text-sm flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-yellow-400 text-sm font-medium mb-2">⏳ Следующие шаги:</p>
            <ul className="space-y-1.5">
              {[
                'Подключить фронтенд к реальному API',
                'Добавить передачу текста (следующий модуль)',
                'QR-коды для ссылок',
                'Уведомления о скачивании',
                'Статистика и мониторинг',
                'Docker контейнеризация',
                'Rate limiting',
                'S3 реализация (когда нужно)',
              ].map((item, i) => (
                <li key={i} className="text-white/60 text-sm flex items-start gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
