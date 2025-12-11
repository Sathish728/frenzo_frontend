import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {COLORS, FONTS, RADIUS, SPACING} from '../config/constants';
import {SHADOWS} from '../config/theme';
import {formatNumber} from '../utils/helpers';

const PackageCard = ({
  packageData,
  onBuy,
  isLoading = false,
}) => {
  const {coins, price, bonus, popular} = packageData;
  const totalCoins = coins + (bonus || 0);

  return (
    <TouchableOpacity
      onPress={() => onBuy(packageData)}
      disabled={isLoading}
      activeOpacity={0.8}
      style={[styles.container, popular && styles.popularContainer]}>
      {popular && (
        <LinearGradient
          colors={COLORS.gradientPrimary}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.popularBadge}>
          <Text style={styles.popularText}>POPULAR</Text>
        </LinearGradient>
      )}

      <View style={styles.content}>
        <View style={styles.leftSection}>
          <View style={styles.coinContainer}>
            <Icon name="circle-multiple" size={24} color={COLORS.accent} />
            <Text style={styles.coinAmount}>{formatNumber(totalCoins)}</Text>
          </View>
          {bonus > 0 && (
            <View style={styles.bonusContainer}>
              <Text style={styles.bonusText}>+{formatNumber(bonus)} bonus</Text>
            </View>
          )}
        </View>

        <View style={styles.rightSection}>
          <Text style={styles.price}>₹{price}</Text>
          <Icon name="chevron-right" size={24} color={COLORS.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  popularContainer: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  popularBadge: {
    paddingVertical: 4,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  popularText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  leftSection: {
    flex: 1,
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinAmount: {
    fontSize: FONTS.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  bonusContainer: {
    marginTop: 4,
    marginLeft: 32,
  },
  bonusText: {
    fontSize: FONTS.sm,
    color: COLORS.success,
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: FONTS.lg,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: SPACING.xs,
  },
});

export default PackageCard;
