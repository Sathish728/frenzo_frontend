import React from 'react';
import {View, StyleSheet} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {COLORS, RADIUS, SPACING} from '../../config/constants';
import {SHADOWS} from '../../config/theme';

const Card = ({
  children,
  variant = 'default', // default, gradient, outline
  gradientColors,
  style,
  padding = SPACING.md,
}) => {
  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={gradientColors || COLORS.gradientPrimary}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[styles.card, {padding}, style]}>
        {children}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {padding},
        variant === 'outline' && styles.outline,
        style,
      ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    ...SHADOWS.medium,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
});

export default Card;
