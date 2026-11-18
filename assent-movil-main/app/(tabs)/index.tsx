import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Plane,
  Ticket,
  DollarSign,
  TrendingUp,
  Users,
  PlusCircle,
  RefreshCw,
  LogOut,
  Sun,
  Moon,
  Calendar,
  MapPin,
  ChevronRight,
  ShieldCheck,
  MessageCircle,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { API_URL } from '../../constants/Config';

const apiBase = API_URL;

const SparkBars = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data, 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 34, gap: 4 }}>
      {data.map((d, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: Math.max(6, (d / max) * 34),
            backgroundColor: color,
            borderRadius: 4,
            opacity: i === data.length - 1 ? 1 : 0.65,
          }}
        />
      ))}
    </View>
  );
};

export default function DashboardScreen() {
  const { token, role, username, signOut } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();

  const [stats, setStats] = useState({
    bookings: 0,
    receipts: 0,
    employees: 0,
    admins: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [seriesA, setSeriesA] = useState([4, 6, 5, 8, 7, 10, 12]);

  const loadDashboardData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    try {
      const [statsRes, bookingsRes] = await Promise.all([
        fetch(`${apiBase}/users/api/stats/`, { headers }).catch(() => null),
        fetch(`${apiBase}/users/api/bookings/?page=1&page_size=5&ordering=-created_at`, {
          headers,
        }).catch(() => null),
      ]);

      if (statsRes && statsRes.ok) {
        const sData = await statsRes.json().catch(() => null);
        if (sData) {
          setStats({
            bookings: Number(sData.total_bookings || 0),
            receipts: Number(sData.total_receipts || sData.total_bookings || 0),
            employees: Number(sData.total_employees || 0),
            admins: Number(sData.total_admins || 0),
          });
        }
      }

      if (bookingsRes && bookingsRes.ok) {
        const bData = await bookingsRes.json().catch(() => null);
        if (bData && Array.isArray(bData.results)) {
          setRecentBookings(bData.results);
          const totalCount = Number(bData.total || bData.results.length || 0);
          const sumRevenue = bData.results.reduce((acc: number, item: any) => {
            const ci = item.check_in_date ? new Date(item.check_in_date) : new Date();
            const co = item.check_out_date ? new Date(item.check_out_date) : new Date();
            const nights = Math.max(
              1,
              Math.round((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24)) || 1,
            );
            const rate = Number(item.room_value || 0);
            const rooms = Number(item.rooms_count || 1);
            return acc + rate * rooms * nights;
          }, 0);

          setStats((prev) => ({
            ...prev,
            bookings: prev.bookings || totalCount,
            receipts: prev.receipts > 100 ? prev.receipts : Math.round(sumRevenue),
          }));

          const chartVals = bData.results
            .slice(0, 7)
            .reverse()
            .map((b: any) => Math.max(1, Number(b.room_value || 100)));
          if (chartVals.length >= 2) {
            setSeriesA(chartVals);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const avgTicket =
    stats.bookings > 0 ? Math.round(stats.receipts / stats.bookings) : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={loadDashboardData}
          tintColor={colors.primary}
        />
      }
    >
      {/* Top Executive Header */}
      <View
        style={[
          styles.headerCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.headerTopRow}>
          <View style={styles.brandRow}>
            <LinearGradient
              colors={['#14B8A6', '#0284C7']}
              style={styles.brandBadge}
            >
              <Plane size={20} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <Text style={[styles.brandTitle, { color: colors.text }]}>
                VUELO<Text style={{ color: colors.primary }}>SEGURO</Text>
              </Text>
              <Text style={[styles.brandSub, { color: colors.textSecondary }]}>
                {username || 'Operador'} · {(role || 'staff').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={toggleTheme}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: colors.surfaceLight,
                  borderColor: colors.border,
                },
              ]}
            >
              {isDark ? (
                <Sun size={17} color="#FBBF24" />
              ) : (
                <Moon size={17} color={colors.accent} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={loadDashboardData}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: colors.surfaceLight,
                  borderColor: colors.border,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <RefreshCw size={17} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={signOut}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: 'rgba(244, 63, 94, 0.14)',
                  borderColor: 'rgba(244, 63, 94, 0.3)',
                },
              ]}
            >
              <LogOut size={17} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.statusBanner,
            { backgroundColor: colors.surfaceLight, borderColor: colors.border },
          ]}
        >
          <ShieldCheck size={15} color={colors.success} />
          <Text style={[styles.statusBannerText, { color: colors.textSecondary }]}>
            Central de Reservas sincronizada · Generación de PDFs activa
          </Text>
        </View>
      </View>

      {/* 2x2 KPI Grid */}
      <View style={styles.kpiGrid}>
        <View
          style={[
            styles.kpiCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.kpiHeader}>
            <View
              style={[
                styles.kpiIconBox,
                { backgroundColor: 'rgba(20, 184, 166, 0.15)' },
              ]}
            >
              <Ticket size={18} color={colors.primary} />
            </View>
            <Text style={[styles.kpiBadge, { color: colors.success }]}>
              ▲ Activo
            </Text>
          </View>
          <Text style={[styles.kpiValue, { color: colors.text }]}>
            {stats.bookings}
          </Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
            Reservas Totales
          </Text>
        </View>

        <View
          style={[
            styles.kpiCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.kpiHeader}>
            <View
              style={[
                styles.kpiIconBox,
                { backgroundColor: 'rgba(14, 165, 233, 0.15)' },
              ]}
            >
              <DollarSign size={18} color={colors.info} />
            </View>
            <Text style={[styles.kpiBadge, { color: colors.info }]}>EUR/USD</Text>
          </View>
          <Text style={[styles.kpiValue, { color: colors.text }]}>
            € {stats.receipts.toLocaleString()}
          </Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
            Volumen Estimado
          </Text>
        </View>

        <View
          style={[
            styles.kpiCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.kpiHeader}>
            <View
              style={[
                styles.kpiIconBox,
                { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
              ]}
            >
              <TrendingUp size={18} color={colors.warning} />
            </View>
            <Text style={[styles.kpiBadge, { color: colors.warning }]}>
              Promedio
            </Text>
          </View>
          <Text style={[styles.kpiValue, { color: colors.text }]}>
            € {avgTicket.toLocaleString()}
          </Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
            Ticket por Reserva
          </Text>
        </View>

        <View
          style={[
            styles.kpiCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.kpiHeader}>
            <View
              style={[
                styles.kpiIconBox,
                { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
              ]}
            >
              <Users size={18} color={colors.success} />
            </View>
            <Text style={[styles.kpiBadge, { color: colors.success }]}>
              {stats.admins} Admin
            </Text>
          </View>
          <Text style={[styles.kpiValue, { color: colors.text }]}>
            {stats.employees + stats.admins || 1}
          </Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
            Equipo Operativo
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={[styles.sectionHeading, { color: colors.text }]}>
        Operaciones Rápidas
      </Text>
      <View style={styles.quickGrid}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/create-booking')}
          style={styles.quickActionPrimary}
        >
          <LinearGradient
            colors={['#14B8A6', '#0284C7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickGradient}
          >
            <PlusCircle size={22} color="#FFFFFF" />
            <View style={{ flex: 1 }}>
              <Text style={styles.quickPrimaryTitle}>Nueva Reserva</Text>
              <Text style={styles.quickPrimarySub}>
                Con logo editable, fotos y cálculo automático
              </Text>
            </View>
            <ChevronRight size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.quickSecondaryRow}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/bookings')}
            style={[
              styles.quickCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ticket size={20} color={colors.primary} />
            <Text style={[styles.quickCardTitle, { color: colors.text }]}>
              Ver Reservas
            </Text>
            <Text style={[styles.quickCardSub, { color: colors.textSecondary }]}>
              Editar, enviar correo y PDFs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/users')}
            style={[
              styles.quickCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Users size={20} color={colors.info} />
            <Text style={[styles.quickCardTitle, { color: colors.text }]}>
              Personal y Roles
            </Text>
            <Text style={[styles.quickCardSub, { color: colors.textSecondary }]}>
              Usuarios y permisos
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/whatsapp' as any)}
          style={[
            styles.quickCard,
            {
              backgroundColor: colors.card,
              borderColor: 'rgba(37,211,102,0.35)',
              marginTop: 10,
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 14,
              gap: 12,
            },
          ]}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: 'rgba(37,211,102,0.14)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MessageCircle size={22} color="#25D366" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.quickCardTitle, { color: colors.text, marginTop: 0 }]}>
                WhatsApp Cloud Operations
              </Text>
              <View
                style={{
                  backgroundColor: 'rgba(37,211,102,0.18)',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: '#25D366', fontSize: 9, fontWeight: '800' }}>
                  EN LÍNEA
                </Text>
              </View>
            </View>
            <Text style={[styles.quickCardSub, { color: colors.textSecondary, marginTop: 2 }]}>
              Chats en vivo, envío de vouchers PDF y asistente IA con Gemini
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Trend Chart Card */}
      <View
        style={[
          styles.chartCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.chartHeader}>
          <View>
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              Ritmo de Actividad Reciente
            </Text>
            <Text style={[styles.chartSub, { color: colors.textSecondary }]}>
              Evolución de reservas emitidas por el sistema
            </Text>
          </View>
          <Text style={[styles.chartHighlight, { color: colors.primary }]}>
            100% Operativo
          </Text>
        </View>
        <SparkBars data={seriesA} color={colors.primary} />
      </View>

      {/* Recent Bookings Feed */}
      <View style={styles.recentHeaderRow}>
        <Text style={[styles.sectionHeading, { color: colors.text, marginBottom: 0 }]}>
          Últimas Reservas Emitidas
        </Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/bookings')}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>
            Ver todas →
          </Text>
        </TouchableOpacity>
      </View>

      {recentBookings.length === 0 ? (
        <View
          style={[
            styles.emptyBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            No hay reservas recientes para mostrar.
          </Text>
        </View>
      ) : (
        recentBookings.map((b) => (
          <TouchableOpacity
            key={b.id}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/bookings')}
            style={[
              styles.bookingRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.bookingTopLine}>
                <View
                  style={[
                    styles.codeBadge,
                    { backgroundColor: 'rgba(20, 184, 166, 0.14)' },
                  ]}
                >
                  <Text style={[styles.codeBadgeText, { color: colors.primary }]}>
                    #{b.code || b.id}
                  </Text>
                </View>
                <Text
                  style={[styles.bookingGuest, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {b.first_name || 'Huésped'}
                </Text>
              </View>

              <View style={styles.bookingMetaLine}>
                <MapPin size={12} color={colors.textSecondary} />
                <Text
                  style={[styles.bookingHotel, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {b.hotel_name || 'Alojamiento'} · {b.location || ''}
                </Text>
              </View>

              <View style={styles.bookingMetaLine}>
                <Calendar size={12} color={colors.info} />
                <Text style={[styles.bookingDates, { color: colors.textMuted }]}>
                  {b.check_in_date || '-'} → {b.check_out_date || '-'}
                </Text>
              </View>
            </View>

            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
              <Text style={[styles.bookingPrice, { color: colors.primary }]}>
                {b.currency_code || 'EUR'} {b.room_value || '0'}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                / noche
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 48,
    paddingBottom: 96,
  },
  headerCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBanner: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBannerText: {
    fontSize: 11,
    fontWeight: '600',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  kpiIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiBadge: {
    fontSize: 10,
    fontWeight: '800',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  quickGrid: {
    gap: 10,
    marginBottom: 18,
  },
  quickActionPrimary: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  quickGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickPrimaryTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  quickPrimarySub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  quickSecondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  quickCardSub: {
    fontSize: 11,
  },
  chartCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 14,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  chartSub: {
    fontSize: 11,
    marginTop: 2,
  },
  chartHighlight: {
    fontSize: 11,
    fontWeight: '800',
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyBox: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  bookingRow: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bookingTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  bookingGuest: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  bookingMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  bookingHotel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  bookingDates: {
    fontSize: 11,
    fontWeight: '600',
  },
  bookingPrice: {
    fontSize: 15,
    fontWeight: '900',
  },
});
