import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './components/Dashboard';
import TitleBar from './components/TitleBar';
import AeroLogo from './components/AeroLogo';

const App = () => {
  const [username, setUsername] = useState(() => localStorage.getItem('agency_username') || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<any>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [role, setRole] = useState<string | null>(() => localStorage.getItem('role'));
  const [permissions, setPermissions] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('agency_permissions');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('agency_theme');
    return saved === 'light' ? 'light' : 'dark';
  });
  const [themeSweep, setThemeSweep] = useState<'to-light' | 'to-dark' | null>(null);

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeSweep(nextTheme === 'light' ? 'to-light' : 'to-dark');
    setTheme(nextTheme);
    setTimeout(() => {
      setThemeSweep(null);
    }, 680);
  };

  useEffect(() => {
    localStorage.setItem('agency_theme', theme);
    document.body.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [token]);

  useEffect(() => {
    if (role) localStorage.setItem('role', role);
    else localStorage.removeItem('role');
  }, [role]);

  useEffect(() => {
    if (username) localStorage.setItem('agency_username', username);
  }, [username]);

  useEffect(() => {
    if (permissions) localStorage.setItem('agency_permissions', JSON.stringify(permissions));
    else localStorage.removeItem('agency_permissions');
  }, [permissions]);

  const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://31.220.21.83:8000';
  const authHeaders = (tkn: string | null) => ({
    'Content-Type': 'application/json',
    ...(tkn ? { Authorization: `Bearer ${tkn}` } : {}),
  });

  // Refresh current user role & granular permissions when token exists
  useEffect(() => {
    if (!token) return;
    fetch(`${apiBase}/users/api/auth/me/`, {
      method: 'GET',
      headers: authHeaders(token),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((meData) => {
        if (meData.role) setRole(meData.role);
        if (meData.username) setUsername(meData.username);
        if (meData.permissions) setPermissions(meData.permissions);
      })
      .catch(() => {});
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/users/api/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Credenciales inválidas');
      }
      try {
        const meRes = await fetch(`${apiBase}/users/api/auth/me/`, {
          method: 'GET',
          headers: authHeaders(data.access),
        });
        const meData = await meRes.json();
        if (!meRes.ok) throw new Error(meData.detail || 'No se pudo obtener el perfil');
        setRole(meData.role);
        setPermissions(meData.permissions || null);
      } catch (e: any) {
        setMessage({ type: 'error', text: e.message });
      }
      setToken(data.access);
      setMessage({ type: 'success', text: 'Inicio de sesión exitoso' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    setToken(null);
    setRole(null);
    setPermissions(null);
    setUsername('');
    setPassword('');
    localStorage.removeItem('agency_username');
    setMessage({ type: 'success', text: 'Sesión cerrada correctamente' });
  };

  return (
    <>
      {/* Animated Theme Transition Overlay (Jet Flyby & Horizon Sweep) */}
      <AnimatePresence>
        {themeSweep && (
          <motion.div
            key={themeSweep}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0.65 }}
              animate={{ scale: 3.4, opacity: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className={`w-96 h-96 rounded-full blur-2xl ${
                themeSweep === 'to-light'
                  ? 'bg-gradient-to-tr from-sky-300 via-teal-200 to-amber-200'
                  : 'bg-gradient-to-tr from-teal-500 via-sky-600 to-indigo-900'
              }`}
            />
            <motion.div
              initial={{ x: '-40vw', y: '18vh', scale: 0.7, opacity: 0 }}
              animate={{ x: '45vw', y: '-20vh', scale: 1.15, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.62, ease: 'easeInOut' }}
              className="fixed flex items-center gap-3 px-4 py-2 rounded-full bg-teal-500/20 border border-teal-400/40 backdrop-blur-md text-teal-400 font-black text-xs uppercase tracking-widest shadow-2xl"
            >
              <span>{themeSweep === 'to-light' ? '☀ Modo Diurno' : '🌙 Modo Nocturno'}</span>
              <svg className="w-5 h-5 transform rotate-45" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {token ? (
          <motion.div
            key="dashboard-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex flex-col h-screen overflow-hidden"
          >
            <TitleBar />
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
              <Dashboard
                token={token}
                role={role}
                permissions={permissions}
                username={username}
                theme={theme}
                onToggleTheme={toggleTheme}
                onSignOut={handleSignOut}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="login-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className={`flex flex-col h-screen overflow-hidden select-none transition-colors duration-500 ${
              isDark ? 'bg-[#050914] text-slate-100' : 'bg-[#eef4fb] text-slate-900'
            }`}
          >
            <TitleBar />

      <div className="relative flex-1 overflow-auto custom-scrollbar flex flex-col justify-between p-4 sm:p-6 lg:p-10">
        {/* BACKGROUND AIRPLANE & FLIGHT RADAR ARTWORK */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          {/* Subtle Coordinate Grid */}
          <div
            className={`absolute inset-0 transition-opacity duration-500 ${
              isDark ? 'opacity-[0.04]' : 'opacity-[0.06]'
            }`}
            style={{
              backgroundImage: isDark
                ? 'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)'
                : 'linear-gradient(to right, #0284c7 1px, transparent 1px), linear-gradient(to bottom, #0284c7 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />

          {/* Ambient Glow Orbs */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: isDark ? [0.22, 0.35, 0.22] : [0.35, 0.5, 0.35] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            className={`absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full blur-[130px] ${
              isDark ? 'bg-teal-500/25' : 'bg-sky-300/60'
            }`}
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: isDark ? [0.18, 0.3, 0.18] : [0.3, 0.45, 0.3] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className={`absolute bottom-[-15%] right-[-10%] w-[580px] h-[580px] rounded-full blur-[140px] ${
              isDark ? 'bg-sky-500/20' : 'bg-teal-300/50'
            }`}
          />

          {/* Giant Flight Paths & Commercial Airplane Silhouette in Background */}
          <svg
            className="absolute inset-0 w-full h-full object-cover"
            viewBox="0 0 1440 900"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
          >
            {/* Radar Concentric Circles */}
            <circle
              cx="420"
              cy="460"
              r="220"
              stroke={isDark ? 'rgba(56,189,248,0.08)' : 'rgba(2,132,199,0.12)'}
              strokeWidth="1.5"
              strokeDasharray="6 8"
            />
            <circle
              cx="420"
              cy="460"
              r="380"
              stroke={isDark ? 'rgba(20,184,166,0.07)' : 'rgba(13,148,136,0.1)'}
              strokeWidth="1.5"
            />
            <circle
              cx="420"
              cy="460"
              r="550"
              stroke={isDark ? 'rgba(56,189,248,0.05)' : 'rgba(2,132,199,0.08)'}
              strokeWidth="1"
              strokeDasharray="12 12"
            />

            {/* Curved Flight Route 1 */}
            <path
              d="M-80 720 C 260 640, 520 300, 1180 120"
              stroke={isDark ? 'url(#routeGradDark)' : 'url(#routeGradLight)'}
              strokeWidth="3"
              strokeDasharray="10 10"
            />
            {/* Curved Flight Route 2 */}
            <path
              d="M80 860 C 420 560, 790 520, 1500 260"
              stroke={isDark ? 'rgba(56,189,248,0.16)' : 'rgba(2,132,199,0.2)'}
              strokeWidth="2"
              strokeDasharray="6 10"
            />

            {/* Waypoint Dots */}
            <circle cx="230" cy="590" r="6" fill={isDark ? '#34d399' : '#0d9488'} />
            <circle cx="230" cy="590" r="14" stroke={isDark ? '#34d399' : '#0d9488'} strokeOpacity="0.4" strokeWidth="2" />
            <circle cx="880" cy="215" r="5" fill={isDark ? '#38bdf8' : '#0284c7'} />

            {/* Large Stylized Commercial Airliner Silhouette */}
            <g
              transform="translate(310, 170) rotate(-18) scale(1.25)"
              opacity={isDark ? '0.16' : '0.13'}
            >
              {/* Contrails */}
              <path
                d="M-260 225 L40 225"
                stroke={isDark ? '#38bdf8' : '#0284c7'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="2 10"
              />
              <path
                d="M-310 255 L40 255"
                stroke={isDark ? '#2dd4bf' : '#0d9488'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="2 10"
              />
              {/* Main Airliner Body & Swept Wings */}
              <path
                d="M420 240 C455 240 485 248 495 255 C485 262 455 270 420 270 L280 270 L175 430 L135 430 L195 270 L85 270 L35 335 L10 335 L45 255 L10 175 L35 175 L85 240 L195 240 L135 80 L175 80 L280 240 Z"
                fill={isDark ? 'url(#planeFillDark)' : 'url(#planeFillLight)'}
                stroke={isDark ? '#38bdf8' : '#0284c7'}
                strokeWidth="2.5"
              />
              {/* Jet Engines */}
              <rect x="215" y="140" width="38" height="18" rx="9" fill={isDark ? '#38bdf8' : '#0284c7'} />
              <rect x="215" y="352" width="38" height="18" rx="9" fill={isDark ? '#38bdf8' : '#0284c7'} />
            </g>

            <defs>
              <linearGradient id="routeGradDark" x1="0" y1="720" x2="1180" y2="120" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.05" />
                <stop offset="50%" stopColor="#10b981" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="routeGradLight" x1="0" y1="720" x2="1180" y2="120" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0d9488" stopOpacity="0.05" />
                <stop offset="50%" stopColor="#0d9488" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.15" />
              </linearGradient>
              <linearGradient id="planeFillDark" x1="0" y1="80" x2="500" y2="430" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <linearGradient id="planeFillLight" x1="0" y1="80" x2="500" y2="430" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0d9488" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* TOP BAR WITH THEME SWITCHER */}
        <header className="relative z-10 flex items-center justify-between max-w-7xl w-full mx-auto pb-4">
          <div className="flex items-center gap-3.5">
            <AeroLogo size="md" />
            <div>
              <span
                className={`text-sm font-black tracking-wider uppercase block leading-none ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                AeroAgencia • Control Central
              </span>
              <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Sistema de Reservas Hoteleras y Operaciones de Viaje
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-md text-xs font-semibold ${
                isDark
                  ? 'bg-white/[0.04] border-white/[0.08] text-slate-300'
                  : 'bg-white/80 border-slate-200 text-slate-700 shadow-sm'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span> Torre de Control Activa</span>
            </div>

            {/* Dark / Light Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold transition-all shadow-sm ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-amber-300'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
              }`}
              title="Cambiar entre modo oscuro y modo claro"
            >
              {isDark ? (
                <>
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                  <span>Modo Oscuro</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* MAIN CENTER WORKSPACE */}
        <div className="relative z-10 my-auto max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-4">
          {/* Left Column: Aviation & Travel Telemetry Showcase */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:flex lg:col-span-7 flex-col justify-between space-y-6 pr-2"
          >
            <div className="space-y-4">
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold tracking-wide uppercase ${
                  isDark
                    ? 'bg-teal-500/10 border-teal-500/25 text-teal-300'
                    : 'bg-teal-50 border-teal-200 text-teal-700'
                }`}
              >
                <svg className="w-4 h-4 transform rotate-45" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
                Cabina de Gestión de Viajes y Alojamientos
              </div>

              <h1
                className={`text-4xl xl:text-5xl font-black tracking-tight leading-[1.12] ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Despega la operación de tu{' '}
                <span className="bg-gradient-to-r from-teal-500 via-emerald-500 to-sky-500 bg-clip-text text-transparent">
                  agencia de viajes
                </span>{' '}
                con precisión.
              </h1>

              <p className={`text-base xl:text-lg leading-relaxed max-w-xl ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Coordina reservas de hotel, itinerarios, vouchers con validación QR y envíos automáticos a tus pasajeros desde una cabina moderna.
              </p>
            </div>

            {/* Interactive Boarding-Pass Style Live Flight & Hotel Card */}
            <div
              className={`rounded-3xl border p-6 backdrop-blur-xl relative overflow-hidden transition-all ${
                isDark
                  ? 'bg-[#0b1324]/80 border-white/10 shadow-2xl'
                  : 'bg-white/90 border-slate-200/90 shadow-xl shadow-slate-200/60'
              }`}
            >
              <div className="flex items-center justify-between border-b border-dashed pb-4 mb-4 border-teal-500/30">
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    RUTA DE OPERACIÓN ACTIVA
                  </span>
                  <div className="flex items-center gap-4 mt-1">
                    <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>BOG</span>
                    <div className="flex items-center gap-2 text-teal-500">
                      <span className="w-8 h-[2px] bg-teal-500/40 inline-block" />
                      <motion.svg
                        animate={{ x: [0, 6, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-5 h-5 transform rotate-90"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                      </motion.svg>
                      <span className="w-8 h-[2px] bg-teal-500/40 inline-block" />
                    </div>
                    <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>MAD</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                    ✈ VUELOS & HOTELES
                  </span>
                  <div className={`text-xs mt-1.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Emisión de Vouchers PDF + QR
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className={`p-3 rounded-2xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                  <div className={`text-xs font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Check-In</div>
                  <div className="text-sm font-extrabold text-teal-500 mt-0.5">Instantáneo</div>
                </div>
                <div className={`p-3 rounded-2xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                  <div className={`text-xs font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Comprobantes</div>
                  <div className="text-sm font-extrabold text-sky-500 mt-0.5">PDF & Email</div>
                </div>
                <div className={`p-3 rounded-2xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                  <div className={`text-xs font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Seguridad</div>
                  <div className="text-sm font-extrabold text-emerald-500 mt-0.5">Multi-Agente</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Login Boarding Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-5 w-full max-w-md mx-auto"
          >
            <div
              className={`relative rounded-3xl backdrop-blur-2xl border overflow-hidden p-7 sm:p-9 transition-all duration-300 ${
                isDark
                  ? 'bg-[#0b1324]/90 border-white/[0.1] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)]'
                  : 'bg-white/95 border-slate-200 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.12)]'
              }`}
            >
              {/* Top glowing accent bar */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-teal-400 via-emerald-500 to-sky-500" />

              {/* Decorative subtle airplane watermark inside login card */}
              <svg
                className={`absolute -right-8 -top-8 w-36 h-36 transform -rotate-12 pointer-events-none ${
                  isDark ? 'text-white/[0.03]' : 'text-slate-900/[0.03]'
                }`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>

              <div className="mb-7 relative z-10 flex items-center gap-3.5">
                <AeroLogo size="lg" />
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <span>✈ Puerta de Embarque</span>
                  </div>
                  <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Iniciar Sesión
                  </h2>
                  <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Acceso de Super Admin e Integrantes
                  </p>
                </div>
              </div>

              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-6 p-3.5 rounded-2xl text-xs sm:text-sm flex items-center gap-3 border ${
                    message.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                  }`}
                >
                  <span className="font-semibold">{message.text}</span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                <div>
                  <label
                    className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    Usuario
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-500 transition-colors">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      minLength={3}
                      className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-4 ${
                        isDark
                          ? 'bg-[#060b16]/90 border-white/[0.09] text-white placeholder-slate-500 focus:border-teal-400 focus:ring-teal-500/15'
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-500 focus:ring-teal-500/15'
                      }`}
                      placeholder="Ej. miguel"
                    />
                  </div>
                </div>

                <div>
                  <label
                    className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    Contraseña
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-500 transition-colors">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={`w-full pl-11 pr-12 py-3.5 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-4 ${
                        isDark
                          ? 'bg-[#060b16]/90 border-white/[0.09] text-white placeholder-slate-500 focus:border-teal-400 focus:ring-teal-500/15'
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-500 focus:ring-teal-500/15'
                      }`}
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-teal-500 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setRemember(!remember)}
                    className={`flex items-center gap-2.5 text-xs font-medium transition-colors ${
                      isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <div
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                        remember ? 'bg-teal-500 justify-end' : isDark ? 'bg-white/15 justify-start' : 'bg-slate-300 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                    </div>
                    <span>Recordar sesión</span>
                  </button>

                  <span className="text-xs text-teal-500 font-semibold flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Conexión segura
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-teal-500 via-emerald-500 to-sky-500 hover:from-teal-400 hover:via-emerald-400 hover:to-sky-400 shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Verificando acceso...</span>
                    </>
                  ) : (
                    <>
                      <span>Ingresar a Cabina</span>
                      <svg className="w-4 h-4 transform rotate-45" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>

        {/* Minimal Footer */}
        <footer
          className={`relative z-10 max-w-7xl w-full mx-auto pt-3 flex flex-col sm:flex-row items-center justify-between text-[11px] gap-2 ${
            isDark ? 'text-slate-500' : 'text-slate-500'
          }`}
        >
          <span>© {new Date().getFullYear()} AeroAgencia • Plataforma de Gestión de Reservas</span>
          <span>Modo actual: {isDark ? 'Oscuro (Nocturno)' : 'Claro (Diurno)'}</span>
        </footer>
      </div>
    </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default App;
