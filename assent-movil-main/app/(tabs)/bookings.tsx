import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { API_URL, DOWNLOAD_BASE_URL } from '../../constants/Config';

const apiBase = API_URL;
const CURRENCIES = ['EUR', 'USD', 'COP', 'GBP', 'MXN', 'ARS', 'CLP', 'PEN', 'BRL'];

const formatCurrency = (val: any, code = 'EUR') => {
  const num = Number(val || 0);
  return `${code} ${num.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const resolveImageUrl = (img?: string | null) => {
  if (!img) return null;
  if (img.startsWith('blob:') || img.startsWith('data:') || img.startsWith('http')) return img;
  const base = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
  const path = img.startsWith('/') ? img : `/${img}`;
  return `${base}${path}`;
};

const calcNights = (checkIn?: string, checkOut?: string) => {
  if (!checkIn || !checkOut) return 1;
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return isNaN(diff) || diff < 1 ? 1 : diff;
};

export default function BookingsScreen() {
  const { token, role, permissions } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();

  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [q, setQ] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [confirmDeleteBooking, setConfirmDeleteBooking] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState<any>({
    first_name: '',
    email: '',
    phone: '',
    address: '',
    location: '',
    hotel_name: '',
    room_type: '',
    check_in_date: '',
    check_out_date: '',
    room_value: '',
    rooms_count: '1',
    guests_count: '2',
    currency_code: 'EUR',
    logo_image: null,
    first_image: null,
    second_image: null,
  });

  const isSuperAdmin = role === 'super_admin' || role === 'admin';
  const canCreate = isSuperAdmin || Boolean(permissions?.can_create_bookings) || role === 'employee';
  const canEdit = isSuperAdmin || Boolean(permissions?.can_edit_bookings) || role === 'employee';
  const canDelete = isSuperAdmin || Boolean(permissions?.can_delete_bookings);

  const authHeaders = (tkn: string) => ({ Authorization: `Bearer ${tkn}` });

  const loadBookings = async (overridePage?: number, overrideOrdering?: string) => {
    if (!token) return;
    setLoading(true);
    setMsg(null);
    try {
      const targetPage = overridePage ?? page;
      const targetOrder = overrideOrdering ?? ordering;
      const url = new URL(`${apiBase}/users/api/bookings/`);
      if (q.trim()) url.searchParams.set('q', q.trim());
      if (targetOrder) url.searchParams.set('ordering', targetOrder);
      url.searchParams.set('page', String(targetPage));
      url.searchParams.set('page_size', String(pageSize));

      const res = await fetch(url.toString(), { headers: authHeaders(token) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'No se pudieron cargar las reservas');
      setList(data.results || []);
      setTotal(Number(data.total || 0));
      setPage(Number(data.page || targetPage));
      setPageSize(Number(data.page_size || 10));
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Error al cargar reservas' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadBookings(1);
  }, [token]);

  const openEditModal = (b: any) => {
    setEditingBooking(b);
    setEditForm({
      first_name: b.first_name || '',
      email: b.email || '',
      phone: b.phone || '',
      address: b.address || '',
      location: b.location || '',
      hotel_name: b.hotel_name || '',
      room_type: b.room_type || '',
      check_in_date: b.check_in_date || '',
      check_out_date: b.check_out_date || '',
      room_value: String(b.room_value ?? ''),
      rooms_count: String(b.rooms_count ?? 1),
      guests_count: String(b.guests_count ?? 1),
      currency_code: b.currency_code || 'EUR',
      logo_image: null,
      first_image: null,
      second_image: null,
    });
  };

  const pickEditImage = async (field: 'logo_image' | 'first_image' | 'second_image') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setEditForm((prev: any) => ({ ...prev, [field]: result.assets[0] }));
    }
  };

  const appendImageToFormData = async (fd: FormData, fieldName: string, asset: any) => {
    if (!asset) return;
    const uri = asset.uri;
    const filename = asset.fileName || uri.split('/').pop() || `${fieldName}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = asset.mimeType || (match ? `image/${match[1]}` : 'image/jpeg');

    if (Platform.OS === 'web') {
      if (asset.file) {
        fd.append(fieldName, asset.file, filename);
        return;
      }
      const res = await fetch(uri);
      const blob = await res.blob();
      fd.append(fieldName, blob, filename);
    } else {
      fd.append(fieldName, { uri, name: filename, type } as any);
    }
  };

  const submitEditBooking = async () => {
    if (!editingBooking || !token) return;
    setSavingEdit(true);
    setMsg(null);
    try {
      const fd = new FormData();
      const textFields = [
        'first_name',
        'email',
        'phone',
        'address',
        'location',
        'hotel_name',
        'room_type',
        'check_in_date',
        'check_out_date',
        'room_value',
        'rooms_count',
        'guests_count',
        'currency_code',
      ];
      textFields.forEach((k) => {
        if (editForm[k] !== undefined && editForm[k] !== null) {
          fd.append(k, String(editForm[k]).trim());
        }
      });

      if (editForm.logo_image) {
        await appendImageToFormData(fd, 'logo_image', editForm.logo_image);
      }
      if (editForm.first_image) {
        await appendImageToFormData(fd, 'first_image', editForm.first_image);
      }
      if (editForm.second_image) {
        await appendImageToFormData(fd, 'second_image', editForm.second_image);
      }

      const res = await fetch(`${apiBase}/users/api/bookings/${editingBooking.id}/`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.message || 'No se pudo actualizar la reserva');
      }

      setMsg({
        type: 'success',
        text: `Reserva #${data.code || editingBooking.code} actualizada correctamente`,
      });
      setEditingBooking(null);
      loadBookings(page);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Error al guardar cambios' });
    } finally {
      setSavingEdit(false);
    }
  };

  const performDelete = async (id: number) => {
    if (!token) return;
    setMsg(null);
    try {
      const res = await fetch(`${apiBase}/users/api/bookings/${id}/`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch {}
      if (!res.ok) {
        throw new Error((data && (data.detail || data.message)) || 'No se pudo eliminar');
      }
      setMsg({ type: 'success', text: 'Reserva eliminada correctamente' });
      setConfirmDeleteBooking(null);
      loadBookings(page);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  const openPublicDownloadPage = (code?: string) => {
    if (!code) return;
    const base = DOWNLOAD_BASE_URL.endsWith('/') ? DOWNLOAD_BASE_URL.slice(0, -1) : DOWNLOAD_BASE_URL;
    const downloadUrl = `${base}/download/${encodeURIComponent(code)}`;
    Linking.openURL(downloadUrl).catch(() => {});
  };

  const totalPages = Math.max(1, Math.ceil(total / (pageSize || 1)));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Executive Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerEyebrow, { color: colors.primary }]}>
            AEROAGENCIA • OPERACIONES
          </Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Reservas Activas</Text>
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
              size={14}
              color={isDark ? colors.warning : colors.secondary}
            />
          </TouchableOpacity>
          {canCreate && (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/create-booking')}
              style={[styles.newBtn, { backgroundColor: colors.primary }]}
            >
              <FontAwesome5 name="plus" size={12} color="#FFF" />
              <Text style={styles.newBtnText}>Nueva</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Alert Banner */}
      {msg && (
        <View
          style={[
            styles.msgBanner,
            msg.type === 'success'
              ? { backgroundColor: 'rgba(16,185,129,0.14)', borderColor: colors.success }
              : { backgroundColor: 'rgba(244,63,94,0.14)', borderColor: colors.error },
          ]}
        >
          <FontAwesome5
            name={msg.type === 'success' ? 'check-circle' : 'exclamation-circle'}
            size={14}
            color={msg.type === 'success' ? colors.success : colors.error}
          />
          <Text
            style={[
              styles.msgText,
              { color: msg.type === 'success' ? colors.success : colors.error },
            ]}
          >
            {msg.text}
          </Text>
        </View>
      )}

      {/* Search & Filter Card */}
      <View
        style={[
          styles.filterCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchBox,
              { backgroundColor: colors.surfaceLight, borderColor: colors.border },
            ]}
          >
            <FontAwesome5 name="search" size={13} color={colors.textMuted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              onSubmitEditing={() => {
                setPage(1);
                loadBookings(1);
              }}
              placeholder="Buscar por código, huésped, hotel o correo..."
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {q.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setQ('');
                  setPage(1);
                  loadBookings(1);
                }}
              >
                <FontAwesome5 name="times-circle" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() => {
              setPage(1);
              loadBookings(1);
            }}
            style={[styles.searchBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.searchBtnText}>Buscar</Text>
          </TouchableOpacity>
        </View>

        {/* Ordering Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          {[
            { key: '-created_at', label: 'Más recientes', icon: 'clock' },
            { key: 'check_in_date', label: 'Próximo Check-In', icon: 'calendar-check' },
            { key: '-room_value', label: 'Mayor Valor', icon: 'dollar-sign' },
          ].map((ord) => {
            const active = ordering === ord.key;
            return (
              <TouchableOpacity
                key={ord.key}
                onPress={() => {
                  setOrdering(ord.key);
                  setPage(1);
                  loadBookings(1, ord.key);
                }}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.primary : colors.surfaceLight,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <FontAwesome5
                  name={ord.icon as any}
                  size={10}
                  color={active ? '#FFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    { color: active ? '#FFF' : colors.textSecondary },
                  ]}
                >
                  {ord.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Bookings List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Sincronizando reservas...
          </Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item: any) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }: any) => {
            const nights = calcNights(item.check_in_date, item.check_out_date);
            const totalStay =
              Number(item.room_value || 0) * Number(item.rooms_count || 1) * nights;
            const logoUri = resolveImageUrl(item.logo_image);
            const thumbUri = resolveImageUrl(item.first_image || item.second_image);

            return (
              <View
                style={[
                  styles.bookingCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {/* Top Card Header */}
                <View style={styles.cardTopRow}>
                  <View style={styles.hotelIdentity}>
                    {logoUri || thumbUri ? (
                      <Image
                        source={{ uri: (logoUri || thumbUri)! }}
                        style={[styles.cardThumb, { borderColor: colors.border }]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.cardThumbPlaceholder,
                          { backgroundColor: 'rgba(20,184,166,0.14)' },
                        ]}
                      >
                        <FontAwesome5 name="hotel" size={16} color={colors.primary} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.hotelTitle, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {item.hotel_name || 'Alojamiento AeroAgencia'}
                      </Text>
                      <Text
                        style={[styles.hotelSub, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        <FontAwesome5 name="map-marker-alt" size={10} />{' '}
                        {item.location || item.address || 'Ubicación confirmada'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.codeBadge,
                      {
                        backgroundColor: 'rgba(20,184,166,0.14)',
                        borderColor: 'rgba(20,184,166,0.35)',
                      },
                    ]}
                  >
                    <Text style={[styles.codeBadgeText, { color: colors.primary }]}>
                      #{item.code || item.id}
                    </Text>
                  </View>
                </View>

                {/* Guest & Dates Summary Grid */}
                <View
                  style={[
                    styles.summaryGrid,
                    { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.summaryCol}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                      HUÉSPED TITULAR
                    </Text>
                    <Text
                      style={[styles.summaryValue, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {item.first_name || '-'}
                    </Text>
                    <Text
                      style={[styles.summarySub, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {item.email || item.phone || '-'}
                    </Text>
                  </View>

                  <View style={styles.summaryCol}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                      ESTANCIA ({nights} {nights === 1 ? 'NOCHE' : 'NOCHES'})
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {item.check_in_date || '-'} → {item.check_out_date || '-'}
                    </Text>
                    <Text
                      style={[styles.summarySub, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {item.room_type || 'Estándar'} • {item.rooms_count || 1} hab •{' '}
                      {item.guests_count || 1} huésp.
                    </Text>
                  </View>
                </View>

                {/* Bottom Total & Actions Row */}
                <View style={styles.cardFooterRow}>
                  <View>
                    <Text style={[styles.totalLabel, { color: colors.textMuted }]}>
                      TOTAL RESERVA
                    </Text>
                    <Text style={[styles.totalValue, { color: colors.primary }]}>
                      {formatCurrency(totalStay, item.currency_code || 'EUR')}
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() => setSelectedBooking(item)}
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: 'rgba(56,189,248,0.14)',
                          borderColor: 'rgba(56,189,248,0.35)',
                        },
                      ]}
                    >
                      <FontAwesome5 name="file-pdf" size={12} color={colors.secondary} />
                      <Text style={[styles.actionBtnText, { color: colors.secondary }]}>
                        PDF / Ver
                      </Text>
                    </TouchableOpacity>

                    {canEdit && (
                      <TouchableOpacity
                        onPress={() => openEditModal(item)}
                        style={[
                          styles.actionBtn,
                          {
                            backgroundColor: 'rgba(20,184,166,0.14)',
                            borderColor: 'rgba(20,184,166,0.35)',
                          },
                        ]}
                      >
                        <FontAwesome5 name="edit" size={12} color={colors.primary} />
                        <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                          Editar
                        </Text>
                      </TouchableOpacity>
                    )}

                    {canDelete && (
                      <TouchableOpacity
                        onPress={() => setConfirmDeleteBooking(item)}
                        style={[
                          styles.actionBtn,
                          {
                            backgroundColor: 'rgba(244,63,94,0.14)',
                            borderColor: 'rgba(244,63,94,0.35)',
                          },
                        ]}
                      >
                        <FontAwesome5 name="trash" size={12} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <FontAwesome5 name="calendar-times" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Sin reservas encontradas
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Ajusta los filtros o registra una nueva reserva operativa.
              </Text>
            </View>
          }
        />
      )}

      {/* Pagination Footer */}
      <View
        style={[
          styles.paginationBar,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.pageInfoText, { color: colors.textSecondary }]}>
          Total: <Text style={{ fontWeight: '800', color: colors.text }}>{total}</Text>
        </Text>
        <View style={styles.pageBtnsRow}>
          <TouchableOpacity
            disabled={page <= 1}
            onPress={() => {
              const prev = Math.max(1, page - 1);
              setPage(prev);
              loadBookings(prev);
            }}
            style={[
              styles.pageBtn,
              { backgroundColor: colors.surfaceLight, borderColor: colors.border },
              page <= 1 && { opacity: 0.4 },
            ]}
          >
            <Text style={[styles.pageBtnText, { color: colors.text }]}>Anterior</Text>
          </TouchableOpacity>

          <Text style={[styles.pageCounter, { color: colors.text }]}>
            {page} / {totalPages}
          </Text>

          <TouchableOpacity
            disabled={page >= totalPages}
            onPress={() => {
              const next = Math.min(totalPages, page + 1);
              setPage(next);
              loadBookings(next);
            }}
            style={[
              styles.pageBtn,
              { backgroundColor: colors.surfaceLight, borderColor: colors.border },
              page >= totalPages && { opacity: 0.4 },
            ]}
          >
            <Text style={[styles.pageBtnText, { color: colors.text }]}>Siguiente</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MODAL 1: VIEW DETAILS & DOWNLOAD OFFICIAL PDFs */}
      <Modal
        visible={Boolean(selectedBooking)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedBooking(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {selectedBooking && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalEyebrow, { color: colors.primary }]}>
                      EXPEDIENTE OFICIAL • #{selectedBooking.code || selectedBooking.id}
                    </Text>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      {selectedBooking.hotel_name || 'Detalle de Reserva'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedBooking(null)}
                    style={[styles.closeCircle, { backgroundColor: colors.surfaceLight }]}
                  >
                    <FontAwesome5 name="times" size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
                  {/* Custom Header Logo Preview if present */}
                  {resolveImageUrl(selectedBooking.logo_image) && (
                    <View
                      style={[
                        styles.detailSection,
                        { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.detailSectionTitle, { color: colors.primary }]}>
                        LOGO DEL ENCABEZADO PDF
                      </Text>
                      <Image
                        source={{ uri: resolveImageUrl(selectedBooking.logo_image)! }}
                        style={styles.logoPreviewBanner}
                        resizeMode="contain"
                      />
                    </View>
                  )}

                  <View
                    style={[
                      styles.detailSection,
                      { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.detailSectionTitle, { color: colors.primary }]}>
                      DATOS DEL HUÉSPED Y ALOJAMIENTO
                    </Text>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailKey, { color: colors.textSecondary }]}>
                        Huésped:
                      </Text>
                      <Text style={[styles.detailVal, { color: colors.text }]}>
                        {selectedBooking.first_name}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailKey, { color: colors.textSecondary }]}>
                        Correo:
                      </Text>
                      <Text style={[styles.detailVal, { color: colors.text }]}>
                        {selectedBooking.email}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailKey, { color: colors.textSecondary }]}>
                        Teléfono:
                      </Text>
                      <Text style={[styles.detailVal, { color: colors.text }]}>
                        {selectedBooking.phone}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailKey, { color: colors.textSecondary }]}>
                        Dirección:
                      </Text>
                      <Text style={[styles.detailVal, { color: colors.text }]}>
                        {selectedBooking.address}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailKey, { color: colors.textSecondary }]}>
                        Tipo de habitación:
                      </Text>
                      <Text style={[styles.detailVal, { color: colors.text }]}>
                        {selectedBooking.room_type}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailKey, { color: colors.textSecondary }]}>
                        Check-In / Check-Out:
                      </Text>
                      <Text style={[styles.detailVal, { color: colors.text }]}>
                        {selectedBooking.check_in_date} → {selectedBooking.check_out_date}
                      </Text>
                    </View>
                  </View>

                  {/* Portal Download CTA */}
                  <View
                    style={[
                      styles.detailSection,
                      {
                        backgroundColor: 'rgba(20,184,166,0.1)',
                        borderColor: 'rgba(20,184,166,0.35)',
                      },
                    ]}
                  >
                    <Text style={[styles.detailSectionTitle, { color: colors.primary }]}>
                      DESCARGA DE RECIBO Y RESERVA OFICIAL (PDF)
                    </Text>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 12,
                        marginBottom: 12,
                        lineHeight: 18,
                      }}
                    >
                      Abre el visor móvil oficial para previsualizar en tamaño A4 y descargar
                      tanto el Comprobante de Pago como el Documento de Reserva con QR.
                    </Text>
                    <TouchableOpacity
                      onPress={() => openPublicDownloadPage(selectedBooking.code)}
                      style={[styles.primaryModalBtn, { backgroundColor: colors.primary }]}
                    >
                      <FontAwesome5 name="download" size={14} color="#FFF" />
                      <Text style={styles.primaryModalBtnText}>
                        Abrir Centro de Descarga PDF (#{selectedBooking.code})
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: EDIT BOOKING (Including #1 Editable PDF Logo & Free-Text Room Type) */}
      <Modal
        visible={Boolean(editingBooking)}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingBooking(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {editingBooking && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalEyebrow, { color: colors.primary }]}>
                      MODIFICAR EXPEDIENTE • #{editingBooking.code || editingBooking.id}
                    </Text>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      Editar Reserva
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setEditingBooking(null)}
                    style={[styles.closeCircle, { backgroundColor: colors.surfaceLight }]}
                  >
                    <FontAwesome5 name="times" size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 470 }} showsVerticalScrollIndicator={false}>
                  {/* #1 Editable PDF Header Logo */}
                  <View
                    style={[
                      styles.logoUploadBox,
                      {
                        backgroundColor: 'rgba(20,184,166,0.08)',
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <Text style={[styles.logoUploadTitle, { color: colors.primary }]}>
                      1. LOGO DEL ENCABEZADO PDF (EDITABLE)
                    </Text>
                    <Text style={[styles.logoUploadSub, { color: colors.textSecondary }]}>
                      La imagen seleccionada reemplazará el logo superior en el Recibo y la
                      Reserva PDF.
                    </Text>
                    <TouchableOpacity
                      onPress={() => pickEditImage('logo_image')}
                      style={[
                        styles.logoPickerBtn,
                        { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                      ]}
                    >
                      {editForm.logo_image?.uri ||
                      resolveImageUrl(editingBooking.logo_image) ? (
                        <Image
                          source={{
                            uri:
                              editForm.logo_image?.uri ||
                              resolveImageUrl(editingBooking.logo_image)!,
                          }}
                          style={{ width: 180, height: 52 }}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <FontAwesome5 name="image" size={15} color={colors.primary} />
                          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                            Seleccionar / Cambiar Logo PDF
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Form Fields */}
                  {[
                    { key: 'first_name', label: 'Nombre completo del huésped' },
                    { key: 'email', label: 'Correo electrónico' },
                    { key: 'phone', label: 'Teléfono (+código)' },
                    { key: 'hotel_name', label: 'Nombre del Hotel / Alojamiento' },
                    {
                      key: 'room_type',
                      label: 'Tipo de habitación (Texto libre: ej. Suite Presidencial Vista Mar)',
                    },
                    { key: 'address', label: 'Dirección del alojamiento' },
                    { key: 'location', label: 'Ciudad / País' },
                    { key: 'check_in_date', label: 'Fecha Check-In (YYYY-MM-DD)' },
                    { key: 'check_out_date', label: 'Fecha Check-Out (YYYY-MM-DD)' },
                    { key: 'room_value', label: 'Valor por noche', numeric: true },
                    { key: 'rooms_count', label: 'Cantidad de habitaciones', numeric: true },
                    { key: 'guests_count', label: 'Cantidad de huéspedes', numeric: true },
                  ].map((field) => (
                    <View key={field.key} style={styles.editFieldGroup}>
                      <Text style={[styles.editLabel, { color: colors.textSecondary }]}>
                        {field.label}
                      </Text>
                      <TextInput
                        value={String(editForm[field.key] ?? '')}
                        onChangeText={(v) =>
                          setEditForm((prev: any) => ({ ...prev, [field.key]: v }))
                        }
                        keyboardType={field.numeric ? 'numeric' : 'default'}
                        placeholder={field.label}
                        placeholderTextColor={colors.textMuted}
                        style={[
                          styles.editInput,
                          {
                            backgroundColor: colors.surfaceLight,
                            borderColor: colors.border,
                            color: colors.text,
                          },
                        ]}
                      />
                    </View>
                  ))}

                  {/* Currency Selector */}
                  <Text style={[styles.editLabel, { color: colors.textSecondary }]}>
                    Moneda de la reserva
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingVertical: 6, marginBottom: 12 }}
                  >
                    {CURRENCIES.map((c) => {
                      const active = editForm.currency_code === c;
                      return (
                        <TouchableOpacity
                          key={c}
                          onPress={() =>
                            setEditForm((prev: any) => ({ ...prev, currency_code: c }))
                          }
                          style={[
                            styles.filterPill,
                            {
                              backgroundColor: active ? colors.primary : colors.surfaceLight,
                              borderColor: active ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: active ? '#FFF' : colors.textSecondary,
                              fontWeight: '700',
                              fontSize: 12,
                            }}
                          >
                            {c}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Hotel Photos */}
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                    <TouchableOpacity
                      onPress={() => pickEditImage('first_image')}
                      style={[
                        styles.photoBtn,
                        { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                      ]}
                    >
                      <FontAwesome5 name="camera" size={13} color={colors.primary} />
                      <Text style={[styles.photoBtnText, { color: colors.text }]}>
                        {editForm.first_image ? 'Foto 1 Lista' : 'Cambiar Foto 1'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => pickEditImage('second_image')}
                      style={[
                        styles.photoBtn,
                        { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                      ]}
                    >
                      <FontAwesome5 name="camera" size={13} color={colors.secondary} />
                      <Text style={[styles.photoBtnText, { color: colors.text }]}>
                        {editForm.second_image ? 'Foto 2 Lista' : 'Cambiar Foto 2'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                <View style={styles.modalFooterBtns}>
                  <TouchableOpacity
                    onPress={() => setEditingBooking(null)}
                    style={[
                      styles.secondaryModalBtn,
                      { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                    ]}
                  >
                    <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={savingEdit}
                    onPress={submitEditBooking}
                    style={[
                      styles.primaryModalBtn,
                      { flex: 1, backgroundColor: colors.primary },
                      savingEdit && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={styles.primaryModalBtnText}>
                      {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 3: DELETE CONFIRMATION */}
      <Modal
        visible={Boolean(confirmDeleteBooking)}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDeleteBooking(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 8 }]}>
              ¿Eliminar reserva #{confirmDeleteBooking?.code}?
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 18 }}>
              Esta acción eliminará permanentemente la reserva de{' '}
              {confirmDeleteBooking?.first_name}.
            </Text>
            <View style={styles.modalFooterBtns}>
              <TouchableOpacity
                onPress={() => setConfirmDeleteBooking(null)}
                style={[
                  styles.secondaryModalBtn,
                  { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  confirmDeleteBooking && performDelete(confirmDeleteBooking.id)
                }
                style={[
                  styles.primaryModalBtn,
                  { flex: 1, backgroundColor: colors.error },
                ]}
              >
                <Text style={styles.primaryModalBtnText}>Sí, Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  newBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  msgBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  msgText: { fontSize: 12, fontWeight: '700', flex: 1 },
  filterCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 13 },
  searchBtn: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  pillsRow: { gap: 8, paddingTop: 10 },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterPillText: { fontSize: 11, fontWeight: '700' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 10, fontSize: 13, fontWeight: '600' },
  bookingCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  hotelIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardThumb: { width: 44, height: 44, borderRadius: 12, borderWidth: 1 },
  cardThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotelTitle: { fontSize: 15, fontWeight: '800' },
  hotelSub: { fontSize: 12, marginTop: 2 },
  codeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  codeBadgeText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  summaryGrid: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 12,
    marginBottom: 12,
  },
  summaryCol: { flex: 1 },
  summaryLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6, marginBottom: 2 },
  summaryValue: { fontSize: 12, fontWeight: '800' },
  summarySub: { fontSize: 11, marginTop: 2 },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  totalValue: { fontSize: 16, fontWeight: '900' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 11, fontWeight: '800' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 10 },
  emptySub: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  paginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  pageInfoText: { fontSize: 12 },
  pageBtnsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  pageBtnText: { fontSize: 12, fontWeight: '700' },
  pageCounter: { fontSize: 12, fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.78)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContainer: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  modalTitle: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  closeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  logoPreviewBanner: { width: '100%', height: 56, borderRadius: 8 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  detailKey: { fontSize: 12, fontWeight: '600' },
  detailVal: { fontSize: 12, fontWeight: '800', maxWidth: '62%', textAlign: 'right' },
  primaryModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  primaryModalBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  secondaryModalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooterBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  logoUploadBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 14,
  },
  logoUploadTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  logoUploadSub: { fontSize: 11, marginTop: 2, marginBottom: 10 },
  logoPickerBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editFieldGroup: { marginBottom: 10 },
  editLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  editInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  photoBtnText: { fontSize: 12, fontWeight: '700' },
});
