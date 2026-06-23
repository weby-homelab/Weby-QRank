import { useState, useEffect } from 'react';
import './index.css';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [activeTab, setActiveTab] = useState('settings');
  
  // Settings State
  const [settings, setSettings] = useState({
    site_title: '',
    bot_token: '',
    webapp_url: '',
    chat_owner_id: '',
    admin_password: ''
  });
  
  // File Upload State
  const [file, setFile] = useState(null);
  
  // UI State
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/status`);
      if (res.ok) {
        const data = await res.json();
        setIsConfigured(data.isConfigured);
      }
    } catch (err) {
      console.error('Check status error:', err);
    }
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');
    
    try {
      const res = await fetch(`${apiUrl}/api/admin/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      if (res.ok) {
        setIsConfigured(true);
        setStatus('✅ Пароль встановлено! Тепер ви можете увійти.');
        setPassword('');
      } else {
        const data = await res.json();
        setStatus(`❌ Помилка: ${data.error}`);
      }
    } catch (err) {
      setStatus(`❌ Помилка: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');
    
    try {
      const res = await fetch(`${apiUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      if (res.ok) {
        setIsLoggedIn(true);
        fetchSettings();
      } else {
        setStatus('❌ Невірний пароль');
      }
    } catch (err) {
      setStatus(`❌ Помилка: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/settings/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Збереження та перезапуск бота...');
    
    try {
      const res = await fetch(`${apiUrl}/api/admin/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, newSettings: settings })
      });
      
      if (res.ok) {
        setStatus('✅ Налаштування збережено! Бот перезапускається (зачекайте пару секунд).');
      } else {
        setStatus('❌ Помилка збереження');
      }
    } catch (err) {
      setStatus(`❌ Помилка: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setStatus('Будь ласка, оберіть файл.');
      return;
    }

    setLoading(true);
    setStatus('Завантаження та обробка...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);

    try {
      const res = await fetch(`${apiUrl}/api/admin/upload-json`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setStatus('✅ Базу успішно очищено та оновлено з нового файлу!');
      } else {
        const errorText = await res.text();
        setStatus(`❌ Помилка: ${errorText}`);
      }
    } catch (err) {
      setStatus(`❌ Помилка з'єднання: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    if (!isConfigured) {
      return (
        <>
          <div className="glass-panel header">
            <h1>🚀 Перше налаштування</h1>
            <p>Встановіть пароль адміністратора для керування системою.</p>
          </div>
          <div className="glass-panel">
            <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="password" 
                placeholder="Встановіть новий пароль"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
              <button type="submit" disabled={loading} style={{ padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                {loading ? 'Налаштування...' : 'Встановити пароль'}
              </button>
            </form>
            {status && <div className={`status-message ${status.startsWith('✅') ? 'success' : 'error'}`}>{status}</div>}
          </div>
        </>
      );
    }

    return (
      <>
        <div className="glass-panel header">
          <h1>🔒 Вхід в Адмін-панель</h1>
          <p>Введіть пароль адміністратора для керування системою.</p>
        </div>
        <div className="glass-panel">
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="password" 
              placeholder="Пароль"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
            <button type="submit" disabled={loading} style={{ padding: '12px', background: '#0088cc', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              {loading ? 'Перевірка...' : 'Увійти'}
            </button>
          </form>
          {status && <div className={`status-message ${status.startsWith('✅') ? 'success' : 'error'}`}>{status}</div>}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="glass-panel header">
        <h1>⚙️ Адмін-панель</h1>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
          <button onClick={() => {setActiveTab('settings'); setStatus('');}} style={{ padding: '8px 15px', background: activeTab === 'settings' ? '#0088cc' : '#444', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Налаштування</button>
          <button onClick={() => {setActiveTab('data'); setStatus('');}} style={{ padding: '8px 15px', background: activeTab === 'data' ? '#0088cc' : '#444', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Імпорт Даних</button>
        </div>
      </div>

      <div className="glass-panel">
        {activeTab === 'settings' ? (
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label className="admin-label">Заголовок сайту:</label>
              <input type="text" value={settings.site_title || ''} onChange={e => setSettings({...settings, site_title: e.target.value})} placeholder="🏆 Рейтинг KRUHLYK Community" />
            </div>
            <div>
              <label className="admin-label">Telegram Bot Token:</label>
              <input type="text" value={settings.bot_token || ''} onChange={e => setSettings({...settings, bot_token: e.target.value})} placeholder="123456789:ABCdefGHIjklmNOPqrsTUVwxyz" />
            </div>
            <div>
              <label className="admin-label">Chat ID (опціонально, напр. -100123456789):</label>
              <input type="text" value={settings.chat_id || ''} onChange={e => setSettings({...settings, chat_id: e.target.value})} placeholder="-100123456789" />
            </div>
            <div>
              <label className="admin-label">WebApp URL (для кнопки Start):</label>
              <input type="text" value={settings.webapp_url || ''} onChange={e => setSettings({...settings, webapp_url: e.target.value})} placeholder="https://kruhlyk.srvrs.top/" />
            </div>
            <div>
              <label className="admin-label">Telegram ID власника чату (для відображення на почесному місці):</label>
              <input type="text" value={settings.chat_owner_id || ''} onChange={e => setSettings({...settings, chat_owner_id: e.target.value})} placeholder="Наприклад: 123456789" />
            </div>
            <div>
              <label className="admin-label">Змінити пароль Адміна (залиште пустим, якщо не треба):</label>
              <input type="text" value={settings.admin_password || ''} onChange={e => setSettings({...settings, admin_password: e.target.value})} placeholder="Новий пароль..." />
            </div>
            <button type="submit" disabled={loading} style={{ padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              {loading ? 'Збереження...' : '💾 Зберегти налаштування'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label className="admin-label">Експорт історії (result.json):</label>
              <input type="file" accept=".json" onChange={(e) => setFile(e.target.files[0])} style={{ width: '100%', padding: '10px' }} />
            </div>
            <button type="submit" disabled={loading} style={{ padding: '12px', background: '#0088cc', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              {loading ? 'Обробка...' : '🔄 Очистити базу та Завантажити JSON'}
            </button>
          </form>
        )}
        
        {status && (
          <div className="status-box">
            {status}
          </div>
        )}
        
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <a href="/" className="back-link">← Повернутися на головну</a>
        </div>
      </div>

    </>
  );
}