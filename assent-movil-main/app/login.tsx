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
import {
  Plane,
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ArrowRight,
  AlertCircle,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../constants/Config';

const apiBase = API_URL;

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      let userPermissions = null;

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
          if (meData.permissions) userPermissions = meData.permissions;
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
            ? ['#050914', '#0B162C', '#050914']
            : ['#EEF4FB', '#E0F2FE', '#F8FAFC']
        }
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top bar with status badge & theme switch */}
        <View style={styles.topBar}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isDark
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(16, 185, 129, 0.15)',
                borderColor: 'rgba(16, 185, 129, 0.35)',
              },
            ]}
          >
            <View style={styles.statusDot} />
            <Text style={[styles.statusText, { color: colors.success }]}>
              OPERACIONES EN LÍNEA
            </Text>
          </View>

          <TouchableOpacity
            onPress={toggleTheme}
            style={[
              styles.themeBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            {isDark ? (
              <Sun size={18} color="#FBBF24" />
            ) : (
              <Moon size={18} color={colors.accent} />
            )}
          </TouchableOpacity>
        </View>

        {/* Brand Header */}
        <View style={styles.brandSection}>
          <LinearGradient
            colors={['#14B8A6', '#0284C7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoShield}
          >
            <Plane size={30} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.brandName, { color: colors.text }]}>
            AERO<Text style={{ color: colors.primary }}>AGENCIA</Text>
          </Text>
          <Text style={[styles.brandTagline, { color: colors.accent }]}>
            FLIGHT & HOTEL OPERATIONS · MOBILE
          </Text>
        </View>

        {/* Login Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            Acceso de Personal
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Ingresa tus credenciales operativas para gestionar reservas, PDFs y equipo.
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              USUARIO OPERATIVO
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.surfaceLight,
                  borderColor: colors.border,
                },
              ]}
            >
              <User size={18} color={colors.primary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholder="Ej. admin"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              CLAVE DE ACCESO
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.surfaceLight,
                  borderColor: colors.border,
                },
              ]}
            >
              <Lock size={18} color={colors.primary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
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

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.88}
            style={[styles.btnOuter, loading && { opacity: 0.65 }]}
          >
            <LinearGradient
              colors={['#14B8A6', '#0284C7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.btnText}>INICIAR OPERACIONES</Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.securityFooter}>
            <ShieldCheck size={15} color={colors.primary} />
            <Text style={[styles.securityText, { color: colors.textSecondary }]}>
              Sincronizado en tiempo real con Central AeroAgencia
            </Text>
          </View>
        </View>
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
    padding: 20,
    paddingTop: 48,
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  themeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 26,
  },
  logoShield: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 4,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 22,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    height: '100%',
  },
  btnOuter: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
  },
  btnGradient: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
