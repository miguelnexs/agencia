import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { API_URL } from '../../constants/Config';

const apiBase = API_URL;

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
  unread?: boolean;
}

const QUICK_TEMPLATES = [
  { label: '📄 Voucher', text: 'Quiero mi voucher de reserva por favor.' },
  { label: '👋 Saludo', text: '¡Hola! Te damos la bienvenida a AeroAgencia ✈️. ¿En qué podemos ayudarte?' },
  { label: '🎫 Consulta', text: 'Por favor facilítanos el código de tu reserva (ejemplo: AEROA1) para verificar.' },
  { label: '📄 Cédula/Doc', text: 'Para completar tu viaje, por favor envíanos una foto legible de tu documento.' },
  { label: '👨‍💼 Asesor', text: 'Un asesor comercial revisará tu solicitud en unos momentos.' },
  { label: '💳 Pago OK', text: 'Pago recibido y confirmado con éxito. Tu reserva ya se encuentra emitida.' },
];

export default function WhatsAppScreen() {
  const { token } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'chat' | 'simulate' | 'config'>('chat');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingVoucher, setSendingVoucher] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modal Nuevo Chat
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('+57');
  const [newChatName, setNewChatName] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [newChatSending, setNewChatSending] = useState(false);

  // Modal Enviar Voucher
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherCodeInput, setVoucherCodeInput] = useState('');

  // Simulador IA
  const [simPhone, setSimPhone] = useState('573245362112');
  const [simName, setSimName] = useState('Cliente Móvil');
  const [simText, setSimText] = useState('Hola, quiero mi voucher de AEROA1');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  // Configuración API
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
  const [savingConfig, setSavingConfig] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const loadConversations = async () => {
    try {
      const res = await fetch(`${apiBase}/users/api/whatsapp/conversations/`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setConversations(data || []);
      }
    } catch (e) {
      console.warn('Error cargando conversaciones de WhatsApp:', e);
    }
  };

  const loadMessages = async (phone: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/users/api/whatsapp/messages/${encodeURIComponent(phone)}/`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data || []);
      }
    } catch (e) {
      console.warn('Error cargando mensajes:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch(`${apiBase}/users/api/whatsapp/config/`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setConfig((prev) => ({ ...prev, ...data }));
        }
      }
    } catch (e) {
      console.warn('Error cargando configuración:', e);
    }
  };

  useEffect(() => {
    loadConversations();
    loadConfig();
    const interval = setInterval(() => {
      loadConversations();
      if (selectedPhone) {
        fetch(`${apiBase}/users/api/whatsapp/messages/${encodeURIComponent(selectedPhone)}/`, { headers: authHeaders })
          .then((r) => r.json())
          .then((data) => {
            if (Array.isArray(data)) setMessages(data);
          })
          .catch(() => {});
      }
    }, 4500);
    return () => clearInterval(interval);
  }, [token, selectedPhone]);

  useEffect(() => {
    if (selectedPhone) {
      loadMessages(selectedPhone);
    }
  }, [selectedPhone]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || messageInput;
    if (!textToSend.trim() || !selectedPhone || sending) return;

    setSending(true);
    setStatusNotice(null);
    try {
      const res = await fetch(`${apiBase}/users/api/whatsapp/messages/${encodeURIComponent(selectedPhone)}/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ message: textToSend }),
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
        if (!customText) setMessageInput('');
        loadConversations();
        setStatusNotice({ type: 'success', text: 'Mensaje enviado a WhatsApp.' });
      } else {
        setStatusNotice({ type: 'error', text: 'Error enviando mensaje por WhatsApp.' });
      }
    } catch (e: any) {
      setStatusNotice({ type: 'error', text: e.message || 'Error de conexión.' });
    } finally {
      setSending(false);
    }
  };

  const handleSendVoucher = async () => {
    if (!selectedPhone || sendingVoucher) return;
    setSendingVoucher(true);
    setStatusNotice(null);
    try {
      const res = await fetch(`${apiBase}/users/api/whatsapp/messages/${encodeURIComponent(selectedPhone)}/send-voucher/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ booking_code: voucherCodeInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusNotice({ type: 'success', text: `✅ Voucher ${data.booking_code || ''} enviado en PDF.` });
        setShowVoucherModal(false);
        setVoucherCodeInput('');
        loadMessages(selectedPhone);
        loadConversations();
      } else {
        setStatusNotice({ type: 'error', text: data.detail || 'No se pudo generar o enviar el voucher.' });
      }
    } catch (e: any) {
      setStatusNotice({ type: 'error', text: e.message || 'Error enviando voucher.' });
    } finally {
      setSendingVoucher(false);
    }
  };

  const handleStartNewChat = async () => {
    const cleanPhone = newChatPhone.replace(/\D/g, '');
    if (!cleanPhone || !newChatMessage.trim()) {
      setStatusNotice({ type: 'error', text: 'Número y mensaje inicial son requeridos.' });
      return;
    }
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
        setShowNewChatModal(false);
        setSelectedPhone(cleanPhone);
        setSelectedName(newChatName.trim() || cleanPhone);
        setNewChatMessage('');
        setNewChatName('');
        loadConversations();
        loadMessages(cleanPhone);
        setStatusNotice({ type: 'success', text: 'Chat iniciado exitosamente.' });
      } else {
        setStatusNotice({ type: 'error', text: 'No se pudo iniciar el chat.' });
      }
    } catch (e: any) {
      setStatusNotice({ type: 'error', text: e.message || 'Error al iniciar chat.' });
    } finally {
      setNewChatSending(false);
    }
  };

  const handleSimulate = async () => {
    if (!simText.trim()) return;
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await fetch(`${apiBase}/users/api/whatsapp/simulate/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          phone: simPhone.trim(),
          name: simName.trim(),
          text: simText.trim(),
        }),
      });
      const data = await res.json();
      setSimResult(data);
      loadConversations();
    } catch (e: any) {
      setSimResult({ error: e.message || 'Error al simular interacción' });
    } finally {
      setSimLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setStatusNotice(null);
    try {
      const res = await fetch(`${apiBase}/users/api/whatsapp/config/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setStatusNotice({ type: 'success', text: 'Configuración de WhatsApp guardada con éxito.' });
      } else {
        setStatusNotice({ type: 'error', text: 'Error al guardar la configuración.' });
      }
    } catch (e: any) {
      setStatusNotice({ type: 'error', text: e.message || 'Error de conexión.' });
    } finally {
      setSavingConfig(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.last_message || '').toLowerCase().includes(q);
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top AeroAgencia WhatsApp Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <FontAwesome5 name="whatsapp" size={15} color="#25D366" />
            <Text style={[styles.headerEyebrow, { color: colors.primary }]}>
              AEROAGENCIA • COMUNICACIONES
            </Text>
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>WhatsApp Cloud API</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <FontAwesome5
              name={isDark ? 'sun' : 'moon'}
              size={13}
              color={isDark ? colors.warning : colors.secondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowNewChatModal(true)}
            style={[styles.newBtn, { backgroundColor: '#25D366' }]}
          >
            <FontAwesome5 name="plus" size={11} color="#FFF" />
            <Text style={styles.newBtnText}>Nuevo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented Sub-Navigation Pills */}
      <View style={[styles.segmentContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('chat')}
          style={[styles.segmentBtn, activeTab === 'chat' && { backgroundColor: colors.primary }]}
        >
          <FontAwesome5 name="comments" size={12} color={activeTab === 'chat' ? '#FFF' : colors.textSecondary} />
          <Text style={[styles.segmentText, { color: activeTab === 'chat' ? '#FFF' : colors.textSecondary }]}>
            Chats ({conversations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('simulate')}
          style={[styles.segmentBtn, activeTab === 'simulate' && { backgroundColor: colors.primary }]}
        >
          <FontAwesome5 name="robot" size={12} color={activeTab === 'simulate' ? '#FFF' : colors.textSecondary} />
          <Text style={[styles.segmentText, { color: activeTab === 'simulate' ? '#FFF' : colors.textSecondary }]}>
            Simulador IA
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('config')}
          style={[styles.segmentBtn, activeTab === 'config' && { backgroundColor: colors.primary }]}
        >
          <FontAwesome5 name="cog" size={12} color={activeTab === 'config' ? '#FFF' : colors.textSecondary} />
          <Text style={[styles.segmentText, { color: activeTab === 'config' ? '#FFF' : colors.textSecondary }]}>
            Config API
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status Notice Banner */}
      {statusNotice && (
        <View
          style={[
            styles.noticeBanner,
            statusNotice.type === 'success'
              ? { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: colors.success }
              : statusNotice.type === 'error'
              ? { backgroundColor: 'rgba(244,63,94,0.12)', borderColor: colors.error }
              : { backgroundColor: 'rgba(56,189,248,0.12)', borderColor: colors.secondary },
          ]}
        >
          <FontAwesome5
            name={statusNotice.type === 'success' ? 'check-circle' : statusNotice.type === 'error' ? 'exclamation-circle' : 'info-circle'}
            size={13}
            color={statusNotice.type === 'success' ? colors.success : statusNotice.type === 'error' ? colors.error : colors.secondary}
          />
          <Text
            style={[
              styles.noticeText,
              { color: statusNotice.type === 'success' ? colors.success : statusNotice.type === 'error' ? colors.error : colors.secondary },
            ]}
          >
            {statusNotice.text}
          </Text>
          <TouchableOpacity onPress={() => setStatusNotice(null)}>
            <FontAwesome5 name="times" size={11} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* TAB 1: CHATS LIST & ACTIVE CONVERSATION */}
      {activeTab === 'chat' && (
        <View style={{ flex: 1 }}>
          {selectedPhone ? (
            /* CONVERSATION ACTIVE VIEW */
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
              style={[styles.chatRoomContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {/* Chat Header */}
              <View style={[styles.chatRoomHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setSelectedPhone(null)} style={styles.backBtn}>
                  <FontAwesome5 name="chevron-left" size={16} color={colors.primary} />
                </TouchableOpacity>

                <View style={[styles.avatarCircleSmall, { backgroundColor: '#25D366' }]}>
                  <Text style={styles.avatarTextSmall}>{(selectedName?.[0] || 'C').toUpperCase()}</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.chatHeaderName, { color: colors.text }]} numberOfLines={1}>
                    {selectedName || selectedPhone}
                  </Text>
                  <Text style={[styles.chatHeaderPhone, { color: colors.textMuted }]}>+{selectedPhone}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => setShowVoucherModal(true)}
                  style={[styles.sendVoucherBtn, { backgroundColor: 'rgba(20,184,166,0.15)', borderColor: colors.primary }]}
                >
                  <FontAwesome5 name="file-pdf" size={12} color={colors.primary} />
                  <Text style={[styles.sendVoucherText, { color: colors.primary }]}>Voucher</Text>
                </TouchableOpacity>
              </View>

              {/* Messages Feed */}
              {loading ? (
                <View style={styles.centerBox}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando mensajes...</Text>
                </View>
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  keyExtractor={(item) => String(item.id)}
                  contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
                  onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                  renderItem={({ item }) => {
                    const isOutbound = item.direction === 'outbound';
                    return (
                      <View style={[styles.messageBubbleWrapper, isOutbound ? styles.bubbleRight : styles.bubbleLeft]}>
                        <View
                          style={[
                            styles.messageBubble,
                            isOutbound
                              ? { backgroundColor: '#054640', borderColor: 'rgba(37,211,102,0.3)' }
                              : { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                          ]}
                        >
                          {item.is_auto_reply && (
                            <View style={styles.aiTag}>
                              <FontAwesome5 name="robot" size={9} color="#38BDF8" />
                              <Text style={styles.aiTagText}>AeroAgencia Gemini AI</Text>
                            </View>
                          )}
                          <Text style={[styles.messageBubbleText, { color: isOutbound ? '#E9EDEF' : colors.text }]}>
                            {item.text}
                          </Text>
                          <View style={styles.bubbleFooter}>
                            <Text style={styles.bubbleTime}>{item.created_at || ''}</Text>
                            {isOutbound && <FontAwesome5 name="check-double" size={9} color="#38BDF8" />}
                          </View>
                        </View>
                      </View>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.emptyMessages}>
                      <FontAwesome5 name="comment-dots" size={28} color={colors.textMuted} />
                      <Text style={[styles.emptyMessagesText, { color: colors.textSecondary }]}>
                        No hay mensajes registrados aún en este chat.
                      </Text>
                    </View>
                  }
                />
              )}

              {/* Quick Template Chips */}
              <View style={[styles.templatesContainer, { borderTopColor: colors.border }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 8 }}>
                  {QUICK_TEMPLATES.map((tmpl, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleSendMessage(tmpl.text)}
                      style={[styles.templateChip, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
                    >
                      <Text style={[styles.templateChipText, { color: colors.textSecondary }]}>{tmpl.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Message Input Bar */}
              <View style={[styles.chatInputBar, { borderTopColor: colors.border }]}>
                <TextInput
                  value={messageInput}
                  onChangeText={setMessageInput}
                  placeholder="Escribe un mensaje de WhatsApp..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={[styles.chatTextInput, { color: colors.text, backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
                />
                <TouchableOpacity
                  disabled={sending || !messageInput.trim()}
                  onPress={() => handleSendMessage()}
                  style={[
                    styles.sendBtn,
                    { backgroundColor: '#25D366' },
                    (sending || !messageInput.trim()) && { opacity: 0.5 },
                  ]}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <FontAwesome5 name="paper-plane" size={14} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          ) : (
            /* CONVERSATIONS INBOX LIST */
            <View style={{ flex: 1 }}>
              {/* Search Bar */}
              <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <FontAwesome5 name="search" size={13} color={colors.textMuted} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar chat por nombre, teléfono o texto..."
                  placeholderTextColor={colors.textMuted}
                  style={[styles.searchInput, { color: colors.text }]}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <FontAwesome5 name="times-circle" size={13} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={filteredConversations}
                keyExtractor={(item) => item.phone}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => {
                  const initial = (item.name?.[0] || item.phone?.[0] || 'C').toUpperCase();
                  const isOutbound = item.direction === 'outbound';
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedPhone(item.phone);
                        setSelectedName(item.name);
                      }}
                      style={[styles.convoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <View style={[styles.convoAvatar, { backgroundColor: '#0D9488' }]}>
                        <Text style={styles.convoAvatarText}>{initial}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={styles.convoTopLine}>
                          <Text style={[styles.convoName, { color: colors.text }]} numberOfLines={1}>
                            {item.name || `+${item.phone}`}
                          </Text>
                          <Text style={[styles.convoTime, { color: colors.textMuted }]}>{item.last_time || ''}</Text>
                        </View>

                        <Text style={[styles.convoSub, { color: colors.textMuted }]}>+{item.phone}</Text>

                        <View style={styles.convoLastMsgRow}>
                          <FontAwesome5
                            name={isOutbound ? 'arrow-up' : 'arrow-down'}
                            size={10}
                            color={isOutbound ? '#38BDF8' : '#25D366'}
                            style={{ marginRight: 5 }}
                          />
                          <Text style={[styles.convoLastMsg, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.last_message || 'Sin mensajes recientes'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyInbox}>
                    <FontAwesome5 name="whatsapp" size={40} color={colors.textMuted} />
                    <Text style={[styles.emptyInboxTitle, { color: colors.text }]}>Sin conversaciones aún</Text>
                    <Text style={[styles.emptyInboxSub, { color: colors.textSecondary }]}>
                      Toca en "+ Nuevo" para iniciar una conversación o prueba el simulador de IA.
                    </Text>
                  </View>
                }
              />
            </View>
          )}
        </View>
      )}

      {/* TAB 2: AI SIMULATOR */}
      {activeTab === 'simulate' && (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.formCardHeader}>
              <FontAwesome5 name="robot" size={16} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.formCardTitle, { color: colors.text }]}>Simulador de Interacción con IA</Text>
                <Text style={[styles.formCardSub, { color: colors.textSecondary }]}>
                  Prueba en vivo la detección automática de vouchers y la respuesta inteligente con Gemini.
                </Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Teléfono del Cliente</Text>
              <TextInput
                value={simPhone}
                onChangeText={setSimPhone}
                placeholder="573245362112"
                placeholderTextColor={colors.textMuted}
                style={[styles.fieldInput, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nombre del Cliente</Text>
              <TextInput
                value={simName}
                onChangeText={setSimName}
                placeholder="Nombre del Cliente"
                placeholderTextColor={colors.textMuted}
                style={[styles.fieldInput, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Mensaje Entrante a Probar</Text>
              <TextInput
                value={simText}
                onChangeText={setSimText}
                multiline
                numberOfLines={3}
                placeholder="Ejemplo: Hola, mándame el voucher de mi reserva AEROA1"
                placeholderTextColor={colors.textMuted}
                style={[styles.fieldInput, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text, height: 75 }]}
              />
            </View>

            <TouchableOpacity
              disabled={simLoading || !simText.trim()}
              onPress={handleSimulate}
              style={[styles.primaryActionBtn, { backgroundColor: colors.primary }, simLoading && { opacity: 0.6 }]}
            >
              {simLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <FontAwesome5 name="play" size={12} color="#FFF" />
                  <Text style={styles.primaryActionBtnText}>Ejecutar Prueba con IA</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Simulation Results Output */}
            {simResult && (
              <View style={[styles.simResultBox, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                <Text style={[styles.simResultTitle, { color: colors.primary }]}>RESULTADO DE LA SIMULACIÓN:</Text>

                {simResult.reply && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={[styles.simResultLabel, { color: colors.textMuted }]}>Respuesta generada:</Text>
                    <Text style={[styles.simResultText, { color: colors.text }]}>{simResult.reply}</Text>
                  </View>
                )}

                {simResult.voucher_detected && (
                  <View style={[styles.voucherBadgeBox, { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: colors.success }]}>
                    <FontAwesome5 name="check-circle" size={13} color={colors.success} />
                    <Text style={[styles.voucherBadgeText, { color: colors.success }]}>
                      ¡Voucher detectado! Código: #{simResult.voucher_code || ''}
                    </Text>
                  </View>
                )}

                {simResult.error && (
                  <Text style={{ color: colors.error, fontSize: 12, marginTop: 6 }}>{simResult.error}</Text>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* TAB 3: META API CONFIGURATION */}
      {activeTab === 'config' && (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.formCardHeader}>
              <FontAwesome5 name="cogs" size={16} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.formCardTitle, { color: colors.text }]}>Credenciales Meta WhatsApp</Text>
                <Text style={[styles.formCardSub, { color: colors.textSecondary }]}>
                  Conexión directa con WhatsApp Cloud API (Graph API v21.0).
                </Text>
              </View>
            </View>

            {[
              { key: 'phone_number_id', label: 'Identificador de Teléfono (Phone Number ID)' },
              { key: 'whatsapp_business_account_id', label: 'WhatsApp Business Account ID' },
              { key: 'access_token', label: 'Access Token Permanente (Meta)', secure: true },
              { key: 'webhook_verify_token', label: 'Webhook Verify Token' },
              { key: 'gemini_api_key', label: 'Google Gemini API Key (Opcional para IA)', secure: true },
            ].map((field) => (
              <View key={field.key} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{field.label}</Text>
                <TextInput
                  value={String((config as any)[field.key] || '')}
                  onChangeText={(v) => setConfig((prev: any) => ({ ...prev, [field.key]: v }))}
                  secureTextEntry={field.secure}
                  placeholder={field.label}
                  placeholderTextColor={colors.textMuted}
                  style={[styles.fieldInput, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text }]}
                />
              </View>
            ))}

            <View style={[styles.switchCard, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchTitle, { color: colors.text }]}>Respuestas Automáticas con IA</Text>
                <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                  Gemini responde dudas y genera vouchers PDF automáticamente.
                </Text>
              </View>
              <Switch
                value={Boolean(config.auto_reply_enabled)}
                onValueChange={(v) => setConfig((prev) => ({ ...prev, auto_reply_enabled: v }))}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <TouchableOpacity
              disabled={savingConfig}
              onPress={handleSaveConfig}
              style={[styles.primaryActionBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
            >
              {savingConfig ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <FontAwesome5 name="save" size={13} color="#FFF" />
                  <Text style={styles.primaryActionBtnText}>Guardar Configuración API</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* MODAL 1: NEW CHAT */}
      <Modal visible={showNewChatModal} transparent animationType="slide" onRequestClose={() => setShowNewChatModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FontAwesome5 name="whatsapp" size={18} color="#25D366" />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Nuevo Chat WhatsApp</Text>
              </View>
              <TouchableOpacity onPress={() => setShowNewChatModal(false)}>
                <FontAwesome5 name="times" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Teléfono (con código de país, ej: +57300...)</Text>
              <TextInput
                value={newChatPhone}
                onChangeText={setNewChatPhone}
                keyboardType="phone-pad"
                placeholder="+573001234567"
                placeholderTextColor={colors.textMuted}
                style={[styles.fieldInput, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nombre del Contacto (Opcional)</Text>
              <TextInput
                value={newChatName}
                onChangeText={setNewChatName}
                placeholder="Nombre del Cliente"
                placeholderTextColor={colors.textMuted}
                style={[styles.fieldInput, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Mensaje Inicial</Text>
              <TextInput
                value={newChatMessage}
                onChangeText={setNewChatMessage}
                multiline
                numberOfLines={3}
                placeholder="¡Hola! Te escribimos de AeroAgencia..."
                placeholderTextColor={colors.textMuted}
                style={[styles.fieldInput, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text, height: 75 }]}
              />
            </View>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                onPress={() => setShowNewChatModal(false)}
                style={[styles.secondaryModalBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={newChatSending}
                onPress={handleStartNewChat}
                style={[styles.primaryActionBtn, { flex: 1, backgroundColor: '#25D366' }, newChatSending && { opacity: 0.6 }]}
              >
                {newChatSending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <FontAwesome5 name="paper-plane" size={12} color="#FFF" />
                    <Text style={styles.primaryActionBtnText}>Iniciar Chat</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: SEND VOUCHER PDF */}
      <Modal visible={showVoucherModal} transparent animationType="fade" onRequestClose={() => setShowVoucherModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FontAwesome5 name="file-pdf" size={16} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Enviar Voucher Oficial</Text>
              </View>
              <TouchableOpacity onPress={() => setShowVoucherModal(false)}>
                <FontAwesome5 name="times" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12, lineHeight: 18 }}>
              Ingresa el código de la reserva que deseas adjuntar en PDF para enviar directamente a este contacto por WhatsApp:
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Código de Reserva (ej: AEROA1)</Text>
              <TextInput
                value={voucherCodeInput}
                onChangeText={(v) => setVoucherCodeInput(v.toUpperCase())}
                autoCapitalize="characters"
                placeholder="AEROA1"
                placeholderTextColor={colors.textMuted}
                style={[styles.fieldInput, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text }]}
              />
            </View>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                onPress={() => setShowVoucherModal(false)}
                style={[styles.secondaryModalBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={sendingVoucher || !voucherCodeInput.trim()}
                onPress={handleSendVoucher}
                style={[styles.primaryActionBtn, { flex: 1, backgroundColor: colors.primary }, (sendingVoucher || !voucherCodeInput.trim()) && { opacity: 0.6 }]}
              >
                {sendingVoucher ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <FontAwesome5 name="paper-plane" size={12} color="#FFF" />
                    <Text style={styles.primaryActionBtnText}>Enviar Voucher PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14, paddingTop: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  headerTitle: { fontSize: 21, fontWeight: '900', marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  newBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  segmentContainer: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, marginBottom: 10, gap: 4 },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 8 },
  segmentText: { fontSize: 11, fontWeight: '800' },
  noticeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  noticeText: { fontSize: 12, fontWeight: '700', flex: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 42, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 13 },
  convoCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8, gap: 12 },
  convoAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  convoAvatarText: { color: '#FFF', fontWeight: '900', fontSize: 17 },
  convoTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convoName: { fontSize: 14, fontWeight: '800', flex: 1 },
  convoTime: { fontSize: 11 },
  convoSub: { fontSize: 11, marginTop: 1 },
  convoLastMsgRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  convoLastMsg: { fontSize: 12, flex: 1 },
  emptyInbox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyInboxTitle: { fontSize: 16, fontWeight: '800', marginTop: 12 },
  emptyInboxSub: { fontSize: 12, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },
  chatRoomContainer: { flex: 1, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  chatRoomHeader: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1 },
  backBtn: { padding: 6, marginRight: 4 },
  avatarCircleSmall: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarTextSmall: { color: '#FFF', fontWeight: '900', fontSize: 14 },
  chatHeaderName: { fontSize: 14, fontWeight: '800' },
  chatHeaderPhone: { fontSize: 11 },
  sendVoucherBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  sendVoucherText: { fontSize: 11, fontWeight: '800' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 8, fontSize: 12 },
  messageBubbleWrapper: { marginVertical: 4 },
  bubbleRight: { alignItems: 'flex-end' },
  bubbleLeft: { alignItems: 'flex-start' },
  messageBubble: { maxWidth: '82%', borderRadius: 14, borderWidth: 1, padding: 10 },
  aiTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  aiTagText: { fontSize: 9, fontWeight: '800', color: '#38BDF8', textTransform: 'uppercase' },
  messageBubbleText: { fontSize: 13, lineHeight: 18 },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  bubbleTime: { fontSize: 9, color: 'rgba(255,255,255,0.6)' },
  emptyMessages: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyMessagesText: { fontSize: 12, marginTop: 8, textAlign: 'center' },
  templatesContainer: { borderTopWidth: 1, paddingVertical: 6 },
  templateChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  templateChipText: { fontSize: 11, fontWeight: '700' },
  chatInputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderTopWidth: 1 },
  chatTextInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, maxHeight: 80 },
  sendBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  formCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 14 },
  formCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  formCardTitle: { fontSize: 15, fontWeight: '800' },
  formCardSub: { fontSize: 11, marginTop: 2 },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  fieldInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 },
  switchCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  switchTitle: { fontSize: 13, fontWeight: '700' },
  switchSub: { fontSize: 11, marginTop: 2 },
  primaryActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12 },
  primaryActionBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  secondaryModalBtn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  simResultBox: { marginTop: 14, padding: 12, borderRadius: 12, borderWidth: 1 },
  simResultTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  simResultLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  simResultText: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  voucherBadgeBox: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 10 },
  voucherBadgeText: { fontSize: 12, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(2,6,23,0.78)', justifyContent: 'center', padding: 16 },
  modalCard: { borderRadius: 20, borderWidth: 1, padding: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '900' },
  modalFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
});
