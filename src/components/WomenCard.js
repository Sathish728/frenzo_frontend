import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../config/theme';
import { API_URL } from '../config/constants';

const WomenCard = ({ woman, onCall, onReport }) => {
  const imageUri = woman.profileImage?.startsWith('http')
    ? woman.profileImage
    : `${API_URL}${woman.profileImage}`;

  return (
    <View style={styles.card}>
      <Image source={{ uri: imageUri }} style={styles.avatar} />
      
      <View style={styles.info}>
        <Text style={styles.name}>{woman.name}</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.dot, woman.isOnline && styles.onlineDot]} />
          <Text style={styles.status}>
            {woman.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.callButton, !woman.isOnline && styles.disabledButton]}
          onPress={() => onCall(woman)}
          disabled={!woman.isOnline}
        >
          <Text style={styles.callButtonText}>📞 Call</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => onReport(woman)}
        >
          <Text style={styles.reportIcon}>⚠️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.border,
  },
  info: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  name: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.textMuted,
    marginRight: theme.spacing.xs,
  },
  onlineDot: {
    backgroundColor: theme.colors.secondary,
  },
  status: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textLight,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  callButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.round,
  },
  disabledButton: {
    backgroundColor: theme.colors.border,
  },
  callButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: theme.fonts.sizes.sm,
  },
  reportButton: {
    backgroundColor: `${theme.colors.warning}20`,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportIcon: {
    fontSize: 18,
  },
});

export default WomenCard;