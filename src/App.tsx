import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import UploadPage from './pages/UploadPage';
import DownloadPage from './pages/DownloadPage';
import HistoryPage from './pages/HistoryPage';
import SnippetPage from './pages/SnippetPage';
import ViewSnippetPage from './pages/ViewSnippetPage';
import AdminSetupPage from './pages/admin/AdminSetupPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  // Секретный путь админки (должен совпадать с ADMIN_SECRET_PATH в .env)
  const adminPath = import.meta.env.VITE_ADMIN_SECRET_PATH || '/secret-admin-panel';

  return (
    <BrowserRouter>
      <Routes>
        {/* Публичные роуты */}
        <Route path="/" element={<Layout />}>
          <Route index element={<UploadPage />} />
          <Route path="download/:link" element={<DownloadPage />} />
          <Route path="snippet" element={<SnippetPage />} />
          <Route path="text/:link" element={<ViewSnippetPage />} />
          <Route path="history" element={<HistoryPage />} />
        </Route>

        {/* Админка — секретные роуты */}
        <Route path={`${adminPath}/setup`} element={<AdminSetupPage />} />
        <Route path={`${adminPath}/login`} element={<AdminLoginPage />} />
        <Route path={`${adminPath}/dashboard`} element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
