import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch, useSelector} from 'react-redux';

import {COLORS, FONTS, SPACING, RADIUS, CALL_RATES} from '../../config/constants';
import {logout} from '../../redux/slices/authSlice';
import {fetchAvailableWomen, reportUser} from '../../redux/slices/userSlice';
import {initiateCall} from '../../redux/slices/callSlice';
import socketService from '../../services/socketService';
import CoinDisplay from '../../components/CoinDisplay';
import WomenCard from '../../components/WomenCard';
import Card from '../../components/common/Card';
import {Loading} from '../../components/common/Loading';

const MenHomeScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {user, token} = useSelector((state) => state.auth);
  const {availableWomen, isLoadingWomen} = useSelector((state) => state.user);
  
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (token) {
      socketService.connect(token);
      loadWomen();
    }

    return () => {
      socketService.disconnect();
    };
  }, [token]);

  const loadWomen = async () => {
    try {
      await dispatch(fetchAvailableWomen()).unwrap();
    } catch (err) {
      console.log('Failed to load women:', err);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWomen();
    setRefreshing(false);
  }, []);

  const handleCall = (woman) => {
    const requiredCoins = CALL_RATES.coinsPerMinute;
    
    if (user.coins < requiredCoins) {
      Alert.alert(
        'Insufficient Coins',
        `You need at least ${requiredCoins} coins to make a call.`,
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Buy Coins', onPress: () => navigation.navigate('BuyCoins')},
        ],
      );
      return;
    }

    Alert.alert(
      'Start Call',
      `Call ${woman.name}? (${CALL_RATES.coinsPerMinute} coins/min)`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Call',
          onPress: () => {
            dispatch(initiateCall({user: woman}));
            socketService.initiateCall(woman._id);
            navigation.navigate('CallScreen', {woman});
          },
        },
      ],
    );
  };

  const handleReport = (woman) => {
    Alert.alert(
      'Report User',
      `Report ${woman.name} for inappropriate behavior?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(
                reportUser({userId: woman._id, reason: 'Inappropriate behavior'}),
              ).unwrap();
              Alert.alert('Reported', 'Thank you for your report.');
            } catch (err) {
              Alert.alert('Error', 'Failed to report user');
            }
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => dispatch(logout()),
      },
    ]);
  };

  const onlineWomen = availableWomen.filter((w) => w.isOnline);

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>Hello, {user?.name || 'User'}</Text>
        <Text style={styles.subGreeting}>Find someone to talk to</Text>
      </View>
      <View style={styles.headerRight}>
        <CoinDisplay
          coins={user?.coins || 0}
          onAddPress={() => navigation.navigate('BuyCoins')}
          size="small"
        />
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Icon name="logout" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <Card style={styles.statCard}>
        <Icon name="account-group" size={24} color={COLORS.success} />
        <Text style={styles.statValue}>{onlineWomen.length}</Text>
        <Text style={styles.statLabel}>Online Now</Text>
      </Card>
      <Card style={styles.statCard}>
        <Icon name="clock-outline" size={24} color={COLORS.accent} />
        <Text style={styles.statValue}>{CALL_RATES.coinsPerMinute}</Text>
        <Text style={styles.statLabel}>Coins/min</Text>
      </Card>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="account-search" size={64} color={COLORS.textMuted} />
      <Text style={styles.emptyText}>No women available right now</Text>
      <Text style={styles.emptySubtext}>Pull down to refresh</Text>
    </View>
  );

  if (isLoadingWomen && availableWomen.length === 0) {
    return <Loading message="Loading..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      
      <FlatList
        data={availableWomen}
        keyExtractor={(item) => item._id}
        renderItem={({item}) => (
          <WomenCard
            woman={item}
            onCall={handleCall}
            onReport={handleReport}
          />
        )}
        ListHeaderComponent={renderStats}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  greeting: {
    fontSize: FONTS.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  subGreeting: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    marginLeft: SPACING.md,
    padding: SPACING.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  statValue: {
    fontSize: FONTS.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyText: {
    fontSize: FONTS.lg,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: FONTS.base,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
});

export default MenHomeScreen;
