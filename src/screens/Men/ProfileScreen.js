import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { selectUserProfile } from '../../redux/slices/userSlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import { logoutUser } from '../../redux/thunks/authThunks';
import { updateProfile } from '../../redux/thunks/userThunks';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Avatar from '../../components/common/Avatar';
import { theme } from '../../config/theme';
import { validators } from '../../utils/validators';

const ProfileScreen = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectUserProfile);
  const user = useAppSelector(selectCurrentUser);
  
  const [name, setName] = useState(profile?.name || '');
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async () => {
    setNameError('');
    
    const error = validators.name(name);
    if (error) {
      setNameError(error);
      return;
    }

    setLoading(true);
    await dispatch(updateProfile({ name }));
    setLoading(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => dispatch(logoutUser()),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar uri={profile?.profileImage} name={profile?.name} size={100} />
        <Text style={styles.phone}>{user?.phone}</Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Name"
          value={name}
          onChangeText={(text) => {
            setName(text);
            setNameError('');
          }}
          placeholder="Enter your name"
          error={nameError}
        />

        <Button
          title="Update Profile"
          onPress={handleUpdateProfile}
          loading={loading}
        />
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.coins || 0}</Text>
          <Text style={styles.statLabel}>Coins</Text>
        </View>
      </View>

      <Button
        title="Logout"
        onPress={handleLogout}
        variant="danger"
        style={styles.logoutButton}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    alignItems: 'center',
    padding: theme.spacing.xxl,
    backgroundColor: theme.colors.white,
  },
  phone: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textLight,
    marginTop: theme.spacing.md,
  },
  form: {
    padding: theme.spacing.lg,
  },
  stats: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    marginTop: theme.spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fonts.sizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textLight,
    marginTop: theme.spacing.xs,
  },
  logoutButton: {
    margin: theme.spacing.lg,
  },
});

export default ProfileScreen;