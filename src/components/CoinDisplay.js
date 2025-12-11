import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {COLORS, FONTS, RADIUS, SPACING} from '../config/constants';
import {formatNumber} from '../utils/helpers';

const CoinDisplay = ({coins = 0, onAddPress, showAddButton = true, size = 'medium'}) => {
  const isSmall = size === 'small';

  return (
    <LinearGradient
      colors={COLORS.gradientGold}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={[styles.container, isSmall && styles.containerSmall]}>
      <View style={styles.coinInfo}>
        <Icon
          name="circle-multiple"
          size={isSmall ? 16 : 20}
          color={COLORS.white}
        />
        <Text style={[styles.coinText, isSmall && styles.coinTextSmall]}>
          {formatNumber(coins)}
        </Text>
      </View>
      {showAddButton && onAddPress && (
        <TouchableOpacity onPress={onAddPress} style={styles.addButton}>
          <Icon name="plus" size={isSmall ? 14 : 16} color={COLORS.accent} />
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
  },
  containerSmall: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  coinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinText: {
    fontSize: FONTS.base,
    fontWeight: '700',
    color: COLORS.white,
    marginLeft: SPACING.xs,
  },
  coinTextSmall: {
    fontSize: FONTS.sm,
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
});

export default CoinDisplay;
