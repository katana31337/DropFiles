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
        title: 'Node.js + Express',
        description: 'Классический стек. Быстрый старт, огромная экосистема, TypeScript из коробки.',
        pros: [
          'Единый язык (TypeScript) на фронт и бэк',
          'Огромное сообщество и готовые решения',
          'Быстрая разработка прототипа',
          'Отличная поддержка WebSocket для реального времени',
        ],
        cons: [
          'Менее производителен при тяжёлых вычислениях',
          'Нужен PM2 или подобный для продакшена',
        ],
        recommended: true,
      },
      {
        id: 'go',
        title: 'Go (Gin/Echo)',
        description: 'Высокопроизводительный, компилируемый. Идеален для микросервисов.',
        pros: [
          'Отличная производительность',
          'Низкое потребление памяти',
          'Встроенная конкурентность (goroutines)',
          'Простой деплой — один бинарник',
        ],
        cons: [
          'Другой язык, чем фронтенд',
          'Меньше готовых решений для файлового обмена',
        ],
      },
      {
        id: 'python-fastapi',
        title: 'Python + FastAPI',
        description: 'Современный, быстрый, с автодокументацией. Отличный для API.',
        pros: [
          'Автоматическая документация (Swagger)',
          'Async из коробки',
          'Валидация данных через Pydantic',
          'Простой и читаемый код',
        ],
        cons: [
          'Медленнее Go и Node.js',
          'GIL может ограничивать многопоточность',
        ],
      },
    ],
  },
  {
    id: 'database',
    title: 'Структура базы данных',
    icon: Database,
    question: 'Как организовать таблицы в PostgreSQL?',
    options: [
      {
        id: 'normalized',
        title: 'Нормализованная схема',
        description: 'Разделение на таблицы: users(sessions), files, downloads, settings.',
        pros: [
          'Нет дублирования данных',
          'Легко расширять',
          'Целостность данных через FK',
          'Эффективные JOIN запросы',
        ],
        cons: [
          'Более сложные запросы',
          'Нужно больше JOIN-ов',
        ],
        recommended: true,
      },
      {
        id: 'denormalized',
        title: 'Денормализованная схема',
        description: 'Минимум таблиц, данные дублируются для скорости чтения.',
        pros: [
          'Быстрые чтения без JOIN',
          'Простые запросы',
          'Меньше таблиц для управления',
        ],
        cons: [
          'Дублирование данных',
          'Сложнее обновлять',
          'Риск рассинхронизации',
        ],
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
        title: 'Локальная файловая система',
        description: 'Файлы хранятся на диске сервера. Просто, но ограничено.',
        pros: [
          'Простая реализация',
          'Нет зависимости от внешних сервисов',
          'Быстрый доступ к файлам',
          'Бесплатно',
        ],
        cons: [
          'Ограничено размером диска',
          'Нет отказоустойчивости',
          'Сложно масштабировать',
        ],
      },
      {
        id: 's3',
        title: 'S3-совместимое хранилище',
        description: 'MinIO, AWS S3, или любой S3-совместимый сервис.',
        pros: [
          'Неограниченное хранилище',
          'Отказоустойчивость',
          'Легко масштабировать',
          'CDN интеграция',
        ],
        cons: [
          'Дополнительная зависимость',
          'Стоимость при больших объёмах',
          'Сложнее настройка',
        ],
        recommended: true,
      },
    ],
  },
  {
    id: 'session',
    title: 'Идентификация анонимного пользователя',
    icon: Users,
    question: 'Как отслеживать "анонимного" пользователя?',
    options: [
      {
        id: 'cookie-uuid',
        title: 'Cookie + UUID токен',
        description: 'Генерируем UUID, храним в httpOnly cookie. Привязываем к сессии в БД.',
        pros: [
          'Прозрачно для пользователя',
          'Безопасно (httpOnly)',
          'Легко реализовать',
          'Работает с rolling expiration',
        ],
        cons: [
          'Зависит от cookie браузера',
          'Не работает в режиме инкогнито (частично)',
        ],
        recommended: true,
      },
      {
        id: 'fingerprint',
        title: 'Browser Fingerprint',
        description: 'Уникальный отпечаток браузера на основе характеристик устройства.',
        pros: [
          'Работает без cookie',
          'Устойчив к очистке данных',
        ],
        cons: [
          'Менее надёжная идентификация',
          'Может меняться при обновлении браузера',
          'Этические вопросы приватности',
        ],
      },
      {
        id: 'local-token',
        title: 'LocalStorage токен',
        description: 'UUID хранится в localStorage браузера.',
        pros: [
          'Простая реализация',
          'Долговечное хранение',
        ],
        cons: [
          'Не передаётся автоматически',
          'Удаляется при очистке данных',
          'Менее безопасно',
        ],
      },
    ],
  },
  {
    id: 'security',
    title: 'Безопасность файлов',
    icon: Shield,
    question: 'Как защитить загруженные файлы?',
    options: [
      {
        id: 'encrypted',
        title: 'Шифрование на сервере',
        description: 'AES-256 шифрование файлов при загрузке. Ключ привязан к ссылке.',
        pros: [
          'Максимальная приватность',
          'Даже админ не увидит содержимое',
          'Соответствует GDPR',
        ],
        cons: [
          'Нагрузка на CPU',
          'Сложнее реализовать',
          'Если потеряли ключ — файл не восстановить',
        ],
      },
      {
        id: 'signed-urls',
        title: 'Подписанные URL (presigned)',
        description: 'Файлы хранятся как есть, но доступ только через временные подписанные ссылки.',
        pros: [
          'Нет нагрузки шифрования',
          'Гибкий контроль доступа',
          'Временные ссылки истекают',
        ],
        cons: [
          'Файлы доступны на диске',
          'Нужен S3 или подобный сервис',
        ],
        recommended: true,
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
        title: 'Cron задача / планировщик',
        description: 'Периодическая задача (каждые N минут) проверяет и удаляет истёкшие файлы.',
        pros: [
          'Простая реализация',
          'Надёжная',
          'Легко мониторить',
          'Можно запускать отдельно от приложения',
        ],
        cons: [
          'Не мгновенная очистка',
          'Нужен дополнительный процесс',
        ],
        recommended: true,
      },
      {
        id: 'on-access',
        title: 'Очистка при обращении',
        description: 'При каждом запросе проверяем срок действия и удаляем если истёк.',
        pros: [
          'Мгновенная очистка',
          'Не нужен отдельный процесс',
        ],
        cons: [
          'Нагрузка при каждом запросе',
          'Файлы без обращений не удалятся',
          'Мусор в хранилище',
        ],
      },
    ],
  },
];

function OptionCard({
  option,
  isSelected,
  onSelect,
}: {
  option: ArchitectureOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.div
      layout
      onClick={onSelect}
      className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
        isSelected
          ? 'border-purple-500 bg-purple-500/10'
          : 'border-white/10 bg-white/5 hover:border-white/20'
      }`}
    >
      {option.recommended && (
        <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
          <Star className="w-3 h-3" />
          Рекомендуем
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
            isSelected ? 'border-purple-500 bg-purple-500' : 'border-white/30'
          }`}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
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

export default function ArchitecturePage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('backend');
  const [selections, setSelections] = useState<Record<string, string>>({
    backend: 'node-express',
    database: 'normalized',
    storage: 's3',
    session: 'cookie-uuid',
    security: 'signed-urls',
    cleanup: 'cron',
  });

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const selectOption = (sectionId: string, optionId: string) => {
    setSelections((prev) => ({ ...prev, [sectionId]: optionId }));
  };

  const selectedCount = Object.keys(selections).length;

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Архитектура проекта</h1>
        <p className="text-white/60">
          Выберите оптимальные решения для каждого компонента системы
        </p>
        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-white/40">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          <span>Выбрано решений: {selectedCount}/{architectureSections.length}</span>
        </div>
      </motion.div>

      {/* Progress */}
      <div className="mb-8">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(selectedCount / architectureSections.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
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
              {/* Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/5 transition-colors"
              >
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium">{section.title}</h3>
                  <p className="text-white/40 text-sm">{section.question}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selections[section.id] && (
                    <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                      ✓ Выбрано
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-white/40" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-white/40" />
                  )}
                </div>
              </button>

              {/* Content */}
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

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20"
      >
        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-purple-400" />
          Ваш выбор архитектуры
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {architectureSections.map((section) => {
            const selectedOption = section.options.find(
              (o) => o.id === selections[section.id]
            );
            return (
              <div key={section.id} className="flex items-center gap-2 text-sm">
                <span className="text-white/40">{section.title}:</span>
                <span className="text-white font-medium">{selectedOption?.title}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-black/20 rounded-lg">
          <p className="text-white/60 text-sm">
            💡 <strong className="text-white">Следующий шаг:</strong> На основе вашего выбора
            мы спроектируем схему БД, API endpoints и структуру проекта. 
            Готовы перейти к реализации?
          </p>
        </div>
      </motion.div>

      {/* DB Schema Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-8 bg-white/5 rounded-xl border border-white/10 p-6"
      >
        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-400" />
          Предварительная схема PostgreSQL
        </h3>
        <div className="bg-black/30 rounded-lg p-4 font-mono text-xs text-white/70 overflow-x-auto">
          <pre>{`-- Таблица сессий (анонимные пользователи)
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token         VARCHAR(64) UNIQUE NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  expires_at    TIMESTAMP NOT NULL
);

-- Таблица файлов
CREATE TABLE files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID REFERENCES sessions(id) ON DELETE CASCADE,
  original_name VARCHAR(255) NOT NULL,
  storage_path  VARCHAR(512) NOT NULL,
  file_size     BIGINT NOT NULL,
  mime_type     VARCHAR(128),
  short_link    VARCHAR(16) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  max_downloads INTEGER,  -- NULL = unlimited
  download_count INTEGER DEFAULT 0,
  created_at    TIMESTAMP DEFAULT NOW(),
  expires_at    TIMESTAMP NOT NULL,
  status        VARCHAR(20) DEFAULT 'active'
);

-- Таблица настроек сервиса
CREATE TABLE settings (
  key   VARCHAR(64) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_files_short_link ON files(short_link);
CREATE INDEX idx_files_expires ON files(expires_at);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_sessions_token ON sessions(token);`}</pre>
        </div>
      </motion.div>
    </div>
  );
}
