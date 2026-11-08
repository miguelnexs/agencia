import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: number;
  text: string;
  direction: 'inbound' | 'outbound';
  sender_name?: string;
  is_auto_reply?: boolean;
  meta_sent?: boolean;
  meta_detail?: string;
  created_at: string;
}

interface Conversation {
  phone: string;
  name: string;
  last_message: string;
  last_time: string;
  direction: 'inbound' | 'outbound';
}

interface WhatsAppIntegrationProps {
  token: string;
  apiBase: string;
}

const QUICK_TEMPLATES = [
  { label: '📄 Solicitar Voucher', text: 'Quiero mi voucher de reserva por favor.' },
  { label: '👋 Saludo Inicial', text: '¡Hola! Te damos la bienvenida a AeroAgencia ✈️. ¿En qué podemos ayudarte el día de hoy?' },
  { label: '🎫 Consulta de Reserva', text: 'Por favor facilítanos el código de tu reserva (ejemplo: AEROA1) para brindarte los detalles de inmediato.' },
  { label: '📄 Solicitud de Documentos', text: 'Para completar el registro de tu viaje, requerimos una foto legible de tu cédula o pasaporte.' },
  { label: '👨‍💼 Atención Asesor', text: 'Un asesor comercial especializado está revisando tu caso y te responderá en unos minutos.' },
  { label: '💳 Confirmación Pago', text: 'Hemos verificado el pago de tu reserva. En breve recibirás tu voucher y confirmación.' },
];

export const WhatsAppIntegration: React.FC<WhatsAppIntegrationProps> = ({ token, apiBase }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'config' | 'test'>('chat');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modal Nuevo Chat
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('+57');
  const [newChatName, setNewChatName] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [newChatSending, setNewChatSending] = useState(false);

  // Form Config
  const [config, setConfig] = useState({
    phone_number_id: '',
    whatsapp_business_account_id: '',
    access_token: '',
    webhook_verify_token: 'aeroagencia_token_seguro',
    auto_reply_enabled: true,
    gemini_api_key: '',
    ai_agent_enabled: true,
    ai_model: 'gemini-3.5-flash-lite',
    welcome_message: '',
    menu_message: '',
  });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Simulator Test
  const [simPhone, setSimPhone] = useState('573245362112');
  const [simName, setSimName] = useState('Cliente Agencia');
  const [simText, setSimText] = useState('AEROA1');
  const [simLoading, setSimLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Cargar lista de conversaciones
  const loadConversations = async () => {
    try {
      const res = await fetch(`${apiBase}/users/api/whatsapp/conversations/`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (data.length > 0 && !selectedPhone) {
          setSelectedPhone(data[0].phone);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Cargar mensajes de conversación
  const loadMessages = async (phone: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/users/api/whatsapp/messages/${phone}/`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Cargar configuración
  const loadConfig = async () => {
    try {
      const res = await fetch(`${apiBase}/users/api/whatsapp/config/`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadConversations();
    loadConfig();
    const interval = setInterval(() => {
      loadConversations();
      if (selectedPhone) {
        fetch(`${apiBase}/users/api/whatsapp/messages/${selectedPhone}/`, { headers: authHeaders })
          .then((r) => r.json())
          .then((data) => setMessages(data))
          .catch(() => {});
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [token, selectedPhone]);

  useEffect(() => {
    if (selectedPhone) {
      loadMessages(selectedPhone);
    }
  }, [selectedPhone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Enviar mensaje manual en el chat actual
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || messageInput;
    if (!textToSend.trim() || !selectedPhone || sending) return;

    setSending(true);
    setStatusNotice(null);

    try {
      const res = await fetch(`${apiBase}/users/api/whatsapp/messages/${selectedPhone}/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ message: textToSend }),
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
        if (!customText) setMessageInput('');
        loadConversations();
        if (newMsg.meta_sent) {
          setStatusNotice({ type: 'success', text: '✅ Mensaje entregado a WhatsApp con éxito.' });
        } else if (newMsg.meta_detail) {
          setStatusNotice({ type: 'info', text: `ℹ️ Guardado en el chat. Nota de Meta: ${newMsg.meta_detail}` });
        }
      } else {
        setStatusNotice({ type: 'error', text: '❌ No se pudo enviar el mensaje.' });
      }
    } catch (e) {
      console.error(e);
      setStatusNotice({ type: 'error', text: '❌ Error de conexión al enviar mensaje.' });
    } finally {
      setSending(false);
      setTimeout(() => setStatusNotice(null), 5000);
    }
  };

  // Iniciar nuevo chat con cualquier número
  const handleStartNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = newChatPhone.replace(/\D/g, '');
    if (!cleanPhone || !newChatMessage.trim() || newChatSending) return;

    setNewChatSending(true);
    try {
      const res = await fetch(`${apiBase}/users/api/whatsapp/messages/${cleanPhone}/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          message: newChatMessage.trim(),
          sender_name: newChatName.trim() || cleanPhone,
        }),
      });

      if (res.ok) {
        const newMsg = await res.json();
        await loadConversations();
        setSelectedPhone(cleanPhone);
        setMessages([newMsg]);
        setShowNewChatModal(false);
        setNewChatPhone('+57');
        setNewChatName('');
        setNewChatMessage('');
        setStatusNotice({ type: 'success', text: `✅ Conversación iniciada con +${cleanPhone}` });
      } else {
        setStatusNotice({ type: 'error', text: '❌ Error al crear la conversación' });
      }
    } catch (err) {
      console.error(err);
      setStatusNotice({ type: 'error', text: '❌ Error de red al iniciar nuevo chat' });
    } finally {
      setNewChatSending(false);
      setTimeout(() => setStatusNotice(null), 5000);
    }
  };

  // Enviar Voucher PDF manual desde el panel
  const [sendingVoucher, setSendingVoucher] = useState(false);
  const handleSendVoucher = async () => {
    if (!selectedPhone || sendingVoucher) return;
    const code = prompt('Ingresa el código de reserva para generar y enviar el Voucher PDF (ejemplo: AEROA1):', 'AEROA1');
    if (!code) return;

    setSendingVoucher(true);
    setStatusNotice({ type: 'info', text: `⏳ Generando voucher PDF para reserva ${code.trim().toUpperCase()}...` });

    try {
      const res = await fetch(`${apiBase}/users/api/whatsapp/messages/${selectedPhone}/send-voucher/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ booking_code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusNotice({ type: 'success', text: `✅ Voucher PDF oficial enviado a +${selectedPhone}` });
        loadMessages(selectedPhone);
        loadConversations();
      } else {
        setStatusNotice({ type: 'error', text: `❌ ${data.detail || 'Error al emitir voucher'}` });
      }
    } catch (e) {
      console.error(e);
      setStatusNotice({ type: 'error', text: '❌ Error de conexión al enviar voucher' });
    } finally {
      setSendingVoucher(false);
      setTimeout(() => setStatusNotice(null), 5000);
    }
  };

  // Guardar configuración
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('Guardando...');
    try {
      const res = await fetch(`${apiBase}/users/api/whatsapp/config/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaveStatus('✅ Configuración guardada exitosamente');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('❌ Error al guardar configuración');
      }
    } catch (e) {
      setSaveStatus('❌ Error al conectar con el servidor');
    }
  };

  // Enviar mensaje de prueba simulador
  const handleSimulate = async () => {
    setSimLoading(true);
    try {
      const res = await fetch(`${apiBase}/users/api/whatsapp/simulate/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          phone: simPhone,
          name: simName,
          message: simText,
        }),
      });
      if (res.ok) {
        await loadConversations();
        setSelectedPhone(simPhone.replace(/\D/g, ''));
        setActiveTab('chat');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="bg-theme-surface border border-theme-border rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold text-2xl shadow-sm">
              💬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-theme-text">WhatsApp Business Suite</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Oficial Meta API
                </span>
              </div>
              <p className="text-xs text-theme-textSecondary mt-0.5 flex items-center gap-2">
                <span>Número Conectado: <strong className="text-emerald-400 font-mono">+57 324 5362112</strong></span>
                <span>•</span>
                <span>Respuesta Automática de Reservas Activa</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex bg-theme-background border border-theme-border rounded-2xl p-1 gap-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'chat'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-theme-textSecondary hover:text-theme-text'
            }`}
          >
            Chats en Vivo
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'config'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-theme-textSecondary hover:text-theme-text'
            }`}
          >
            Ajustes & Bot
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'test'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-theme-textSecondary hover:text-theme-text'
            }`}
          >
            🧪 Simulador
          </button>
        </div>
      </div>

      {/* Notificación de Estado */}
      <AnimatePresence>
        {statusNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`px-4 py-3 rounded-2xl text-xs font-bold shadow-md flex items-center justify-between ${
              statusNotice.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : statusNotice.type === 'error'
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                : 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
            }`}
          >
            <span>{statusNotice.text}</span>
            <button onClick={() => setStatusNotice(null)} className="opacity-60 hover:opacity-100">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TAB 1: CHAT EN VIVO */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[660px]">
          {/* Lista de Chats (4 cols) */}
          <div className="md:col-span-4 bg-theme-surface border border-theme-border rounded-3xl flex flex-col overflow-hidden shadow-sm">
            <div className="p-4 border-b border-theme-border bg-theme-background/40 flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-theme-textMuted block">
                  Clientes & Contactos
                </span>
                <span className="text-xs font-black text-theme-text">
                  {conversations.length} Conversación(es)
                </span>
              </div>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-sm flex items-center gap-1 transition"
              >
                <span>+</span> Nuevo Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-theme-border/50">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-theme-textSecondary text-xs">
                  <div className="text-3xl mb-2">📭</div>
                  No hay chats todavía.
                  <button
                    onClick={() => setShowNewChatModal(true)}
                    className="block mx-auto mt-3 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold hover:bg-emerald-500/20"
                  >
                    + Enviar primer mensaje
                  </button>
                </div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.phone}
                    onClick={() => setSelectedPhone(c.phone)}
                    className={`w-full p-4 text-left transition flex items-start gap-3 ${
                      selectedPhone === c.phone
                        ? 'bg-emerald-500/10 border-l-4 border-emerald-500'
                        : 'hover:bg-theme-background/50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-black text-sm shrink-0">
                      {c.name.slice(0, 2).toUpperCase() || 'WA'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-theme-text truncate block">
                          {c.name}
                        </span>
                        <span className="text-[10px] text-theme-textMuted">
                          {c.last_time.includes(' ') ? c.last_time.split(' ')[1] : c.last_time}
                        </span>
                      </div>
                      <span className="text-xs text-theme-textMuted block font-mono">+{c.phone}</span>
                      <p className="text-xs text-theme-textSecondary truncate mt-1">
                        {c.direction === 'outbound' ? 'Tú: ' : ''}
                        {c.last_message}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Ventana de Mensajes (8 cols) */}
          <div className="md:col-span-8 bg-theme-surface border border-theme-border rounded-3xl flex flex-col overflow-hidden shadow-sm">
            {selectedPhone ? (
              <>
                {/* Cabecera del chat */}
                <div className="p-4 border-b border-theme-border bg-theme-background/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black">
                      WA
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-theme-text">
                        {conversations.find((c) => c.phone === selectedPhone)?.name || `Cliente +${selectedPhone}`}
                      </h3>
                      <span className="text-[11px] font-mono text-emerald-400">+{selectedPhone}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSendVoucher}
                      disabled={sendingVoucher}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      title="Genera y envía el PDF oficial del Voucher al cliente por WhatsApp"
                    >
                      <span>📄</span>
                      <span>{sendingVoucher ? 'Generando PDF...' : 'Enviar Voucher PDF'}</span>
                    </button>
                    <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                      🤖 IA Activa
                    </span>
                  </div>
                </div>

                {/* Historial de mensajes */}
                <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-theme-background/30">
                  {loading && messages.length === 0 ? (
                    <div className="text-center py-10 text-xs text-theme-textSecondary">Cargando mensajes...</div>
                  ) : (
                    messages.map((m) => {
                      const isOut = m.direction === 'outbound';
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isOut ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[78%] rounded-2xl p-3.5 text-xs font-medium shadow-sm leading-relaxed whitespace-pre-wrap ${
                              isOut
                                ? m.is_auto_reply
                                  ? 'bg-teal-600/90 text-white border border-teal-400/30'
                                  : 'bg-emerald-600 text-white'
                                : 'bg-theme-surface border border-theme-border text-theme-text'
                            }`}
                          >
                            {m.is_auto_reply && (
                              <div className="text-[9px] font-bold uppercase tracking-wider text-teal-200 mb-1 flex items-center gap-1">
                                <span>🤖 AeroAgencia IA</span>
                              </div>
                            )}
                            {m.text.includes('[DOCUMENTO ADJUNTO') || m.text.includes('[VOUCHER PDF ENVIADO') ? (
                              <div className="space-y-2">
                                <div className="p-2.5 rounded-xl bg-black/20 border border-white/20 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-rose-500/30 text-rose-300 flex items-center justify-center font-black text-xs">
                                      PDF
                                    </div>
                                    <div>
                                      <div className="font-bold text-xs text-white">Voucher Oficial de Servicio</div>
                                      <div className="text-[9px] text-emerald-200">Comprobante emitido con IA</div>
                                    </div>
                                  </div>
                                  {(() => {
                                    const match = m.text.match(/Voucher_([A-Z0-9]+)\.pdf/i) || m.text.match(/\b([A-Z0-9]{5,7})\b/i);
                                    const vCode = match ? match[1] : '';
                                    return vCode ? (
                                      <a
                                        href={`https://globetrek.cloud/users/api/whatsapp/voucher/${vCode}/`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold transition flex items-center gap-1"
                                      >
                                        <span>👁</span>
                                        <span>Ver PDF</span>
                                      </a>
                                    ) : null;
                                  })()}
                                </div>
                                <div className="text-[11px] opacity-95">{m.text}</div>
                              </div>
                            ) : (
                              <div>{m.text}</div>
                            )}
                            <div
                              className={`text-[9px] mt-1.5 flex items-center justify-end gap-1 ${
                                isOut ? 'text-white/70' : 'text-theme-textMuted'
                              }`}
                            >
                              <span>{m.created_at}</span>
                              {isOut && <span title="Enviado">✓✓</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Respuestas Rápidas / Plantillas */}
                <div className="px-3.5 py-2 border-t border-theme-border bg-theme-background/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] font-extrabold uppercase text-theme-textMuted shrink-0">
                    Plantillas:
                  </span>
                  {QUICK_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(undefined, tmpl.text)}
                      className="px-2.5 py-1 rounded-xl bg-theme-surface border border-theme-border text-[11px] font-bold text-theme-textSecondary hover:text-theme-text hover:border-emerald-500/50 hover:bg-emerald-500/10 transition shrink-0 whitespace-nowrap"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>

                {/* Input de envío de mensajes en el Dashboard */}
                <form onSubmit={(e) => handleSendMessage(e)} className="p-3.5 border-t border-theme-border bg-theme-background/60 flex items-center gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Escribe tu mensaje para responder por WhatsApp..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-theme-border bg-theme-surface text-theme-text text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={sending || !messageInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50 transition flex items-center gap-1.5"
                  >
                    {sending ? 'Enviando...' : (
                      <>
                        <span>Enviar</span>
                        <span>➤</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-theme-textSecondary">
                <div className="text-4xl mb-3">💬</div>
                <div className="font-extrabold text-theme-text text-sm">Selecciona una conversación</div>
                <p className="text-xs text-theme-textMuted mt-1 mb-4">
                  Elige un cliente de la lista de la izquierda o inicia un nuevo chat directamente con un número.
                </p>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition"
                >
                  + Iniciar Nueva Conversación
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CREDENCIALES & AJUSTES */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleSaveConfig} className="lg:col-span-8 bg-theme-surface border border-theme-border rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-theme-text flex items-center gap-2">
                ⚙️ Ajustes del Bot y Conexión Meta
              </h3>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400">
                Línea: +57 324 5362112
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                  Phone Number ID (Asignado a +57 324 5362112)
                </label>
                <input
                  type="text"
                  value={config.phone_number_id}
                  onChange={(e) => setConfig({ ...config, phone_number_id: e.target.value })}
                  placeholder="1391379807400528"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border bg-theme-background text-theme-text text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                  WABA ID (Cuenta de WhatsApp Business)
                </label>
                <input
                  type="text"
                  value={config.whatsapp_business_account_id}
                  onChange={(e) => setConfig({ ...config, whatsapp_business_account_id: e.target.value })}
                  placeholder="1490898346242932"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border bg-theme-background text-theme-text text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                Token de acceso de Usuario del Sistema (Permanente)
              </label>
              <textarea
                rows={2}
                value={config.access_token}
                onChange={(e) => setConfig({ ...config, access_token: e.target.value })}
                placeholder="EAAQyFdmt9nYBS..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border bg-theme-background text-theme-text text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-theme-border">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                  Token de verificación de Webhook
                </label>
                <input
                  type="text"
                  value={config.webhook_verify_token}
                  onChange={(e) => setConfig({ ...config, webhook_verify_token: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border bg-theme-background text-theme-text text-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="auto_reply_enabled"
                  checked={config.auto_reply_enabled}
                  onChange={(e) => setConfig({ ...config, auto_reply_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 accent-emerald-500"
                />
                <label htmlFor="auto_reply_enabled" className="text-xs font-extrabold text-theme-text cursor-pointer">
                  Habilitar respuestas automáticas con datos de reservas
                </label>
              </div>
            </div>

            {/* SECCIÓN GOOGLE GEMINI AI */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-transparent border border-blue-500/25 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <div>
                    <h4 className="text-xs font-black text-theme-text uppercase tracking-wider">
                      Google Gemini AI — Motor Inteligente Oficial
                    </h4>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      Responde preguntas de turismo y genera Vouchers PDF automáticamente
                    </span>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer bg-theme-background px-3 py-1.5 rounded-xl border border-theme-border">
                  <input
                    type="checkbox"
                    checked={config.ai_agent_enabled}
                    onChange={(e) => setConfig({ ...config, ai_agent_enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-500 accent-blue-500"
                  />
                  <span className="text-xs font-bold text-theme-text">Gemini Activo</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                    Gemini API Key
                  </label>
                  <input
                    type="text"
                    value={config.gemini_api_key}
                    onChange={(e) => setConfig({ ...config, gemini_api_key: e.target.value })}
                    placeholder="Pega aquí tu Gemini API Key..."
                    className="w-full px-3 py-2 rounded-xl border border-theme-border bg-theme-background text-theme-text text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                    Modelo de Gemini
                  </label>
                  <input
                    type="text"
                    value={config.ai_model}
                    onChange={(e) => setConfig({ ...config, ai_model: e.target.value })}
                    placeholder="gemini-3.5-flash-lite"
                    className="w-full px-3 py-2 rounded-xl border border-theme-border bg-theme-background text-theme-text text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                Mensaje de bienvenida automático del Bot
              </label>
              <textarea
                rows={2}
                value={config.welcome_message}
                onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border bg-theme-background text-theme-text text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                Menú de opciones de ayuda
              </label>
              <textarea
                rows={3}
                value={config.menu_message}
                onChange={(e) => setConfig({ ...config, menu_message: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border bg-theme-background text-theme-text text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold text-emerald-500">{saveStatus}</span>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition"
              >
                Guardar Configuración
              </button>
            </div>
          </form>

          {/* Tarjeta de Información Oficial Meta (4 cols) */}
          <div className="lg:col-span-4 bg-theme-surface border border-theme-border rounded-3xl p-6 shadow-sm space-y-4 text-xs">
            <h4 className="font-black text-theme-text flex items-center gap-2">
              🌐 Webhook HTTPS Oficial
            </h4>
            <p className="text-theme-textSecondary leading-relaxed">
              Callback URL activa en el servidor:
            </p>
            <div className="p-3 rounded-xl bg-theme-background border border-theme-border font-mono text-[11px] text-teal-400 break-all select-all">
              https://globetrek.cloud/users/api/whatsapp/webhook/
            </div>
            <p className="text-theme-textSecondary leading-relaxed">
              <strong>Verify Token:</strong>
            </p>
            <div className="p-3 rounded-xl bg-theme-background border border-theme-border font-mono text-[11px] text-teal-400 break-all select-all">
              {config.webhook_verify_token}
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1">
                <span>✓</span> Certificado SSL Let's Encrypt Activo
              </div>
              <div>Cualquier mensaje enviado a tu número oficial <strong>+57 324 5362112</strong> llegará directamente a esta bandeja.</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SIMULADOR DE PRUEBAS */}
      {activeTab === 'test' && (
        <div className="bg-theme-surface border border-theme-border rounded-3xl p-6 shadow-sm max-w-2xl mx-auto space-y-5">
          <div>
            <h3 className="text-base font-black text-theme-text flex items-center gap-2">
              🧪 Simulador de Recepción de Mensajes
            </h3>
            <p className="text-xs text-theme-textSecondary mt-1">
              Prueba la inteligencia del bot sin gastar mensajes de Meta. Simula que un cliente te escribe desde su teléfono.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                Teléfono del cliente remitente
              </label>
              <input
                type="text"
                value={simPhone}
                onChange={(e) => setSimPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border bg-theme-background text-theme-text text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                Nombre del cliente
              </label>
              <input
                type="text"
                value={simName}
                onChange={(e) => setSimName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border bg-theme-background text-theme-text text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                Mensaje que envía el cliente
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  placeholder="Ej: AEROA1 o Hola"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-theme-border bg-theme-background text-theme-text text-xs"
                />
                <button
                  type="button"
                  onClick={() => setSimText('AEROA1')}
                  className="px-3 py-2 rounded-xl border border-teal-500/30 text-teal-400 text-xs font-bold hover:bg-teal-500/10"
                >
                  Probar AEROA1
                </button>
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={simLoading || !simText.trim()}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
            >
              {simLoading ? 'Simulando mensaje...' : 'Simular Recepción de Mensaje y Abrir Chat ➤'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL NUEVO CHAT DIRECTO */}
      <AnimatePresence>
        {showNewChatModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-theme-surface border border-theme-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-theme-border pb-3">
                <h3 className="font-black text-base text-theme-text flex items-center gap-2">
                  <span>✉️</span> Iniciar Conversación WhatsApp
                </h3>
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="text-theme-textMuted hover:text-theme-text text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleStartNewChat} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                    Número de teléfono WhatsApp (con código de país)
                  </label>
                  <input
                    type="text"
                    required
                    value={newChatPhone}
                    onChange={(e) => setNewChatPhone(e.target.value)}
                    placeholder="+573001234567"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border bg-theme-background text-theme-text text-xs font-mono"
                  />
                  <span className="text-[10px] text-theme-textMuted mt-0.5 block">
                    Ejemplo para Colombia: +57 324 5362112
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                    Nombre del Contacto (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    placeholder="Ej: Laura Gómez"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border bg-theme-background text-theme-text text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                    Mensaje Inicial
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={newChatMessage}
                    onChange={(e) => setNewChatMessage(e.target.value)}
                    placeholder="Escribe el mensaje que se enviará al cliente..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border bg-theme-background text-theme-text text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewChatModal(false)}
                    className="px-4 py-2 rounded-xl border border-theme-border text-theme-textSecondary hover:text-theme-text text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={newChatSending || !newChatMessage.trim()}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50 transition"
                  >
                    {newChatSending ? 'Enviando...' : 'Enviar y Crear Chat ➤'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WhatsAppIntegration;
