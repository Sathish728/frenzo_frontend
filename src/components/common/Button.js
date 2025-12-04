import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../../config/theme';

const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  ...props
}) => {
  const getButtonStyle = () => {
    const styles = [buttonStyles.base];
    
    if (variant === 'primary') styles.push(buttonStyles.primary);
    if (variant === 'secondary') styles.push(buttonStyles.secondary);
    if (variant === 'danger') styles.push(buttonStyles.danger);
    if (variant === 'outline') styles.push(buttonStyles.outline);
    
    if (size === 'sm') styles.push(buttonStyles.small);
    if (size === 'lg') styles.push(buttonStyles.large);
    
    if (disabled || loading) styles.push(buttonStyles.disabled);
    
    if (style) styles.push(style);
    
    return styles;
  };

  const getTextStyle = () => {
    const styles = [buttonStyles.text];
    
    if (variant === 'outline') styles.push(buttonStyles.outlineText);
    if (size === 'sm') styles.push(buttonStyles.smallText);
    if (size === 'lg') styles.push(buttonStyles.largeText);
    
    if (textStyle) styles.push(textStyle);
    
    return styles;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? theme.colors.primary : '#fff'} />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const buttonStyles = StyleSheet.create({
  base: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.secondary,
  },
  danger: {
    backgroundColor: theme.colors.danger,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  disabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.6,
  },
  small: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  large: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  text: {
    color: theme.colors.white,
    fontSize: theme.fonts.sizes.md,
    fontWeight: 'bold',
  },
  outlineText: {
    color: theme.colors.primary,
  },
  smallText: {
    fontSize: theme.fonts.sizes.sm,
  },
  largeText: {
    fontSize: theme.fonts.sizes.lg,
  },
});

export default Button;