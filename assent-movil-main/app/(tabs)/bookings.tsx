import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../constants/Config';
import { useRouter } from 'expo-router';

const apiBase = API_URL;

export default function BookingsScreen() {
  const { token, role } = useAuth();
  const router = useRouter();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<any>(null);
  const [q, setQ] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const canManage = role === 'admin' || role === 'super_admin' || role === 'employee';

  const authHeaders = (tkn: string) => ({ Authorization: `Bearer ${tkn}` });

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
      const res = await fetch(url.toString(), { headers: authHeaders(token!) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'No se pudieron cargar reservas');
      setList(data.results || []);
      setTotal(Number(data.total || 0));
      setPage(Number(data.page || 1));
      setPageSize(Number(data.page_size || 10));
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token && canManage) loadBookings(); }, [token]);

  const performDelete = async (id: number) => {
    setMsg(null);
    try {
      const res = await fetch(`${apiBase}/users/api/bookings/${id}/`, { method: 'DELETE', headers: authHeaders(token!) });
      let data = null;
      try { data = await res.json(); } catch {}
      if (!res.ok) throw new Error((data && (data.detail || data.message)) || 'No se pudo eliminar');
      setMsg({ type: 'success', text: 'Reserva eliminada' });
      loadBookings();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  return (
    <View style={styles.container}>
      {msg && <Text style={[styles.msg, msg.type === 'success' ? styles.msgSuccess : styles.msgError]}>{msg.text}</Text>}
      <View style={[styles.rowBetween, { marginBottom: 12 }]}>
        <Text style={styles.screenTitle}>Reservas</Text>
        {canManage && (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/create-booking')}
            style={[styles.btn, { backgroundColor: Colors.dark.success }]}
          >
            <Text style={styles.btnText}>Nueva reserva</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.card}>
        <View style={[styles.rowBetween, { marginBottom: 10 }]}>
          <Text style={styles.cardTitle}>Reservas</Text>
          <View style={styles.row}>
            <TextInput 
              value={q} 
              onChangeText={setQ} 
              placeholder="Buscar..." 
              placeholderTextColor={Colors.dark.textSecondary}
              style={[styles.input, { width: 120 }]} 
            />
            <TouchableOpacity onPress={() => { setPage(1); loadBookings(); }} style={[styles.btn, { marginLeft: 8 }]}>
                <Text style={styles.btnText}>Filtrar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={list}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }: any) => (
            <View style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listPrimary}>{item.first_name}</Text>
                <Text style={styles.listSecondary}>{item.code || '-'}</Text>
                <Text style={styles.listMuted}>{item.email}</Text>
              </View>
              <View style={styles.row}>
                <TouchableOpacity onPress={() => performDelete(item.id)} style={[styles.btn, styles.btnDanger]}>
                    <Text style={styles.btnText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.listSecondary}>No hay reservas registradas.</Text>}
        />

        <View style={[styles.rowBetween, { marginTop: 10 }]}>
          <Text style={styles.listMuted}>Total: {total}</Text>
          <View style={styles.row}>
            <TouchableOpacity 
                disabled={page <= 1} 
                onPress={() => { setPage(Math.max(1, page - 1)); loadBookings(); }}
                style={[styles.btn, styles.btnNeutral, page <= 1 && styles.btnDisabled]}
            >
                <Text style={styles.btnText}>Anterior</Text>
            </TouchableOpacity>
            
            <Text style={[styles.listMuted, { marginHorizontal: 8 }]}>{page}/{Math.max(1, Math.ceil(total / (pageSize || 1)))}</Text>
            
            <TouchableOpacity 
                disabled={page >= Math.max(1, Math.ceil(total / (pageSize || 1)))} 
                onPress={() => { const tp = Math.max(1, Math.ceil(total / (pageSize || 1))); setPage(Math.min(tp, page + 1)); loadBookings(); }}
                style={[styles.btn, styles.btnNeutral, page >= Math.max(1, Math.ceil(total / (pageSize || 1))) && styles.btnDisabled]}
            >
                <Text style={styles.btnText}>Siguiente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.dark.background,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  card: { backgroundColor: Colors.dark.card, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: 12, padding: 12, marginBottom: 12, flex: 1 },
  cardTitle: { color: Colors.dark.text, fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: { 
    backgroundColor: Colors.dark.surfaceLight, 
    color: Colors.dark.text, 
    borderWidth: 1, 
    borderColor: Colors.dark.border, 
    borderRadius: 8, 
    paddingHorizontal: 10, 
    paddingVertical: 6 
  },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.dark.surfaceLight, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: 8, padding: 10, marginBottom: 8 },
  listPrimary: { color: Colors.dark.text, fontWeight: '600' },
  listSecondary: { color: Colors.dark.textSecondary },
  listMuted: { color: Colors.dark.textSecondary, fontSize: 12 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dark.primary },
  btnNeutral: { backgroundColor: Colors.dark.surfaceLight },
  btnDanger: { backgroundColor: Colors.dark.error },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: 'white', fontWeight: '600', fontSize: 12 },
  msg: { padding: 10, borderRadius: 8, marginBottom: 8 },
  msgSuccess: { backgroundColor: 'rgba(22,163,74,0.2)', color: Colors.dark.success, borderWidth: 1, borderColor: 'rgba(22,163,74,0.4)' },
  msgError: { backgroundColor: 'rgba(220,38,38,0.2)', color: Colors.dark.error, borderWidth: 1, borderColor: 'rgba(220,38,38,0.4)' },
});
