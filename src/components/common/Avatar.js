import React from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {COLORS, FONTS} from '../../config/constants';
import {getInitials} from '../../utils/helpers';

const Avatar = ({
  name,
  imageUrl,
  size = 50,
  showOnlineStatus = false,
  isOnline = false,
  style,
}) => {
  const initials = getInitials(name);
  const fontSize = size * 0.4;
  const statusSize = size * 0.25;

  return (
    <View style={[{width: size, height: size}, style]}>
      {imageUrl ? (
        <Image
          source={{uri: imageUrl}}
          style={[
            styles.image,
            {width: size, height: size, borderRadius: size / 2},
          ]}
        />
      ) : (
        <LinearGradient
          colors={COLORS.gradientPrimary}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={[
            styles.placeholder,
            {width: size, height: size, borderRadius: size / 2},
          ]}>
          <Text style={[styles.initials, {fontSize}]}>{initials}</Text>
        </LinearGradient>
      )}
      {showOnlineStatus && (
        <View
          style={[
            styles.statusContainer,
            {
              width: statusSize,
              height: statusSize,
              borderRadius: statusSize / 2,
              right: 0,
              bottom: 0,
            },
          ]}>
          <View
            style={[
              styles.status,
              {
                width: statusSize - 4,
                height: statusSize - 4,
                borderRadius: (statusSize - 4) / 2,
                backgroundColor: isOnline ? COLORS.success : COLORS.textMuted,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: COLORS.surface,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: COLORS.white,
    fontWeight: '600',
  },
  statusContainer: {
    position: 'absolute',
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  status: {},
});

export default Avatar;
