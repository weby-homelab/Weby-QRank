import { useState, useEffect } from 'react'
import { version } from '../package.json'
import './index.css'

const TRANSLATIONS = {
  ua: {
    site_title_fallback: '🏆 Рейтинг активності',
    loading: 'Завантаження рейтингу...',
    error_fallback: 'Сервер тимчасово недоступний (можливо, перезапускається). Спробуйте оновити сторінку за хвилину.',
    info_btn_label: 'Деталі про рейтинг',
    modal_close: 'Закрити',
    formula_title: '⚙️ Формула та вага рейтингу',
    formula_intro: 'Карма формується на основі повідомлень, відповідей та реакцій у групі:',
    formula_guru: '(Гуру):',
    formula_flooder: '(Флудер):',
    formula_skeptic: '(Скептик):',
    formula_negative: '(Негативні):',
    formula_reply: 'Отримання відповіді (Reply):',
    formula_msg: 'Надсилання повідомлення:',
    quality_index: 'Індекс якості:',
    quality_desc: 'Масовий флуд без зворотних реакцій суттєво знижує підсумкову карму.',
    anti_cheat: 'Анти-накрутка:',
    anti_cheat_desc: 'Повторні реакції між тими ж користувачами мають згасаючу вагу.',
    welcome_title: '👋 Ласкаво просимо до KRUHLYK Karma!',
    welcome_intro: 'Ваша система оцінки активності чату ще не налаштована. Слідуйте цим простим крокам, щоб запустити її:',
    step1_title: '🤖 Додайте бота до чату',
    step1_desc: 'Запросіть вашого Telegram-бота в групу як адміністратора, щоб він міг реєструвати реакції на повідомлення.',
    step2_title: '🔓 Вимкніть Group Privacy',
    step2_desc: 'Через @BotFather вимкніть налаштування Group Privacy та переконайтеся, що ввімкнено message_reaction у дозволених оновленнях.',
    step3_title: '📥 Імпортуйте історію чату',
    step3_desc: 'Експортуйте історію чату з Telegram Desktop у форматі JSON та завантажте її в адмін-панелі для миттєвого заповнення рейтингу.',
    go_to_admin: '⚙️ Перейти до Адмінки',
    chat_owner: '👑 Власник чату',
    my_profile: 'Мій профіль',
    last_updated: 'Оновлено:',
    anonymous: 'Анонім',
    flooder_tag: 'Флудер-Юмораст',
    guru_tag: 'Корисний Гуру / Технічний Авторитет',
    skeptic_tag: 'Скептик / -Аналітик / Думер',
    detail_title: '📊 Розшифровка активності',
    detail_rank: 'Ранг у рейтингу:',
    detail_karma: 'Карма:',
    sent_msg: 'Надіслано повідомлень',
    received_replies: 'Отримано відповідей (Replies)',
    reactions_guru: 'Реакції «Гуру» (🔥, 👍, ❤️, тощо)',
    reactions_flooder: 'Реакції «Флудер» (😁, 🤣, 🤪)',
    reactions_skeptic: 'Реакції «Скептик» (🤔, 👀, тощо)',
    reactions_negative: 'Негативні реакції (👎, 🤮, 💩)',
    detail_quality_title: '🛡️ Індекс якості (Quality Index)',
    coeff_q: 'Коефіцієнт Q:',
    calculated_as: 'Розраховано як:',
    useful_msg_part: 'корисних повідомлень з реакцією/відповіддю',
    total_msg_part: 'повідомлень всього',
    detail_footer_note: '* Розрахунок балів враховує репутацію тих, хто ставить реакції, протидію взаємній накрутці, а також поступове згасання старих повідомлень (період напіврозпаду: 30 днів).'
  },
  en: {
    site_title_fallback: '🏆 Activity Rating',
    loading: 'Loading leaderboard...',
    error_fallback: 'Server is temporarily unavailable (possibly restarting). Try refreshing the page in a minute.',
    info_btn_label: 'Scoring Details',
    modal_close: 'Close',
    formula_title: '⚙️ Scoring Formula & Weights',
    formula_intro: 'Karma is calculated based on messages, replies, and reactions in the group:',
    formula_guru: '(Guru):',
    formula_flooder: '(Flooder):',
    formula_skeptic: '(Skeptic):',
    formula_negative: '(Negative):',
    formula_reply: 'Receiving reply (Reply):',
    formula_msg: 'Sending message:',
    quality_index: 'Quality Index:',
    quality_desc: 'Mass flooding without outgoing reactions severely reduces the final karma.',
    anti_cheat: 'Anti-boost Protection:',
    anti_cheat_desc: 'Repeated reactions between the same users have decaying weight.',
    welcome_title: '👋 Welcome to KRUHLYK Karma!',
    welcome_intro: 'Your chat activity scoring system is not set up yet. Follow these simple steps to launch it:',
    step1_title: '🤖 Add Bot to Chat',
    step1_desc: 'Invite your Telegram bot to the group as an admin so it can register message reactions.',
    step2_title: '🔓 Disable Group Privacy',
    step2_desc: 'Through @BotFather, disable Group Privacy and ensure message_reaction is enabled in allowed updates.',
    step3_title: '📥 Import Chat History',
    step3_desc: 'Export chat history from Telegram Desktop in JSON format and upload it in the admin panel for instant calculation.',
    go_to_admin: '⚙️ Go to Admin Panel',
    chat_owner: '👑 Chat Owner',
    my_profile: 'My Profile',
    last_updated: 'Updated:',
    anonymous: 'Anonymous',
    flooder_tag: 'Flooder-Humorist',
    guru_tag: 'Useful Guru / Technical Authority',
    skeptic_tag: 'Skeptic / Analyst / Doomer',
    detail_title: '📊 Activity Breakdown',
    detail_rank: 'Leaderboard Rank:',
    detail_karma: 'Karma:',
    sent_msg: 'Messages sent',
    received_replies: 'Replies received',
    reactions_guru: 'Guru reactions (🔥, 👍, ❤️, etc.)',
    reactions_flooder: 'Flooder reactions (😁, 🤣, 🤪)',
    reactions_skeptic: 'Skeptic reactions (🤔, 👀, etc.)',
    reactions_negative: 'Negative reactions (👎, 🤮, 💩)',
    detail_quality_title: '🛡️ Quality Index (Q)',
    coeff_q: 'Q Coefficient:',
    calculated_as: 'Calculated as:',
    useful_msg_part: 'useful messages with reaction/reply',
    total_msg_part: 'total messages',
    detail_footer_note: '* Point calculation takes into account reactor reputation, mutual boosting countermeasures, and decay of old messages (half-life: 30 days).'
  }
}

function App() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState({ site_title: '', bot_name: '', last_update: '', chat_owner_id: '', owner_info: null });
  const [showInfo, setShowInfo] = useState(false);
  const [activeUserDetail, setActiveUserDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('karma_lang') || 'ua';
  });

  const toggleLang = (l) => {
    setLang(l);
    localStorage.setItem('karma_lang', l);
  };

  const t = TRANSLATIONS[lang];

  const handleUserClick = async (user) => {
    if (!user || !user.id) return;
    setDetailLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/user/${user.id}`);
      if (response.ok) {
        const details = await response.json();
        setActiveUserDetail(details);
      }
    } catch (e) {
      console.error('Error loading user details:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    // Expand Telegram Web App
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }

    const fetchWithRetry = async (url, retries = 5, delay = 2000) => {
      for (let i = 0; i < retries; i++) {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error('Bad response');
          return await res.json();
        } catch (err) {
          if (i === retries - 1) throw err;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };

    const fetchData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        
        // Fetch Settings
        try {
          const settingsData = await fetchWithRetry(`${apiUrl}/api/settings`, 5, 2000);
          setSettings(settingsData);
          document.title = settingsData.site_title || (lang === 'ua' ? '🏆 Рейтинг активності' : '🏆 Activity Rating');
        } catch (e) {
          console.warn('Could not fetch settings, using defaults');
        }

        // Fetch Leaderboard
        const data = await fetchWithRetry(`${apiUrl}/api/leaderboard`, 5, 2000);
        setLeaderboard(data);

        // Fetch user profile if WebApp info is available
        const user = tg?.initDataUnsafe?.user;
        if (user && user.id) {
          const queryParams = new URLSearchParams({
            first_name: user.first_name || '',
            username: user.username || ''
          }).toString();
          
          try {
            const profileData = await fetchWithRetry(`${apiUrl}/api/user/${user.id}?${queryParams}`, 3, 1000);
            setMyProfile(profileData);
          } catch (e) {
            // User not found or server error
            setMyProfile({
              first_name: user.first_name,
              karma: 0,
              rank: '?'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('server_unavailable_error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [lang]);

  const getRankClass = (index) => {
    if (index === 0) return 'rank-1';
    if (index === 1) return 'rank-2';
    if (index === 2) return 'rank-3';
    return '';
  };

  const getDisplayTitle = () => {
    if (!settings.site_title) return t.site_title_fallback;
    const defaultUaTitles = ['🏆 Рейтинг активності', '🏆 Рейтинг активності спільноти', '🏆 Рейтинг KRUHLYK Community'];
    if (defaultUaTitles.includes(settings.site_title)) {
      return lang === 'ua' 
        ? settings.site_title 
        : settings.site_title
            .replace('Рейтинг активності спільноти', 'Community Activity Rating')
            .replace('Рейтинг активності', 'Activity Rating')
            .replace('Рейтинг', 'Rating');
    }
    return settings.site_title;
  };

  return (
    <>
      <div className="top-bar">
        <button 
          className="info-btn" 
          onClick={() => setShowInfo(!showInfo)}
          aria-label={t.info_btn_label}
        >
          ℹ️
        </button>

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
        <div className="header-title-container">
          <h1>{getDisplayTitle()}</h1>
        </div>
        
        {showInfo && (
          <>
            <div className="modal-backdrop" onClick={() => setShowInfo(false)} />
            <div className="info-tooltip glass-panel">
              <button className="modal-close-btn" onClick={() => setShowInfo(false)} aria-label={t.modal_close}>
                &times;
              </button>
              <h3>{t.formula_title}</h3>
              <p>
                {t.formula_intro}
              </p>
              <ul>
                <li>🔥, 👍, 💯, 🤝, ❤️ {t.formula_guru} <strong>+2.00</strong></li>
                <li>😁, 🤣, 🤪 {t.formula_flooder} <strong>+1.50</strong></li>
                <li>🤔, 👀, 🤷‍♂️, 🤯 {t.formula_skeptic} <strong>+1.00</strong></li>
                <li>👎, 🤮, 💩 {t.formula_negative} <strong>-1.00</strong></li>
                <li>{t.formula_reply} <strong>+1.00</strong></li>
                <li>{t.formula_msg} <strong>+0.50</strong></li>
              </ul>
              <p className="tooltip-note">
                🛡️ <strong>{t.quality_index}</strong> {t.quality_desc}
              </p>
              <p className="tooltip-note">
                🚫 <strong>{t.anti_cheat}</strong> {t.anti_cheat_desc}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="glass-panel">
        {loading ? (
          <div className="loader">{t.loading}</div>
        ) : error ? (
          <div className="loader error-text">
            {error === 'server_unavailable_error' ? t.error_fallback : error}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="onboarding-container">
            <h2>{t.welcome_title}</h2>
            <p className="onboarding-intro">{t.welcome_intro}</p>
            
            <div className="onboarding-steps">
              <div className="onboarding-step">
                <span className="step-num">1</span>
                <div className="step-content">
                  <h3>{t.step1_title}</h3>
                  <p>{t.step1_desc}</p>
                </div>
              </div>
              
              <div className="onboarding-step">
                <span className="step-num">2</span>
                <div className="step-content">
                  <h3>{t.step2_title}</h3>
                  <p>{t.step2_desc}</p>
                </div>
              </div>
              
              <div className="onboarding-step">
                <span className="step-num">3</span>
                <div className="step-content">
                  <h3>{t.step3_title}</h3>
                  <p>{t.step3_desc}</p>
                </div>
              </div>
            </div>

            <div className="onboarding-actions">
              <a href="/admin" className="onboarding-btn">{t.go_to_admin}</a>
            </div>
          </div>
        ) : (
          <>

            {settings.owner_info && (
              <div className="owner-card-container">
                <div className="owner-card-title">{t.chat_owner}</div>
                <div className="leaderboard-item owner-item" onClick={() => handleUserClick(settings.owner_info)} style={{ cursor: 'pointer' }}>
                  <div className="rank rank-owner">
                    👑
                  </div>
                  <div className="user-info">
                    <span className="username">{settings.owner_info.first_name || settings.owner_info.username || t.anonymous}</span>
                    <div className="karma-bar-container">
                      {(settings.owner_info.karma_flooder || 0) > 0 && (
                        <div 
                          className="karma-bar-segment flooder" 
                          style={{ width: `${((settings.owner_info.karma_flooder || 0) / ((settings.owner_info.karma_flooder || 0) + (settings.owner_info.karma_guru || 0) + (settings.owner_info.karma_skeptic || 0) || 1)) * 100}%` }}
                          title={`${t.flooder_tag}: ${Math.round(settings.owner_info.karma_flooder || 0)}`}
                        />
                      )}
                      {(settings.owner_info.karma_guru || 0) > 0 && (
                        <div 
                          className="karma-bar-segment guru" 
                          style={{ width: `${((settings.owner_info.karma_guru || 0) / ((settings.owner_info.karma_flooder || 0) + (settings.owner_info.karma_guru || 0) + (settings.owner_info.karma_skeptic || 0) || 1)) * 100}%` }}
                          title={`${t.guru_tag}: ${Math.round(settings.owner_info.karma_guru || 0)}`}
                        />
                      )}
                      {(settings.owner_info.karma_skeptic || 0) > 0 && (
                        <div 
                          className="karma-bar-segment skeptic" 
                          style={{ width: `${((settings.owner_info.karma_skeptic || 0) / ((settings.owner_info.karma_flooder || 0) + (settings.owner_info.karma_guru || 0) + (settings.owner_info.karma_skeptic || 0) || 1)) * 100}%` }}
                          title={`${t.skeptic_tag}: ${Math.round(settings.owner_info.karma_skeptic || 0)}`}
                        />
                      )}
                      {(settings.owner_info.karma || 0) === 0 && (
                        <div 
                          className="karma-bar-segment empty" 
                          style={{ width: '100%' }}
                        />
                      )}
                    </div>
                    <div className="karma-bar-stats">
                      <span className="stat-item flooder">🎭 {Math.round(settings.owner_info.karma_flooder || 0)}</span>
                      <span className="stat-item guru">🛠 {Math.round(settings.owner_info.karma_guru || 0)}</span>
                      <span className="stat-item skeptic">🧐 {Math.round(settings.owner_info.karma_skeptic || 0)}</span>
                    </div>
                  </div>
                  <div className="karma-score">
                    {Math.round(settings.owner_info.karma || 0)} <span className="karma-icon">🔥</span>
                  </div>
                </div>
              </div>
            )}
            <div className="leaderboard">
              {leaderboard.filter(user => String(user.id) !== String(settings.chat_owner_id)).map((user, index) => {
                const flooder = user.karma_flooder || 0;
                const guru = user.karma_guru || 0;
                const skeptic = user.karma_skeptic || 0;
                const total = user.karma || 0;
                const sum = flooder + guru + skeptic;
                const divisor = sum > 0 ? sum : 1;
                const flooderPct = sum > 0 ? (flooder / divisor) * 100 : 0;
                const guruPct = sum > 0 ? (guru / divisor) * 100 : 0;
                const skepticPct = sum > 0 ? (skeptic / divisor) * 100 : 0;

                return (
                  <div className="leaderboard-item" key={user.id} onClick={() => handleUserClick(user)} style={{ cursor: 'pointer' }}>
                    <div className={`rank ${getRankClass(index)}`}>
                      #{index + 1}
                    </div>
                    <div className="user-info">
                      <span className="username">{user.first_name || user.username || t.anonymous}</span>
                      <div className="karma-bar-container">
                        {flooder > 0 && (
                          <div 
                            className="karma-bar-segment flooder" 
                            style={{ width: `${flooderPct}%` }}
                            title={`${t.flooder_tag}: ${Math.round(flooder)}`}
                          />
                        )}
                        {guru > 0 && (
                          <div 
                            className="karma-bar-segment guru" 
                            style={{ width: `${guruPct}%` }}
                            title={`${t.guru_tag}: ${Math.round(guru)}`}
                          />
                        )}
                        {skeptic > 0 && (
                          <div 
                            className="karma-bar-segment skeptic" 
                            style={{ width: `${skepticPct}%` }}
                            title={`${t.skeptic_tag}: ${Math.round(skeptic)}`}
                          />
                        )}
                        {total === 0 && (
                          <div 
                            className="karma-bar-segment empty" 
                            style={{ width: '100%' }}
                          />
                        )}
                      </div>
                      <div className="karma-bar-stats">
                        <span className="stat-item flooder">🎭 {Math.round(flooder)}</span>
                        <span className="stat-item guru">🛠 {Math.round(guru)}</span>
                        <span className="stat-item skeptic">🧐 {Math.round(skeptic)}</span>
                      </div>
                    </div>
                    <div className="karma-score">
                      {Math.round(total)} <span className="karma-icon">🔥</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <footer className="footer-credits">
        <p>
          <a href="https://github.com/weby-homelab/karma-2-community-app" target="_blank" rel="noopener noreferrer">
            {t.last_updated} {settings.last_update}
          </a>
        </p>
        <p>
          &copy; 2026 Weby Homelab &bull;{' '}
          <a href="https://github.com/weby-homelab/karma-2-community-app" target="_blank" rel="noopener noreferrer" className="version-link">
            v{version}
          </a>
        </p>
      </footer>

      {myProfile && (() => {
        const flooder = myProfile.karma_flooder || 0;
        const guru = myProfile.karma_guru || 0;
        const skeptic = myProfile.karma_skeptic || 0;
        const total = myProfile.karma || 0;
        const sum = flooder + guru + skeptic;
        const divisor = sum > 0 ? sum : 1;
        const flooderPct = sum > 0 ? (flooder / divisor) * 100 : 0;
        const guruPct = sum > 0 ? (guru / divisor) * 100 : 0;
        const skepticPct = sum > 0 ? (skeptic / divisor) * 100 : 0;

        return (
          <div className="glass-panel my-profile">
            <div className={`rank ${getRankClass(myProfile.rank - 1)}`}>
              #{myProfile.rank}
            </div>
            <div className="user-info">
              <span className="username">{t.my_profile} ({myProfile.first_name})</span>
              <div className="karma-bar-container">
                {flooder > 0 && (
                  <div 
                    className="karma-bar-segment flooder" 
                    style={{ width: `${flooderPct}%` }}
                  />
                )}
                {guru > 0 && (
                  <div 
                    className="karma-bar-segment guru" 
                    style={{ width: `${guruPct}%` }}
                  />
                )}
                {skeptic > 0 && (
                  <div 
                    className="karma-bar-segment skeptic" 
                    style={{ width: `${skepticPct}%` }}
                  />
                )}
                {total === 0 && (
                  <div 
                    className="karma-bar-segment empty" 
                    style={{ width: '100%' }}
                  />
                )}
              </div>
              <div className="karma-bar-stats">
                <span className="stat-item flooder">🎭 {Math.round(flooder)}</span>
                <span className="stat-item guru">🛠 {Math.round(guru)}</span>
                <span className="stat-item skeptic">🧐 {Math.round(skeptic)}</span>
              </div>
            </div>
            <div className="karma-score">
              {Math.round(total)} <span className="karma-icon">🔥</span>
            </div>
          </div>
        );
      })()}

      {activeUserDetail && (
        <>
          <div className="modal-backdrop" onClick={() => setActiveUserDetail(null)} />
          <div className="user-detail-modal glass-panel">
            <button className="modal-close-btn" onClick={() => setActiveUserDetail(null)} aria-label={t.modal_close}>
              &times;
            </button>
            <div className="user-detail-header">
              <h3 className="user-detail-name">👤 {activeUserDetail.first_name || activeUserDetail.username || t.anonymous}</h3>
              <div className="user-detail-rank-karma">
                <span>{t.detail_rank} <strong>#{activeUserDetail.rank}</strong></span>
                <span>{t.detail_karma} <strong className="user-detail-karma-value">{Math.round(activeUserDetail.karma)} 🔥</strong></span>
              </div>
            </div>

            <div className="detail-section-title">{t.detail_title}</div>
            <div className="detail-grid">
              <div className="detail-grid-item-label">{t.sent_msg}</div>
              <div className="detail-grid-item-val">{activeUserDetail.message_count} ({lang === 'ua' ? 'вага' : 'weight'} ×0.50)</div>

              <div className="detail-grid-item-label">{t.received_replies}</div>
              <div className="detail-grid-item-val">{activeUserDetail.replies_count} ({lang === 'ua' ? 'вага' : 'weight'} ×1.00)</div>

              <div className="detail-grid-item-label">{t.reactions_guru}</div>
              <div className="detail-grid-item-val">{activeUserDetail.reactions_guru_count} ({lang === 'ua' ? 'вага' : 'weight'} ×2.00)</div>

              <div className="detail-grid-item-label">{t.reactions_flooder}</div>
              <div className="detail-grid-item-val">{activeUserDetail.reactions_flooder_count} ({lang === 'ua' ? 'вага' : 'weight'} ×1.50)</div>

              <div className="detail-grid-item-label">{t.reactions_skeptic}</div>
              <div className="detail-grid-item-val">{activeUserDetail.reactions_skeptic_count} ({lang === 'ua' ? 'вага' : 'weight'} ×1.00)</div>

              <div className="detail-grid-item-label">{t.reactions_negative}</div>
              <div className="detail-grid-item-val">{activeUserDetail.reactions_negative_count} ({lang === 'ua' ? 'вага' : 'weight'} ×-1.00)</div>
            </div>

            <div className="detail-section-title">{t.detail_quality_title}</div>
            <div className="detail-quality-box">
              {t.coeff_q} <strong>{((activeUserDetail.engaged_message_count + 1) / (activeUserDetail.message_count + 1)).toFixed(2)}</strong>
              <br />
              <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>
                {t.calculated_as} ({activeUserDetail.engaged_message_count} {t.useful_msg_part} + 1) / ({activeUserDetail.message_count} {t.total_msg_part} + 1)
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '12px', marginBottom: 0, fontStyle: 'italic' }}>
              {t.detail_footer_note}
            </p>
          </div>
        </>
      )}
    </>
  )
}

export default App