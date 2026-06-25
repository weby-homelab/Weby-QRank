import { useState, useEffect } from 'react';
import './index.css';

const TRANSLATIONS = {
  ua: {
    first_setup_title: '🚀 Перше налаштування',
    first_setup_subtitle: 'Встановіть пароль адміністратора для керування системою.',
    new_password_placeholder: 'Встановіть новий пароль',
    set_password_btn: 'Встановити пароль',
    set_password_loading: 'Налаштування...',
    password_set_success: '✅ Пароль встановлено! Тепер ви можете увійти.',
    login_title: '🔒 Вхід в Адмін-панель',
    login_subtitle: 'Введіть пароль адміністратора для керування системою.',
    password_placeholder: 'Пароль',
    login_btn: 'Увійти',
    login_loading: 'Перевірка...',
    wrong_password: '❌ Невірний пароль',
    error_prefix: '❌ Помилка: ',
    error_conn_prefix: "❌ Помилка з'єднання: ",
    admin_panel_title: '⚙️ Адмін-панель',
    tab_settings: 'Налаштування',
    tab_data: 'Імпорт Даних',
    site_title_label: 'Заголовок сайту:',
    site_title_placeholder: '🏆 Рейтинг KRUHLYK Community',
    bot_token_label: 'Telegram Bot Token:',
    bot_token_placeholder: '123456789:ABCdefGHIjklmNOPqrsTUVwxyz',
    chat_id_label: 'Chat ID (опціонально, напр. -100123456789):',
    webapp_url_label: 'WebApp URL (для кнопки Start):',
    owner_id_label: 'Telegram ID власника чату (для відображення на почесному місці):',
    owner_id_placeholder: 'Наприклад: 123456789',
    new_admin_password_label: 'Змінити пароль Адміна (залиште пустим, якщо не треба):',
    new_admin_password_placeholder: 'Новий пароль...',
    save_settings_btn: '💾 Зберегти налаштування',
    saving: 'Збереження...',
    saving_and_restarting: 'Збереження та перезапуск бота...',
    settings_saved_success: '✅ Налаштування збережено! Бот перезапускається (зачекайте пару секунд).',
    settings_save_error: '❌ Помилка збереження',
    export_history_label: 'Експорт історії (result.json):',
    choose_file_btn: 'Вибрати файл',
    no_file_selected: 'Файл не вибрано',
    select_file_error: 'Будь ласка, оберіть файл.',
    upload_loading: 'Завантаження та обробка...',
    upload_success: '✅ Базу успішно очищено та оновлено з нового файлу!',
    upload_btn: '🔄 Очистити базу та Завантажити JSON',
    back_to_main: '← Повернутися на головну'
  },
  en: {
    first_setup_title: '🚀 First-time Setup',
    first_setup_subtitle: 'Set the administrator password to manage the system.',
    new_password_placeholder: 'Set a new password',
    set_password_btn: 'Set Password',
    set_password_loading: 'Configuring...',
    password_set_success: '✅ Password configured! You can now log in.',
    login_title: '🔒 Admin Login',
    login_subtitle: 'Enter the administrator password to manage the system.',
    password_placeholder: 'Password',
    login_btn: 'Login',
    login_loading: 'Verifying...',
    wrong_password: '❌ Incorrect password',
    error_prefix: '❌ Error: ',
    error_conn_prefix: '❌ Connection error: ',
    admin_panel_title: '⚙️ Admin Panel',
    tab_settings: 'Settings',
    tab_data: 'Import Data',
    site_title_label: 'Site Title:',
    site_title_placeholder: '🏆 KRUHLYK Community Rating',
    bot_token_label: 'Telegram Bot Token:',
    bot_token_placeholder: '123456789:ABCdefGHIjklmNOPqrsTUVwxyz',
    chat_id_label: 'Chat ID (optional, e.g. -100123456789):',
    webapp_url_label: 'WebApp URL (for the Start button):',
    owner_id_label: 'Chat Owner Telegram ID (to display in the honorary place):',
    owner_id_placeholder: 'Example: 123456789',
    new_admin_password_label: 'Change Admin Password (leave blank if unchanged):',
    new_admin_password_placeholder: 'New password...',
    save_settings_btn: '💾 Save Settings',
    saving: 'Saving...',
    saving_and_restarting: 'Saving and restarting bot...',
    settings_saved_success: '✅ Settings saved! The bot is restarting (wait a couple of seconds).',
    settings_save_error: '❌ Failed to save settings',
    export_history_label: 'Chat History Export (result.json):',
    choose_file_btn: 'Choose File',
    no_file_selected: 'No file chosen',
    select_file_error: 'Please select a file.',
    upload_loading: 'Uploading and processing...',
    upload_success: '✅ Database cleared and updated from the new file successfully!',
    upload_btn: '🔄 Clear Database & Upload JSON',
    back_to_main: '← Back to Main Page'
  }
};

export default function Admin() {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('qrank_lang') || 'en';
  });

  const toggleLang = (l) => {
    setLang(l);
    localStorage.setItem('qrank_lang', l);
  };

  const t = TRANSLATIONS[lang];

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
        setStatus('password_set_success');
        setPassword('');
      } else {
        const data = await res.json();
        setStatus('error_prefix' + data.error);
      }
    } catch (err) {
      setStatus('error_prefix' + err.message);
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
        setStatus('wrong_password');
      }
    } catch (err) {
      setStatus('error_prefix' + err.message);
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
    setStatus('saving_and_restarting');
    
    try {
      const res = await fetch(`${apiUrl}/api/admin/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, newSettings: settings })
      });
      
      if (res.ok) {
        setStatus('settings_saved_success');
      } else {
        setStatus('settings_save_error');
      }
    } catch (err) {
      setStatus('error_prefix' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setStatus('select_file_error');
      return;
    }

    setLoading(true);
    setStatus('upload_loading');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);

    try {
      const res = await fetch(`${apiUrl}/api/admin/upload-json`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setStatus('upload_success');
      } else {
        const errorText = await res.text();
        setStatus('error_prefix' + errorText);
      }
    } catch (err) {
      setStatus('error_conn_prefix' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = () => {
    if (!status) return null;
    if (status.startsWith('error_prefix')) {
      const rawError = status.replace('error_prefix', '');
      let displayError = rawError;
      
      // Parse JSON errors if returned by backend (like multer errors)
      try {
        if (rawError.trim().startsWith('{')) {
          const parsed = JSON.parse(rawError);
          if (parsed && parsed.error) {
            displayError = parsed.error;
          }
        }
      } catch (e) {}

      // Translate known backend error messages if language is English
      if (lang === 'en') {
        const errorMap = {
          'Пароль надто короткий': 'Password is too short (minimum 4 characters)',
          'Пароль вже встановлено': 'Password has already been set',
          'Помилка сервера': 'Server error',
          'Адмін-пароль не встановлено. Використовуйте сторінку налаштування.': 'Admin password not configured. Please use the setup page.',
          'Невірний пароль': 'Incorrect password',
          'Файл не знайдено': 'File not found',
          'Файл надто великий. Максимальний розмір: 50MB': 'File is too large. Maximum size is 50MB',
          'Внутрішня помилка сервера під час обробки файлу': 'Internal server error while processing file',
          'Будь ласка, оберіть файл.': 'Please select a file.',
          'Успішно оновлено': 'Updated successfully'
        };
        displayError = errorMap[displayError] || displayError;
      }
      
      return t.error_prefix + displayError;
    }
    if (status.startsWith('error_conn_prefix')) {
      return t.error_conn_prefix + status.replace('error_conn_prefix', '');
    }
    return t[status] || status;
  };

  const getStatusClass = () => {
    if (!status) return '';
    if (status === 'password_set_success' || status === 'settings_saved_success' || status === 'upload_success') {
      return 'success';
    }
    if (status === 'wrong_password' || status === 'settings_save_error' || status.startsWith('error_prefix') || status.startsWith('error_conn_prefix') || status === 'select_file_error') {
      return 'error';
    }
    return '';
  };

  if (!isLoggedIn) {
    if (!isConfigured) {
      return (
        <>
          <div className="top-bar" style={{ justifyContent: 'flex-end' }}>
            <div className="lang-switcher">
              <button 
                className={`lang-btn ${lang === 'ua' ? 'active' : ''}`} 
                onClick={() => toggleLang('ua')}
              >
                UA
              </button>
              <span className="lang-divider">|</span>
              <button 
                className={`lang-btn ${lang === 'en' ? 'active' : ''}`} 
                onClick={() => toggleLang('en')}
              >
                EN
              </button>
            </div>
          </div>
          <div className="glass-panel header">
            <h1>{t.first_setup_title}</h1>
            <p>{t.first_setup_subtitle}</p>
          </div>
          <div className="glass-panel">
            <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="password" 
                placeholder={t.new_password_placeholder}
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
              <button type="submit" disabled={loading} style={{ padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                {loading ? t.set_password_loading : t.set_password_btn}
              </button>
            </form>
            {status && <div className={`status-message ${getStatusClass()}`}>{renderStatus()}</div>}
          </div>
        </>
      );
    }

    return (
      <>
        <div className="top-bar" style={{ justifyContent: 'flex-end' }}>
          <div className="lang-switcher">
            <button 
              className={`lang-btn ${lang === 'ua' ? 'active' : ''}`} 
              onClick={() => toggleLang('ua')}
            >
              UA
            </button>
            <span className="lang-divider">|</span>
            <button 
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`} 
              onClick={() => toggleLang('en')}
            >
              EN
            </button>
          </div>
        </div>
        <div className="glass-panel header">
          <h1>{t.login_title}</h1>
          <p>{t.login_subtitle}</p>
        </div>
        <div className="glass-panel">
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="password" 
              placeholder={t.password_placeholder}
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
            <button type="submit" disabled={loading} style={{ padding: '12px', background: '#0088cc', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              {loading ? t.login_loading : t.login_btn}
            </button>
          </form>
          {status && <div className={`status-message ${getStatusClass()}`}>{renderStatus()}</div>}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="top-bar" style={{ justifyContent: 'flex-end' }}>
        <div className="lang-switcher">
          <button 
            className={`lang-btn ${lang === 'ua' ? 'active' : ''}`} 
            onClick={() => toggleLang('ua')}
          >
            UA
          </button>
          <span className="lang-divider">|</span>
          <button 
            className={`lang-btn ${lang === 'en' ? 'active' : ''}`} 
            onClick={() => toggleLang('en')}
          >
            EN
          </button>
        </div>
      </div>
      <div className="glass-panel header">
        <h1>{t.admin_panel_title}</h1>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
          <button onClick={() => {setActiveTab('settings'); setStatus('');}} style={{ padding: '8px 15px', background: activeTab === 'settings' ? '#0088cc' : '#444', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>{t.tab_settings}</button>
          <button onClick={() => {setActiveTab('data'); setStatus('');}} style={{ padding: '8px 15px', background: activeTab === 'data' ? '#0088cc' : '#444', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>{t.tab_data}</button>
        </div>
      </div>

      <div className="glass-panel">
        {activeTab === 'settings' ? (
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label className="admin-label">{t.site_title_label}</label>
              <input type="text" value={settings.site_title || ''} onChange={e => setSettings({...settings, site_title: e.target.value})} placeholder={t.site_title_placeholder} />
            </div>
            <div>
              <label className="admin-label">{t.bot_token_label}</label>
              <input type="text" value={settings.bot_token || ''} onChange={e => setSettings({...settings, bot_token: e.target.value})} placeholder={t.bot_token_placeholder} />
            </div>
            <div>
              <label className="admin-label">{t.chat_id_label}</label>
              <input type="text" value={settings.chat_id || ''} onChange={e => setSettings({...settings, chat_id: e.target.value})} placeholder="-100123456789" />
            </div>
            <div>
              <label className="admin-label">{t.webapp_url_label}</label>
              <input type="text" value={settings.webapp_url || ''} onChange={e => setSettings({...settings, webapp_url: e.target.value})} placeholder="https://kruhlyk.srvrs.top/" />
            </div>
            <div>
              <label className="admin-label">{t.owner_id_label}</label>
              <input type="text" value={settings.chat_owner_id || ''} onChange={e => setSettings({...settings, chat_owner_id: e.target.value})} placeholder={t.owner_id_placeholder} />
            </div>
            <div>
              <label className="admin-label">{t.new_admin_password_label}</label>
              <input type="text" value={settings.admin_password || ''} onChange={e => setSettings({...settings, admin_password: e.target.value})} placeholder={t.new_admin_password_placeholder} />
            </div>
            <button type="submit" disabled={loading} style={{ padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              {loading ? t.saving : t.save_settings_btn}
            </button>
          </form>
        ) : (
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label className="admin-label">{t.export_history_label}</label>
              <div className="file-input-container">
                <button
                  type="button"
                  onClick={() => document.getElementById('admin-file-upload').click()}
                  className="file-input-btn"
                >
                  {t.choose_file_btn}
                </button>
                <span className={`file-input-name ${file ? 'has-file' : ''}`}>
                  {file ? file.name : t.no_file_selected}
                </span>
                <input
                  id="admin-file-upload"
                  type="file"
                  accept=".json"
                  onChange={(e) => setFile(e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
            <button type="submit" disabled={loading} style={{ padding: '12px', background: '#0088cc', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              {loading ? t.upload_loading : t.upload_btn}
            </button>
          </form>
        )}
        
        {status && (
          <div className={`status-box ${getStatusClass()}`}>
            {renderStatus()}
          </div>
        )}
        
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <a href="/" className="back-link">{t.back_to_main}</a>
        </div>
      </div>

    </>
  );
}