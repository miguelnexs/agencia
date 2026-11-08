import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/Button';
import { Star, Heart } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Details() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, isDark ? '#1A1A2E' : colors.surfaceLight]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.header}>
            <Button 
              title="Volver" 
              variant="secondary"
              onPress={() => router.back()} 
              style={styles.backButton}
            />
            <View style={styles.iconGroup}>
                <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <Star color="#FFD700" size={24} fill="#FFD700" />
                </View>
                 <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <Heart color="#FF6584" size={24} />
                </View>
            </View>
          </View>

          <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Detalles Premium</Text>
            <Text style={[styles.text, { color: colors.textSecondary }]}>
              Esta es una vista detallada que muestra cómo las animaciones nativas pueden crear una experiencia de usuario fluida sin dependencias complejas.
            </Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
             <Text style={[styles.subtext, { color: colors.textSecondary }]}>
              • Transiciones suaves{'\n'}
              • Sin caídas de frames{'\n'}
              • Diseño cohesivo
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: 24,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
  },
  iconGroup: {
      flexDirection: 'row',
      gap: 12,
  },
  iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
  },
  mainCard: {
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 10,
        },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 24,
  },
  subtext: {
    fontSize: 16,
    lineHeight: 28,
    fontWeight: '500',
  }
});
