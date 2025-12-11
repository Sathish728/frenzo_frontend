import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSelector} from 'react-redux';

import {COLORS, FONTS, SPACING, RADIUS} from '../../config/constants';
import Card from '../../components/common/Card';
import {Loading} from '../../components/common/Loading';
import {calculateEarnings, formatNumber, formatDate, formatCurrency} from '../../utils/helpers';

// Mock withdrawal history
const MOCK_WITHDRAWALS = [
  {
    id: '1',
    amount: 500,
    coins: 10000,
    status: 'completed',
    upiId: 'user@paytm',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    amount: 250,
    coins: 5000,
    status: 'pending',
    upiId: 'user@paytm',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
];

const EarningsScreen = ({navigation}) => {
  const {user} = useSelector((state) => state.auth);
  
  const [withdrawals, setWithdrawals] = useState(MOCK_WITHDRAWALS);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const coins = user?.coins || 0;
  const currentEarnings = calculateEarnings(coins);
  const totalWithdrawn = withdrawals
    .filter((w) => w.status === 'completed')
    .reduce((sum, w) => sum + w.amount, 0);

  const onRefresh = async () => {
    setRefreshing(true);
    // In production, fetch from API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return COLORS.success;
      case 'pending':
        return COLORS.warning;
      case 'failed':
        return COLORS.danger;
      default:
        return COLORS.textMuted;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'pending':
        return 'clock-outline';
      case 'failed':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Current Balance</Text>
            <Text style={styles.summaryValue}>₹{currentEarnings.toFixed(0)}</Text>
            <Text style={styles.summarySubtext}>{formatNumber(coins)} coins</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Withdrawn</Text>
            <Text style={[styles.summaryValue, {color: COLORS.success}]}>
              ₹{totalWithdrawn}
            </Text>
            <Text style={styles.summarySubtext}>All time</Text>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Withdrawal History</Text>
    </View>
  );

  const renderWithdrawal = ({item}) => (
    <Card style={styles.withdrawalCard}>
      <View style={styles.withdrawalHeader}>
        <View style={styles.withdrawalAmount}>
          <Text style={styles.withdrawalValue}>₹{item.amount}</Text>
          <Text style={styles.withdrawalCoins}>{formatNumber(item.coins)} coins</Text>
        </View>
        <View style={[styles.statusBadge, {backgroundColor: getStatusColor(item.status) + '20'}]}>
          <Icon
            name={getStatusIcon(item.status)}
            size={14}
            color={getStatusColor(item.status)}
          />
          <Text style={[styles.statusText, {color: getStatusColor(item.status)}]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      
      <View style={styles.withdrawalDetails}>
        <View style={styles.detailRow}>
          <Icon name="bank" size={14} color={COLORS.textMuted} />
          <Text style={styles.detailText}>{item.upiId}</Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="calendar" size={14} color={COLORS.textMuted} />
          <Text style={styles.detailText}>
            Requested: {formatDate(item.createdAt)}
          </Text>
        </View>
        {item.completedAt && (
          <View style={styles.detailRow}>
            <Icon name="check" size={14} color={COLORS.success} />
            <Text style={styles.detailText}>
              Completed: {formatDate(item.completedAt)}
            </Text>
          </View>
        )}
      </View>
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="history" size={64} color={COLORS.textMuted} />
      <Text style={styles.emptyText}>No withdrawals yet</Text>
      <Text style={styles.emptySubtext}>
        Your withdrawal history will appear here
      </Text>
    </View>
  );

  if (isLoading) {
    return <Loading message="Loading history..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={withdrawals}
        keyExtractor={(item) => item.id}
        renderItem={renderWithdrawal}
        ListHeaderComponent={renderHeader}
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
  listContent: {
    padding: SPACING.lg,
  },
  headerSection: {
    marginBottom: SPACING.md,
  },
  summaryCard: {
    marginBottom: SPACING.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: FONTS.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  summarySubtext: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 50,
    backgroundColor: COLORS.surfaceLight,
  },
  sectionTitle: {
    fontSize: FONTS.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  withdrawalCard: {
    marginBottom: SPACING.sm,
  },
  withdrawalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  withdrawalAmount: {},
  withdrawalValue: {
    fontSize: FONTS.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  withdrawalCoins: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    marginLeft: 4,
  },
  withdrawalDetails: {
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
    paddingTop: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
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

export default EarningsScreen;
