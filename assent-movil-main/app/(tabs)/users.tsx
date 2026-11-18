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
  ActivityIndicator,
  Switch,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { API_URL } from '../../constants/Config';

const apiBase = API_URL;

export default function UsersScreen() {
  const { token, role, permissions } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();

  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [q, setQ] = useState('');
  const [permFilter, setPermFilter] = useState<'all' | 'delegated' | 'restricted'>('all');

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<any | null>(null);

  const [createForm, setCreateForm] = useState<any>({
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

  const isSuperAdmin = role === 'super_admin' || role === 'admin';
  const canManage = isSuperAdmin || Boolean(permissions?.can_manage_users);

  const authHeaders = (tkn: string) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tkn}`,
  });

  const loadUsers = async () => {
    if (!token || !canManage) return;
    setLoading(true);
    setMsg(null);
    try {
      const url = new URL(`${apiBase}/users/api/users/`);
      if (q.trim()) url.searchParams.set('q', q.trim());
      const res = await fetch(url.toString(), { headers: authHeaders(token) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'No se pudieron cargar los integrantes');
      const items = Array.isArray(data) ? data : data.results || [];
      setList(items);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Error al cargar equipo' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && canManage) loadUsers();
  }, [token, role]);

  const handleQuickTogglePerm = async (
    u: any,
    permKey: 'can_create_bookings' | 'can_edit_bookings' | 'can_delete_bookings'
  ) => {
    if (!token || !isSuperAdmin) return;
    setMsg(null);
    try {
      const nextVal = !Boolean(u[permKey]);
      const res = await fetch(`${apiBase}/users/api/users/${u.id}/`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({ [permKey]: nextVal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'No se pudo actualizar el permiso');
      setList((prev) => prev.map((item) => (item.id === u.id ? data : item)));
      setMsg({
        type: 'success',
        text: `Permisos de ${u.username} actualizados correctamente`,
      });
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  const handleCreateUser = async () => {
    if (!token) return;
    if (!createForm.username.trim() || !createForm.password.trim()) {
      setMsg({ type: 'error', text: 'Usuario y contraseña son obligatorios' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const payload = { ...createForm, role: 'employee' };
      const res = await fetch(`${apiBase}/users/api/users/`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'No se pudo registrar el integrante');
      setMsg({
        type: 'success',
        text: `Integrante ${data.username || createForm.username} registrado exitosamente`,
      });
      setCreateForm({
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
      loadUsers();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const openEditUser = (u: any) => {
    setEditingUser(u);
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

  const handleUpdateUser = async () => {
    if (!token || !editingUser) return;
    setSaving(true);
    setMsg(null);
    try {
      const payload: any = { ...editForm };
      if (!payload.password) delete payload.password;
      const res = await fetch(`${apiBase}/users/api/users/${editingUser.id}/`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'No se pudo actualizar el integrante');
      setMsg({
        type: 'success',
        text: `Perfil y permisos de ${data.username || editingUser.username} actualizados`,
      });
      setEditingUser(null);
      loadUsers();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async (id: number) => {
    if (!token) return;
    setMsg(null);
    try {
      const res = await fetch(`${apiBase}/users/api/users/${id}/`, {
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
      setMsg({ type: 'success', text: 'Integrante eliminado correctamente' });
      setConfirmDeleteUser(null);
      loadUsers();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  const filteredList = list.filter((u) => {
    const isRestricted =
      !u.can_create_bookings && !u.can_edit_bookings && !u.can_delete_bookings;
    if (permFilter === 'delegated' && isRestricted) return false;
    if (permFilter === 'restricted' && !isRestricted) return false;
    if (!q.trim()) return true;
    const term = q.toLowerCase();
    return (
      (u.username || '').toLowerCase().includes(term) ||
      (u.first_name || '').toLowerCase().includes(term) ||
      (u.last_name || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.department || '').toLowerCase().includes(term)
    );
  });

  if (!canManage) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.restrictedBanner,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <FontAwesome5 name="user-shield" size={32} color={colors.warning} />
          <Text style={[styles.restrictedTitle, { color: colors.text }]}>
            Control Exclusivo de Super Administrador
          </Text>
          <Text style={[styles.restrictedSub, { color: colors.textSecondary }]}>
            Tu cuenta se encuentra en modo operativo estándar. Solo el Super Administrador
            puede crear integrantes o delegar permisos de manipulación.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Executive Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerEyebrow, { color: colors.primary }]}>
            CONTROL DE TRIPULACIÓN • SUPER ADMIN
          </Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Directorio de Equipo
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
              size={14}
              color={isDark ? colors.warning : colors.secondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCreateOpen(true)}
            style={[styles.newBtn, { backgroundColor: colors.primary }]}
          >
            <FontAwesome5 name="user-plus" size={12} color="#FFF" />
            <Text style={styles.newBtnText}>Nuevo</Text>
          </TouchableOpacity>
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
              placeholder="Buscar por usuario, nombre, cargo o correo..."
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {q.length > 0 && (
              <TouchableOpacity onPress={() => setQ('')}>
                <FontAwesome5 name="times-circle" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={loadUsers}
            style={[styles.searchBtn, { backgroundColor: colors.primary }]}
          >
            <FontAwesome5 name="sync" size={13} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          {[
            { key: 'all', label: `Todos (${list.length})` },
            { key: 'delegated', label: '⚡ Con Permisos Delegados' },
            { key: 'restricted', label: '🔒 Solo Lectura' },
          ].map((f) => {
            const active = permFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setPermFilter(f.key as any)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.primary : (isDark ? '#1E293B' : '#E2E8F0'),
                    borderColor: active ? colors.primary : (isDark ? '#334155' : '#CBD5E1'),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: active ? '#FFFFFF' : (isDark ? '#F1F5F9' : '#0F172A') },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Users List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Cargando directorio de tripulación...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item: any) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }: any) => {
            const isRestricted =
              !item.can_create_bookings &&
              !item.can_edit_bookings &&
              !item.can_delete_bookings;
            const fullName =
              [item.first_name, item.last_name].filter(Boolean).join(' ') || 'Integrante';
            const initial = (
              item.first_name?.[0] ||
              item.username?.[0] ||
              'U'
            ).toUpperCase();

            return (
              <View
                style={[
                  styles.userCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {/* Top Identity Row */}
                <View style={styles.userTopRow}>
                  <View style={styles.userIdentity}>
                    <View
                      style={[
                        styles.avatarCircle,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.avatarText}>{initial}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.userName, { color: colors.text }]}>
                        {item.username}
                      </Text>
                      <Text style={[styles.userSub, { color: colors.textSecondary }]}>
                        {fullName} • {item.position || 'Agente'}{' '}
                        {item.department ? `(${item.department})` : ''}
                      </Text>
                      <Text style={[styles.userEmail, { color: colors.textMuted }]}>
                        {item.email || 'Sin correo registrado'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isRestricted
                        ? {
                            backgroundColor: 'rgba(245,158,11,0.14)',
                            borderColor: 'rgba(245,158,11,0.35)',
                          }
                        : {
                            backgroundColor: 'rgba(20,184,166,0.14)',
                            borderColor: 'rgba(20,184,166,0.35)',
                          },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: isRestricted ? colors.warning : colors.primary,
                      }}
                    >
                      {isRestricted ? '🔒 Solo Lectura' : '⚡ Autorizado'}
                    </Text>
                  </View>
                </View>

                {/* Quick Granular Permission Toggles */}
                <View
                  style={[
                    styles.permBar,
                    { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.permBarLabel, { color: colors.textMuted }]}>
                    PERMISOS DE RESERVA (TOCA PARA CAMBIAR):
                  </Text>
                  <View style={styles.permChipsRow}>
                    {[
                      {
                        key: 'can_create_bookings',
                        label: 'Crear',
                        activeColor: colors.success,
                      },
                      {
                        key: 'can_edit_bookings',
                        label: 'Editar',
                        activeColor: colors.secondary,
                      },
                      {
                        key: 'can_delete_bookings',
                        label: 'Borrar',
                        activeColor: colors.error,
                      },
                    ].map((p) => {
                      const enabled = Boolean(item[p.key]);
                      return (
                        <TouchableOpacity
                          key={p.key}
                          onPress={() => handleQuickTogglePerm(item, p.key as any)}
                          style={[
                            styles.permChip,
                            {
                              backgroundColor: enabled ? p.activeColor : (isDark ? '#1E293B' : '#E2E8F0'),
                              borderColor: enabled ? p.activeColor : (isDark ? '#334155' : '#CBD5E1'),
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '800',
                              color: enabled ? '#FFFFFF' : (isDark ? '#F1F5F9' : '#0F172A'),
                            }}
                          >
                            {p.label}: {enabled ? 'SÍ' : 'NO'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <View
                      style={[
                        styles.permChip,
                        {
                          backgroundColor: '#10B981',
                          borderColor: '#10B981',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        },
                      ]}
                    >
                      <FontAwesome5 name="whatsapp" size={11} color="#FFFFFF" />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                        WhatsApp: SÍ
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Card Footer Actions */}
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    onPress={() => openEditUser(item)}
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: '#0284C7',
                        borderColor: '#0284C7',
                      },
                    ]}
                  >
                    <FontAwesome5 name="sliders-h" size={12} color="#FFFFFF" />
                    <Text style={[styles.actionBtnText, { color: '#FFFFFF', fontWeight: '800' }]}>
                      Configurar Perfil y Permisos
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setConfirmDeleteUser(item)}
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: colors.error,
                        borderColor: colors.error,
                      },
                    ]}
                  >
                    <FontAwesome5 name="trash" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <FontAwesome5 name="users-slash" size={30} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Sin integrantes registrados
              </Text>
            </View>
          }
        />
      )}

      {/* MODAL 1: CREATE USER */}
      <Modal
        visible={createOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalEyebrow, { color: colors.primary }]}>
                  ALTA DE TRIPULACIÓN • ACCESO RESTRINGIDO POR DEFECTO
                </Text>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Registrar Nuevo Integrante
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCreateOpen(false)}
                style={[styles.closeCircle, { backgroundColor: colors.surfaceLight }]}
              >
                <FontAwesome5 name="times" size={14} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
              {[
                { key: 'username', label: 'Usuario *' },
                { key: 'password', label: 'Contraseña *', secure: true },
                { key: 'first_name', label: 'Nombre' },
                { key: 'last_name', label: 'Apellido' },
                { key: 'email', label: 'Correo electrónico' },
                { key: 'department', label: 'Departamento' },
                { key: 'position', label: 'Cargo' },
              ].map((f) => (
                <View key={f.key} style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    {f.label}
                  </Text>
                  <TextInput
                    value={createForm[f.key]}
                    onChangeText={(v) =>
                      setCreateForm((prev: any) => ({ ...prev, [f.key]: v }))
                    }
                    secureTextEntry={f.secure}
                    placeholder={f.label}
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
              ))}

              <View
                style={[
                  styles.permModalBox,
                  { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.permModalTitle, { color: colors.primary }]}>
                  AUTORIZACIONES DE MANIPULACIÓN (SUPER ADMIN)
                </Text>
                {[
                  { key: 'can_create_bookings', label: 'Permitir Crear Reservas' },
                  { key: 'can_edit_bookings', label: 'Permitir Editar Reservas' },
                  { key: 'can_delete_bookings', label: 'Permitir Eliminar Reservas' },
                ].map((perm) => (
                  <View key={perm.key} style={styles.switchRow}>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>
                      {perm.label}
                    </Text>
                    <Switch
                      value={Boolean(createForm[perm.key])}
                      onValueChange={(v) =>
                        setCreateForm((prev: any) => ({ ...prev, [perm.key]: v }))
                      }
                      trackColor={{ false: colors.border, true: colors.primary }}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooterBtns}>
              <TouchableOpacity
                onPress={() => setCreateOpen(false)}
                style={[
                  styles.secondaryModalBtn,
                  { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={saving}
                onPress={handleCreateUser}
                style={[
                  styles.primaryModalBtn,
                  { flex: 1, backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.primaryModalBtnText}>
                  {saving ? 'Guardando...' : 'Crear Integrante'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: EDIT USER & PERMISSIONS */}
      <Modal
        visible={Boolean(editingUser)}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingUser(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {editingUser && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalEyebrow, { color: colors.primary }]}>
                      PANEL DE SUPER ADMIN • PERFIL Y PERMISOS
                    </Text>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      Configurar: {editingUser.username}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setEditingUser(null)}
                    style={[styles.closeCircle, { backgroundColor: colors.surfaceLight }]}
                  >
                    <FontAwesome5 name="times" size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
                  {[
                    { key: 'first_name', label: 'Nombre' },
                    { key: 'last_name', label: 'Apellido' },
                    { key: 'email', label: 'Correo electrónico' },
                    { key: 'department', label: 'Departamento' },
                    { key: 'position', label: 'Cargo' },
                    {
                      key: 'password',
                      label: 'Nueva contraseña (opcional)',
                      secure: true,
                    },
                  ].map((f) => (
                    <View key={f.key} style={styles.fieldGroup}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                        {f.label}
                      </Text>
                      <TextInput
                        value={editForm[f.key]}
                        onChangeText={(v) =>
                          setEditForm((prev: any) => ({ ...prev, [f.key]: v }))
                        }
                        secureTextEntry={f.secure}
                        placeholder={f.label}
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
                  ))}

                  <View
                    style={[
                      styles.permModalBox,
                      { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.permModalTitle, { color: colors.primary }]}>
                      AUTORIZACIONES DE MANIPULACIÓN (SUPER ADMIN)
                    </Text>
                    {[
                      { key: 'can_create_bookings', label: 'Permitir Crear Reservas' },
                      { key: 'can_edit_bookings', label: 'Permitir Editar Reservas' },
                      { key: 'can_delete_bookings', label: 'Permitir Eliminar Reservas' },
                    ].map((perm) => (
                      <View key={perm.key} style={styles.switchRow}>
                        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>
                          {perm.label}
                        </Text>
                        <Switch
                          value={Boolean(editForm[perm.key])}
                          onValueChange={(v) =>
                            setEditForm((prev: any) => ({ ...prev, [perm.key]: v }))
                          }
                          trackColor={{ false: colors.border, true: colors.primary }}
                        />
                      </View>
                    ))}
                  </View>
                </ScrollView>

                <View style={styles.modalFooterBtns}>
                  <TouchableOpacity
                    onPress={() => setEditingUser(null)}
                    style={[
                      styles.secondaryModalBtn,
                      { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                    ]}
                  >
                    <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={saving}
                    onPress={handleUpdateUser}
                    style={[
                      styles.primaryModalBtn,
                      { flex: 1, backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={styles.primaryModalBtnText}>
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
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
        visible={Boolean(confirmDeleteUser)}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDeleteUser(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 8 }]}>
              ¿Eliminar integrante {confirmDeleteUser?.username}?
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 18 }}>
              El usuario perderá inmediatamente el acceso al sistema operativo de
              AeroAgencia.
            </Text>
            <View style={styles.modalFooterBtns}>
              <TouchableOpacity
                onPress={() => setConfirmDeleteUser(null)}
                style={[
                  styles.secondaryModalBtn,
                  { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => confirmDeleteUser && performDelete(confirmDeleteUser.id)}
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
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillsRow: { gap: 8, paddingTop: 10 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterPillText: { fontSize: 11, fontWeight: '700' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 10, fontSize: 13, fontWeight: '600' },
  userCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  userTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  userIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  userName: { fontSize: 15, fontWeight: '800' },
  userSub: { fontSize: 12, marginTop: 2 },
  userEmail: { fontSize: 11, marginTop: 1 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  permBar: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  permBarLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6, marginBottom: 8 },
  permChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  permChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 12, fontWeight: '800' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 15, fontWeight: '800', marginTop: 10 },
  restrictedBanner: {
    marginTop: 40,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  restrictedTitle: { fontSize: 18, fontWeight: '900', marginTop: 12, textAlign: 'center' },
  restrictedSub: { fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 20 },
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
  fieldGroup: { marginBottom: 10 },
  fieldLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  permModalBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  permModalTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 0.7, marginBottom: 8 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  modalFooterBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  primaryModalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
});
