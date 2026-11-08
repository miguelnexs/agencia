import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import html2pdf from 'html2pdf.js';
import QRCode from 'qrcode';
import { AERO_LOGO_PDF_DATA_URI as logoNegro } from './AeroLogo';

const currency = (v, code = 'EUR') => {
  const n = Number(v || 0);
  try {
    const formatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: code });
    const parts = formatter.formatToParts(n);
    const symbol = parts.find(p => p.type === 'currency')?.value || code;
    const number = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    return `${symbol} ${number}`;
  } catch {
    return String(n);
  }
};

const roomTypeLabel = (rt) => {
  if (rt === 'single') return 'Individual';
  if (rt === 'double') return 'Doble';
  if (rt === 'triple') return 'Triple';
  if (rt === 'suite') return 'Suite';
  return rt || '-';
};

const Bookings = ({ token, apiBase, role, permissions, setView, onEdit }: any) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [q, setQ] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmSendEmail, setConfirmSendEmail] = useState(null);
  const [showSuccessEmail, setShowSuccessEmail] = useState(null);
  const [showErrorEmail, setShowErrorEmail] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [roomFilter, setRoomFilter] = useState('all');
  const [copiedCode, setCopiedCode] = useState(null);
  const [seedingDemo, setSeedingDemo] = useState(false);

  const authHeaders = (tkn) => ({ Authorization: `Bearer ${tkn}` });

  const normalizeRoomType = (val) => {
    const s = (val || '').toString().trim().toLowerCase();
    if (['single','individual','simple','sencilla','indiv'].includes(s)) return 'single';
    if (['double','doble','duo','2','two'].includes(s)) return 'double';
    if (['triple','triple','tres','three','3'].includes(s)) return 'triple';
    if (['suite','suíte'].includes(s)) return 'suite';
    return s;
  };

  const extractServerError = (data) => {
    if (!data) return null;
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.message === 'string') return data.message;
    if (typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length) {
        const k = keys[0];
        const v = data[k];
        if (Array.isArray(v) && v.length) return `${k}: ${v[0]}`;
        if (typeof v === 'string') return `${k}: ${v}`;
      }
    }
    return null;
  };

  const isSuperAdmin = role === 'super_admin';
  const canManage = true;
  const canCreate = isSuperAdmin || Boolean(permissions?.can_create_bookings);
  const canEdit = isSuperAdmin || Boolean(permissions?.can_edit_bookings);
  const canDelete = isSuperAdmin || Boolean(permissions?.can_delete_bookings);

  const loadBookings = async () => {
    if (!canManage) {
      setMsg({ type: 'error', text: 'Solo personal autorizado puede gestionar reservas.' });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const url = new URL(`${apiBase}/users/api/bookings/`);
      if (q) url.searchParams.set('q', q);
      if (ordering) url.searchParams.set('ordering', ordering);
      url.searchParams.set('page', page.toString());
      url.searchParams.set('page_size', pageSize.toString());
      const res = await fetch(url, { headers: authHeaders(token) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'No se pudieron cargar reservas');
      setList(data.results || []);
      setTotal(Number(data.total || 0));
      setPage(Number(data.page || 1));
      setPageSize(Number(data.page_size || 10));
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    console.log('Bookings component loaded v2.1 - Fix total receipt');
    if (token && canManage) loadBookings(); 
  }, [token]);


  const createReceiptPdfBlob = async (b) => {
    const inDate = new Date(b.check_in_date);
    const outDate = new Date(b.check_out_date);
    const nightsRaw = Math.round((outDate - inDate) / (1000 * 60 * 60 * 24));
    const nights = isNaN(nightsRaw) ? 1 : Math.max(1, nightsRaw);
    const roomRatePerNight = Number(b.room_value || 0);
    const roomsCount = Number(b.rooms_count || 1);
    const subtotal = roomRatePerNight * roomsCount * nights;
    
    // Generate QR
    const qrUrlText = `${window.location.origin}/download/${b.code || b.id || ''}`;
    let qrSrc = null;
    try {
      qrSrc = await QRCode.toDataURL(qrUrlText, { width: 140, margin: 1 });
    } catch (e) {
      console.error('Error generating QR', e);
    }

    const receiptContent = document.createElement('div');
    receiptContent.style.cssText = `
      background-color: white;
      color: black;
      padding: 24px;
      font-family: Arial, sans-serif;
      width: 210mm;
      max-height: 296mm;
      overflow: hidden;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      line-height: 1.4;
      border-top: 8px solid #111111;
    `;
    const totalStay = subtotal;
    receiptContent.innerHTML = `
      <div style="height:100%;display:flex;flex-direction:column;max-width:80%;margin:0 auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${logoNegro}" alt="Agencia" style="height:48px;display:block;" />
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="text-align:right;font-size:18px;color:#111827;font-weight:700;">
              <div>Numero de reserva</div>
              <div style="font-weight:700;">${b.code || b.id || '-'}</div>
            </div>
            ${qrSrc ? `<img src="${qrSrc}" alt="QR" style="height:70px;width:70px;border:1px solid #e5e7eb;border-radius:6px;display:block;" />` : ``}
          </div>
        </div>
        <div style="margin-top:6px;color:#6b7280;font-size:12px;">Este es tu recibo</div>
        
        <div style="margin-top:18px;font-size:18px;font-weight:700;">Tus datos</div>
        <div style="margin-top:8px;">
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;">
            <div>Nombre</div><div style="font-weight:600;">${b.first_name || '-'}</div>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;">
            <div>Correo</div><div style="font-weight:600;">${b.email || '-'}</div>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;">
            <div>Fecha</div><div style="font-weight:600;">${new Date().toLocaleDateString('es-ES')}</div>
          </div>
        </div>
        
        <div style="margin-top:18px;font-size:18px;font-weight:700;">Datos de la Reserva</div>
        <div style="margin-top:8px;">
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;">
            <div>Nombre del alojamiento</div><div style="text-align:right;font-weight:600;">${b.hotel_name || '-'}</div>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;">
            <div>Direccion del alojamiento</div><div style="text-align:right;font-weight:600;">${b.address || '-'}</div>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;">
            <div>Numero de reserva</div><div style="font-weight:600;">${b.code || b.id || '-'}</div>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;">
            <div>Entrada</div><div style="font-weight:600;">${b.check_in_date || '-'}</div>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;">
            <div>Salida</div><div style="font-weight:600;">${b.check_out_date || '-'}</div>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;">
            <div>Total</div><div style="font-weight:700;">${currency(totalStay, b.currency_code || 'EUR')}</div>
          </div>
        </div>
        
        <div style="margin-top:18px;">Pago realizado con tarjeta de credito ****${String(b.card_last_digits || '244')}</div>
        <div style="margin-top:12px;">Gracias por tu compra</div>
        <div>Comprobante oficial de reserva emitida por el sistema.</div>
      </div>
    `;
    document.body.appendChild(receiptContent);
    const baseName = b.code ? `Comprobante_${b.code}` : `Comprobante_${b.id}`;
    let blob;
    await html2pdf()
      .set({
        margin: 0,
        filename: `${baseName}.pdf`,
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', letterRendering: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      })
      .from(receiptContent)
      .toPdf()
      .get('pdf')
      .then((pdf) => { blob = pdf.output('blob'); });
    document.body.removeChild(receiptContent);
    return { blob, filename: `${baseName}.pdf` };
  };

  const createBookingPdfBlob = async (b) => {
    const inDate = new Date(b.check_in_date);
    const outDate = new Date(b.check_out_date);
    const nightsRaw = Math.round((outDate - inDate) / (1000 * 60 * 60 * 24));
    const nights = isNaN(nightsRaw) ? '-' : Math.max(1, nightsRaw);
    const subtotal = Number(b.room_value || 0) * Number(b.rooms_count || 1);
    const resolveImageSrc = async (u) => {
      if (!u) return null;
      const abs = /^https?:/.test(u) ? u : `${apiBase}${u}`;
      try {
        const res = await fetch(abs, { headers: authHeaders(token) });
        if (!res.ok) return null;
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          console.warn('Image fetch returned HTML (likely 404 or proxy issue), ignoring:', abs);
          return null;
        }
        const blob = await res.blob();
        return await new Promise((done) => {
          const reader = new FileReader();
          reader.onloadend = () => done(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    };
    const img1 = await resolveImageSrc(b.first_image);
    const img2 = await resolveImageSrc(b.second_image);
    const total = typeof nights === 'number' ? subtotal * nights : subtotal;

    // Generate QR
    const qrUrlText = `${window.location.origin}/download/${b.code || b.id || ''}`;
    let qrSrc = null;
    try {
      qrSrc = await QRCode.toDataURL(qrUrlText, { width: 120, margin: 1 });
    } catch (e) {
      console.error('Error generating QR', e);
    }

    const el = document.createElement('div');
    el.style.cssText = 'background-color:white;color:black;padding:16px;font-family:Arial,sans-serif;width:210mm;max-height:296mm;overflow:hidden;box-sizing:border-box;display:flex;flex-direction:column;gap:8px;';
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;border-bottom:2px solid #111111;">
        <div style="display:flex;align-items:center;">
          <img src="${logoNegro}" alt="Agencia" style="height:80px;display:block;" />
        </div>
        <div style="display:flex;align-items:center;gap:12px;background:#ffffff;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;">
          <div style="text-align:right;">
            <p style="margin:0;color:#0f172a;font-size:16px;font-weight:700;">Comprobante reserva</p>
            <p style="margin:4px 0 0 0;color:#64748b;font-size:12px;">Código de confirmación</p>
            <p style="margin:2px 0 0 0;font-family:monospace;font-size:20px;font-weight:700;color:#111111;">${b.code || b.id}</p>
          </div>
          ${qrSrc ? `<img src="${qrSrc}" alt="QR" style="height:70px;width:70px;border:1px solid #e5e7eb;border-radius:6px;display:block;" />` : ``}
        </div>
      </div>
      <div>
        <p style="margin:0;color:#0f172a;font-size:14px;">Estimado/a <span style="font-weight:600;">${b.first_name || '-'}</span>, su reserva está confirmada.</p>
      </div>
      <div style="display:grid;grid-template-columns:300px 1fr;gap:16px;align-items:start;">
        <div style="background:#f8fafc;padding:12px;border-radius:6px;">
          <div style="position:relative;width:100%;height:150px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:8px;">
            ${img1 ? `<img src="${img1}" alt="Imagen 1" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;" />` : `<span style="color:#94a3b8;font-size:12px;">Sin imagen</span>`}
          </div>
        </div>
        <div style="background:#f8fafc;padding:12px;border-radius:6px;">
          <div style="margin-bottom:10px;color:#0f172a;font-size:26px;font-weight:900;letter-spacing:0.3px;">${b.hotel_name || '-'}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-family:'Calibri',sans-serif;">
            <div style="grid-column:1 / span 2;">
              <div style="color:black;font-size:12px;font-weight:700;">Dirección</div>
              <div style="color:#0f172a;font-size:12px;">${b.address || '-'}</div>
            </div>
            <div>
              <div style="color:black;font-size:12px;font-weight:700;">Check-in</div>
              <div style="color:#0f172a;font-size:12px;">${b.check_in_date || '-'}</div>
            </div>
            <div>
              <div style="color:black;font-size:12px;font-weight:700;">Check-out</div>
              <div style="color:#0f172a;font-size:12px;">${b.check_out_date || '-'}</div>
            </div>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 300px;gap:16px;align-items:start;">
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
          <div style="background:#111111;color:#ffffff;padding:10px;font-size:13px;font-weight:600;">Resumen de la Reserva</div>
          <div>
          <table style="width:100%;border-collapse:separate;border-spacing:0;">
            <tbody>
              <tr style="background:#f8fafc;">
                <td style="padding:10px;color:black;font-weight:bold;font-size:12px;width:35%;">Nombre del hotel</td>
                <td style="padding:10px;color:black;font-size:12px;">${b.hotel_name || '-'}</td>
              </tr>
              <tr>
                <td style="padding:10px;color:black;font-weight:bold;font-size:12px;width:35%;">Tipo de habitación</td>
                <td style="padding:10px;color:black;font-size:12px;">${roomTypeLabel(b.room_type)}</td>
              </tr>
              <tr style="background:#f8fafc;">
                <td style="padding:10px;color:black;font-weight:bold;font-size:12px;width:35%;">Ubicación</td>
                <td style="padding:10px;color:black;font-size:12px;">${b.location || '-'}</td>
              </tr>
              <tr>
                <td style="padding:10px;color:black;font-weight:bold;font-size:12px;width:35%;">Teléfono</td>
                <td style="padding:10px;color:black;font-size:12px;">${b.phone || '-'}</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
        <div style="background:#f8fafc;padding:12px;border-radius:6px;">
          <div style="position:relative;width:100%;height:200px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:8px;">
            ${img2 ? `<img src="${img2}" alt="Imagen 2" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;" />` : `<span style="color:#94a3b8;font-size:12px;">Sin imagen</span>`}
          </div>
        </div>
      </div>
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
        <div style="background:#111111;color:#ffffff;padding:8px;font-size:12px;font-weight:600;">Información del Pago</div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;">
          <tbody>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:12px;color:#0f172a;font-size:12px;font-weight:700;width:30%;">Habitación:</td>
              <td style="padding:12px;color:#0f172a;font-size:12px;text-align:center;">${b.rooms_count || 1}</td>
              <td style="padding:12px;color:#0f172a;font-size:12px;text-align:right;border-left:1px solid #e2e8f0;width:25%;">${currency(subtotal, b.currency_code || 'EUR')}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:12px;color:#0f172a;font-size:12px;font-weight:700;">Dias:</td>
              <td style="padding:12px;color:#0f172a;font-size:12px;text-align:center;">${typeof nights === 'number' ? nights : '-'}</td>
              <td style="padding:12px;color:#0f172a;font-size:12px;text-align:right;border-left:1px solid #e2e8f0;">${typeof nights === 'number' ? nights : '-'}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:12px;color:#0f172a;font-size:12px;font-weight:700;">Huéspedes:</td>
              <td style="padding:12px;color:#0f172a;font-size:12px;text-align:center;">${b.guests_count || 1}</td>
              <td style="padding:12px;color:#0f172a;font-size:12px;text-align:right;border-left:1px solid #e2e8f0;">-</td>
            </tr>
            <tr>
              <td style="padding:12px;color:#0f172a;font-size:12px;font-weight:700;">Total:</td>
              <td style="padding:12px;color:#0f172a;font-size:12px;text-align:center;"></td>
              <td style="padding:12px;color:#0f172a;font-size:14px;font-weight:700;text-align:right;border-left:1px solid #e2e8f0;">${currency(total, b.currency_code || 'EUR')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top:4px;background:#dbeafe;border:1px solid #e2e8f0;border-radius:8px;padding:10px;font-size:12px;color:#0f172a;line-height:1.6;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:start;">
          <div>
            <p style="margin:0;font-weight:700;">El precio final que se muestra ya ha sido pagado.</p>
            <p style="margin:0;">No se realizarán cargos adicionales.</p>
            <p style="margin:4px 0 0 0;"><span style="font-weight:700;">Total pagado:</span> <span style="font-weight:700;">${currency(total, b.currency_code || 'EUR')}</span></p>
          </div>
          <div>
            <p style="margin:0;">Este alojamiento acepta las siguientes formas de pago: American Express, Visa, Diners Club, Maestro</p>
          </div>
          <div style="grid-column:1 / span 2;">
            <p style="margin:8px 0 0 0;font-weight:600;">Información adicional</p>
            <p style="margin:2px 0 0 0;color:#334155;">Los suplementos adicionales (como cama supletoria) no están incluidos en el precio total. Si no te presentas o cancelas la reserva, es posible que el alojamiento te cargue los impuestos correspondientes. Recuerda leer la información importante que aparece a continuación, ya que puede contener datos relevantes que no se mencionan aquí.</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    const baseName = b.code ? `Reserva_${b.code}` : `Reserva_${b.id}`;
    let blob;
    await html2pdf()
      .set({ margin: 0, filename: `${baseName}.pdf`, html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } })
      .from(el)
      .toPdf()
      .get('pdf')
      .then((pdf) => { blob = pdf.output('blob'); });
    document.body.removeChild(el);
    return { blob, filename: `${baseName}.pdf` };
  };
  const downloadReceipt = async (b) => {
    try {
      const { blob, filename } = await createReceiptPdfBlob(b);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Error generando PDF:', e);
      setMsg({ type: 'error', text: 'Error generando el recibo. Por favor intenta de nuevo.' });
    }
  };

  const downloadBookingPdf = async (b) => {
    try {
      const { blob, filename } = await createBookingPdfBlob(b);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      setMsg({ type: 'error', text: 'Error generando la reserva en PDF. Intenta de nuevo.' });
    }
  };

  const performDelete = async (id) => {
    setMsg(null);
    try {
      const res = await fetch(`${apiBase}/users/api/bookings/${id}/`, { method: 'DELETE', headers: authHeaders(token) });
      let data = null;
      try { data = await res.json(); } catch {}
      if (!res.ok) throw new Error((data && (data.detail || data.message)) || 'No se pudo eliminar');
      const msgText = (data && (data.message || data.detail)) || 'Reserva eliminada';
      setMsg({ type: 'success', text: msgText });
      loadBookings();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / (pageSize || 1))), [total, pageSize]);

  const calcNights = (b) => {
    if (!b?.check_in_date || !b?.check_out_date) return 1;
    const inD = new Date(b.check_in_date);
    const outD = new Date(b.check_out_date);
    const diff = Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24));
    return isNaN(diff) ? 1 : Math.max(1, diff);
  };

  const calcTotal = (b) => {
    const nights = calcNights(b);
    const rate = Number(b?.room_value || 0);
    const rooms = Number(b?.rooms_count || 1);
    return rate * rooms * nights;
  };

  const filteredList = useMemo(() => {
    if (roomFilter === 'all') return list;
    return list.filter((b) => normalizeRoomType(b.room_type) === roomFilter);
  }, [list, roomFilter]);

  const pageSummary = useMemo(() => {
    let totalNights = 0;
    let totalGuests = 0;
    let totalRooms = 0;
    const hotelsSet = new Set();
    filteredList.forEach((b) => {
      totalNights += calcNights(b);
      totalGuests += Number(b.guests_count || 0) + Number(b.children_count || 0);
      totalRooms += Number(b.rooms_count || 1);
      if (b.hotel_name) hotelsSet.add(b.hotel_name.trim().toLowerCase());
    });
    return { totalNights, totalGuests, totalRooms, totalHotels: hotelsSet.size };
  }, [filteredList]);

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const handleSeedDemoBookings = async () => {
    setSeedingDemo(true);
    setMsg(null);
    const samples = [
      {
        first_name: 'Carlos Mendoza',
        email: 'carlos.mendoza@ejemplo.com',
        phone: '+34612345678',
        address: 'Gran Vía 42, Madrid',
        hotel_name: 'Grand Hotel Velázquez Palace',
        location: 'Madrid, España',
        room_type: 'suite',
        check_in_date: '2026-11-12',
        check_out_date: '2026-11-16',
        currency_code: 'EUR',
        room_value: '240.00',
        rooms_count: '1',
        guests_count: '2',
        children_count: '0',
        pets_count: '0',
        notes: 'Traslado ejecutivo desde el aeropuerto incluido. Habitación piso alto.',
      },
      {
        first_name: 'Valentina Restrepo',
        email: 'valentina.restrepo@ejemplo.com',
        phone: '+573004567890',
        address: 'Av. Kukulcan Km 12, Zona Hotelera',
        hotel_name: 'Resort Turquesa Cancún All-Inclusive',
        location: 'Cancún, México',
        room_type: 'double',
        check_in_date: '2026-11-20',
        check_out_date: '2026-11-25',
        currency_code: 'USD',
        room_value: '185.00',
        rooms_count: '2',
        guests_count: '4',
        children_count: '1',
        pets_count: '0',
        notes: 'Paquete familiar todo incluido con vista al mar.',
      },
      {
        first_name: 'Alejandro Silva',
        email: 'alejandro.silva@ejemplo.com',
        phone: '+33142685500',
        address: '18 Rue de Rivoli, París',
        hotel_name: 'Hôtel Lumière Louvre Boutique',
        location: 'París, Francia',
        room_type: 'single',
        check_in_date: '2026-12-02',
        check_out_date: '2026-12-05',
        currency_code: 'EUR',
        room_value: '160.00',
        rooms_count: '1',
        guests_count: '1',
        children_count: '0',
        pets_count: '0',
        notes: 'Viaje de negocios. Check-in temprano solicitado.',
      },
    ];

    try {
      for (const item of samples) {
        const fd = new FormData();
        Object.entries(item).forEach(([k, v]) => fd.append(k, v));
        await fetch(`${apiBase}/users/api/bookings/`, {
          method: 'POST',
          headers: authHeaders(token),
          body: fd,
        });
      }
      setMsg({ type: 'success', text: 'Se cargaron 3 reservas de demostración correctamente.' });
      await loadBookings();
    } catch (e) {
      setMsg({ type: 'error', text: 'No se pudieron generar las reservas de ejemplo.' });
    } finally {
      setSeedingDemo(false);
    }
  };

  const handleSendEmail = async (b) => {
    try {
      setIsSendingEmail(true);
      const { blob: receiptBlob, filename: receiptName } = await createReceiptPdfBlob(b);
      const { blob: bookingBlob, filename: bookingName } = await createBookingPdfBlob(b);
      const fd = new FormData();
      fd.append('receipt_pdf', receiptBlob, receiptName);
      fd.append('reservation_pdf', bookingBlob, bookingName);
      const res = await fetch(`${apiBase}/users/api/bookings/${b.id}/send-receipt/`, {
        method: 'POST',
        headers: authHeaders(token),
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al enviar el correo');
      setShowSuccessEmail(b);
      setMsg(null);
    } catch (e) {
      setShowErrorEmail(e.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'PS';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  };

  const roomBadgeStyle = (rt) => {
    const norm = normalizeRoomType(rt);
    if (norm === 'suite') return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
    if (norm === 'double') return 'bg-sky-500/15 text-sky-500 border-sky-500/30';
    if (norm === 'triple') return 'bg-purple-500/15 text-purple-500 border-purple-500/30';
    return 'bg-teal-500/15 text-teal-500 border-teal-500/30';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transitionEnd: { transform: 'none' } }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6"
    >
      {/* Notification Banner */}
      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-4 rounded-2xl text-sm font-semibold flex items-center justify-between border ${
              msg.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span>{msg.type === 'success' ? '✓' : '⚠'}</span>
              <span>{msg.text}</span>
            </div>
            <button onClick={() => setMsg(null)} className="text-xs opacity-70 hover:opacity-100">
              Cerrar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Operational KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-theme-textMuted block">
              Total Expedientes
            </span>
            <span className="text-2xl font-black text-theme-text mt-1 block">{total}</span>
            <span className="text-[11px] text-teal-500 font-semibold">Reservas registradas</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-teal-500/15 border border-teal-500/25 text-teal-500 flex items-center justify-center">
            <svg className="w-5 h-5 transform rotate-45" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
          </div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-theme-textMuted block">
              Noches en Vista
            </span>
            <span className="text-2xl font-black text-theme-text mt-1 block">{pageSummary.totalNights}</span>
            <span className="text-[11px] text-sky-500 font-semibold">Estancias acumuladas</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-500/25 text-sky-500 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-theme-textMuted block">
              Pasajeros / Huéspedes
            </span>
            <span className="text-2xl font-black text-theme-text mt-1 block">{pageSummary.totalGuests}</span>
            <span className="text-[11px] text-emerald-500 font-semibold">En página actual</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-500 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-theme-textMuted block">
              Hoteles & Destinos
            </span>
            <span className="text-2xl font-black text-theme-text mt-1 block">
              {pageSummary.totalHotels}
            </span>
            <span className="text-[11px] text-amber-500 font-semibold">
              {pageSummary.totalRooms} {pageSummary.totalRooms === 1 ? 'habitación' : 'habitaciones'} activas
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-500 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Professional Table Card */}
      <div className="bg-theme-surface border border-theme-border rounded-3xl shadow-sm overflow-hidden">
        {/* Control & Filter Header */}
        <div className="p-5 sm:p-6 border-b border-theme-border space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-teal-500">
                  MANIFIESTO DE PASAJEROS Y ALOJAMIENTOS
                </span>
              </div>
              <h3 className="text-xl font-black text-theme-text mt-0.5">
                Registro Central de Vuelos y Reservas
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => loadBookings()}
                disabled={loading}
                className="px-3.5 py-2.5 rounded-xl border border-theme-border bg-theme-background hover:border-teal-500/50 text-theme-text text-xs font-bold flex items-center gap-1.5 transition"
                title="Actualizar tabla"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin text-teal-500' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Actualizar</span>
              </button>

              {canCreate && (
                <button
                  onClick={() => setView('booking-create')}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 via-emerald-500 to-sky-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-teal-500/25 hover:opacity-95 transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Emitir Nueva Reserva</span>
                </button>
              )}
            </div>
          </div>

          {/* Search, Sort & Quick Room Filter Pills */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-2">
            {/* Quick Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'Todas las Categorías' },
                { id: 'suite', label: 'Suite' },
                { id: 'double', label: 'Doble' },
                { id: 'triple', label: 'Triple' },
                { id: 'single', label: 'Individual' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setRoomFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    roomFilter === tab.id
                      ? 'bg-teal-500 text-white shadow-sm shadow-teal-500/30'
                      : 'bg-theme-background text-theme-textSecondary hover:text-theme-text border border-theme-border'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input & Ordering */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textMuted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setPage(1);
                      loadBookings();
                    }
                  }}
                  className="w-full pl-10 pr-8 py-2 rounded-xl bg-theme-background text-theme-text border border-theme-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  placeholder="Buscar pasajero, código, hotel..."
                />
                {q && (
                  <button
                    onClick={() => {
                      setQ('');
                      setPage(1);
                      setTimeout(() => loadBookings(), 0);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-textMuted hover:text-theme-text text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={ordering}
                  onChange={(e) => setOrdering(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-theme-background text-theme-text border border-theme-border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                >
                  <option value="-created_at">Más recientes primero</option>
                  <option value="check_in_date">Próximo Check-in</option>
                  <option value="first_name">Pasajero (A-Z)</option>
                  <option value="hotel_name">Hotel (A-Z)</option>
                </select>
                <button
                  onClick={() => {
                    setPage(1);
                    loadBookings();
                  }}
                  className="px-4 py-2 rounded-xl bg-teal-500/15 text-teal-500 border border-teal-500/30 hover:bg-teal-500 hover:text-white text-xs sm:text-sm font-bold transition"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* LOADING SKELETON */}
        {loading && (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-16 rounded-2xl bg-theme-background animate-pulse border border-theme-border"
              />
            ))}
          </div>
        )}

        {/* PROFESSIONAL DESKTOP TABLE - ZERO HORIZONTAL SCROLL */}
        {!loading && filteredList.length > 0 && (
          <div className="hidden lg:block w-full">
            <table className="w-full table-fixed text-sm text-theme-text">
              <thead>
                <tr className="bg-theme-background text-theme-textSecondary font-extrabold uppercase tracking-wider text-[11px] border-b border-theme-border">
                  <th className="w-[15%] px-4 py-3.5 text-left">Localizador</th>
                  <th className="w-[24%] px-4 py-3.5 text-left">Pasajero Titular</th>
                  <th className="w-[26%] px-4 py-3.5 text-left">Alojamiento & Destino</th>
                  <th className="w-[17%] px-4 py-3.5 text-left">Check-in / Check-out</th>
                  <th className="w-[18%] px-4 py-3.5 text-center">Operaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {filteredList.map((b, i) => {
                  const nights = calcNights(b);
                  return (
                    <motion.tr
                      key={b.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-teal-500/[0.06] transition-colors group"
                    >
                      {/* Localizador */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleCopyCode(b.code)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-mono text-xs font-black bg-teal-500/15 text-teal-500 border border-teal-500/30 hover:bg-teal-500 hover:text-white transition"
                            title="Clic para copiar código de reserva"
                          >
                            <span>✈ {b.code || `#${b.id}`}</span>
                          </button>
                          {copiedCode === b.code && (
                            <span className="text-[10px] font-bold text-emerald-500">¡Copiado!</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-[11px] text-emerald-500 font-semibold truncate">Confirmada</span>
                        </div>
                      </td>

                      {/* Pasajero Titular */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-sky-600 text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0">
                            {getInitials(b.first_name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-extrabold text-theme-text truncate" title={b.first_name}>
                              {b.first_name}
                            </div>
                            <div className="text-xs text-theme-textSecondary truncate" title={b.email}>
                              {b.email}
                            </div>
                            {b.phone && (
                              <div className="text-[11px] text-theme-textMuted truncate">{b.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Alojamiento & Destino */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="font-bold text-theme-text truncate" title={b.hotel_name}>
                          {b.hotel_name || 'Alojamiento Asignado'}
                        </div>
                        <div className="text-xs text-theme-textSecondary flex items-center gap-1 mt-0.5 min-w-0">
                          <svg className="w-3.5 h-3.5 text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate" title={b.location || b.address}>
                            {b.location || b.address || '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${roomBadgeStyle(b.room_type)}`}>
                            {roomTypeLabel(b.room_type)}
                          </span>
                          <span className="text-[11px] text-theme-textMuted font-medium">
                            {b.rooms_count || 1} hab. • {b.guests_count || 1} huésp.
                          </span>
                        </div>
                      </td>

                      {/* Itinerario */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="inline-flex flex-col px-2.5 py-1.5 rounded-xl bg-theme-background border border-theme-border text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-theme-text">
                            <span className="text-[10px] uppercase text-teal-500 font-extrabold">IN</span>
                            <span>{b.check_in_date || '-'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-bold text-theme-text mt-0.5">
                            <span className="text-[10px] uppercase text-sky-500 font-extrabold">OUT</span>
                            <span>{b.check_out_date || '-'}</span>
                          </div>
                        </div>
                        <div className="text-[11px] text-theme-textSecondary font-semibold mt-1 pl-0.5">
                          {nights} {nights === 1 ? 'noche' : 'noches'} de estancia
                        </div>
                      </td>

                      {/* Operaciones */}
                      <td className="px-3 py-3.5 align-middle">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="p-2 rounded-xl bg-theme-background hover:bg-teal-500/15 text-theme-textSecondary hover:text-teal-500 border border-theme-border transition"
                            title="Ver Boarding Pass / Detalle"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {canEdit && (
                            <button
                              onClick={() => onEdit && onEdit(b)}
                              className="p-2 rounded-xl bg-theme-background hover:bg-sky-500/15 text-theme-textSecondary hover:text-sky-500 border border-theme-border transition"
                              title="Editar reserva"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}

                          <button
                            onClick={() => downloadBookingPdf(b)}
                            className="p-2 rounded-xl bg-teal-500/15 hover:bg-teal-500 text-teal-500 hover:text-white border border-teal-500/30 transition"
                            title="Descargar Voucher de Reserva PDF"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>

                          <button
                            onClick={() => downloadReceipt(b)}
                            className="p-2 rounded-xl bg-sky-500/15 hover:bg-sky-500 text-sky-500 hover:text-white border border-sky-500/30 transition"
                            title="Descargar Recibo PDF"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>

                          <button
                            onClick={() => setConfirmSendEmail(b)}
                            className="p-2 rounded-xl bg-purple-500/15 hover:bg-purple-500 text-purple-500 hover:text-white border border-purple-500/30 transition"
                            title="Enviar PDFs por Correo"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </button>

                          {canDelete && (
                            <button
                              onClick={() => setConfirmDelete(b)}
                              className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 transition"
                              title="Eliminar reserva"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* MOBILE & TABLET CARDS */}
        {!loading && filteredList.length > 0 && (
          <div className="lg:hidden p-4 space-y-4">
            {filteredList.map((b) => {
              const nights = calcNights(b);
              return (
                <div
                  key={b.id}
                  className="bg-theme-background border border-theme-border rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-sky-600 text-white font-black text-xs flex items-center justify-center">
                        {getInitials(b.first_name)}
                      </div>
                      <div>
                        <div className="font-extrabold text-theme-text">{b.first_name}</div>
                        <div className="text-xs font-mono text-teal-500 font-bold">✈ {b.code || `#${b.id}`}</div>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${roomBadgeStyle(b.room_type)}`}>
                      {roomTypeLabel(b.room_type)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-theme-surface p-3 rounded-xl border border-theme-border">
                    <div>
                      <span className="text-theme-textMuted block text-[10px] uppercase font-bold">Hotel</span>
                      <span className="font-bold text-theme-text truncate block">{b.hotel_name}</span>
                    </div>
                    <div>
                      <span className="text-theme-textMuted block text-[10px] uppercase font-bold">Estancia</span>
                      <span className="font-black text-teal-500">{nights} {nights === 1 ? 'noche' : 'noches'} • {b.guests_count || 1} huésp.</span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-theme-border flex justify-between text-theme-textSecondary">
                      <span>Check-in: <strong className="text-theme-text">{b.check_in_date}</strong></span>
                      <span>Check-out: <strong className="text-theme-text">{b.check_out_date}</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button onClick={() => setSelectedBooking(b)} className="flex-1 py-2 px-3 rounded-xl bg-theme-surface border border-theme-border text-xs font-bold text-theme-text">
                      Detalle
                    </button>
                    {canEdit && (
                      <button onClick={() => onEdit && onEdit(b)} className="flex-1 py-2 px-3 rounded-xl bg-theme-surface border border-theme-border text-xs font-bold text-theme-text">
                        Editar
                      </button>
                    )}
                    <button onClick={() => downloadBookingPdf(b)} className="flex-1 py-2 px-3 rounded-xl bg-teal-500/15 text-teal-500 text-xs font-bold">
                      Voucher
                    </button>
                    <button onClick={() => downloadReceipt(b)} className="flex-1 py-2 px-3 rounded-xl bg-sky-500/15 text-sky-500 text-xs font-bold">
                      Recibo
                    </button>
                    <button onClick={() => setConfirmSendEmail(b)} className="py-2 px-3 rounded-xl bg-purple-500/15 text-purple-500 text-xs font-bold">
                      Email
                    </button>
                    {canDelete && (
                      <button onClick={() => setConfirmDelete(b)} className="py-2 px-3 rounded-xl bg-rose-500/15 text-rose-500 text-xs font-bold">
                        Borrar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* RICH PROFESSIONAL EMPTY STATE */}
        {!loading && filteredList.length === 0 && (
          <div className="p-8 sm:p-14 text-center relative overflow-hidden">
            {/* Subtle Radar Rings in Empty State */}
            <div className="max-w-xl mx-auto relative z-10 space-y-6">
              <div className="relative mx-auto w-28 h-28 rounded-3xl bg-gradient-to-br from-teal-500/15 via-sky-500/10 to-emerald-500/15 border border-teal-500/30 flex items-center justify-center shadow-inner">
                <motion.svg
                  animate={{ y: [0, -6, 0], rotate: [-8, 0, -8] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-14 h-14 text-teal-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </motion.svg>
                <span className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-500 text-white shadow">
                  Pista Libre
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="text-xl sm:text-2xl font-black text-theme-text">
                  {q || roomFilter !== 'all'
                    ? 'No se encontraron reservas con ese filtro'
                    : 'Aún no hay vuelos ni reservas registradas'}
                </h4>
                <p className="text-sm text-theme-textSecondary max-w-md mx-auto leading-relaxed">
                  {q || roomFilter !== 'all'
                    ? 'Prueba limpiando los criterios de búsqueda o cambiando la categoría de habitación seleccionada.'
                    : 'Comienza registrando tu primera reserva de alojamiento o genera reservas de ejemplo con un clic para explorar los vouchers PDF y códigos QR.'}
                </p>
              </div>

              {/* Onboarding Feature Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                <div className="p-3.5 rounded-2xl bg-theme-background/60 border border-theme-border">
                  <div className="text-xs font-extrabold text-teal-500 mb-0.5">1. Localizador & QR</div>
                  <div className="text-[11px] text-theme-textSecondary">
                    Código único automático para cada pasajero.
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-theme-background/60 border border-theme-border">
                  <div className="text-xs font-extrabold text-sky-500 mb-0.5">2. Voucher + Recibo</div>
                  <div className="text-[11px] text-theme-textSecondary">
                    Descarga instantánea en formato PDF A4.
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-theme-background/60 border border-theme-border">
                  <div className="text-xs font-extrabold text-emerald-500 mb-0.5">3. Despacho por Email</div>
                  <div className="text-[11px] text-theme-textSecondary">
                    Envío directo de documentos al huésped.
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {q || roomFilter !== 'all' ? (
                  <button
                    onClick={() => {
                      setQ('');
                      setRoomFilter('all');
                      loadBookings();
                    }}
                    className="px-5 py-3 rounded-2xl border border-theme-border bg-theme-background text-theme-text text-xs sm:text-sm font-bold"
                  >
                    Limpiar filtros activos
                  </button>
                ) : (
                  <>
                    {canCreate && (
                      <button
                        onClick={() => setView('booking-create')}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-sky-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-teal-500/25 hover:opacity-95 transition flex items-center gap-2"
                      >
                        <span>+ Registrar Primera Reserva</span>
                      </button>
                    )}
                    {canCreate && (
                      <button
                        onClick={handleSeedDemoBookings}
                        disabled={seedingDemo}
                        className="px-5 py-3 rounded-2xl border border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 text-teal-500 font-bold text-xs sm:text-sm transition flex items-center gap-2 disabled:opacity-50"
                      >
                        <span>{seedingDemo ? 'Generando ejemplos...' : '⚡ Cargar 3 Reservas de Ejemplo'}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Pagination Bar */}
        <div className="px-6 py-4 bg-theme-background/40 border-t border-theme-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm">
          <div className="text-theme-textSecondary font-semibold">
            Mostrando <span className="font-black text-theme-text">{filteredList.length}</span> de{' '}
            <span className="font-black text-theme-text">{total}</span> reservas totales
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => {
                setPage(Math.max(1, page - 1));
                loadBookings();
              }}
              className="px-4 py-2 rounded-xl border border-theme-border bg-theme-surface hover:bg-theme-background disabled:opacity-40 transition font-bold"
            >
              ← Anterior
            </button>
            <span className="px-4 py-2 rounded-xl bg-teal-500/10 border border-teal-500/25 text-teal-500 font-black">
              Página {page} de {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => {
                setPage(Math.min(totalPages, page + 1));
                loadBookings();
              }}
              className="px-4 py-2 rounded-xl border border-theme-border bg-theme-surface hover:bg-theme-background disabled:opacity-40 transition font-bold"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>

      {createPortal(
        <>
          {/* BOARDING-PASS QUICK DETAIL MODAL */}
          <AnimatePresence>
            {selectedBooking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-y-auto"
                onClick={() => setSelectedBooking(null)}
              >
                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-xl my-auto bg-theme-surface border border-theme-border rounded-3xl overflow-hidden shadow-2xl"
                >
                  <div className="bg-gradient-to-r from-[#071929] via-[#0c2d3e] to-[#0d9488] p-6 text-white flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-teal-200 block">
                        TARJETA DE RESERVA Y ALOJAMIENTO
                      </span>
                      <h4 className="text-2xl font-black tracking-tight mt-0.5">
                        ✈ Código: {selectedBooking.code || `#${selectedBooking.id}`}
                      </h4>
                    </div>
                    <button
                      onClick={() => setSelectedBooking(null)}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-6 space-y-5 text-sm">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-theme-background/60 border border-theme-border">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-theme-textMuted block">Pasajero</span>
                        <span className="font-extrabold text-theme-text">{selectedBooking.first_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-theme-textMuted block">Correo</span>
                        <span className="font-semibold text-theme-textSecondary truncate block">{selectedBooking.email}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-theme-textMuted block">Teléfono</span>
                        <span className="font-semibold text-theme-textSecondary">{selectedBooking.phone || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-theme-textMuted block">Alojamiento</span>
                        <span className="font-extrabold text-theme-text">{selectedBooking.hotel_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-theme-textMuted block">Ubicación</span>
                        <span className="font-semibold text-theme-textSecondary">{selectedBooking.location || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-theme-textMuted block">Habitación</span>
                        <span className="font-extrabold text-teal-500 uppercase">{roomTypeLabel(selectedBooking.room_type)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-theme-textMuted block">Check-in</span>
                        <span className="font-bold text-theme-text">{selectedBooking.check_in_date}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-theme-textMuted block">Check-out</span>
                        <span className="font-bold text-theme-text">{selectedBooking.check_out_date}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-theme-textMuted block">Importe Total</span>
                        <span className="font-black text-emerald-500">
                          {currency(calcTotal(selectedBooking), selectedBooking.currency_code || 'EUR')}
                        </span>
                      </div>
                    </div>

                    {selectedBooking.notes && (
                      <div className="p-3.5 rounded-2xl bg-theme-background/40 border border-theme-border text-xs text-theme-textSecondary">
                        <strong className="text-theme-text block mb-1">Notas operativas:</strong>
                        {selectedBooking.notes}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-theme-border">
                      {canEdit && (
                        <button
                          onClick={() => {
                            const b = selectedBooking;
                            setSelectedBooking(null);
                            onEdit && onEdit(b);
                          }}
                          className="px-4 py-2 rounded-xl border border-theme-border text-theme-text text-xs font-bold"
                        >
                          Editar Reserva
                        </button>
                      )}
                      <button
                        onClick={() => downloadBookingPdf(selectedBooking)}
                        className="px-4 py-2 rounded-xl bg-teal-500 text-white text-xs font-bold"
                      >
                        Descargar Voucher PDF
                      </button>
                      <button
                        onClick={() => downloadReceipt(selectedBooking)}
                        className="px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold"
                      >
                        Descargar Recibo PDF
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {confirmDelete && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-y-auto" role="dialog" aria-modal="true"
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="w-full max-w-md my-auto bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-2xl"
                >
                  <div className="bg-gradient-to-r from-red-600 to-pink-600 p-6">
                    <div className="flex items-center gap-3 text-white">
                      <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M9.402 2.01a2 2 0 00-1.732 1l-5.196 9a2 2 0 000 2l5.196 9a2 2 0 001.732 1h9.196a2 2 0 001.732-1l-5.196-9a2 2 0 000-2l-5.196-9a2 2 0 00-1.732-1H9.402z"/></svg>
                      </div>
                      <div className="font-bold text-lg">Confirmar eliminación</div>
                    </div>
                  </div>
                  <div className="p-6 text-theme-text space-y-4">
                    <p>¿Estás seguro de eliminar esta reserva? Esta acción no se puede deshacer.</p>
                    <div className="text-sm bg-theme-background/30 border border-theme-border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between"><span className="text-theme-textSecondary">Nombre:</span> <span className="font-medium">{confirmDelete.first_name}</span></div>
                      <div className="flex justify-between"><span className="text-theme-textSecondary">Hotel:</span> <span className="font-medium">{confirmDelete.hotel_name}</span></div>
                      <div className="flex justify-between"><span className="text-theme-textSecondary">Código:</span> <span className="font-mono">{confirmDelete.code || '-'}</span></div>
                    </div>
                  </div>
                  <div className="p-6 flex items-center justify-end gap-3 border-t border-theme-border bg-theme-background/20">
                    <button className="px-4 py-2 rounded-lg bg-theme-background/50 hover:bg-theme-background/70 text-theme-text transition-colors" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                    <button className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 transition-colors" onClick={async () => { const id = confirmDelete.id; setConfirmDelete(null); await performDelete(id); }}>Eliminar</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {confirmSendEmail && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-y-auto" role="dialog" aria-modal="true"
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="w-full max-w-md my-auto bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-2xl"
                >
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
                    <div className="flex items-center gap-3 text-white">
                      <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
                      </div>
                      <div className="font-bold text-lg">¿Enviar reserva?</div>
                    </div>
                  </div>
                  <div className="p-6 text-theme-text space-y-4">
                    <p>Se enviará el comprobante y el recibo de la reserva al correo electrónico del cliente.</p>
                    <div className="text-sm bg-theme-background/30 border border-theme-border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between"><span className="text-theme-textSecondary">Cliente:</span> <span className="font-medium">{confirmSendEmail.first_name}</span></div>
                      <div className="flex justify-between"><span className="text-theme-textSecondary">Email:</span> <span className="font-medium">{confirmSendEmail.email}</span></div>
                      <div className="flex justify-between"><span className="text-theme-textSecondary">Código:</span> <span className="font-mono">{confirmSendEmail.code || '-'}</span></div>
                    </div>
                  </div>
                  <div className="p-6 flex items-center justify-end gap-3 border-t border-theme-border bg-theme-background/20">
                    <button className="px-4 py-2 rounded-lg bg-theme-background/50 hover:bg-theme-background/70 text-theme-text transition-colors" onClick={() => setConfirmSendEmail(null)}>Cancelar</button>
                    <button className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20 transition-colors flex items-center gap-2" disabled={isSendingEmail} onClick={async () => { const b = confirmSendEmail; await handleSendEmail(b); setConfirmSendEmail(null); }}>
                      {isSendingEmail ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <span>Confirmar envío</span>
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showErrorEmail && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-y-auto" role="dialog" aria-modal="true"
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="w-full max-w-md my-auto bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-2xl"
                >
                  <div className="bg-gradient-to-r from-red-600 to-rose-600 p-6">
                    <div className="flex items-center gap-3 text-white">
                      <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                      </div>
                      <div className="font-bold text-lg">Error al enviar</div>
                    </div>
                  </div>
                  <div className="p-6 text-theme-text space-y-4 text-center">
                    <p>Ocurrió un problema al intentar enviar el correo.</p>
                    <div className="text-sm bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg p-3">
                      {showErrorEmail}
                    </div>
                  </div>
                  <div className="p-6 flex items-center justify-center border-t border-theme-border bg-theme-background/20">
                    <button className="px-8 py-2 rounded-lg bg-theme-background/50 hover:bg-theme-background/70 text-theme-text transition-colors" onClick={() => setShowErrorEmail(null)}>Cerrar</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showSuccessEmail && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-y-auto" role="dialog" aria-modal="true"
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="w-full max-w-md my-auto bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-2xl"
                >
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
                    <div className="flex items-center gap-3 text-white">
                      <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div className="font-bold text-lg">¡Correo enviado!</div>
                    </div>
                  </div>
                  <div className="p-6 text-theme-text space-y-4 text-center">
                    <p>El correo ha sido enviado correctamente a <span className="font-bold text-theme-text">{showSuccessEmail.email}</span>.</p>
                    <p className="text-sm text-theme-textSecondary">El cliente recibirá su reserva y recibo en breve.</p>
                  </div>
                  <div className="p-6 flex items-center justify-center border-t border-theme-border bg-theme-background/20">
                    <button className="px-8 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 transition-colors" onClick={() => setShowSuccessEmail(null)}>Entendido</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </motion.div>
  );
};

export default Bookings;
