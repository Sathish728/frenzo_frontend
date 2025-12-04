import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../config/theme';

const CoinDisplay = ({ coins, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.icon}>💰</Text>
      <Text style={styles.coins}>{coins}</Text>
      <Text style={styles.label}>coins</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.round,
  },
  icon: {
    fontSize: 20,
    marginRight: theme.spacing.xs,
  },
  coins: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginRight: theme.spacing.xs,
  },
  label: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.white,
  },
});

export default CoinDisplay;
