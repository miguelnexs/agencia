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
  KeyboardAvoidingView,
  Platform,
  Linking,
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
}

const QUICK_TEMPLATES = [
  {
    label: '👋 Saludo',
    text: '¡Hola! Te damos la bienvenida a nuestra Central de Reservas y Viajes ✈️. ¿En qué podemos colaborarte hoy?',
  },
  {
    label: '🎫 Pedir Código',
    text: 'Por favor facilítanos el código de tu reserva (ejemplo: AEROA1) para verificar tu itinerario de inmediato.',
  },
  {
    label: '📄 Voucher Listo',
    text: 'Tu reserva se encuentra confirmada y garantizada. A continuación te adjuntamos tu Voucher oficial en PDF.',
  },
  {
    label: '🧾 Recibo Pago',
    text: 'Hemos validado tu pago exitosamente. Te compartimos el Recibo Oficial de Pago en formato PDF.',
  },
  {
    label: '🪪 Documentos',
    text: 'Para completar el registro de los huéspedes, por favor envíanos foto legible del documento de identidad o pasaporte.',
  },
  {
    label: '👨‍💼 Asesor',
    text: 'Hola, soy tu asesor asignado de operaciones. Estoy revisando tu solicitud y te ayudaré paso a paso.',
  },
];

export default function WhatsAppScreen() {
  const { token, username, role } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingVoucher, setSendingVoucher] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyBrand, setCompanyBrand] = useState('');
  const [statusNotice, setStatusNotice] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Modal Nuevo Chat
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('+57');
  const [newChatName, setNewChatName] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [newChatSending, setNewChatSending] = useState(false);

  // Modal Enviar Voucher / Recibo Multi-Empresa
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [docTypeToSend, setDocTypeToSend] = useState<'voucher' | 'receipt' | 'both'>('both');
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  const flatListRef = useRef<FlatList>(null);

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const loadConversations = async () => {
    try {
      const res = await fetch(`${apiBase}/users/api/whatsapp/conversations/`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data || []);
      }
    } catch (e) {
      console.warn('Error cargando conversaciones de WhatsApp:', e);
    }
  };

  const loadRecentBookings = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/users/api/bookings/?page=1&page_size=8`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setRecentBookings(data.results || []);
      }
    } catch {
      // ignore
    }
  };

  const loadMessages = async (phone: string) => {
    try {
      setLoading(true);
      const res = await fetch(
        `${apiBase}/users/api/whatsapp/messages/${encodeURIComponent(phone)}/`,
        { headers: authHeaders }
      );
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

  useEffect(() => {
    loadConversations();
    loadRecentBookings();
    const interval = setInterval(() => {
      loadConversations();
      if (selectedPhone) {
        fetch(
          `${apiBase}/users/api/whatsapp/messages/${encodeURIComponent(selectedPhone)}/`,
          { headers: authHeaders }
        )
          .then((r) => r.json())
          .then((data) => {
            if (Array.isArray(data)) setMessages(data);
          })
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

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || messageInput;
    if (!textToSend.trim() || !selectedPhone || sending) return;

    setSending(true);
    setStatusNotice(null);
    try {
      const senderLabel = companyBrand.trim()
        ? `${username || 'Asesor'} (${companyBrand.trim()})`
        : username || 'Asesor de Reservas';

      const res = await fetch(
        `${apiBase}/users/api/whatsapp/messages/${encodeURIComponent(selectedPhone)}/`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            message: textToSend,
            sender_name: senderLabel,
          }),
        }
      );
      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
        if (!customText) setMessageInput('');
        loadConversations();
        setStatusNotice({
          type: 'success',
          text: 'Mensaje enviado correctamente al cliente.',
        });
      } else {
        setStatusNotice({
          type: 'error',
          text: 'No se pudo enviar el mensaje por WhatsApp.',
        });
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
      const res = await fetch(
        `${apiBase}/users/api/whatsapp/messages/${encodeURIComponent(
          selectedPhone
        )}/send-voucher/`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            booking_code: voucherCodeInput.trim(),
            doc_type: docTypeToSend,
            company_name: companyBrand.trim(),
          }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusNotice({
          type: 'success',
          text: `✅ PDF (${data.booking_code || voucherCodeInput}) enviado al chat.`,
        });
        setShowVoucherModal(false);
        setVoucherCodeInput('');
        loadMessages(selectedPhone);
        loadConversations();
      } else {
        setStatusNotice({
          type: 'error',
          text: data.detail || 'No se encontró una reserva con ese código.',
        });
      }
    } catch (e: any) {
      setStatusNotice({ type: 'error', text: e.message || 'Error enviando PDF.' });
    } finally {
      setSendingVoucher(false);
    }
  };

  const handleStartNewChat = async () => {
    const cleanPhone = newChatPhone.replace(/\D/g, '');
    if (!cleanPhone || !newChatMessage.trim()) {
      setStatusNotice({
        type: 'error',
        text: 'Número y mensaje inicial son requeridos.',
      });
      return;
    }
    setNewChatSending(true);
    try {
      const res = await fetch(
        `${apiBase}/users/api/whatsapp/messages/${cleanPhone}/`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            message: newChatMessage.trim(),
            sender_name: newChatName.trim() || cleanPhone,
          }),
        }
      );
      if (res.ok) {
        setShowNewChatModal(false);
        setSelectedPhone(cleanPhone);
        setSelectedName(newChatName.trim() || cleanPhone);
        setNewChatMessage('');
        setNewChatName('');
        loadConversations();
        loadMessages(cleanPhone);
        setStatusNotice({
          type: 'success',
          text: 'Conversación iniciada exitosamente.',
        });
      } else {
        setStatusNotice({ type: 'error', text: 'No se pudo iniciar el chat.' });
      }
    } catch (e: any) {
      setStatusNotice({ type: 'error', text: e.message || 'Error al iniciar chat.' });
    } finally {
      setNewChatSending(false);
    }
  };

  const openDirectPdfFromBubble = (text: string) => {
    const base = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    const isReceipt = text.toLowerCase().includes('recibo_');
    const codeMatch =
      text.match(/(?:Voucher|Recibo)_([A-Z0-9]+)\.pdf/i) ||
      text.match(/\b([A-Z]{4,6}\d{1,3})\b/);
    const code = codeMatch ? codeMatch[1].toUpperCase() : '';
    if (!code) return;
    const endpoint = isReceipt ? 'receipt' : 'voucher';
    Linking.openURL(`${base}/users/api/whatsapp/${endpoint}/${code}/`).catch(() => {});
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.last_message || '').toLowerCase().includes(q)
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Executive Multi-Company Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <FontAwesome5 name="whatsapp" size={16} color="#25D366" />
            <Text style={[styles.headerEyebrow, { color: colors.primary }]}>
              MULTI-EMPRESA • {role === 'super_admin' ? 'SUPER ADMIN' : 'AGENTE ACTIVO'}
            </Text>
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            WhatsApp ({conversations.length})
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={[
              styles.iconBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <FontAwesome5
              name={isDark ? 'sun' : 'moon'}
              size={13}
              color={isDark ? colors.warning : colors.secondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowNewChatModal(true)}
            style={[styles.newBtn, { backgroundColor: '#10B981' }]}
          >
            <FontAwesome5 name="plus" size={11} color="#FFF" />
            <Text style={styles.newBtnText}>Nuevo Chat</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notice Banner */}
      {statusNotice && (
        <View
          style={[
            styles.noticeBanner,
            statusNotice.type === 'success'
              ? {
                  backgroundColor: 'rgba(16,185,129,0.16)',
                  borderColor: colors.success,
                }
              : statusNotice.type === 'error'
              ? {
                  backgroundColor: 'rgba(244,63,94,0.16)',
                  borderColor: colors.error,
                }
              : {
                  backgroundColor: 'rgba(56,189,248,0.16)',
                  borderColor: colors.secondary,
                },
          ]}
        >
          <FontAwesome5
            name={
              statusNotice.type === 'success'
                ? 'check-circle'
                : statusNotice.type === 'error'
                ? 'exclamation-circle'
                : 'info-circle'
            }
            size={13}
            color={
              statusNotice.type === 'success'
                ? colors.success
                : statusNotice.type === 'error'
                ? colors.error
                : colors.secondary
            }
          />
          <Text
            style={[
              styles.noticeText,
              {
                color:
                  statusNotice.type === 'success'
                    ? colors.success
                    : statusNotice.type === 'error'
                    ? colors.error
                    : colors.secondary,
              },
            ]}
          >
            {statusNotice.text}
          </Text>
          <TouchableOpacity onPress={() => setStatusNotice(null)}>
            <FontAwesome5 name="times" size={11} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* MAIN VIEW: ACTIVE CONVERSATION OR INBOX */}
      <View style={{ flex: 1 }}>
        {selectedPhone ? (
          /* ACTIVE CONVERSATION ROOM */
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            style={[
              styles.chatRoomContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {/* Chat Room Header */}
            <View
              style={[
                styles.chatRoomHeader,
                { borderBottomColor: colors.border },
              ]}
            >
              <TouchableOpacity
                onPress={() => setSelectedPhone(null)}
                style={styles.backBtn}
              >
                <FontAwesome5
                  name="chevron-left"
                  size={16}
                  color={colors.primary}
                />
              </TouchableOpacity>

              <View
                style={[
                  styles.avatarCircleSmall,
                  { backgroundColor: '#10B981' },
                ]}
              >
                <Text style={styles.avatarTextSmall}>
                  {(selectedName?.[0] || 'C').toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text
                  style={[styles.chatHeaderName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {selectedName || selectedPhone}
                </Text>
                <Text style={[styles.chatHeaderPhone, { color: colors.textMuted }]}>
                  +{selectedPhone}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  loadRecentBookings();
                  setShowVoucherModal(true);
                }}
                style={[
                  styles.sendVoucherBtn,
                  { backgroundColor: '#0284C7', borderColor: '#0284C7' },
                ]}
              >
                <FontAwesome5 name="file-pdf" size={12} color="#FFFFFF" />
                <Text style={[styles.sendVoucherText, { color: '#FFFFFF' }]}>
                  Enviar PDF
                </Text>
              </TouchableOpacity>
            </View>

            {/* Messages Feed */}
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text
                  style={[styles.loadingText, { color: colors.textSecondary }]}
                >
                  Cargando mensajes...
                </Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
                onContentSizeChange={() =>
                  flatListRef.current?.scrollToEnd({ animated: true })
                }
                renderItem={({ item }) => {
                  const isOutbound = item.direction === 'outbound';
                  const hasPdfAttachment =
                    item.text.includes('PDF ENVIADO') ||
                    item.text.includes('DOCUMENTO ADJUNTO');
                  return (
                    <View
                      style={[
                        styles.messageBubbleWrapper,
                        isOutbound ? styles.bubbleRight : styles.bubbleLeft,
                      ]}
                    >
                      <View
                        style={[
                          styles.messageBubble,
                          isOutbound
                            ? {
                                backgroundColor: '#065F46',
                                borderColor: 'rgba(16,185,129,0.4)',
                              }
                            : {
                                backgroundColor: colors.surfaceLight,
                                borderColor: colors.border,
                              },
                        ]}
                      >
                        {item.is_auto_reply ? (
                          <View style={styles.aiTag}>
                            <FontAwesome5 name="robot" size={9} color="#38BDF8" />
                            <Text style={styles.aiTagText}>
                              Asistente IA Multi-Empresa
                            </Text>
                          </View>
                        ) : item.sender_name && isOutbound ? (
                          <Text style={styles.senderTagText}>
                            {item.sender_name}
                          </Text>
                        ) : null}

                        <Text
                          style={[
                            styles.messageBubbleText,
                            { color: isOutbound ? '#F8FAFC' : colors.text },
                          ]}
                        >
                          {item.text}
                        </Text>

                        {hasPdfAttachment && (
                          <TouchableOpacity
                            onPress={() => openDirectPdfFromBubble(item.text)}
                            style={styles.pdfBubbleBtn}
                          >
                            <FontAwesome5
                              name="download"
                              size={11}
                              color="#FFFFFF"
                            />
                            <Text style={styles.pdfBubbleBtnText}>
                              Descargar PDF Oficial
                            </Text>
                          </TouchableOpacity>
                        )}

                        <View style={styles.bubbleFooter}>
                          <Text
                            style={[
                              styles.bubbleTime,
                              {
                                color: isOutbound
                                  ? 'rgba(255,255,255,0.7)'
                                  : colors.textMuted,
                              },
                            ]}
                          >
                            {item.created_at || ''}
                          </Text>
                          {isOutbound && (
                            <FontAwesome5
                              name="check-double"
                              size={9}
                              color="#38BDF8"
                            />
                          )}
                        </View>
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyMessages}>
                    <FontAwesome5
                      name="comment-dots"
                      size={28}
                      color={colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.emptyMessagesText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      No hay mensajes registrados aún en este chat.
                    </Text>
                  </View>
                }
              />
            )}

            {/* Quick Templates Bar */}
            <View
              style={[
                styles.templatesContainer,
                { borderTopColor: colors.border },
              ]}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingHorizontal: 8 }}
              >
                {QUICK_TEMPLATES.map((tmpl, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleSendMessage(tmpl.text)}
                    style={[
                      styles.templateChip,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
                        borderColor: isDark ? '#334155' : '#CBD5E1',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.templateChipText,
                        { color: isDark ? '#F1F5F9' : '#0F172A' },
                      ]}
                    >
                      {tmpl.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Message Input */}
            <View
              style={[styles.chatInputBar, { borderTopColor: colors.border }]}
            >
              <TextInput
                value={messageInput}
                onChangeText={setMessageInput}
                placeholder="Escribe un mensaje de WhatsApp..."
                placeholderTextColor={colors.textMuted}
                multiline
                style={[
                  styles.chatTextInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.surfaceLight,
                    borderColor: colors.border,
                  },
                ]}
              />
              <TouchableOpacity
                disabled={sending || !messageInput.trim()}
                onPress={() => handleSendMessage()}
                style={[
                  styles.sendBtn,
                  { backgroundColor: '#10B981' },
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
          /* CONVERSATIONS INBOX */
          <View style={{ flex: 1 }}>
            {/* Search & Company Brand Bar */}
            <View
              style={[
                styles.searchBox,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <FontAwesome5 name="search" size={13} color={colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar cliente, teléfono o empresa..."
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.text }]}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <FontAwesome5
                    name="times-circle"
                    size={13}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredConversations}
              keyExtractor={(item) => item.phone}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => {
                const initial = (
                  item.name?.[0] ||
                  item.phone?.[0] ||
                  'C'
                ).toUpperCase();
                const isOutbound = item.direction === 'outbound';
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedPhone(item.phone);
                      setSelectedName(item.name);
                    }}
                    style={[
                      styles.convoCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.convoAvatar,
                        { backgroundColor: '#0D9488' },
                      ]}
                    >
                      <Text style={styles.convoAvatarText}>{initial}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.convoTopLine}>
                        <Text
                          style={[styles.convoName, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {item.name || `+${item.phone}`}
                        </Text>
                        <Text
                          style={[styles.convoTime, { color: colors.textMuted }]}
                        >
                          {item.last_time || ''}
                        </Text>
                      </View>

                      <Text
                        style={[styles.convoSub, { color: colors.textMuted }]}
                      >
                        +{item.phone}
                      </Text>

                      <View style={styles.convoLastMsgRow}>
                        <FontAwesome5
                          name={isOutbound ? 'arrow-up' : 'arrow-down'}
                          size={10}
                          color={isOutbound ? '#38BDF8' : '#10B981'}
                          style={{ marginRight: 5 }}
                        />
                        <Text
                          style={[
                            styles.convoLastMsg,
                            { color: colors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {item.last_message || 'Sin mensajes recientes'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyInbox}>
                  <FontAwesome5
                    name="whatsapp"
                    size={42}
                    color={colors.textMuted}
                  />
                  <Text style={[styles.emptyInboxTitle, { color: colors.text }]}>
                    Bandeja Multi-Empresa Lista
                  </Text>
                  <Text
                    style={[
                      styles.emptyInboxSub,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Toca en "+ Nuevo Chat" para comunicarte con clientes de cualquier empresa o enviarles su Voucher y Recibo PDF.
                  </Text>
                </View>
              }
            />
          </View>
        )}
      </View>

      {/* MODAL: NEW CHAT */}
      <Modal
        visible={showNewChatModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewChatModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FontAwesome5 name="whatsapp" size={18} color="#10B981" />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Nuevo Chat Multi-Empresa
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowNewChatModal(false)}>
                <FontAwesome5 name="times" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Número telefónico (+código país, ej: +57300...)
              </Text>
              <TextInput
                value={newChatPhone}
                onChangeText={setNewChatPhone}
                keyboardType="phone-pad"
                placeholder="+573001234567"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.fieldInput,
                  {
                    backgroundColor: colors.surfaceLight,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Nombre del Cliente / Empresa (Opcional)
              </Text>
              <TextInput
                value={newChatName}
                onChangeText={setNewChatName}
                placeholder="Ej. Carlos Mendoza - Hotel Estelar"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.fieldInput,
                  {
                    backgroundColor: colors.surfaceLight,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Mensaje Inicial
              </Text>
              <TextInput
                value={newChatMessage}
                onChangeText={setNewChatMessage}
                multiline
                numberOfLines={3}
                placeholder="¡Hola! Te escribimos de la Central de Reservas..."
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.fieldInput,
                  {
                    backgroundColor: colors.surfaceLight,
                    borderColor: colors.border,
                    color: colors.text,
                    height: 75,
                  },
                ]}
              />
            </View>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                onPress={() => setShowNewChatModal(false)}
                style={[
                  styles.secondaryModalBtn,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
                    borderColor: isDark ? '#334155' : '#CBD5E1',
                  },
                ]}
              >
                <Text
                  style={{
                    color: isDark ? '#F1F5F9' : '#0F172A',
                    fontWeight: '800',
                  }}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={newChatSending}
                onPress={handleStartNewChat}
                style={[
                  styles.primaryActionBtn,
                  { flex: 1, backgroundColor: '#10B981' },
                  newChatSending && { opacity: 0.6 },
                ]}
              >
                {newChatSending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <FontAwesome5 name="paper-plane" size={12} color="#FFF" />
                    <Text style={styles.primaryActionBtnText}>
                      Enviar Mensaje
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: SEND VOUCHER & RECEIPT PDF (MULTI-EMPRESA) */}
      <Modal
        visible={showVoucherModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVoucherModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FontAwesome5 name="file-pdf" size={16} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Enviar PDF Oficial por WhatsApp
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowVoucherModal(false)}>
                <FontAwesome5 name="times" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Document Type Selector */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              1. Selecciona qué documento enviar:
            </Text>
            <View style={styles.docTypeRow}>
              {[
                { key: 'both', label: '📦 Ambos PDFs' },
                { key: 'voucher', label: '✈️ Reserva' },
                { key: 'receipt', label: '🧾 Recibo' },
              ].map((opt) => {
                const active = docTypeToSend === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => setDocTypeToSend(opt.key as any)}
                    style={[
                      styles.docTypePill,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : isDark
                          ? '#1E293B'
                          : '#E2E8F0',
                        borderColor: active
                          ? colors.primary
                          : isDark
                          ? '#334155'
                          : '#CBD5E1',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: active
                          ? '#FFFFFF'
                          : isDark
                          ? '#F1F5F9'
                          : '#0F172A',
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                2. Código de Reserva (o toca una reserva abajo):
              </Text>
              <TextInput
                value={voucherCodeInput}
                onChangeText={(v) => setVoucherCodeInput(v.toUpperCase())}
                autoCapitalize="characters"
                placeholder="Ej. AEROA1"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.fieldInput,
                  {
                    backgroundColor: colors.surfaceLight,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
            </View>

            {recentBookings.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={[
                    styles.fieldLabel,
                    { color: colors.textMuted, marginBottom: 6 },
                  ]}
                >
                  Reservas recientes (todas las empresas):
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6 }}
                >
                  {recentBookings.map((b) => {
                    const selected = voucherCodeInput === b.code;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        onPress={() => {
                          setVoucherCodeInput(b.code);
                          if (b.hotel_name) setCompanyBrand(b.hotel_name);
                        }}
                        style={[
                          styles.bookingQuickChip,
                          {
                            backgroundColor: selected
                              ? '#0284C7'
                              : isDark
                              ? '#1E293B'
                              : '#E2E8F0',
                            borderColor: selected
                              ? '#0284C7'
                              : isDark
                              ? '#334155'
                              : '#CBD5E1',
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '900',
                            color: selected
                              ? '#FFFFFF'
                              : isDark
                              ? '#F1F5F9'
                              : '#0F172A',
                          }}
                        >
                          #{b.code}
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            color: selected
                              ? '#E0F2FE'
                              : colors.textSecondary,
                          }}
                          numberOfLines={1}
                        >
                          {b.first_name} • {b.hotel_name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                3. Nombre de la Empresa / Hotel remitente (Opcional):
              </Text>
              <TextInput
                value={companyBrand}
                onChangeText={setCompanyBrand}
                placeholder="Ej. Hotel Caribe / Agencia Global"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.fieldInput,
                  {
                    backgroundColor: colors.surfaceLight,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
            </View>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                onPress={() => setShowVoucherModal(false)}
                style={[
                  styles.secondaryModalBtn,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
                    borderColor: isDark ? '#334155' : '#CBD5E1',
                  },
                ]}
              >
                <Text
                  style={{
                    color: isDark ? '#F1F5F9' : '#0F172A',
                    fontWeight: '800',
                  }}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={sendingVoucher || !voucherCodeInput.trim()}
                onPress={handleSendVoucher}
                style={[
                  styles.primaryActionBtn,
                  { flex: 1, backgroundColor: '#0284C7' },
                  (sendingVoucher || !voucherCodeInput.trim()) && {
                    opacity: 0.6,
                  },
                ]}
              >
                {sendingVoucher ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <FontAwesome5 name="paper-plane" size={12} color="#FFF" />
                    <Text style={styles.primaryActionBtnText}>Enviar PDF</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  headerTitle: { fontSize: 21, fontWeight: '900', marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  noticeText: { fontSize: 12, fontWeight: '700', flex: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 13 },
  convoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  convoAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convoAvatarText: { color: '#FFF', fontWeight: '900', fontSize: 17 },
  convoTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convoName: { fontSize: 14, fontWeight: '800', flex: 1 },
  convoTime: { fontSize: 11 },
  convoSub: { fontSize: 11, marginTop: 1 },
  convoLastMsgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  convoLastMsg: { fontSize: 12, flex: 1 },
  emptyInbox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyInboxTitle: { fontSize: 16, fontWeight: '800', marginTop: 12 },
  emptyInboxSub: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  chatRoomContainer: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  chatRoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 6, marginRight: 4 },
  avatarCircleSmall: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextSmall: { color: '#FFF', fontWeight: '900', fontSize: 14 },
  chatHeaderName: { fontSize: 14, fontWeight: '800' },
  chatHeaderPhone: { fontSize: 11 },
  sendVoucherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
  },
  sendVoucherText: { fontSize: 11, fontWeight: '800' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 8, fontSize: 12 },
  messageBubbleWrapper: { marginVertical: 4 },
  bubbleRight: { alignItems: 'flex-end' },
  bubbleLeft: { alignItems: 'flex-start' },
  messageBubble: {
    maxWidth: '84%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  aiTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38BDF8',
    textTransform: 'uppercase',
  },
  senderTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#A7F3D0',
    marginBottom: 3,
  },
  messageBubbleText: { fontSize: 13, lineHeight: 18 },
  pdfBubbleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#0284C7',
  },
  pdfBubbleBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  bubbleTime: { fontSize: 9 },
  emptyMessages: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyMessagesText: { fontSize: 12, marginTop: 8, textAlign: 'center' },
  templatesContainer: { borderTopWidth: 1, paddingVertical: 6 },
  templateChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  templateChipText: { fontSize: 11, fontWeight: '800' },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderTopWidth: 1,
  },
  chatTextInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    maxHeight: 80,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', marginBottom: 5 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  docTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  docTypePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingQuickChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: 165,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  primaryActionBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  secondaryModalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.78)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: { borderRadius: 20, borderWidth: 1, padding: 16 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: '900' },
  modalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
});
