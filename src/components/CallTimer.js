import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import { updateCallDuration, selectCallDuration } from '../redux/slices/callSlice';
import { formatDuration } from '../utils/helpers';
import { theme } from '../config/theme';

const CallTimer = () => {
  const dispatch = useAppDispatch();
  const duration = useAppSelector(selectCallDuration);

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(updateCallDuration(duration + 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [duration, dispatch]);

  return (
    <View style={styles.container}>
      <Text style={styles.timer}>{formatDuration(duration)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: {
    fontSize: 56,
    fontWeight: 'bold',
    color: theme.colors.secondary,
  },
});

export default CallTimer;