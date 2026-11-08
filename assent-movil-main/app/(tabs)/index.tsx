import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../constants/Config';

const apiBase = API_URL;

const KPI = ({ label, value, delta, positive }: any) => {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{String(value)}</Text>
      {typeof delta !== 'undefined' && (
        <Text style={[styles.kpiDelta, { color: positive ? Colors.dark.success : Colors.dark.error }]}>
          {positive ? '▲' : '▼'} {delta}%
        </Text>
      )}
    </View>
  );
};

const SparkBars = ({ data, color = Colors.dark.primary }: any) => {
  const max = Math.max(...data);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 36 }}>
      {data.map((d: number, i: number) => (
        <View key={i} style={{ width: 6, height: ((d / (max || 1)) * 36), backgroundColor: color, marginRight: 3, borderRadius: 3 }} />
      ))}
    </View>
  );
};

const RichKPI = ({ icon, label, value, delta, positive, series }: any) => {
  return (
    <View style={styles.richKpi}>
      <View style={styles.richKpiHeader}>
        <Text style={styles.kpiLabel}>{label}</Text>
        {typeof delta !== 'undefined' && (
          <Text style={[styles.kpiDelta, { color: positive ? Colors.dark.success : Colors.dark.error }]}>
            {positive ? '▲' : '▼'} {delta}%
          </Text>
        )}
      </View>
      <Text style={styles.kpiValue}>{String(value)}</Text>
      {Array.isArray(series) && series.length > 1 && <SparkBars data={series} />}
    </View>
  );
};

const SimpleBarChart = ({ data }: any) => {
  const max = Math.max(...data);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100 }}>
      {data.map((d: number, i: number) => (
        <View key={i} style={{ width: 18, height: ((d / (max || 1)) * 100), backgroundColor: Colors.dark.info, marginRight: 6, borderRadius: 4 }} />
      ))}
    </View>
  );
};

const StatsPanel = ({ stats, seriesA }: any) => {
  const bookings = Number(stats.bookings || 0);
  const receipts = Number(stats.receipts || 0);
  const avgTicket = bookings > 0 ? Math.round((receipts / bookings) * 100) / 100 : 0;
  const deltaBookings = seriesA.length > 1 ? Math.round(((seriesA[seriesA.length - 1] - seriesA[seriesA.length - 2]) / (seriesA[seriesA.length - 2] || 1)) * 100) : 0;
  return (
    <View>
      <View style={styles.grid3}>
        <RichKPI icon="ticket" label="Reservas totales" value={bookings} delta={Math.abs(deltaBookings)} positive={deltaBookings >= 0} series={seriesA} />
        <RichKPI icon="money" label="Ingresos estimados" value={`$ ${receipts}`} series={seriesA} />
        <RichKPI icon="trend" label="Ticket promedio" value={avgTicket ? `$ ${avgTicket}` : 'N/D'} />
      </View>
      <View style={styles.grid2}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tendencia de reservas</Text>
          <SparkBars data={seriesA} color={Colors.dark.primary} />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reservas por región</Text>
          <SimpleBarChart data={[5, 3, 6, 2, 4, 7]} />
        </View>
      </View>
    </View>
  );
};

export default function Dashboard() {
  const { token, role, signOut } = useAuth();
  const [stats, setStats] = useState({ bookings: 0, receipts: 0, employees: 0, admins: 0 });
  const [seriesA, setSeriesA] = useState([3, 5, 4, 6, 8, 7, 9]);

  useEffect(() => {
    if (!token) return;
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    fetch(`${apiBase}/users/api/stats/`, { headers })
      .then(async (res) => {
        let data;
        try { data = await res.json(); } catch { data = null; }
        return { ok: res.ok, data };
      })
      .then(({ ok, data }) => {
        if (ok && data) {
          setStats({
            bookings: Number(data.total_bookings || 0),
            receipts: Number(data.total_receipts || data.total_bookings || 0),
            employees: Number(data.total_employees || 0),
            admins: Number(data.total_admins || 0),
          });
        }
      })
      .catch(() => {});
  }, [token]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Panel de Agencia</Text>
          <Text style={styles.role}>Rol: {role}</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>
      
      <StatsPanel stats={stats} seriesA={seriesA} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen</Text>
        <Text style={styles.cardSubtitle}>Vista general del sistema con métricas clave y gráficos rápidos.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 80,
    backgroundColor: Colors.dark.background,
    minHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcome: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  role: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  logoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.dark.error,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  grid3: { flexDirection: 'row', gap: 12, justifyContent: 'space-between', marginBottom: 12 },
  grid2: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  kpiCard: { backgroundColor: Colors.dark.card, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: 12, padding: 12, flex: 1 },
  richKpi: { backgroundColor: Colors.dark.card, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: 12, padding: 12, flex: 1 },
  richKpiHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kpiLabel: { color: Colors.dark.textSecondary, fontSize: 12 },
  kpiValue: { color: Colors.dark.text, fontSize: 22, fontWeight: '700', marginTop: 4 },
  kpiDelta: { fontSize: 12, marginTop: 4 },
  card: { backgroundColor: Colors.dark.card, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: 12, padding: 12, marginBottom: 12 },
  cardTitle: { color: Colors.dark.text, fontSize: 14, fontWeight: '600' },
  cardSubtitle: { color: Colors.dark.textSecondary, fontSize: 12, marginTop: 4 },
});
