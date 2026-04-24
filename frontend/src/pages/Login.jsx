import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import useStore from '../store';
import { useLang } from '../hooks/useLang';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const login = useStore(s => s.login);
  const nav   = useNavigate();
  const { t, lang, changeLang, LANGUAGES } = useLang();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      nav('/');
    } catch (err) {
      setError(err.message || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-hero">
          <img src="/logo-bnz.png" alt="BNZ Engineering" className="login-logo" />
          <h1>BNZ <span>TASK</span></h1>
          <p>{t('appTagline')}</p>
          <div className="login-features">
            <div className="login-feature">{t('feat1')}</div>
            <div className="login-feature">{t('feat2')}</div>
            <div className="login-feature">{t('feat3')}</div>
            <div className="login-feature">{t('feat4')}</div>
          </div>
        </div>
      </div>

      <div className="login-right">
        {/* Language switcher on login */}
        <div className="login-lang-switcher">
          {LANGUAGES.map(l => (
            <button key={l.code} className={`lang-btn ${lang === l.code ? 'active' : ''}`}
              onClick={() => changeLang(l.code)} title={l.label}>
              {l.flag} <span>{l.code.toUpperCase()}</span>
            </button>
          ))}
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <h2>{t('login')}</h2>
          <p className="login-subtitle">{t('loginSubtitle')}</p>

          {error && <div className="form-error">{error}</div>}

          <label className="form-label">
            <Mail size={16} />
            <span>{t('email')}</span>
          </label>
          <input type="email" className="form-input" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="email@company.com" required />

          <label className="form-label" style={{ marginTop: 16 }}>
            <Lock size={16} />
            <span>{t('password')}</span>
          </label>
          <input type="password" className="form-input" value={password}
            onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
            style={{ marginTop: 24, width: '100%' }}>
            {loading ? t('loginLoading') : <>{t('loginBtn')} <ArrowRight size={16} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
