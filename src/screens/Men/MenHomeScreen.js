import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchAvailableWomen, reportUser } from '../../redux/thunks/userThunks';
import {
  selectAvailableWomen,
  selectUserCoins,
  selectUserLoading,
} from '../../redux/slices/userSlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import WomenCard from '../../components/WomenCard';
import CoinDisplay from '../../components/CoinDisplay';
import Loading from '../../components/common/Loading';
import socketService from '../../services/socket.service';
import { theme } from '../../config/theme';

const MenHomeScreen = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const women = useAppSelector(selectAvailableWomen);
  const coins = useAppSelector(selectUserCoins);
  const loading = useAppSelector(selectUserLoading);
  const user = useAppSelector(selectCurrentUser);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await dispatch(fetchAvailableWomen());
    if (user?.id) {
      socketService.connect(user.id);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchAvailableWomen());
    setRefreshing(false);
  };

  const handleCall = (woman) => {
    if (coins < 40) {
      Alert.alert(
        'Insufficient Coins',
        'You need at least 40 coins to make a call. Buy more coins?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Buy Coins',
            onPress: () => navigation.navigate('BuyCoins'),
          },
        ]
      );
      return;
    }

    navigation.navigate('CallScreen', {
      womenUserId: woman._id,
      womenName: woman.name,
    });
  };

  const handleReport = (woman) => {
    Alert.alert(
      'Report User',
      'Why are you reporting this user?',
      [
        {
          text: 'Fake Profile',
          onPress: () => submitReport(woman._id, 'Fake profile'),
        },
        {
          text: 'Inappropriate Behavior',
          onPress: () => submitReport(woman._id, 'Inappropriate behavior'),
        },
        {
          text: 'Scam',
          onPress: () => submitReport(woman._id, 'Scam or fraud'),
        },
        {
          text: 'Other',
          onPress: () => submitReport(woman._id, 'Other reason'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const submitReport = async (userId, reason) => {
    await dispatch(reportUser(userId, reason));
  };

  if (loading && !refreshing) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <CoinDisplay
          coins={coins}
          onPress={() => navigation.navigate('BuyCoins')}
        />
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={women}
        renderItem={({ item }) => (
          <WomenCard
            woman={item}
            onCall={handleCall}
            onReport={handleReport}
          />
        )}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No women available right now</Text>
            <Text style={styles.emptySubtext}>Pull to refresh</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    fontSize: 24,
  },
  list: {
    padding: theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl * 2,
  },
  emptyText: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
});

export default MenHomeScreen;