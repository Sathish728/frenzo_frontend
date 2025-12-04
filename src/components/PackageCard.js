
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../config/theme';
import Card from './common/Card';

const PackageCard = ({ pkg, onPress, loading }) => {
  return (
    <Card style={styles.card}>
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <Text style={styles.coins}>{pkg.coins} Coins</Text>
          {pkg.bonus > 0 && (
            <View style={styles.bonusBadge}>
              <Text style={styles.bonusText}>+{pkg.bonus} Bonus</Text>
            </View>
          )}
          <Text style={styles.amount}>₹{pkg.amount}</Text>
        </View>

        <TouchableOpacity
          style={styles.buyButton}
          onPress={() => onPress(pkg)}
          disabled={loading}
        >
          <Text style={styles.buyButtonText}>Buy Now →</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
  },
  coins: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  bonusBadge: {
    backgroundColor: `${theme.colors.success}20`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  bonusText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.success,
    fontWeight: 'bold',
  },
  amount: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.textLight,
    marginTop: theme.spacing.xs,
  },
  buyButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  buyButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: theme.fonts.sizes.md,
  },
});

export default PackageCard;