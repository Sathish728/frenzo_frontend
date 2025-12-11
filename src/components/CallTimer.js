import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {COLORS, FONTS, SPACING} from '../config/constants';
import {formatDuration} from '../utils/helpers';

const CallTimer = ({duration, isActive = true, showIcon = true}) => {
  return (
    <View style={styles.container}>
      {showIcon && (
        <Icon
          name="clock-outline"
          size={20}
          color={isActive ? COLORS.success : COLORS.textSecondary}
          style={styles.icon}
        />
      )}
      <Text style={[styles.timer, !isActive && styles.timerInactive]}>
        {formatDuration(duration)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: SPACING.xs,
  },
  timer: {
    fontSize: FONTS.xxl,
    fontWeight: '600',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  timerInactive: {
    color: COLORS.textSecondary,
  },
});

export default CallTimer;
