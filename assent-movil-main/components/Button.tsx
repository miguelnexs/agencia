import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, PressableProps, Animated, ViewStyle, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary';
  onPress: () => void;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({ title, variant = 'primary', onPress, style, ...props }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const { colors } = useTheme();

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: Platform.OS !== 'web',
      friction: 5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
      friction: 5,
    }).start();
  };

  const dynamicStyles = {
    backgroundColor: variant === 'primary' ? colors.primary : colors.secondary,
    ...Platform.select({
      web: {},
      default: { shadowColor: variant === 'primary' ? colors.primary : colors.secondary }
    }),
  };

  const textStyle = {
    color: '#FFFFFF', // Buttons usually have white text on primary colors
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      <Animated.View
        style={[
          styles.container,
          dynamicStyles,
          { transform: [{ scale }] },
          style,
        ]}
      >
        <Text style={[styles.text, textStyle]}>{title}</Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 12px rgba(0, 0, 0, 0.25)',
      },
      default: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
