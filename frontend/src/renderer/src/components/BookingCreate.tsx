import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AERO_LOGO_PDF_DATA_URI } from './AeroLogo';

const BookingCreate = ({ token, apiBase, role, permissions, setView }: any) => {
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(() => localStorage.getItem('custom_pdf_logo') || null);
  const [firstPreview, setFirstPreview] = useState(null);
  const [secondPreview, setSecondPreview] = useState(null);
  const [form, setForm] = useState({
    first_name: '',
    email: '',
    address: '',
    check_in_date: '',
    check_out_date: '',
    hotel_name: '',
    room_type: '',
    location: '',
    phone: '',
    room_value: '',
    rooms_count: 1,
    guests_count: 1,
    logo_image: null,
    first_image: null,
    second_image: null,
    currency_code: 'EUR',
  });

  const saveLogoToStorage = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        try {
          localStorage.setItem('custom_pdf_logo', reader.result);
        } catch (e) {
          console.warn('No se pudo guardar el logo en localStorage', e);
        }
        setLogoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const authHeaders = (tkn) => {
    if (!tkn) return {};
    return { Authorization: `Bearer ${tkn.trim()}` };
  };

  const canCreate = role === 'super_admin' || Boolean(permissions?.can_create_bookings);

  const normalizeRoomType = (val) => {
    return (val || '').toString().trim();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files && files[0] ? files[0] : null;
    setForm((f) => ({ ...f, [name]: file }));
    if (name === 'logo_image') {
      if (file) {
        saveLogoToStorage(file);
      } else {
        setLogoPreview(null);
      }
    }
    if (name === 'first_image') {
      if (firstPreview) URL.revokeObjectURL(firstPreview);
      setFirstPreview(file ? URL.createObjectURL(file) : null);
    }
    if (name === 'second_image') {
      if (secondPreview) URL.revokeObjectURL(secondPreview);
      setSecondPreview(file ? URL.createObjectURL(file) : null);
    }
  };
  const handleFileDrop = (name, file) => {
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) { setMsg({ type: 'error', text: 'Archivo no válido: debe ser una imagen.' }); return; }
    setForm((f) => ({ ...f, [name]: file }));
    if (name === 'logo_image') {
      saveLogoToStorage(file);
      return;
    }
    const url = URL.createObjectURL(file);
    if (name === 'first_image') { if (firstPreview) URL.revokeObjectURL(firstPreview); setFirstPreview(url); }
    if (name === 'second_image') { if (secondPreview) URL.revokeObjectURL(secondPreview); setSecondPreview(url); }
  };
  const removeImage = (name) => {
    setForm((f) => ({ ...f, [name]: null }));
    if (name === 'logo_image') {
      if (logoPreview && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
      localStorage.removeItem('custom_pdf_logo');
      setLogoPreview(null);
    }
    if (name === 'first_image') { if (firstPreview) URL.revokeObjectURL(firstPreview); setFirstPreview(null); }
    if (name === 'second_image') { if (secondPreview) URL.revokeObjectURL(secondPreview); setSecondPreview(null); }
  };

  const validateForm = () => {
    const required = ['first_name','email','address','check_in_date','check_out_date','hotel_name','room_type','location','phone','room_value','rooms_count','guests_count','currency_code'];
    for (const k of required) { if (!form[k]) return `${k.replace('_',' ')} es requerido`; }
    if (!/^\+?\d{7,15}$/.test(form.phone)) return 'Teléfono inválido';
    const inDate = new Date(form.check_in_date); const outDate = new Date(form.check_out_date);
    if (inDate.toString() === 'Invalid Date' || outDate.toString() === 'Invalid Date') return 'Fechas inválidas';
    if (outDate < inDate) return 'Check-out debe ser posterior al check-in';
    return null;
  };

  const extractServerError = (data) => {
    if (!data) return null;
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.message === 'string') return data.message;
    if (typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length) { const k = keys[0]; const v = data[k]; if (Array.isArray(v) && v.length) return `${k}: ${v[0]}`; if (typeof v === 'string') return `${k}: ${v}`; }
    }
    return null;
  };

  const createBooking = async (e) => {
    e.preventDefault();
    if (!token) { setMsg({ type: 'error', text: 'No hay sesión activa. Por favor inicie sesión nuevamente.' }); return; }
    if (!canCreate) { setMsg({ type: 'error', text: 'No tienes permisos para crear reservas.' }); return; }
    const err = validateForm(); if (err) { setMsg({ type: 'error', text: err }); return; }
    setLoading(true); setMsg(null);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined) fd.append(k, v as any);
      });
      if (!form.logo_image && logoPreview && logoPreview.startsWith('data:')) {
        try {
          const resBlob = await fetch(logoPreview);
          const blob = await resBlob.blob();
          fd.append('logo_image', blob, 'custom_logo.png');
        } catch (err) {
          console.warn('No se pudo adjuntar logo desde dataURL', err);
        }
      }
      fd.set('room_type', normalizeRoomType(form.room_type));
      
      const res = await fetch(`${apiBase}/users/api/bookings/`, { method: 'POST', headers: authHeaders(token), body: fd });
      const data = await res.json();
      
      if (res.status === 401) throw new Error('Sesión expirada o inválida. Por favor inicie sesión nuevamente.');
      if (!res.ok) throw new Error(extractServerError(data) || 'No se pudo crear la reserva');
      
      const emailMsg = data.email_sent ? ' Se envio el correo correctamente.' : '';
      setMsg({ type: 'success', text: `Reserva creada: ${data.first_name} - ${data.hotel_name}.${emailMsg}` });
      setTimeout(() => setView('bookings'), 800);
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    } finally { setLoading(false); }
  };

  useEffect(() => () => { if (logoPreview && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview); if (firstPreview) URL.revokeObjectURL(firstPreview); if (secondPreview) URL.revokeObjectURL(secondPreview); }, [logoPreview, firstPreview, secondPreview]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-[calc(100vh-120px)]"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="text-theme-text font-bold text-2xl tracking-tight">Nueva reserva</div>
        <div className="flex items-center gap-2">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button" 
            onClick={() => setView('bookings')} 
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-theme-background/50 hover:bg-theme-background/70 text-theme-text transition-colors border border-theme-border font-bold text-sm"
          >
            Cancelar y volver
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {msg && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`mb-6 p-4 rounded-xl text-sm flex items-center gap-3 ${msg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}
          >
            {msg.type === 'error' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            )}
            <span className="font-medium">{msg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={createBooking} className="space-y-6 md:space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-theme-surface border border-theme-border rounded-xl p-5 md:p-6 shadow-sm"
          >
            <div className="text-theme-primary font-bold text-xs uppercase tracking-widest mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-theme-primary"></div>
                Logo superior del PDF (Encabezado)
              </div>
              <span className="text-[10px] font-semibold text-theme-textMuted normal-case">
                {logoPreview ? 'Logo personalizado seleccionado' : 'Usando logo oficial por defecto'}
              </span>
            </div>
            <input id="logo_image_input" type="file" name="logo_image" onChange={handleFileChange} accept="image/*" className="hidden" />
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <motion.div
                whileHover={{ scale: 1.01, borderColor: 'rgba(var(--color-primary-rgb), 0.5)' }}
                onClick={() => { const el = document.getElementById('logo_image_input'); if (el) el.click(); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) handleFileDrop('logo_image', f); }}
                className="group relative flex items-center justify-center rounded-xl border-2 border-dashed border-theme-border bg-white h-28 w-full sm:w-72 cursor-pointer transition-all overflow-hidden p-3"
              >
                <img
                  src={logoPreview || AERO_LOGO_PDF_DATA_URI}
                  alt="Vista previa logo PDF"
                  className="max-h-full max-w-full object-contain"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={(ev) => { ev.stopPropagation(); const el = document.getElementById('logo_image_input'); if (el) el.click(); }}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white text-black hover:bg-theme-primary hover:text-white transition-all"
                  >
                    Cambiar logo
                  </button>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={(ev) => { ev.stopPropagation(); removeImage('logo_image'); }}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all"
                    >
                      Restaurar
                    </button>
                  )}
                </div>
              </motion.div>
              <div className="flex-1 flex flex-col gap-2 text-center sm:text-left">
                <div className="text-sm font-bold text-theme-text">Personaliza el logo del encabezado del PDF</div>
                <p className="text-xs text-theme-textSecondary">
                  Haz clic en el recuadro o arrastra una nueva imagen para reemplazar el logo que aparece en la parte superior del comprobante y reserva en PDF.
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => { const el = document.getElementById('logo_image_input'); if (el) el.click(); }}
                    className="px-4 py-2 rounded-xl bg-theme-primary/15 hover:bg-theme-primary/25 text-theme-primary border border-theme-primary/30 text-xs font-bold transition"
                  >
                    Subir nueva imagen de logo
                  </button>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={() => removeImage('logo_image')}
                      className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition"
                    >
                      Usar logo por defecto
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }}
            className="bg-theme-surface border border-theme-border rounded-xl p-5 md:p-6 shadow-sm"
          >
            <div className="text-theme-primary font-bold text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-theme-primary"></div>
              Datos del huésped
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-theme-textSecondary text-[10px] uppercase tracking-widest font-bold ml-1">Primer nombre</label>
                <input type="text" name="first_name" value={form.first_name} onChange={handleChange} required className="px-4 py-3 rounded-xl bg-theme-background/30 text-theme-text border border-theme-border focus:outline-none focus:ring-2 focus:ring-theme-accent/40 transition text-sm" placeholder="Ej. Juan Pérez" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-theme-textSecondary text-[10px] uppercase tracking-widest font-bold ml-1">Correo electrónico</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required className="px-4 py-3 rounded-xl bg-theme-background/30 text-theme-text border border-theme-border focus:outline-none focus:ring-2 focus:ring-theme-accent/40 transition text-sm" placeholder="correo@ejemplo.com" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-theme-textSecondary text-[10px] uppercase tracking-widest font-bold ml-1">Dirección</label>
                <input type="text" name="address" value={form.address} onChange={handleChange} required className="px-4 py-3 rounded-xl bg-theme-background/30 text-theme-text border border-theme-border focus:outline-none focus:ring-2 focus:ring-theme-accent/40 transition text-sm" placeholder="Calle, ciudad, país" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-theme-textSecondary text-[10px] uppercase tracking-widest font-bold ml-1">Teléfono</label>
                <input type="text" name="phone" value={form.phone} onChange={handleChange} required className="px-4 py-3 rounded-xl bg-theme-background/30 text-theme-text border border-theme-border focus:outline-none focus:ring-2 focus:ring-theme-accent/40 transition text-sm" placeholder="+34 600 000 000" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-theme-textSecondary text-[10px] uppercase tracking-widest font-bold ml-1">Check-in</label>
                <input type="date" name="check_in_date" value={form.check_in_date} onChange={handleChange} required className="px-4 py-3 rounded-xl bg-theme-background/30 text-theme-text border border-theme-border focus:outline-none focus:ring-2 focus:ring-theme-accent/40 transition text-sm" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-theme-textSecondary text-[10px] uppercase tracking-widest font-bold ml-1">Check-out</label>
                <input type="date" name="check_out_date" value={form.check_out_date} onChange={handleChange} required className="px-4 py-3 rounded-xl bg-theme-background/30 text-theme-text border border-theme-border focus:outline-none focus:ring-2 focus:ring-theme-accent/40 transition text-sm" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
            className="bg-theme-surface border border-theme-border rounded-xl p-5 md:p-6 shadow-sm"
          >
            <div className="text-theme-primary font-bold text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-theme-primary"></div>
              Datos del hotel
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-theme-textSecondary text-[10px] uppercase tracking-widest font-bold ml-1">Nombre del hotel</label>
                <input type="text" name="hotel_name" value={form.hotel_name} onChange={handleChange} required className="px-4 py-3 rounded-xl bg-theme-background/30 text-theme-text border border-theme-border focus:outline-none focus:ring-2 focus:ring-theme-accent/40 transition text-sm" placeholder="Ej. Grand Hotel Marina" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-theme-textSecondary text-[10px] uppercase tracking-widest font-bold ml-1">Tipo de habitación</label>
                <input type="text" name="room_type" value={form.room_type} onChange={handleChange} className="px-4 py-3 rounded-xl bg-theme-background/30 text-theme-text border border-theme-border focus:outline-none focus:ring-2 focus:ring-theme-accent/40 transition text-sm" placeholder="Ej: Suite Deluxe, Cabaña, Familiar..." />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-theme-textSecondary text-[10px] uppercase tracking-widest font-bold ml-1">Ubicación</label>
                <input type="text" name="location" value={form.location} onChange={handleChange} required className="px-4 py-3 rounded-xl bg-theme-background/30 text-theme-text border border-theme-border focus:outline-none focus:ring-2 focus:ring-theme-accent/40 transition text-sm" placeholder="Ciudad, Zona" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.3 }}
            className="bg-theme-surface border border-theme-border rounded-xl p-5 md:p-6 shadow-sm"
          >
            <div className="text-theme-primary font-bold text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-theme-primary"></div>
              Detalles de la reserva
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-theme-textSecondary text-[10px] uppercase tracking-widest font-bold ml-1">Valor p/noche</label>
                <input type="number" name="room_value" value={form.room_value} onChange={handleChange} required min={0} step="0.01" className="px-4 py-3 rounded-xl bg-theme-background/30 text-theme-text border border-theme-border focus:outline-none focus:ring-2 focus:ring-theme-accent/40 transition text-sm" placeholder="0.00" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-theme-textSecondary text-[10px] uppercase tracking-widest font-bold ml-1">Cant. Habitaciones</label>
                <input type="number" name="rooms_count" value={form.rooms_count} onChange={handleChange} required min={1} className="px-4 py-3 rounded-xl bg-theme-background/30 text-theme-text border border-theme-border focus:outline-none focus:ring-2 focus:ring-theme-accent/40 transition text-sm" placeholder="1" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-theme-textSecondary text-[10px] uppercase tracking-widest font-bold ml-1">Cant. Huéspedes</label>
                <input type="number" name="guests_count" value={form.guests_count} onChange={handleChange} required min={1} className="px-4 py-3 rounded-xl bg-theme-background/30 text-theme-text border border-theme-border focus:outline-none focus:ring-2 focus:ring-theme-accent/40 transition text-sm" placeholder="1" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-theme-textSecondary text-[10px] uppercase tracking-widest font-bold ml-1">Moneda</label>
                <select name="currency_code" value={form.currency_code} onChange={handleChange} className="px-4 py-3 rounded-xl bg-theme-background/30 text-theme-text border border-theme-border focus:outline-none focus:ring-2 focus:ring-theme-accent/40 transition text-sm cursor-pointer">
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="USD">USD ($) - Dólar</option>
                  <option value="COP">COP ($) - Peso Col</option>
                  <option value="MXN">MXN ($) - Peso Mex</option>
                </select>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.4 }}
            className="bg-theme-surface border border-theme-border rounded-xl p-5 md:p-6 shadow-sm"
          >
            <div className="text-theme-primary font-bold text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-theme-primary"></div>
              Imágenes del comprobante
            </div>
            <input id="first_image_input" type="file" name="first_image" onChange={handleFileChange} accept="image/*" className="hidden" />
            <input id="second_image_input" type="file" name="second_image" onChange={handleFileChange} accept="image/*" className="hidden" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-theme-textSecondary text-[10px] uppercase tracking-widest font-bold ml-1">Foto del huésped / DNI</label>
                <motion.div
                  whileHover={{ scale: 1.01, borderColor: 'rgba(var(--color-primary-rgb), 0.5)' }}
                  onClick={() => { const el = document.getElementById('first_image_input'); if (el) el.click(); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) handleFileDrop('first_image', f); }}
                  className="group relative flex items-center justify-center rounded-xl border-2 border-dashed border-theme-border bg-theme-background/20 h-40 cursor-pointer transition-all overflow-hidden"
                >
                  {!firstPreview && (
                    <div className="text-theme-textSecondary text-sm flex flex-col items-center gap-3 p-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-theme-background/50 flex items-center justify-center text-theme-textMuted group-hover:text-theme-primary transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      </div>
                      <span className="font-medium">Haz clic o arrastra para subir</span>
                      <span className="text-[10px] opacity-60">PNG, JPG hasta 5MB</span>
                    </div>
                  )}
                  {firstPreview && (
                    <>
                      <img src={firstPreview} alt="Vista previa huésped" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                        <button type="button" onClick={(ev) => { ev.stopPropagation(); const el = document.getElementById('first_image_input'); if (el) el.click(); }} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white text-black hover:bg-theme-primary hover:text-white transition-all">Cambiar</button>
                        <button type="button" onClick={(ev) => { ev.stopPropagation(); removeImage('first_image'); }} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all">Quitar</button>
                      </div>
                    </>
                  )}
                </motion.div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-theme-textSecondary text-[10px] uppercase tracking-widest font-bold ml-1">Foto del hotel / Logo</label>
                <motion.div
                  whileHover={{ scale: 1.01, borderColor: 'rgba(var(--color-primary-rgb), 0.5)' }}
                  onClick={() => { const el = document.getElementById('second_image_input'); if (el) el.click(); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) handleFileDrop('second_image', f); }}
                  className="group relative flex items-center justify-center rounded-xl border-2 border-dashed border-theme-border bg-theme-background/20 h-40 cursor-pointer transition-all overflow-hidden"
                >
                  {!secondPreview && (
                    <div className="text-theme-textSecondary text-sm flex flex-col items-center gap-3 p-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-theme-background/50 flex items-center justify-center text-theme-textMuted group-hover:text-theme-primary transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5"/></svg>
                      </div>
                      <span className="font-medium">Haz clic o arrastra para subir</span>
                      <span className="text-[10px] opacity-60">PNG, JPG hasta 5MB</span>
                    </div>
                  )}
                  {secondPreview && (
                    <>
                      <img src={secondPreview} alt="Vista previa hotel" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                        <button type="button" onClick={(ev) => { ev.stopPropagation(); const el = document.getElementById('second_image_input'); if (el) el.click(); }} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white text-black hover:bg-theme-primary hover:text-white transition-all">Cambiar</button>
                        <button type="button" onClick={(ev) => { ev.stopPropagation(); removeImage('second_image'); }} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all">Quitar</button>
                      </div>
                    </>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-6 mb-10">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button" 
              onClick={() => setView('bookings')} 
              className="px-6 py-3 rounded-xl bg-theme-background/50 hover:bg-theme-background/70 text-theme-text transition-colors border border-theme-border font-bold"
            >
              Cancelar
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={loading || !canCreate} 
              className="px-8 py-3 rounded-xl btn-brand disabled:opacity-50 shadow-xl shadow-theme-primary/30 font-bold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Guardando...</span>
                </>
              ) : 'Crear Reserva'}
            </motion.button>
          </div>
      </form>
    </motion.div>
  );
};

export default BookingCreate;
