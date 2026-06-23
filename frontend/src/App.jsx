import { useState, useEffect } from 'react'
import { version } from '../package.json'
import './index.css'

function App() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState({ site_title: '🏆 Рейтинг активності', bot_name: '', last_update: '28.05.2026 17:57', chat_owner_id: '', owner_info: null });
  const [showInfo, setShowInfo] = useState(false);
  const [activeUserDetail, setActiveUserDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
          document.title = settingsData.site_title || '🏆 Рейтинг активності';
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
        setError('Сервер тимчасово недоступний (можливо, перезапускається). Спробуйте оновити сторінку за хвилину.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getRankClass = (index) => {
    if (index === 0) return 'rank-1';
    if (index === 1) return 'rank-2';
    if (index === 2) return 'rank-3';
    return '';
  };

  return (
    <>
      <div className="glass-panel header">
        <div className="header-title-container">
          <h1>{settings.site_title || '🏆 Рейтинг KRUHLYK Community'}</h1>
          <button 
            className="info-btn" 
            onClick={() => setShowInfo(!showInfo)}
            aria-label="Деталі про рейтинг"
          >
            ℹ️
          </button>
        </div>
        
        {showInfo && (
          <>
            <div className="modal-backdrop" onClick={() => setShowInfo(false)} />
            <div className="info-tooltip glass-panel">
              <button className="modal-close-btn" onClick={() => setShowInfo(false)} aria-label="Закрити">
                &times;
              </button>
              <h3>⚙️ Формула та вага рейтингу</h3>
              <p>
                Карма формується на основі повідомлень, відповідей та реакцій у групі:
              </p>
              <ul>
                <li>🔥, 👍, 💯, 🤝, ❤️ (Гуру): <strong>+2.00</strong></li>
                <li>😁, 🤣, 🤪 (Флудер): <strong>+1.50</strong></li>
                <li>🤔, 👀, 🤷‍♂️, 🤯 (Скептик): <strong>+1.00</strong></li>
                <li>👎, 🤮, 💩 (Негативні): <strong>-1.00</strong></li>
                <li>Отримання відповіді (Reply): <strong>+1.00</strong></li>
                <li>Надсилання повідомлення: <strong>+0.50</strong></li>
              </ul>
              <p className="tooltip-note">
                🛡️ <strong>Індекс якості:</strong> Масовий флуд без зворотних реакцій суттєво знижує підсумкову карму.
              </p>
              <p className="tooltip-note">
                🚫 <strong>Анти-накрутка:</strong> Повторні реакції між тими ж користувачами мають згасаючу вагу.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="glass-panel">
        {loading ? (
          <div className="loader">Завантаження рейтингу...</div>
        ) : error ? (
          <div className="loader error-text">{error}</div>
        ) : leaderboard.length === 0 ? (
          <div className="onboarding-container">
            <h2>👋 Ласкаво просимо до KRUHLYK Karma!</h2>
            <p className="onboarding-intro">Ваша система оцінки активності чату ще не налаштована. Слідуйте цим простим крокам, щоб запустити її:</p>
            
            <div className="onboarding-steps">
              <div className="onboarding-step">
                <span className="step-num">1</span>
                <div className="step-content">
                  <h3>🤖 Додайте бота до чату</h3>
                  <p>Запросіть вашого Telegram-бота в групу як адміністратора, щоб він міг реєструвати реакції на повідомлення.</p>
                </div>
              </div>
              
              <div className="onboarding-step">
                <span className="step-num">2</span>
                <div className="step-content">
                  <h3>🔓 Вимкніть Group Privacy</h3>
                  <p>Через <strong>@BotFather</strong> вимкніть налаштування <i>Group Privacy</i> та переконайтеся, що ввімкнено <i>message_reaction</i> у дозволених оновленнях.</p>
                </div>
              </div>
              
              <div className="onboarding-step">
                <span className="step-num">3</span>
                <div className="step-content">
                  <h3>📥 Імпортуйте історію чату</h3>
                  <p>Експортуйте історію чату з Telegram Desktop у форматі <strong>JSON</strong> та завантажте її в адмін-панелі для миттєвого заповнення рейтингу.</p>
                </div>
              </div>
            </div>

            <div className="onboarding-actions">
              <a href="/admin" className="onboarding-btn">⚙️ Перейти до Адмінки</a>
            </div>
          </div>
        ) : (
          <>

            {settings.owner_info && (
              <div className="owner-card-container">
                <div className="owner-card-title">👑 Власник чату</div>
                <div className="leaderboard-item owner-item" onClick={() => handleUserClick(settings.owner_info)} style={{ cursor: 'pointer' }}>
                  <div className="rank rank-owner">
                    👑
                  </div>
                  <div className="user-info">
                    <span className="username">{settings.owner_info.first_name || settings.owner_info.username || 'Анонім'}</span>
                    <div className="karma-bar-container">
                      {(settings.owner_info.karma_flooder || 0) > 0 && (
                        <div 
                          className="karma-bar-segment flooder" 
                          style={{ width: `${((settings.owner_info.karma_flooder || 0) / ((settings.owner_info.karma_flooder || 0) + (settings.owner_info.karma_guru || 0) + (settings.owner_info.karma_skeptic || 0) || 1)) * 100}%` }}
                          title={`Флудер-Юмораст: ${Math.round(settings.owner_info.karma_flooder || 0)}`}
                        />
                      )}
                      {(settings.owner_info.karma_guru || 0) > 0 && (
                        <div 
                          className="karma-bar-segment guru" 
                          style={{ width: `${((settings.owner_info.karma_guru || 0) / ((settings.owner_info.karma_flooder || 0) + (settings.owner_info.karma_guru || 0) + (settings.owner_info.karma_skeptic || 0) || 1)) * 100}%` }}
                          title={`Корисний Гуру / Технічний Авторитет: ${Math.round(settings.owner_info.karma_guru || 0)}`}
                        />
                      )}
                      {(settings.owner_info.karma_skeptic || 0) > 0 && (
                        <div 
                          className="karma-bar-segment skeptic" 
                          style={{ width: `${((settings.owner_info.karma_skeptic || 0) / ((settings.owner_info.karma_flooder || 0) + (settings.owner_info.karma_guru || 0) + (settings.owner_info.karma_skeptic || 0) || 1)) * 100}%` }}
                          title={`Скептик / Аналітик / Думер: ${Math.round(settings.owner_info.karma_skeptic || 0)}`}
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
                      <span className="username">{user.first_name || user.username || 'Анонім'}</span>
                      <div className="karma-bar-container">
                        {flooder > 0 && (
                          <div 
                            className="karma-bar-segment flooder" 
                            style={{ width: `${flooderPct}%` }}
                            title={`Флудер-Юмораст: ${Math.round(flooder)}`}
                          />
                        )}
                        {guru > 0 && (
                          <div 
                            className="karma-bar-segment guru" 
                            style={{ width: `${guruPct}%` }}
                            title={`Корисний Гуру / Технічний Авторитет: ${Math.round(guru)}`}
                          />
                        )}
                        {skeptic > 0 && (
                          <div 
                            className="karma-bar-segment skeptic" 
                            style={{ width: `${skepticPct}%` }}
                            title={`Скептик / Аналітик / Думер: ${Math.round(skeptic)}`}
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
            Оновлено: {settings.last_update}
          </a>
        </p>
        <p>
          &copy; 2026 Weby Homelab &bull;{' '}
          <a href="https://github.com/weby-homelab/karma-2-community-app" target="_blank" rel="noopener noreferrer" className="version-link">
            v2.0.5
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
              <span className="username">Мій профіль ({myProfile.first_name})</span>
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
            <button className="modal-close-btn" onClick={() => setActiveUserDetail(null)} aria-label="Закрити">
              &times;
            </button>
            <div className="user-detail-header">
              <h3 className="user-detail-name">👤 {activeUserDetail.first_name || activeUserDetail.username || 'Анонім'}</h3>
              <div className="user-detail-rank-karma">
                <span>Ранг у рейтингу: <strong>#{activeUserDetail.rank}</strong></span>
                <span>Карма: <strong className="user-detail-karma-value">{Math.round(activeUserDetail.karma)} 🔥</strong></span>
              </div>
            </div>

            <div className="detail-section-title">📊 Розшифровка активності</div>
            <div className="detail-grid">
              <div className="detail-grid-item-label">Надіслано повідомлень</div>
              <div className="detail-grid-item-val">{activeUserDetail.message_count} (вага ×0.50)</div>

              <div className="detail-grid-item-label">Отримано відповідей (Replies)</div>
              <div className="detail-grid-item-val">{activeUserDetail.replies_count} (вага ×1.00)</div>

              <div className="detail-grid-item-label">Реакції «Гуру» (🔥, 👍, ❤️, тощо)</div>
              <div className="detail-grid-item-val">{activeUserDetail.reactions_guru_count} (вага ×2.00)</div>

              <div className="detail-grid-item-label">Реакції «Флудер» (😁, 🤣, 🤪)</div>
              <div className="detail-grid-item-val">{activeUserDetail.reactions_flooder_count} (вага ×1.50)</div>

              <div className="detail-grid-item-label">Реакції «Скептик» (🤔, 👀, тощо)</div>
              <div className="detail-grid-item-val">{activeUserDetail.reactions_skeptic_count} (вага ×1.00)</div>

              <div className="detail-grid-item-label">Негативні реакції (👎, 🤮, 💩)</div>
              <div className="detail-grid-item-val">{activeUserDetail.reactions_negative_count} (вага ×-1.00)</div>
            </div>

            <div className="detail-section-title">🛡️ Індекс якості (Quality Index)</div>
            <div className="detail-quality-box">
              Коефіцієнт Q: <strong>{((activeUserDetail.engaged_message_count + 1) / (activeUserDetail.message_count + 1)).toFixed(2)}</strong>
              <br />
              <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>
                Розраховано як: ({activeUserDetail.engaged_message_count} корисних повідомлень з реакцією/відповіддю + 1) / ({activeUserDetail.message_count} повідомлень всього + 1)
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '12px', marginBottom: 0, fontStyle: 'italic' }}>
              * Розрахунок балів враховує репутацію тих, хто ставить реакції, протидію взаємній накрутці, а також поступове згасання старих повідомлень (період напіврозпаду: 30 днів).
            </p>
          </div>
        </>
      )}
    </>
  )
}

export default App