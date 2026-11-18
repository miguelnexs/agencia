import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  G,
} from 'react-native-svg';
import {
  Plane,
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  Sun,
  Moon,
  AlertCircle,
  MessageCircle,
  FileText,
  Zap,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../constants/Config';

const apiBase = API_URL;

const AeroShieldSvg = ({ size = 48 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
    <Defs>
      <SvgLinearGradient id="shieldBorder" x1="12" y1="6" x2="108" y2="114" gradientUnits="userSpaceOnUse">
        <Stop offset="0%" stopColor="#2DD4BF" />
        <Stop offset="50%" stopColor="#0EA5E9" />
        <Stop offset="100%" stopColor="#0284C7" />
      </SvgLinearGradient>
      <SvgLinearGradient id="shieldCore" x1="20" y1="12" x2="100" y2="108" gradientUnits="userSpaceOnUse">
        <Stop offset="0%" stopColor="#051329" />
        <Stop offset="55%" stopColor="#083B4C" />
        <Stop offset="100%" stopColor="#0D9488" />
      </SvgLinearGradient>
    </Defs>
    <Path
      d="M60 5 L106 25 C106 66 95 96 60 115 C25 96 14 66 14 25 Z"
      fill="url(#shieldBorder)"
    />
    <Path
      d="M60 11 L100 28.5 C100 64 90 91 60 108.5 C30 91 20 64 20 28.5 Z"
      fill="url(#shieldCore)"
    />
    <Circle cx="46" cy="27" r="3" fill="#38BDF8" />
    <Circle cx="60" cy="24" r="4.2" fill="#2DD4BF" />
    <Circle cx="74" cy="27" r="3" fill="#38BDF8" />
    <G transform="translate(62, 62) rotate(-32)">
      <Path
        d="M22 0 C22 2.2 19.5 3.5 16 3.5 L3 3.5 L-7 21 L-12 21 L-6 3.5 L-18 3.5 L-23 10.5 L-26.5 10.5 L-23 0 L-26.5 -10.5 L-23 -10.5 L-18 -3.5 L-6 -3.5 L-12 -21 L-7 -21 L3 -3.5 L16 -3.5 C19.5 -3.5 22 -2.2 22 0 Z"
        fill="#FFFFFF"
      />
    </G>
  </Svg>
);

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Por favor ingresa tu usuario y contraseña');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let res = await fetch(`${apiBase}/users/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (res.status === 404) {
        res = await fetch(`${apiBase}/users/api/auth/token/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), password }),
        });
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || 'Credenciales inválidas');
      }

      const accessToken = data.access;
      if (!accessToken) {
        throw new Error('No se recibió token de acceso');
      }

      let userRole = data.role || 'employee';
      let userName = username.trim();
      let userPermissions: any = {
        can_use_whatsapp: true,
      };

      try {
        const meRes = await fetch(`${apiBase}/users/api/auth/me/`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.role) userRole = meData.role;
          if (meData.username) userName = meData.username;
          if (meData.permissions) {
            userPermissions = {
              ...meData.permissions,
              can_use_whatsapp: true,
            };
          }
        }
      } catch {
        // continue with login role
      }

      signIn(accessToken, userRole, userName, userPermissions);
    } catch (e: any) {
      setError(e.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={
          isDark
            ? ['#050914', '#081428', '#050914']
            : ['#EEF4FB', '#E0F2FE', '#F8FAFC']
        }
        style={StyleSheet.absoluteFill}
      />

      {/* Radar & Flight Route Background SVG */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 420 820">
          <Circle
            cx="210"
            cy="220"
            r="140"
            stroke={isDark ? 'rgba(56,189,248,0.09)' : 'rgba(2,132,199,0.12)'}
            strokeWidth="1.5"
            strokeDasharray="6 8"
            fill="none"
          />
          <Circle
            cx="210"
            cy="220"
            r="230"
            stroke={isDark ? 'rgba(20,184,166,0.07)' : 'rgba(13,148,136,0.10)'}
            strokeWidth="1.2"
            fill="none"
          />
          <Path
            d="M -20 380 C 110 310, 250 180, 440 90"
            stroke={isDark ? 'rgba(20,184,166,0.22)' : 'rgba(13,148,136,0.25)'}
            strokeWidth="2.2"
            strokeDasharray="8 8"
            fill="none"
          />
          <Circle cx="105" cy="295" r="4.5" fill="#14B8A6" />
          <Circle cx="330" cy="145" r="4.5" fill="#38BDF8" />
        </Svg>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Control Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBrandRow}>
            <AeroShieldSvg size={42} />
            <View>
              <Text style={[styles.topBrandTitle, { color: colors.text }]}>
                VUELO<Text style={{ color: '#14B8A6' }}>ASEGURO</Text>
              </Text>
              <Text style={[styles.topBrandSub, { color: colors.textSecondary }]}>
                CONTROL CENTRAL • MULTI-EMPRESA
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={toggleTheme}
            style={[
              styles.themeToggleBtn,
              {
                backgroundColor: isDark ? '#131F38' : '#FFFFFF',
                borderColor: colors.border,
              },
            ]}
          >
            {isDark ? (
              <>
                <Sun size={15} color="#FBBF24" />
                <Text style={[styles.themeToggleText, { color: '#FBBF24' }]}>
                  Claro
                </Text>
              </>
            ) : (
              <>
                <Moon size={15} color="#0284C7" />
                <Text style={[styles.themeToggleText, { color: '#0284C7' }]}>
                  Oscuro
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Boarding-Pass Style Telemetry Card (Matching Desktop Login) */}
        <View
          style={[
            styles.telemetryCard,
            {
              backgroundColor: isDark ? 'rgba(11, 19, 36, 0.88)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(56, 189, 248, 0.22)' : '#CBD5E1',
            },
          ]}
        >
          <View style={styles.telemetryHeader}>
            <View>
              <Text style={[styles.telemetryEyebrow, { color: colors.textMuted }]}>
                RUTA DE OPERACIÓN ACTIVA
              </Text>
              <View style={styles.routeRow}>
                <Text style={[styles.airportCode, { color: colors.text }]}>BOG</Text>
                <View style={styles.routeLineBox}>
                  <View style={[styles.routeDash, { backgroundColor: colors.primary }]} />
                  <Plane size={15} color={colors.primary} />
                  <View style={[styles.routeDash, { backgroundColor: colors.primary }]} />
                </View>
                <Text style={[styles.airportCode, { color: colors.text }]}>MAD</Text>
              </View>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>MULTI-EMPRESA</Text>
              </View>
              <Text style={[styles.telemetrySub, { color: colors.textSecondary }]}>
                Vouchers PDF + WhatsApp
              </Text>
            </View>
          </View>

          <View style={styles.pillarsRow}>
            <View
              style={[
                styles.pillarBox,
                { backgroundColor: isDark ? '#131F38' : '#F1F5F9' },
              ]}
            >
              <Zap size={13} color="#14B8A6" />
              <Text style={[styles.pillarLabel, { color: colors.textSecondary }]}>
                Check-In
              </Text>
              <Text style={[styles.pillarVal, { color: '#14B8A6' }]}>
                Instantáneo
              </Text>
            </View>

            <View
              style={[
                styles.pillarBox,
                { backgroundColor: isDark ? '#131F38' : '#F1F5F9' },
              ]}
            >
              <FileText size={13} color="#38BDF8" />
              <Text style={[styles.pillarLabel, { color: colors.textSecondary }]}>
                Documentos
              </Text>
              <Text style={[styles.pillarVal, { color: '#38BDF8' }]}>
                Recibo & PDF
              </Text>
            </View>

            <View
              style={[
                styles.pillarBox,
                { backgroundColor: isDark ? '#131F38' : '#F1F5F9' },
              ]}
            >
              <MessageCircle size={13} color="#25D366" />
              <Text style={[styles.pillarLabel, { color: colors.textSecondary }]}>
                WhatsApp
              </Text>
              <Text style={[styles.pillarVal, { color: '#25D366' }]}>
                Activo 24/7
              </Text>
            </View>
          </View>
        </View>

        {/* Main Login Boarding Card */}
        <View
          style={[
            styles.loginCard,
            {
              backgroundColor: isDark ? '#0B1324' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#CBD5E1',
            },
          ]}
        >
          {/* Top Glowing Gradient Accent Bar */}
          <LinearGradient
            colors={['#14B8A6', '#10B981', '#0284C7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topGradientBar}
          />

          <View style={styles.cardHeaderRow}>
            <AeroShieldSvg size={54} />
            <View style={{ flex: 1 }}>
              <View style={styles.boardingGateBadge}>
                <Text style={styles.boardingGateText}>✈ PUERTA DE EMBARQUE</Text>
              </View>
              <Text style={[styles.loginTitle, { color: colors.text }]}>
                Iniciar Sesión
              </Text>
              <Text style={[styles.loginSubtitle, { color: colors.textSecondary }]}>
                Acceso para Empresas, Super Admin y Empleados
              </Text>
            </View>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color="#F43F5E" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Username Input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              USUARIO CORPORATIVO O AGENTE
            </Text>
            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: isDark ? '#060B16' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#CBD5E1',
                },
              ]}
            >
              <User size={18} color="#14B8A6" />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholder="Ej. miguel / agente"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              CONTRASEÑA DE ACCESO
            </Text>
            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: isDark ? '#060B16' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#CBD5E1',
                },
              ]}
            >
              <Lock size={18} color="#14B8A6" />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••••••"
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff size={18} color={colors.textSecondary} />
                ) : (
                  <Eye size={18} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember & SSL Row */}
          <View style={styles.rememberRow}>
            <TouchableOpacity
              onPress={() => setRemember(!remember)}
              style={styles.rememberToggle}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.switchTrack,
                  {
                    backgroundColor: remember
                      ? '#14B8A6'
                      : isDark
                      ? '#1E293B'
                      : '#CBD5E1',
                     alignItems: remember ? 'flex-end' : 'flex-start',
                  },
                ]}
              >
                <View style={styles.switchThumb} />
              </View>
              <Text style={[styles.rememberLabel, { color: colors.textSecondary }]}>
                Recordar sesión
              </Text>
            </TouchableOpacity>

            <View style={styles.sslBadge}>
              <ShieldCheck size={14} color="#14B8A6" />
              <Text style={styles.sslText}>Conexión segura</Text>
            </View>
          </View>

          {/* Submit CTA Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.9}
            style={[styles.submitOuter, loading && { opacity: 0.65 }]}
          >
            <LinearGradient
              colors={['#14B8A6', '#10B981', '#0284C7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.submitText}>VERIFICANDO ACCESO...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.submitText}>INGRESAR A CABINA</Text>
                  <Plane size={17} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={[styles.footerCopy, { color: colors.textMuted }]}>
          © {new Date().getFullYear()} VueloAseguro • Plataforma Multi-Empresa de Reservas y WhatsApp
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingTop: 42,
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  topBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topBrandTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  topBrandSub: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 1,
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  themeToggleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  telemetryCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 15,
    marginBottom: 16,
  },
  telemetryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(20, 184, 166, 0.22)',
  },
  telemetryEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  airportCode: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  routeLineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  routeDash: {
    width: 18,
    height: 2,
    borderRadius: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  telemetrySub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  pillarsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillarBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 2,
  },
  pillarLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  pillarVal: {
    fontSize: 11,
    fontWeight: '900',
  },
  loginCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  topGradientBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 20,
  },
  boardingGateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(20, 184, 166, 0.14)',
    borderColor: 'rgba(20, 184, 166, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  boardingGateText: {
    color: '#14B8A6',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  loginSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.14)',
    borderColor: 'rgba(244, 63, 94, 0.35)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#F43F5E',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 7,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 18,
  },
  rememberToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchTrack: {
    width: 36,
    height: 20,
    borderRadius: 999,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  rememberLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  sslBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sslText: {
    color: '#14B8A6',
    fontSize: 11,
    fontWeight: '700',
  },
  submitOuter: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 10,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  footerCopy: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 18,
  },
});
