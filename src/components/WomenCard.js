import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {COLORS, FONTS, RADIUS, SPACING} from '../config/constants';
import {SHADOWS} from '../config/theme';
import Avatar from './common/Avatar';
import Button from './common/Button';

const WomenCard = ({
  woman,
  onCall,
  onReport,
  disabled = false,
}) => {
  const {name, profileImage, isOnline, isAvailable} = woman;
  const canCall = isOnline && isAvailable && !disabled;

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Avatar
          name={name}
          imageUrl={profileImage}
          size={56}
          showOnlineStatus
          isOnline={isOnline}
        />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {backgroundColor: isOnline ? COLORS.success : COLORS.textMuted},
              ]}
            />
            <Text style={styles.statusText}>
              {isOnline ? (isAvailable ? 'Available' : 'Busy') : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.rightSection}>
        <Button
          title="Call"
          icon="phone"
          size="small"
          variant={canCall ? 'primary' : 'outline'}
          onPress={() => onCall(woman)}
          disabled={!canCall}
        />
        <TouchableOpacity
          onPress={() => onReport(woman)}
          style={styles.reportButton}>
          <Icon name="flag-outline" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  info: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  name: {
    fontSize: FONTS.base,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportButton: {
    marginLeft: SPACING.sm,
    padding: SPACING.xs,
  },
});

export default WomenCard;
