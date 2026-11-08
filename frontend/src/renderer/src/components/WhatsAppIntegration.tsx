import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: number;
  text: string;
  direction: 'inbound' | 'outbound';
  sender_name?: string;
  is_auto_reply?: boolean;
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

export const WhatsAppIntegration: React.FC<WhatsAppIntegrationProps> = ({ token, apiBase }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'config' | 'test'>('chat');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Form Config
  const [config, setConfig] = useState({
    phone_number_id: '',
    whatsapp_business_account_id: '',
    access_token: '',
    webhook_verify_token: 'aeroagencia_token_seguro',
    auto_reply_enabled: true,
    welcome_message: '',
    menu_message: '',
  });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Simulator Test
  const [simPhone, setSimPhone] = useState('573143291149');
  const [simName, setSimName] = useState('Pasajero Demo');
  const [simText, setSimText] = useState('GRXEB3');
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

  // Enviar mensaje manual
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedPhone || sending) return;

    setSending(true);
    try {
      const res = await fetch(`${apiBase}/users/api/whatsapp/messages/${selectedPhone}/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ message: messageInput }),
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
        setMessageInput('');
        loadConversations();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
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
        setSelectedPhone(simPhone);
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
      {/* Encabezado y Selector de Tabs */}
      <div className="bg-theme-surface border border-theme-border rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold text-xl">
              💬
            </div>
            <div>
              <h2 className="text-xl font-black text-theme-text flex items-center gap-2">
                WhatsApp Business Suite
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 uppercase tracking-widest">
                  API Oficial & Bot
                </span>
              </h2>
              <p className="text-xs text-theme-textSecondary mt-0.5">
                Central de mensajería con auto-respuestas inteligentes de reservas y control de clientes
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
            Credenciales API
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'test'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-theme-textSecondary hover:text-theme-text'
            }`}
          >
            🧪 Simulador / Pruebas
          </button>
        </div>
      </div>

      {/* TAB 1: CHAT EN VIVO */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[640px]">
          {/* Lista de Chats (4 cols) */}
          <div className="md:col-span-4 bg-theme-surface border border-theme-border rounded-3xl flex flex-col overflow-hidden shadow-sm">
            <div className="p-4 border-b border-theme-border bg-theme-background/40">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-theme-textMuted block">
                Clientes & Conversaciones
              </span>
              <div className="text-xs font-bold text-theme-text mt-1 flex items-center justify-between">
                <span>{conversations.length} Contacto(s)</span>
                <button
                  onClick={loadConversations}
                  className="text-[11px] text-emerald-500 hover:underline"
                >
                  ↻ Actualizar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-theme-border/50">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-theme-textSecondary text-xs">
                  <div className="text-3xl mb-2">📭</div>
                  No hay chats todavía.
                  <button
                    onClick={() => setActiveTab('test')}
                    className="block mx-auto mt-3 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold hover:bg-emerald-500/20"
                  >
                    Abrir simulador de prueba
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
                        <span className="text-[10px] text-theme-textMuted">{c.last_time.split(' ')[1]}</span>
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
                        {conversations.find((c) => c.phone === selectedPhone)?.name || selectedPhone}
                      </h3>
                      <span className="text-[11px] font-mono text-emerald-500">+{selectedPhone}</span>
                    </div>
                  </div>
                  <div className="text-[11px] px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">
                    Auto-Respuesta Activa ⚡
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
                                <span>🤖 Auto-Respuesta Sistema</span>
                              </div>
                            )}
                            <div>{m.text}</div>
                            <div
                              className={`text-[9px] mt-1 text-right ${
                                isOut ? 'text-white/70' : 'text-theme-textMuted'
                              }`}
                            >
                              {m.created_at}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input de envío */}
                <form onSubmit={handleSendMessage} className="p-3.5 border-t border-theme-border bg-theme-background/60 flex items-center gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Escribe un mensaje de respuesta a través de WhatsApp..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-theme-border bg-theme-surface text-theme-text text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={sending || !messageInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50 transition"
                  >
                    {sending ? 'Enviando...' : 'Enviar ➤'}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-theme-textSecondary">
                <div className="text-4xl mb-3">💬</div>
                <div className="font-extrabold text-theme-text text-sm">Selecciona una conversación</div>
                <p className="text-xs text-theme-textMuted mt-1">
                  Elige un cliente de la lista de la izquierda o envía un mensaje de prueba con el simulador.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CREDENCIALES & AJUSTES */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleSaveConfig} className="lg:col-span-8 bg-theme-surface border border-theme-border rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="text-base font-black text-theme-text flex items-center gap-2">
              ⚙️ Conexión con Meta / WhatsApp Cloud API
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                  Identificador de número de teléfono (Phone Number ID)
                </label>
                <input
                  type="text"
                  value={config.phone_number_id}
                  onChange={(e) => setConfig({ ...config, phone_number_id: e.target.value })}
                  placeholder="Ej: 104582947182930"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border bg-theme-background text-theme-text text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                  ID de cuenta de WhatsApp Business (WABA ID)
                </label>
                <input
                  type="text"
                  value={config.whatsapp_business_account_id}
                  onChange={(e) => setConfig({ ...config, whatsapp_business_account_id: e.target.value })}
                  placeholder="Ej: 981726354182910"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border bg-theme-background text-theme-text text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                Token de acceso permanente o temporal (System User Access Token)
              </label>
              <textarea
                rows={2}
                value={config.access_token}
                onChange={(e) => setConfig({ ...config, access_token: e.target.value })}
                placeholder="EAAG..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-theme-border bg-theme-background text-theme-text text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-theme-border">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                  Token de verificación de Webhook (Webhook Verify Token)
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

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                Mensaje de bienvenida automático
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

          {/* Instrucciones de URL para Meta (4 cols) */}
          <div className="lg:col-span-4 bg-theme-surface border border-theme-border rounded-3xl p-6 shadow-sm space-y-4 text-xs">
            <h4 className="font-black text-theme-text flex items-center gap-2">
              🌐 Webhook URL para Meta
            </h4>
            <p className="text-theme-textSecondary leading-relaxed">
              En tu portal de Meta Developer, en la sección <strong>WhatsApp → Configuración</strong>, pega esta URL en el Webhook:
            </p>
            <div className="p-3 rounded-xl bg-theme-background border border-theme-border font-mono text-[11px] text-teal-400 break-all select-all">
              https://tu-dominio.com/users/api/whatsapp/webhook/
            </div>
            <p className="text-theme-textSecondary leading-relaxed">
              <strong>Token de verificación:</strong>
            </p>
            <div className="p-3 rounded-xl bg-theme-background border border-theme-border font-mono text-[11px] text-teal-400 break-all select-all">
              {config.webhook_verify_token}
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] leading-relaxed">
              💡 <em>Para pruebas locales</em> puedes usar <strong>ngrok</strong> (ej: <code>ngrok http 8000</code>) y pegar el enlace HTTPS público que te genere en el webhook de Meta.
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SIMULADOR DE PRUEBAS */}
      {activeTab === 'test' && (
        <div className="bg-theme-surface border border-theme-border rounded-3xl p-6 shadow-sm max-w-2xl mx-auto space-y-5">
          <div>
            <h3 className="text-base font-black text-theme-text flex items-center gap-2">
              🧪 Simulador Interactivo de WhatsApp
            </h3>
            <p className="text-xs text-theme-textSecondary mt-1">
              Prueba la inteligencia de auto-respuesta del bot de inmediato. Escribe el código de una reserva (por ejemplo: <strong className="text-emerald-400">GRXEB3</strong>), o escribe <strong className="text-emerald-400">HOLA</strong> o <strong className="text-emerald-400">ASESOR</strong>.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textMuted block mb-1">
                Número de teléfono simulado
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
                Nombre del pasajero / cliente
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
                Mensaje enviado por el usuario
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  placeholder="Ej: GRXEB3 o Hola"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-theme-border bg-theme-background text-theme-text text-xs"
                />
                <button
                  type="button"
                  onClick={() => setSimText('GRXEB3')}
                  className="px-3 py-2 rounded-xl border border-teal-500/30 text-teal-400 text-xs font-bold hover:bg-teal-500/10"
                >
                  Probar GRXEB3
                </button>
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={simLoading || !simText.trim()}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
            >
              {simLoading ? 'Simulando llegada de mensaje...' : 'Simular Recepción de Mensaje y Ver Respuesta ➤'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppIntegration;

