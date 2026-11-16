import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Image as ImageIcon,
  User,
  Hotel,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { API_URL } from '../../constants/Config';

const apiBase = API_URL;
const CURRENCIES = ['EUR', 'USD', 'GBP', 'COP', 'MXN', 'CHF', 'CAD'];

export default function CreateBookingScreen() {
  const { token, role, permissions } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);

  const [form, setForm] = useState({
    logo_image: null as string | null,
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
    rooms_count: '1',
    guests_count: '1',
    children_count: '0',
    pets_count: '0',
    currency_code: 'EUR',
    notes: '',
    first_image: null as string | null,
    second_image: null as string | null,
  });

  const canCreate =
    role === 'admin' ||
    role === 'super_admin' ||
    (role === 'employee' && permissions?.can_create_booking !== false);

  const handleChange = (key: keyof typeof form, value: string | null) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDateChange = (
    field: 'check_in_date' | 'check_out_date',
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (event.type === 'dismissed') {
      if (field === 'check_in_date') setShowCheckInPicker(false);
      if (field === 'check_out_date') setShowCheckOutPicker(false);
      return;
    }
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formatted = `${year}-${month}-${day}`;
      handleChange(field, formatted);
      if (field === 'check_in_date') setShowCheckInPicker(false);
      if (field === 'check_out_date') setShowCheckOutPicker(false);
    }
  };

  const pickImage = async (field: 'logo_image' | 'first_image' | 'second_image') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: field !== 'logo_image',
      aspect: field === 'logo_image' ? undefined : [4, 3],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      handleChange(field, result.assets[0].uri);
    }
  };

  const validateForm = () => {
    const required: [keyof typeof form, string][] = [
      ['first_name', 'Nombre del huésped'],
      ['email', 'Correo electrónico'],
      ['address', 'Dirección del alojamiento'],
      ['check_in_date', 'Fecha de Check-in'],
      ['check_out_date', 'Fecha de Check-out'],
      ['hotel_name', 'Nombre del hotel'],
      ['room_type', 'Tipo de habitación'],
      ['location', 'Ubicación'],
      ['phone', 'Teléfono'],
      ['room_value', 'Valor por noche'],
    ];
    for (const [k, label] of required) {
      if (!String(form[k] || '').trim()) return `${label} es obligatorio`;
    }
    const inDate = new Date(form.check_in_date);
    const outDate = new Date(form.check_out_date);
    if (inDate.toString() === 'Invalid Date' || outDate.toString() === 'Invalid Date') {
      return 'Las fechas deben tener formato YYYY-MM-DD válido';
    }
    if (outDate < inDate) {
      return 'La fecha de salida debe ser posterior a la fecha de entrada';
    }
    return null;
  };

  const extractServerError = (data: any) => {
    if (!data) return null;
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.message === 'string') return data.message;
    if (typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length) {
        const k = keys[0];
        const v = (data as any)[k];
        if (Array.isArray(v) && v.length) return `${k}: ${v[0]}`;
        if (typeof v === 'string') return `${k}: ${v}`;
      }
    }
    return null;
  };

  const appendImageToFormData = async (
    formData: FormData,
    fieldName: string,
    uri: string | null,
    defaultName: string,
  ) => {
    if (!uri) return;
    if (Platform.OS === 'web' && (uri.startsWith('blob:') || uri.startsWith('data:'))) {
      const res = await fetch(uri);
      const blob = await res.blob();
      formData.append(fieldName, blob, defaultName);
      return;
    }
    const filename = uri.split('/').pop() || defaultName;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append(fieldName, { uri, name: filename, type } as any);
  };

  const handleSubmit = async () => {
    if (!token) {
      setMsg({ type: 'error', text: 'No hay sesión activa.' });
      return;
    }
    if (!canCreate) {
      setMsg({ type: 'error', text: 'No tienes permisos para crear reservas.' });
      return;
    }

    const error = validateForm();
    if (error) {
      setMsg({ type: 'error', text: error });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      const formData = new FormData();

      formData.append('first_name', form.first_name.trim());
      formData.append('email', form.email.trim());
      formData.append('address', form.address.trim());
      formData.append('check_in_date', form.check_in_date.trim());
      formData.append('check_out_date', form.check_out_date.trim());
      formData.append('hotel_name', form.hotel_name.trim());
      formData.append('room_type', form.room_type.trim());
      formData.append('location', form.location.trim());
      formData.append('phone', form.phone.trim());
      formData.append('room_value', form.room_value.trim());
      formData.append('rooms_count', form.rooms_count || '1');
      formData.append('guests_count', form.guests_count || '1');
      formData.append('children_count', form.children_count || '0');
      formData.append('pets_count', form.pets_count || '0');
      formData.append('currency_code', form.currency_code || 'EUR');
      if (form.notes.trim()) {
        formData.append('notes', form.notes.trim());
      }

      await appendImageToFormData(formData, 'logo_image', form.logo_image, 'logo.png');
      await appendImageToFormData(formData, 'first_image', form.first_image, 'hotel1.jpg');
      await appendImageToFormData(formData, 'second_image', form.second_image, 'hotel2.jpg');

      const res = await fetch(`${apiBase}/users/api/bookings/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) {
        throw new Error(extractServerError(data) || 'No se pudo crear la reserva');
      }

      setMsg({
        type: 'success',
        text: `¡Reserva creada con éxito! Código: #${data.code || data.id}`,
      });
      Alert.alert(
        'Reserva emitida',
        `Se creó la reserva #${data.code || data.id} para ${data.first_name}.`,
        [
          { text: 'Ver Reservas', onPress: () => router.push('/(tabs)/bookings') },
          { text: 'Crear otra', style: 'cancel' },
        ],
      );

      setForm({
        logo_image: null,
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
        rooms_count: '1',
        guests_count: '1',
        children_count: '0',
        pets_count: '0',
        currency_code: 'EUR',
        notes: '',
        first_image: null,
        second_image: null,
      });
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Live nights & total calculation
  const ciDate = form.check_in_date ? new Date(form.check_in_date) : null;
  const coDate = form.check_out_date ? new Date(form.check_out_date) : null;
  const rawNights =
    ciDate &&
    coDate &&
    ciDate.toString() !== 'Invalid Date' &&
    coDate.toString() !== 'Invalid Date'
      ? Math.round((coDate.getTime() - ciDate.getTime()) / (1000 * 60 * 60 * 24))
      : 1;
  const nights = Math.max(1, isNaN(rawNights) ? 1 : rawNights);
  const estimatedTotal =
    Number(form.room_value || 0) * Number(form.rooms_count || 1) * nights;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>
            Emitir Nueva Reserva
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Completa el expediente para generar el código y los PDFs oficiales.
          </Text>
        </View>
      </View>

      {msg && (
        <View
          style={[
            styles.msgBox,
            msg.type === 'success' ? styles.msgSuccess : styles.msgError,
          ]}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 size={18} color={colors.success} />
          ) : (
            <AlertCircle size={18} color={colors.error} />
          )}
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

      {/* 1. LOGO DEL ENCABEZADO PDF (PRIMERO EN EL FORMULARIO) */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Sparkles size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            1. Logo del Encabezado PDF (Editable)
          </Text>
        </View>
        <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
          Selecciona una imagen para personalizar el logo superior en el PDF de Reserva y Recibo.
        </Text>

        <View style={styles.logoPickerRow}>
          <TouchableOpacity
            onPress={() => pickImage('logo_image')}
            style={[
              styles.logoPreviewBox,
              {
                backgroundColor: colors.surfaceLight,
                borderColor: colors.primary,
              },
            ]}
          >
            {form.logo_image ? (
              <Image
                source={{ uri: form.logo_image }}
                style={styles.logoPreviewImg}
              />
            ) : (
              <View style={{ alignItems: 'center', padding: 10 }}>
                <ImageIcon size={24} color={colors.primary} />
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 12,
                    fontWeight: '700',
                    marginTop: 6,
                  }}
                >
                  Toca para elegir Logo del PDF
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2 }}>
                  PNG o JPG (encabezado de Reserva y Recibo)
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {form.logo_image && (
            <TouchableOpacity
              onPress={() => handleChange('logo_image', null)}
              style={[
                styles.removeLogoBtn,
                { backgroundColor: 'rgba(244, 63, 94, 0.14)' },
              ]}
            >
              <Trash2 size={16} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. DATOS DEL HUÉSPED */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.sectionHeader}>
          <User size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            2. Datos del Titular / Huésped
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            NOMBRE COMPLETO *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceLight,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={form.first_name}
            onChangeText={(v) => handleChange('first_name', v)}
            placeholder="Ej. Carlos Mendoza"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.fieldRow}>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              CORREO ELECTRÓNICO *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceLight,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={form.email}
              onChangeText={(v) => handleChange('email', v)}
              placeholder="cliente@correo.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              TELÉFONO *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceLight,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={form.phone}
              onChangeText={(v) => handleChange('phone', v)}
              placeholder="+34600123456"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>
        </View>
      </View>

      {/* 3. ALOJAMIENTO Y TIPO DE HABITACIÓN LIBRE */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Hotel size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            3. Datos del Hotel y Habitación
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            NOMBRE DEL HOTEL / ALOJAMIENTO *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceLight,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={form.hotel_name}
            onChangeText={(v) => handleChange('hotel_name', v)}
            placeholder="Ej. Grand Hotel Miramar"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            TIPO DE HABITACIÓN (ESCRITURA LIBRE) *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceLight,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={form.room_type}
            onChangeText={(v) => handleChange('room_type', v)}
            placeholder="Escribe libremente (ej. Suite Deluxe Vista al Mar, Doble...)"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.fieldRow}>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              CIUDAD / UBICACIÓN *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceLight,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={form.location}
              onChangeText={(v) => handleChange('location', v)}
              placeholder="Ej. Madrid, España"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              DIRECCIÓN *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceLight,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={form.address}
              onChangeText={(v) => handleChange('address', v)}
              placeholder="Av. Principal 123"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
      </View>

      {/* 4. FECHAS DE ESTANCIA */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Calendar size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            4. Fechas de Check-in y Check-out
          </Text>
        </View>

        <View style={styles.fieldRow}>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              ENTRADA (YYYY-MM-DD) *
            </Text>
            {Platform.OS === 'web' ? (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceLight,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={form.check_in_date}
                onChangeText={(v) => handleChange('check_in_date', v)}
                placeholder="2026-11-20"
                placeholderTextColor={colors.textMuted}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.dateBtn,
                    {
                      backgroundColor: colors.surfaceLight,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setShowCheckInPicker(true)}
                >
                  <Text
                    style={{
                      color: form.check_in_date ? colors.text : colors.textMuted,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    {form.check_in_date || 'Seleccionar fecha'}
                  </Text>
                </TouchableOpacity>
                {showCheckInPicker && (
                  <DateTimePicker
                    value={
                      form.check_in_date ? new Date(form.check_in_date) : new Date()
                    }
                    mode="date"
                    display="default"
                    onChange={(event, date) =>
                      handleDateChange('check_in_date', event, date || new Date())
                    }
                  />
                )}
              </>
            )}
          </View>

          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              SALIDA (YYYY-MM-DD) *
            </Text>
            {Platform.OS === 'web' ? (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceLight,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={form.check_out_date}
                onChangeText={(v) => handleChange('check_out_date', v)}
                placeholder="2026-11-25"
                placeholderTextColor={colors.textMuted}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.dateBtn,
                    {
                      backgroundColor: colors.surfaceLight,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setShowCheckOutPicker(true)}
                >
                  <Text
                    style={{
                      color: form.check_out_date ? colors.text : colors.textMuted,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    {form.check_out_date || 'Seleccionar fecha'}
                  </Text>
                </TouchableOpacity>
                {showCheckOutPicker && (
                  <DateTimePicker
                    value={
                      form.check_out_date ? new Date(form.check_out_date) : new Date()
                    }
                    mode="date"
                    display="default"
                    onChange={(event, date) =>
                      handleDateChange('check_out_date', event, date || new Date())
                    }
                  />
                )}
              </>
            )}
          </View>
        </View>
      </View>

      {/* 5. TARIFAS, CAPACIDAD Y MONEDA */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.sectionHeader}>
          <CreditCard size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            5. Tarifas y Ocupación
          </Text>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          MONEDA
        </Text>
        <View style={styles.currencyRow}>
          {CURRENCIES.map((c) => {
            const active = form.currency_code === c;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => handleChange('currency_code', c)}
                style={[
                  styles.currencyPill,
                  {
                    backgroundColor: active ? colors.primary : colors.surfaceLight,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? '#FFFFFF' : colors.textSecondary,
                    fontSize: 11,
                    fontWeight: '800',
                  }}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.fieldRow}>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              VALOR POR NOCHE *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceLight,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={form.room_value}
              onChangeText={(v) => handleChange('room_value', v)}
              placeholder="150.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              N° HABITACIONES
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceLight,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={form.rooms_count}
              onChangeText={(v) => handleChange('rooms_count', v)}
              placeholder="1"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.fieldRow}>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              ADULTOS / HUÉSPEDES
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceLight,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={form.guests_count}
              onChangeText={(v) => handleChange('guests_count', v)}
              placeholder="2"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
          </View>

          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              NIÑOS
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceLight,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={form.children_count}
              onChangeText={(v) => handleChange('children_count', v)}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            NOTAS ADICIONALES (OPCIONAL)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceLight,
                color: colors.text,
                borderColor: colors.border,
                height: 64,
                textAlignVertical: 'top',
              },
            ]}
            multiline
            value={form.notes}
            onChangeText={(v) => handleChange('notes', v)}
            placeholder="Observaciones o solicitudes especiales..."
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Live Total Banner */}
        <View
          style={[
            styles.totalSummaryBanner,
            { backgroundColor: colors.surfaceLight, borderColor: colors.border },
          ]}
        >
          <View>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
              ESTANCIA ESTIMADA ({nights} noche{nights === 1 ? '' : 's'})
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 10 }}>
              {form.rooms_count || 1} hab. × {form.currency_code} {form.room_value || '0'}
            </Text>
          </View>
          <Text style={{ color: colors.primary, fontSize: 20, fontWeight: '900' }}>
            {form.currency_code} {estimatedTotal.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* 6. FOTOS DEL ALOJAMIENTO */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.sectionHeader}>
          <ImageIcon size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            6. Fotografías del Alojamiento (Para el PDF)
          </Text>
        </View>

        <View style={styles.imageRow}>
          <TouchableOpacity
            onPress={() => pickImage('first_image')}
            style={[
              styles.imageBtn,
              {
                backgroundColor: colors.surfaceLight,
                borderColor: colors.border,
              },
            ]}
          >
            {form.first_image ? (
              <Image source={{ uri: form.first_image }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholderContainer}>
                <ImageIcon size={22} color={colors.primary} />
                <Text style={[styles.imagePlaceholderText, { color: colors.text }]}>
                  Imagen Principal
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                  Toca para subir
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => pickImage('second_image')}
            style={[
              styles.imageBtn,
              {
                backgroundColor: colors.surfaceLight,
                borderColor: colors.border,
              },
            ]}
          >
            {form.second_image ? (
              <Image source={{ uri: form.second_image }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholderContainer}>
                <ImageIcon size={22} color={colors.info} />
                <Text style={[styles.imagePlaceholderText, { color: colors.text }]}>
                  Segunda Imagen
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                  Toca para subir
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitOuter, loading && { opacity: 0.65 }]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.88}
      >
        <LinearGradient
          colors={['#14B8A6', '#0284C7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.submitGradient}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>GUARDAR Y EMITIR RESERVA</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 48,
    paddingBottom: 96,
  },
  headerRow: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  msgBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  msgSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  msgError: {
    backgroundColor: 'rgba(244, 63, 94, 0.14)',
    borderColor: 'rgba(244, 63, 94, 0.35)',
  },
  msgText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  sectionCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  sectionHint: {
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 16,
  },
  logoPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoPreviewBox: {
    flex: 1,
    height: 92,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoPreviewImg: {
    width: '90%',
    height: '80%',
    resizeMode: 'contain',
  },
  removeLogoBtn: {
    width: 44,
    height: 92,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldHalf: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  dateBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  currencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  currencyPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  totalSummaryBanner: {
    marginTop: 6,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imageRow: {
    flexDirection: 'row',
    gap: 10,
  },
  imageBtn: {
    flex: 1,
    height: 120,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 4,
  },
  imagePlaceholderText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  submitOuter: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitGradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
