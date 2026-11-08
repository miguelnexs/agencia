import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { API_URL } from '../../constants/Config';

const apiBase = API_URL;

export default function CreateBookingScreen() {
  const { token, role } = useAuth();
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    email: '',
    address: '',
    check_in_date: '',
    check_out_date: '',
    hotel_name: '',
    room_type: 'single',
    location: '',
    phone: '',
    room_value: '',
    rooms_count: '1',
    guests_count: '1',
    currency_code: 'EUR',
    first_image: null as string | null,
    second_image: null as string | null,
  });

  const canCreate = role === 'admin' || role === 'super_admin' || role === 'employee';

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

  const pickImage = async (field: 'first_image' | 'second_image') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      handleChange(field, result.assets[0].uri);
    }
  };

  const normalizeRoomType = (val: string) => {
    const s = (val || '').toString().trim().toLowerCase();
    if (['single', 'individual', 'simple', 'sencilla', 'indiv'].includes(s)) return 'single';
    if (['double', 'doble', 'duo', '2', 'two'].includes(s)) return 'double';
    if (['suite', 'suíte'].includes(s)) return 'suite';
    return s;
  };

  const validateForm = () => {
    const required: (keyof typeof form)[] = [
      'first_name',
      'email',
      'address',
      'check_in_date',
      'check_out_date',
      'hotel_name',
      'room_type',
      'location',
      'phone',
      'room_value',
      'rooms_count',
      'guests_count',
      'currency_code',
    ];
    for (const k of required) {
      if (!form[k]) return `${k.replace('_', ' ')} es requerido`;
    }
    if (!/^\+?\d{7,15}$/.test(form.phone)) return 'Teléfono inválido';
    const inDate = new Date(form.check_in_date);
    const outDate = new Date(form.check_out_date);
    if (inDate.toString() === 'Invalid Date' || outDate.toString() === 'Invalid Date') return 'Fechas inválidas';
    if (outDate < inDate) return 'Check-out debe ser posterior al check-in';
    const rt = normalizeRoomType(form.room_type);
    if (!['single', 'double', 'suite'].includes(rt)) return 'Tipo de habitación inválido: use individual, doble o suite';
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

      // Append text fields
      formData.append('first_name', form.first_name);
      formData.append('email', form.email);
      formData.append('address', form.address);
      formData.append('check_in_date', form.check_in_date);
      formData.append('check_out_date', form.check_out_date);
      formData.append('hotel_name', form.hotel_name);
      formData.append('room_type', normalizeRoomType(form.room_type || ''));
      formData.append('location', form.location);
      formData.append('phone', form.phone);
      formData.append('room_value', form.room_value);
      formData.append('rooms_count', form.rooms_count);
      formData.append('guests_count', form.guests_count);
      formData.append('currency_code', form.currency_code);

      // Append images
      if (form.first_image) {
        const uri = form.first_image;
        const filename = uri.split('/').pop() || 'image1.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append('first_image', { uri, name: filename, type } as any);
      }
      if (form.second_image) {
        const uri = form.second_image;
        const filename = uri.split('/').pop() || 'image2.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append('second_image', { uri, name: filename, type } as any);
      }


      const res = await fetch(`${apiBase}/users/api/bookings/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Content-Type is handled automatically by fetch for FormData
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
        text: `Reserva creada: ${data.first_name} - ${data.hotel_name}.`,
      });
      Alert.alert('Reserva creada', 'La reserva se creó correctamente.');
      setForm({
        first_name: '',
        email: '',
        address: '',
        check_in_date: '',
        check_out_date: '',
        hotel_name: '',
        room_type: 'single',
        location: '',
        phone: '',
        room_value: '',
        rooms_count: '1',
        guests_count: '1',
        currency_code: 'EUR',
        first_image: null,
        second_image: null,
      });
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nueva reserva</Text>
      <Text style={styles.subtitle}>Completa los datos para crear una nueva reserva.</Text>

      {msg && (
        <View
          style={[
            styles.msg,
            msg.type === 'success' ? styles.msgSuccess : styles.msgError,
          ]}
        >
          <Text style={styles.msgText}>{msg.text}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Datos del huésped</Text>
      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Primer nombre</Text>
          <TextInput
            style={styles.input}
            value={form.first_name}
            onChangeText={(v) => handleChange('first_name', v)}
            placeholder="Primer nombre"
            placeholderTextColor={Colors.dark.textSecondary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            value={form.email}
            onChangeText={(v) => handleChange('email', v)}
            placeholder="correo@ejemplo.com"
            placeholderTextColor={Colors.dark.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Dirección</Text>
          <TextInput
            style={styles.input}
            value={form.address}
            onChangeText={(v) => handleChange('address', v)}
            placeholder="Calle y número"
            placeholderTextColor={Colors.dark.textSecondary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            value={form.phone}
            onChangeText={(v) => handleChange('phone', v)}
            placeholder="+123456789"
            placeholderTextColor={Colors.dark.textSecondary}
            keyboardType="phone-pad"
          />
        </View>
        <View style={styles.fieldRow}>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={styles.label}>Check-in</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowCheckInPicker(true)}
            >
              <Text style={form.check_in_date ? styles.dateText : styles.datePlaceholder}>
                {form.check_in_date || 'Selecciona fecha'}
              </Text>
            </TouchableOpacity>
            {showCheckInPicker && (
              <DateTimePicker
                value={
                  form.check_in_date
                    ? new Date(form.check_in_date)
                    : new Date()
                }
                mode="date"
                display="default"
                onChange={(event, date) =>
                  handleDateChange('check_in_date', event, date || new Date())
                }
              />
            )}
          </View>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={styles.label}>Check-out</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowCheckOutPicker(true)}
            >
              <Text style={form.check_out_date ? styles.dateText : styles.datePlaceholder}>
                {form.check_out_date || 'Selecciona fecha'}
              </Text>
            </TouchableOpacity>
            {showCheckOutPicker && (
              <DateTimePicker
                value={
                  form.check_out_date
                    ? new Date(form.check_out_date)
                    : new Date()
                }
                mode="date"
                display="default"
                onChange={(event, date) =>
                  handleDateChange('check_out_date', event, date || new Date())
                }
              />
            )}
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Datos del hotel</Text>
      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Nombre del hotel</Text>
          <TextInput
            style={styles.input}
            value={form.hotel_name}
            onChangeText={(v) => handleChange('hotel_name', v)}
            placeholder="Nombre del hotel"
            placeholderTextColor={Colors.dark.textSecondary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Tipo de habitación</Text>
          <TextInput
            style={styles.input}
            value={form.room_type}
            onChangeText={(v) => handleChange('room_type', v)}
            placeholder="individual, doble, suite"
            placeholderTextColor={Colors.dark.textSecondary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Ubicación</Text>
          <TextInput
            style={styles.input}
            value={form.location}
            onChangeText={(v) => handleChange('location', v)}
            placeholder="Ciudad, país"
            placeholderTextColor={Colors.dark.textSecondary}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Detalles de la reserva</Text>
      <View style={styles.card}>
        <View style={styles.fieldRow}>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={styles.label}>Valor habitación</Text>
            <TextInput
              style={styles.input}
              value={form.room_value}
              onChangeText={(v) => handleChange('room_value', v)}
              placeholder="0.00"
              placeholderTextColor={Colors.dark.textSecondary}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={styles.label}>Habitaciones</Text>
            <TextInput
              style={styles.input}
              value={form.rooms_count}
              onChangeText={(v) => handleChange('rooms_count', v)}
              placeholder="1"
              placeholderTextColor={Colors.dark.textSecondary}
              keyboardType="number-pad"
            />
          </View>
        </View>
        <View style={styles.fieldRow}>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={styles.label}>Huéspedes</Text>
            <TextInput
              style={styles.input}
              value={form.guests_count}
              onChangeText={(v) => handleChange('guests_count', v)}
              placeholder="1"
              placeholderTextColor={Colors.dark.textSecondary}
              keyboardType="number-pad"
            />
          </View>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={styles.label}>Moneda</Text>
            <TextInput
              style={styles.input}
              value={form.currency_code}
              onChangeText={(v) => handleChange('currency_code', v.toUpperCase())}
              placeholder="EUR, USD, COP..."
              placeholderTextColor={Colors.dark.textSecondary}
              autoCapitalize="characters"
            />
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Imágenes (Opcional)</Text>
      <View style={styles.card}>
        <View style={styles.imageRow}>
          <TouchableOpacity onPress={() => pickImage('first_image')} style={styles.imageBtn}>
            {form.first_image ? (
              <Image source={{ uri: form.first_image }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholderContainer}>
                <Text style={styles.imagePlaceholderText}>Foto Huésped</Text>
                <Text style={styles.imagePlaceholderSubtext}>(Toca para subir)</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => pickImage('second_image')} style={styles.imageBtn}>
            {form.second_image ? (
              <Image source={{ uri: form.second_image }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholderContainer}>
                <Text style={styles.imagePlaceholderText}>Foto Hotel</Text>
                <Text style={styles.imagePlaceholderSubtext}>(Toca para subir)</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Guardar reserva</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.dark.background,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    marginTop: 12,
    marginBottom: 4,
  },
  card: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    padding: 12,
  },
  field: {
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    columnGap: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  label: {
    color: Colors.dark.text,
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.dark.surfaceLight,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  dateInput: {
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  dateText: {
    color: Colors.dark.text,
    fontSize: 14,
  },
  datePlaceholder: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  btn: {
    marginTop: 20,
    height: 48,
    backgroundColor: Colors.dark.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  msg: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  msgText: {
    fontSize: 12,
  },
  msgSuccess: {
    backgroundColor: 'rgba(22,163,74,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.4)',
  },
  msgError: {
    backgroundColor: 'rgba(220,38,38,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.4)',
  },
  imageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    columnGap: 12,
  },
  imageBtn: {
    flex: 1,
    height: 120,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    overflow: 'hidden',
    borderStyle: 'dashed',
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
    padding: 4,
  },
  imagePlaceholderText: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  imagePlaceholderSubtext: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    textAlign: 'center',
  },
});
