import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Bookings from './Bookings';
import BookingCreate from './BookingCreate';
import BookingEdit from './BookingEdit';
import WhatsAppIntegration from './WhatsAppIntegration';
import AeroLogo from './AeroLogo';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 110, damping: 14 },
  },
};

const Icon = ({ name, className = 'w-5 h-5' }: { name: string; className?: string }) => {
  if (name === 'dashboard') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
      </svg>
    );
  }
  if (name === 'users') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }
  if (name === 'bookings') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    );
  }
  if (name === 'plane') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
      </svg>
    );
  }
  if (name === 'plus') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    );
  }
  if (name === 'logout') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    );
  }
  if (name === 'money') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (name === 'ticket') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    );
  }
  if (name === 'map') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (name === 'cancel') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }
  if (name === 'whatsapp') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    );
  }
  if (name === 'trend') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    );
  }
  if (name === 'info') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  return null;
};

const SparkArea = ({ data }: { data: number[] }) => {
  const { points, area } = useMemo(() => {
    const w = 160;
    const h = 42;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const step = w / Math.max(data.length - 1, 1);
    const coords = data.map((d, i) => {
      const x = i * step;
      const y = h - ((d - min) / (max - min || 1)) * (h - 10) - 5;
      return `${x},${y}`;
    });
    const pts = coords.join(' ');
    return {
      points: pts,
      area: `0,${h} ${pts} ${w},${h}`,
    };
  }, [data]);

  return (
    <svg viewBox="0 0 160 42" className="w-28 h-10 overflow-visible">
      <polygon points={area} fill="currentColor" className="text-teal-500/15" />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="text-teal-500"
      />
    </svg>
  );
};

const RichKPI = ({
  icon,
  label,
  value,
  delta,
  positive = true,
  series = [],
  accent = 'teal',
}: any) => {
  const badgeColors: Record<string, string> = {
    teal: 'bg-teal-500/15 text-teal-500 border-teal-500/25',
    sky: 'bg-sky-500/15 text-sky-500 border-sky-500/25',
    emerald: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25',
    amber: 'bg-amber-500/15 text-amber-500 border-amber-500/25',
  };

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -3 }}
      className="bg-theme-surface/90 backdrop-blur-xl border border-theme-border rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-theme-textMuted block">
            {label}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-theme-text mt-1.5 tracking-tight">
            {value}
          </div>
        </div>
        <div
          className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-transform group-hover:scale-110 ${
            badgeColors[accent] || badgeColors.teal
          }`}
        >
          <Icon name={icon} className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-theme-border/60 flex items-center justify-between">
        {typeof delta !== 'undefined' ? (
          <span
            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
              positive
                ? 'bg-emerald-500/15 text-emerald-500'
                : 'bg-rose-500/15 text-rose-500'
            }`}
          >
            {positive ? '▲' : '▼'} {delta}% vs período ant.
          </span>
        ) : (
          <span className="text-xs text-theme-textMuted font-medium">
            Sincronizado en vivo
          </span>
        )}
        {series.length > 1 && <SparkArea data={series} />}
      </div>
    </motion.div>
  );
};

const AreaTrendChart = ({ data }: { data: number[] }) => {
  const { linePoints, areaPoints } = useMemo(() => {
    const w = 500;
    const h = 160;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const step = w / Math.max(data.length - 1, 1);
    const pts = data
      .map((d, i) => {
        const x = i * step;
        const y = h - ((d - min) / (max - min || 1)) * (h - 28) - 14;
        return `${x},${y}`;
      })
      .join(' ');
    return {
      linePoints: pts,
      areaPoints: `0,${h} ${pts} ${w},${h}`,
    };
  }, [data]);

  return (
    <svg viewBox="0 0 500 160" className="w-full h-44 overflow-visible">
      <defs>
        <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#chartAreaGrad)" />
      <motion.polyline
        points={linePoints}
        fill="none"
        stroke="#14b8a6"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      />
    </svg>
  );
};

const ChartsPanel = ({ seriesA, seriesB }: { seriesA: number[]; seriesB: number[] }) => {
  const regions = ['Europa', 'América del Norte', 'Sudamérica', 'Caribe', 'Asia & Pacífico', 'Nacional'];
  const maxB = Math.max(...seriesB, 1);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      <motion.div
        variants={itemVariants}
        className="lg:col-span-7 bg-theme-surface/90 backdrop-blur-xl border border-theme-border rounded-3xl p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-teal-500">
              TELEMETRÍA DE VUELOS Y ALOJAMIENTOS
            </span>
            <h3 className="text-lg font-extrabold text-theme-text">
              Flujo Operativo de Reservas
            </h3>
          </div>
          <span className="text-xs bg-teal-500/10 text-teal-500 border border-teal-500/20 px-3 py-1 rounded-full font-bold">
            Tiempo Real
          </span>
        </div>
        <AreaTrendChart data={seriesA} />
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="lg:col-span-5 bg-theme-surface/90 backdrop-blur-xl border border-theme-border rounded-3xl p-6 shadow-sm flex flex-col justify-between"
      >
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-sky-500">
            RUTAS Y DESTINOS
          </span>
          <h3 className="text-lg font-extrabold text-theme-text mb-4">
            Demanda por Región
          </h3>

          <div className="space-y-3.5">
            {regions.slice(0, Math.max(seriesB.length, 5)).map((region, idx) => {
              const val = seriesB[idx] || 10;
              const pct = Math.min(100, Math.round((val / maxB) * 100));
              return (
                <div key={region} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-theme-text flex items-center gap-1.5">
                      <Icon name="plane" className="w-3.5 h-3.5 text-teal-500 transform rotate-45" />
                      {region}
                    </span>
                    <span className="text-theme-textSecondary">{pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-theme-background overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.08 }}
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-sky-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const StatsPanel = ({ stats, seriesA }: any) => {
  const bookings = Number(stats.bookings || 0);
  const receipts = Number(stats.receipts || 0);
  const employees = Number(stats.employees || 0);
  const admins = Number(stats.admins || 0);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
    >
      <RichKPI
        icon="ticket"
        label="Reservas Activas"
        value={bookings}
        delta={14}
        positive={true}
        series={seriesA}
        accent="teal"
      />
      <RichKPI
        icon="money"
        label="Vouchers / Recibos"
        value={receipts}
        delta={9}
        positive={true}
        series={seriesA}
        accent="sky"
      />
      <RichKPI
        icon="users"
        label="Agentes en Turno"
        value={employees}
        accent="emerald"
      />
      <RichKPI
        icon="map"
        label="Supervisores / Admins"
        value={Math.max(admins, 1)}
        accent="amber"
      />
    </motion.div>
  );
};

const UsersManager = ({ token, apiBase, role, permissions }: any) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<any>(null);
  const [form, setForm] = useState<any>({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    department: '',
    position: '',
    can_create_bookings: false,
    can_edit_bookings: false,
    can_delete_bookings: false,
  });
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({
    first_name: '',
    last_name: '',
    email: '',
    department: '',
    position: '',
    password: '',
    can_create_bookings: false,
    can_edit_bookings: false,
    can_delete_bookings: false,
  });
  const [createOpen, setCreateOpen] = useState(false);

  const isSuperAdmin = role === 'super_admin';
  const canManage = isSuperAdmin || Boolean(permissions?.can_manage_users);
  const authHeaders = (tkn: string) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tkn}`,
  });

  const loadEmployees = async () => {
    if (!canManage) return;
    setMsg(null);
    try {
      const res = await fetch(`${apiBase}/users/api/users/`, { headers: authHeaders(token) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'No se pudieron cargar integrantes');
      setEmployees(Array.isArray(data) ? data : data.results || []);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  useEffect(() => {
    if (token && canManage) loadEmployees();
  }, [token, role]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const payload = { ...form, role: 'employee' };
      const res = await fetch(`${apiBase}/users/api/users/`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'No se pudo crear el integrante');
      setMsg({ type: 'success', text: `Integrante ${data.username} registrado con acceso limitado` });
      setForm({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        email: '',
        department: '',
        position: '',
        can_create_bookings: false,
        can_edit_bookings: false,
        can_delete_bookings: false,
      });
      setCreateOpen(false);
      loadEmployees();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setMsg(null);
    try {
      const res = await fetch(`${apiBase}/users/api/users/${id}/`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'No se pudo eliminar');
      setMsg({ type: 'success', text: 'Integrante eliminado correctamente' });
      loadEmployees();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  const handleQuickTogglePerm = async (u: any, permKey: string) => {
    if (!isSuperAdmin) return;
    setMsg(null);
    try {
      const nextVal = !Boolean(u[permKey]);
      const res = await fetch(`${apiBase}/users/api/users/${u.id}/`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({ [permKey]: nextVal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'No se pudo actualizar permiso');
      setEmployees((prev) => prev.map((item) => (item.id === u.id ? data : item)));
      setMsg({
        type: 'success',
        text: `Permisos de ${u.username} actualizados por Super Admin`,
      });
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  const startEdit = (u: any) => {
    setEditing(u);
    setEditForm({
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      email: u.email || '',
      department: u.department || '',
      position: u.position || '',
      password: '',
      can_create_bookings: Boolean(u.can_create_bookings),
      can_edit_bookings: Boolean(u.can_edit_bookings),
      can_delete_bookings: Boolean(u.can_delete_bookings),
    });
  };

  const handleEditChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setEditForm((prev: any) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setMsg(null);
    try {
      const payload: any = { ...editForm };
      if (!payload.password) delete payload.password;
      const res = await fetch(`${apiBase}/users/api/users/${editing.id}/`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'No se pudo actualizar');
      setMsg({ type: 'success', text: `Integrante ${data.username} actualizado por Super Admin` });
      setEditing(null);
      loadEmployees();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  const fieldLabels: Record<string, string> = {
    username: 'Usuario',
    password: 'Contraseña',
    first_name: 'Nombre',
    last_name: 'Apellido',
    email: 'Correo electrónico',
    department: 'Departamento',
    position: 'Cargo',
  };

  if (!canManage) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 font-semibold">
        Acceso exclusivo del Super Administrador principal. Los integrantes tienen funciones limitadas.
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {msg && (
        <div
          className={`p-4 rounded-2xl text-sm font-semibold border ${
            msg.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="bg-theme-surface border border-theme-border rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-teal-500">
              CONTROL EXCLUSIVO DE SUPER ADMIN • JERARQUÍA Y PERMISOS
            </span>
            <h3 className="text-xl font-black text-theme-text">Directorio de Integrantes</h3>
            <p className="text-xs text-theme-textSecondary mt-1">
              Por defecto, los integrantes están en <strong>Modo Limitado (Solo Lectura)</strong> y no pueden borrar, editar ni manipular reservas a menos que el Super Admin lo autorice.
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 text-white font-bold text-sm shadow-lg shadow-teal-500/25 hover:opacity-95 transition flex items-center gap-2 shrink-0"
          >
            <Icon name="plus" className="w-4 h-4" />
            <span>Nuevo Integrante</span>
          </button>
        </div>

        <div className="w-full">
          <table className="w-full table-fixed text-sm text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-theme-textSecondary bg-theme-background border-b border-theme-border">
                <th className="w-[22%] py-3.5 px-4">Integrante</th>
                <th className="w-[23%] py-3.5 px-4">Nombre & Cargo</th>
                <th className="w-[35%] py-3.5 px-4">Estado & Permisos (Click para cambiar)</th>
                <th className="w-[20%] py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {employees.map((u) => {
                const isRestricted = !u.can_create_bookings && !u.can_edit_bookings && !u.can_delete_bookings;
                return (
                  <tr key={u.id} className="hover:bg-teal-500/[0.04] transition-colors">
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-sky-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          {(u.first_name?.[0] || u.username?.[0] || 'U').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-theme-text truncate">{u.username}</div>
                          <div className="text-xs text-theme-textSecondary truncate">{u.email || 'Sin correo'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-middle">
                      <div className="font-bold text-theme-text truncate">
                        {[u.first_name, u.last_name].filter(Boolean).join(' ') || 'Integrante'}
                      </div>
                      <div className="text-xs text-theme-textMuted truncate">
                        {u.position || 'Agente'} {u.department ? `• ${u.department}` : ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-middle">
                      <div className="space-y-1.5">
                        <div>
                          {isRestricted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                              🔒 Acceso Limitado (Solo Lectura)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-teal-500/15 text-teal-500 border border-teal-500/30">
                              ⚡ Con Permisos Delegados
                            </span>
                          )}
                        </div>
                        {isSuperAdmin && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickTogglePerm(u, 'can_create_bookings')}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                                u.can_create_bookings
                                  ? 'bg-emerald-500 text-white border-emerald-500'
                                  : 'bg-theme-background text-theme-textMuted border-theme-border hover:border-teal-500/50'
                              }`}
                              title="Permitir o bloquear creación de reservas"
                            >
                              Crear: {u.can_create_bookings ? 'SÍ' : 'NO'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickTogglePerm(u, 'can_edit_bookings')}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                                u.can_edit_bookings
                                  ? 'bg-sky-500 text-white border-sky-500'
                                  : 'bg-theme-background text-theme-textMuted border-theme-border hover:border-sky-500/50'
                              }`}
                              title="Permitir o bloquear edición de reservas"
                            >
                              Editar: {u.can_edit_bookings ? 'SÍ' : 'NO'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickTogglePerm(u, 'can_delete_bookings')}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                                u.can_delete_bookings
                                  ? 'bg-rose-500 text-white border-rose-500'
                                  : 'bg-theme-background text-theme-textMuted border-theme-border hover:border-rose-500/50'
                              }`}
                              title="Permitir o bloquear eliminación de reservas"
                            >
                              Borrar: {u.can_delete_bookings ? 'SÍ' : 'NO'}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right align-middle">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(u)}
                          className="px-3 py-1.5 rounded-xl bg-sky-500/15 text-sky-500 hover:bg-sky-500 hover:text-white border border-sky-500/30 text-xs font-bold transition"
                        >
                          Configurar
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/30 text-xs font-bold transition"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-theme-textMuted">
                    No hay integrantes registrados todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear Usuario (Renderizado en Portal para centrarse sobre toda la pantalla) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {createOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999]"
                onClick={() => setCreateOpen(false)}
              >
                <motion.div
                  initial={{ scale: 0.94, opacity: 0, y: 12 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0, y: 12 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-theme-surface border border-theme-border rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden"
                >
                  {/* Header Banner */}
                  <div className="bg-gradient-to-r from-[#071929] via-[#0c2d3e] to-[#0d9488] px-6 py-4 text-white flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-teal-200 block">
                        ALTA DE TRIPULACIÓN • ACCESO RESTRINGIDO POR DEFECTO
                      </span>
                      <h4 className="text-xl font-black tracking-tight">Registrar Nuevo Integrante</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreateOpen(false)}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                    >
                      <Icon name="cancel" className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleCreate} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {['username', 'password', 'first_name', 'last_name', 'email', 'department', 'position'].map((field) => (
                        <div key={field} className={field === 'email' ? 'sm:col-span-2' : ''}>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-theme-textSecondary mb-1">
                            {fieldLabels[field]} {field === 'username' || field === 'password' ? '*' : ''}
                          </label>
                          <input
                            type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                            name={field}
                            value={form[field]}
                            onChange={handleChange}
                            required={field === 'username' || field === 'password'}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-theme-background border border-theme-border text-theme-text text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                            placeholder={fieldLabels[field]}
                          />
                        </div>
                      ))}
                    </div>

                    {isSuperAdmin && (
                      <div className="p-4 rounded-2xl bg-theme-background border border-theme-border space-y-2.5">
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-teal-500">
                          Autorizaciones de Manipulación (Control de Super Admin)
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {[
                            { key: 'can_create_bookings', label: 'Crear Reservas' },
                            { key: 'can_edit_bookings', label: 'Editar Reservas' },
                            { key: 'can_delete_bookings', label: 'Eliminar Reservas' },
                          ].map((perm) => (
                            <label
                              key={perm.key}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                                form[perm.key]
                                  ? 'bg-teal-500/15 border-teal-500/40 text-teal-500'
                                  : 'bg-theme-surface border-theme-border text-theme-textSecondary'
                              }`}
                            >
                              <input
                                type="checkbox"
                                name={perm.key}
                                checked={Boolean(form[perm.key])}
                                onChange={handleChange}
                                className="rounded border-theme-border text-teal-500 focus:ring-teal-500"
                              />
                              <span>{perm.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-3 border-t border-theme-border">
                      <button
                        type="button"
                        onClick={() => setCreateOpen(false)}
                        className="px-5 py-2.5 rounded-xl border border-theme-border bg-theme-background text-theme-text text-sm font-bold hover:opacity-90"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 text-white text-sm font-bold shadow-lg shadow-teal-500/25 hover:opacity-95"
                      >
                        {loading ? 'Guardando...' : 'Crear Integrante'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Modal Editar Usuario (Renderizado en Portal para centrarse sobre toda la pantalla) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {editing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999]"
                onClick={() => setEditing(null)}
              >
                <motion.div
                  initial={{ scale: 0.94, opacity: 0, y: 12 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0, y: 12 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-theme-surface border border-theme-border rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden"
                >
                  {/* Header Banner */}
                  <div className="bg-gradient-to-r from-[#071929] via-[#0c2d3e] to-[#0d9488] px-6 py-4 text-white flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-teal-200 block">
                        PANEL DE SUPER ADMINISTRADOR • PERFIL Y PERMISOS
                      </span>
                      <h4 className="text-xl font-black tracking-tight">
                        Configurar Integrante: {editing.username}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                    >
                      <Icon name="cancel" className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={submitEdit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {['first_name', 'last_name', 'email', 'department', 'position', 'password'].map((field) => (
                        <div key={field}>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-theme-textSecondary mb-1">
                            {fieldLabels[field]}
                          </label>
                          <input
                            type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                            name={field}
                            value={editForm[field]}
                            onChange={handleEditChange}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-theme-background border border-theme-border text-theme-text text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                            placeholder={field === 'password' ? 'Nueva contraseña (opcional)' : fieldLabels[field]}
                          />
                        </div>
                      ))}
                    </div>

                    {isSuperAdmin && (
                      <div className="p-4 rounded-2xl bg-theme-background border border-theme-border space-y-2.5">
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-teal-500">
                          Autorizaciones de Manipulación (Control de Super Admin)
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {[
                            { key: 'can_create_bookings', label: 'Crear Reservas' },
                            { key: 'can_edit_bookings', label: 'Editar Reservas' },
                            { key: 'can_delete_bookings', label: 'Eliminar Reservas' },
                          ].map((perm) => (
                            <label
                              key={perm.key}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                                editForm[perm.key]
                                  ? 'bg-teal-500/15 border-teal-500/40 text-teal-500'
                                  : 'bg-theme-surface border-theme-border text-theme-textSecondary'
                              }`}
                            >
                              <input
                                type="checkbox"
                                name={perm.key}
                                checked={Boolean(editForm[perm.key])}
                                onChange={handleEditChange}
                                className="rounded border-theme-border text-teal-500 focus:ring-teal-500"
                              />
                              <span>{perm.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-3 border-t border-theme-border">
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="px-5 py-2.5 rounded-xl border border-theme-border bg-theme-background text-theme-text text-sm font-bold hover:opacity-90"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 text-white text-sm font-bold shadow-lg shadow-teal-500/25 hover:opacity-95"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </motion.div>
  );
};

const Dashboard = ({
  token,
  role,
  permissions,
  username,
  theme = 'dark',
  onToggleTheme,
  onSignOut,
}: any) => {
  const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
  const [view, setView] = useState('dashboard');
  const [bookingToEdit, setBookingToEdit] = useState<any>(null);
  const [stats, setStats] = useState({ bookings: 0, receipts: 0, employees: 0, admins: 0 });
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDark = theme === 'dark';
  const isSuperAdmin = role === 'super_admin';
  const canCreateBookings = isSuperAdmin || Boolean(permissions?.can_create_bookings);
  const canEditBookings = isSuperAdmin || Boolean(permissions?.can_edit_bookings);
  const canDeleteBookings = isSuperAdmin || Boolean(permissions?.can_delete_bookings);
  const canManageUsers = isSuperAdmin || Boolean(permissions?.can_manage_users);

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    fetch(`${apiBase}/users/api/stats/`, { headers })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) =>
        setStats({
          bookings: d.total_bookings || 0,
          receipts: d.total_receipts || 0,
          employees: d.total_employees || 0,
          admins: d.total_admins || 0,
        })
      )
      .catch(() => {});
  }, [token, view]);

  const seriesA = useMemo(() => {
    const base = Number(stats.bookings || 4);
    return [3, 6, 5, 9, 8, 12, Math.max(base, 7), Math.max(base + 4, 11)];
  }, [stats]);

  const seriesB = useMemo(() => [18, 14, 11, 9, 7, 5], []);

  const navItems = [
    { id: 'dashboard', label: 'Torre de Control', icon: 'dashboard', allowed: true },
    {
      id: 'bookings',
      label: 'Vuelos y Reservas',
      icon: 'bookings',
      allowed: true,
    },
    {
      id: 'booking-create',
      label: 'Emitir Reserva',
      icon: 'plus',
      allowed: canCreateBookings,
    },
    {
      id: 'users',
      label: 'Integrantes / Permisos',
      icon: 'users',
      allowed: canManageUsers,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp Chat API',
      icon: 'whatsapp',
      allowed: true,
    },
  ];

  const viewTitles: Record<string, string> = {
    dashboard: 'Centro de Mando y Operaciones',
    bookings: 'Gestión de Reservas y Vouchers',
    'booking-create': 'Emisión de Nueva Reserva',
    'booking-edit': 'Edición de Reserva',
    users: 'Control de Integrantes y Permisos',
    whatsapp: 'Integración WhatsApp Business & Bot',
  };

  const viewTransitionVariants = {
    initial: { opacity: 0, y: 14 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
      transitionEnd: { transform: 'none' },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: { duration: 0.18, ease: 'easeInOut' },
    },
  };

  return (
    <div className="min-h-screen bg-theme-background text-theme-text flex relative overflow-hidden transition-colors duration-300">
      {/* SUBTLE BACKGROUND AIRPLANE & FLIGHT ROUTES WATERMARK */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <svg
          className="absolute right-[-5%] bottom-[-8%] w-[780px] h-[520px]"
          viewBox="0 0 800 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-50 420 C 180 340, 420 180, 780 60"
            stroke="currentColor"
            className="text-teal-500/15"
            strokeWidth="2.5"
            strokeDasharray="8 8"
          />
          <g
            transform="translate(260, 40) rotate(-16) scale(0.95)"
            className={isDark ? 'text-teal-400/[0.05]' : 'text-teal-700/[0.06]'}
          >
            <path
              d="M420 240 C455 240 485 248 495 255 C485 262 455 270 420 270 L280 270 L175 430 L135 430 L195 270 L85 270 L35 335 L10 335 L45 255 L10 175 L35 175 L85 240 L195 240 L135 80 L175 80 L280 240 Z"
              fill="currentColor"
            />
          </g>
        </svg>
      </div>

      {/* SIDEBAR NAVIGATION (DESKTOP) */}
      <aside
        className={`hidden md:flex flex-col w-72 shrink-0 border-r z-30 transition-colors duration-300 ${
          isDark
            ? 'bg-[#080e1c]/95 border-white/[0.08]'
            : 'bg-white/95 border-slate-200/90 shadow-sm'
        }`}
      >
        {/* Brand Header with Custom Logo */}
        <div className="p-6 border-b border-theme-border/60 flex items-center gap-3.5">
          <AeroLogo size="md" />
          <div>
            <div className="font-black text-base tracking-tight text-theme-text leading-none">
              AeroAgencia
            </div>
            <span className="text-[11px] font-semibold text-teal-500 uppercase tracking-wider">
              ✈ Flight & Hotel Suite
            </span>
          </div>
        </div>

        {/* Navigation Links with Animated Active Pill */}
        <div className="flex-1 px-4 py-6 space-y-2">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-theme-textMuted">
            Módulos de Cabina
          </div>
          {navItems
            .filter((item) => item.allowed)
            .map((item) => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`relative w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold transition-colors overflow-hidden ${
                    active
                      ? 'text-white'
                      : 'text-theme-textSecondary hover:bg-theme-background/70 hover:text-theme-text'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="activeSidebarPill"
                      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                      className="absolute inset-0 bg-gradient-to-r from-teal-500 to-sky-500 rounded-2xl shadow-lg shadow-teal-500/25 z-0"
                    />
                  )}
                  <Icon
                    name={item.icon}
                    className={`w-5 h-5 relative z-10 ${active ? 'text-white' : 'text-teal-500'}`}
                  />
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
        </div>

        {/* Sidebar Bottom: Theme Switcher & User Card */}
        <div className="p-4 border-t border-theme-border/60 space-y-3">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-theme-border bg-theme-background hover:border-teal-500/40 text-xs font-bold text-theme-text transition"
            >
              <span className="flex items-center gap-2">
                {isDark ? (
                  <>
                    <span className="text-amber-400">☀</span>
                    <span>Cambiar a Modo Claro</span>
                  </>
                ) : (
                  <>
                    <span className="text-sky-600">🌙</span>
                    <span>Cambiar a Modo Oscuro</span>
                  </>
                )}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-500 text-[10px] uppercase">
                {isDark ? 'Oscuro' : 'Claro'}
              </span>
            </button>
          )}

          <div className="p-3.5 rounded-2xl bg-theme-background border border-theme-border flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-theme-text truncate">
                {username || 'Usuario'}
              </div>
              <div
                className={`text-[10px] font-bold uppercase tracking-wider truncate ${
                  isSuperAdmin ? 'text-teal-500' : 'text-amber-500'
                }`}
              >
                {isSuperAdmin ? '★ Super Admin Principal' : '🔒 Integrante (Limitado)'}
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="p-2.5 rounded-xl bg-rose-500/15 text-rose-500 hover:bg-rose-500 hover:text-white transition shrink-0"
              title="Cerrar sesión"
            >
              <Icon name="logout" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-72 bg-theme-surface border-r border-theme-border z-50 p-5 flex flex-col justify-between md:hidden"
            >
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-theme-border">
                  <div className="flex items-center gap-2.5">
                    <AeroLogo size="sm" />
                    <span className="font-black text-base text-theme-text">AeroAgencia</span>
                  </div>
                  <button onClick={() => setMobileOpen(false)} className="p-1.5 text-theme-textMuted">
                    <Icon name="cancel" className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {navItems
                    .filter((i) => i.allowed)
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setView(item.id);
                          setMobileOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold ${
                          view === item.id
                            ? 'bg-teal-500 text-white'
                            : 'text-theme-textSecondary hover:bg-theme-background'
                        }`}
                      >
                        <Icon name={item.icon} className="w-5 h-5" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                </div>
              </div>
              <div className="space-y-2 pt-4 border-t border-theme-border">
                {onToggleTheme && (
                  <button
                    onClick={onToggleTheme}
                    className="w-full py-2.5 px-4 rounded-xl border border-theme-border text-xs font-bold text-theme-text"
                  >
                    {isDark ? '☀ Modo Claro' : '🌙 Modo Oscuro'}
                  </button>
                )}
                <button
                  onClick={onSignOut}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-500 text-white text-xs font-bold"
                >
                  Cerrar sesión
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Header */}
        <header className="h-16 px-4 sm:px-8 border-b border-theme-border bg-theme-surface/90 backdrop-blur-xl flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl border border-theme-border text-theme-text"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-teal-500">
                SISTEMA OPERATIVO DE VIAJES
              </div>
              <h1 className="text-base sm:text-lg font-black text-theme-text truncate">
                {viewTitles[view] || 'Panel Principal'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                isSuperAdmin
                  ? 'bg-teal-500/10 text-teal-500 border-teal-500/25'
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/25'
              }`}
            >
              <span>{isSuperAdmin ? '★ Control Super Admin' : '🔒 Modo Integrante Limitado'}</span>
            </span>

            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="px-3.5 py-2 rounded-xl border border-theme-border bg-theme-background hover:border-teal-500/40 text-xs font-bold text-theme-text flex items-center gap-1.5 transition"
                title="Cambiar entre modo oscuro y claro"
              >
                <span>{isDark ? '☀ Claro' : '🌙 Oscuro'}</span>
              </button>
            )}
            {canCreateBookings && (
              <button
                onClick={() => setView('booking-create')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-teal-500/20 hover:opacity-95 transition flex items-center gap-1.5"
              >
                <Icon name="plane" className="w-4 h-4 transform rotate-45" />
                <span className="hidden sm:inline">Nueva Reserva</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Scrollable Content with Animated View Transitions */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div
                key="view-dashboard"
                variants={viewTransitionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                {/* Aviation Hero Banner with Airplane Illustration */}
                <div className="relative rounded-3xl overflow-hidden border border-teal-500/30 bg-gradient-to-r from-[#071929] via-[#0c2d3e] to-[#0a3c49] text-white p-6 sm:p-8 shadow-xl">
                  <svg
                    className="pointer-events-none absolute right-0 top-0 h-full w-2/3 opacity-20"
                    viewBox="0 0 600 240"
                    fill="none"
                  >
                    <path
                      d="M10 210 Q 260 40, 560 50"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeDasharray="8 8"
                    />
                    <g transform="translate(360, 15) rotate(-14) scale(0.45)">
                      <path
                        d="M420 240 C455 240 485 248 495 255 C485 262 455 270 420 270 L280 270 L175 430 L135 430 L195 270 L85 270 L35 335 L10 335 L45 255 L10 175 L35 175 L85 240 L195 240 L135 80 L175 80 L280 240 Z"
                        fill="#2dd4bf"
                      />
                    </g>
                  </svg>

                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-400/15 border border-teal-300/30 text-teal-200 text-xs font-bold uppercase tracking-wider">
                        <span>
                          {isSuperAdmin
                            ? '★ Super Administrador Principal • Control Total'
                            : '🔒 Integrante de Agencia • Acceso de Consulta'}
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                        Bienvenido a bordo, {username || 'Capitán'}
                      </h2>
                      <p className="text-teal-100/80 text-sm sm:text-base">
                        {isSuperAdmin
                          ? 'Tienes control absoluto para emitir, editar o eliminar reservas y administrar los permisos de cada integrante.'
                          : 'Tu cuenta de integrante permite consultar las reservas y descargar comprobantes. Las ediciones y eliminaciones están reservadas al Super Administrador.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setView('bookings')}
                        className="px-5 py-3 rounded-2xl bg-white text-slate-900 font-extrabold text-sm shadow-lg hover:bg-teal-50 transition"
                      >
                        Ver Reservas ({stats.bookings})
                      </button>
                      {canCreateBookings && (
                        <button
                          onClick={() => setView('booking-create')}
                          className="px-5 py-3 rounded-2xl bg-teal-500/30 hover:bg-teal-500/45 border border-teal-300/40 text-white font-bold text-sm backdrop-blur-md transition"
                        >
                          + Emitir Voucher
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <StatsPanel stats={stats} seriesA={seriesA} />
                <ChartsPanel seriesA={seriesA} seriesB={seriesB} />
              </motion.div>
            )}

            {view === 'users' && (
              <motion.div
                key="view-users"
                variants={viewTransitionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <UsersManager token={token} apiBase={apiBase} role={role} permissions={permissions} />
              </motion.div>
            )}

            {view === 'whatsapp' && (
              <motion.div
                key="view-whatsapp"
                variants={viewTransitionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <WhatsAppIntegration token={token} apiBase={apiBase} />
              </motion.div>
            )}

            {view === 'bookings' && (
              <motion.div
                key="view-bookings"
                variants={viewTransitionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Bookings
                  token={token}
                  apiBase={apiBase}
                  role={role}
                  permissions={permissions}
                  setView={setView}
                  onEdit={(b: any) => {
                    setBookingToEdit(b);
                    setView('booking-edit');
                  }}
                />
              </motion.div>
            )}

            {view === 'booking-create' && (
              <motion.div
                key="view-booking-create"
                variants={viewTransitionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <BookingCreate
                  token={token}
                  apiBase={apiBase}
                  role={role}
                  permissions={permissions}
                  setView={setView}
                />
              </motion.div>
            )}

            {view === 'booking-edit' && (
              <motion.div
                key="view-booking-edit"
                variants={viewTransitionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <BookingEdit
                  token={token}
                  apiBase={apiBase}
                  role={role}
                  permissions={permissions}
                  setView={setView}
                  booking={bookingToEdit}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
