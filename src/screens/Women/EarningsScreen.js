import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { withdrawalAPI } from '../../services/api/withdrawalAPI';
import Card from '../../components/common/Card';
import Loading from '../../components/common/Loading';
import { theme } from '../../config/theme';

const EarningsScreen = () => {
  const [earnings, setEarnings] = React.useState(null);
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [earningsRes, historyRes] = await Promise.all([
        withdrawalAPI.getEarnings(),
        withdrawalAPI.getWithdrawalHistory(),
      ]);
      
      setEarnings(earningsRes.data);
      setHistory(historyRes.data.withdrawals);
    } catch (error) {
      console.error('Load earnings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <Card style={styles.historyCard}>
      <View style={styles.historyRow}>
        <View style={styles.historyInfo}>
          <Text style={styles.historyAmount}>₹{item.amount}</Text>
          <Text style={styles.historyDate}>
            {new Date(item.requestDate).toLocaleDateString()}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          item.status === 'completed' && styles.completedBadge,
          item.status === 'failed' && styles.failedBadge,
        ]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.historyCoins}>{item.coins} coins</Text>
    </Card>
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <Card style={styles.summaryCard}>
        <Text style={styles.label}>Current Balance</Text>
        <Text style={styles.value}>₹{earnings?.currentEarnings || 0}</Text>
        <Text style={styles.sublabel}>{earnings?.currentCoins || 0} coins</Text>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Withdrawn</Text>
            <Text style={styles.statValue}>₹{earnings?.totalWithdrawn || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Earned</Text>
            <Text style={styles.statValue}>
              {earnings?.totalLifetimeCoins || 0} coins
            </Text>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Withdrawal History</Text>

      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No withdrawal history yet</Text>
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
  summaryCard: {
    margin: theme.spacing.md,
  },
  label: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textLight,
  },
  value: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.secondary,
    marginVertical: theme.spacing.sm,
  },
  sublabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textLight,
  },
  statValue: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  list: {
    padding: theme.spacing.md,
  },
  historyCard: {
    marginBottom: theme.spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  historyInfo: {
    flex: 1,
  },
  historyAmount: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  historyDate: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textLight,
    marginTop: theme.spacing.xs,
  },
  historyCoins: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.warning + '20',
  },
  completedBadge: {
    backgroundColor: theme.colors.success + '20',
  },
  failedBadge: {
    backgroundColor: theme.colors.danger + '20',
  },
  statusText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xxl,
  },
});

export default EarningsScreen;