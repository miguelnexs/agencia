import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, Animated, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface CardProps {
  title: string;
  description: string;
  index: number;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ title, description, index, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;
  const { colors } = useTheme();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay: index * 150,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 7,
        tension: 40,
        delay: index * 150,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [index]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          ...Platform.select({
            web: {},
            default: { shadowColor: colors.text }
          }),
          opacity,
          transform: [{ translateY }],
        },
        style,
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
});
