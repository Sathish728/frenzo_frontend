import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch, useSelector} from 'react-redux';

import {COLORS, FONTS, SPACING, RADIUS, COIN_PACKAGES} from '../../config/constants';
import {updateCoins} from '../../redux/slices/authSlice';
import Card from '../../components/common/Card';
import PackageCard from '../../components/PackageCard';
import {formatNumber} from '../../utils/helpers';

const BuyCoinsScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {user} = useSelector((state) => state.auth);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBuyPackage = async (pkg) => {
    Alert.alert(
      'Confirm Purchase',
      `Buy ${formatNumber(pkg.coins + (pkg.bonus || 0))} coins for ₹${pkg.price}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Buy',
          onPress: async () => {
            setIsProcessing(true);
            
            try {
              // In production, integrate Razorpay here
              // For now, simulate purchase
              await new Promise((resolve) => setTimeout(resolve, 1500));
              
              const newCoins = (user?.coins || 0) + pkg.coins + (pkg.bonus || 0);
              dispatch(updateCoins(newCoins));
              
              Alert.alert(
                'Success!',
                `${formatNumber(pkg.coins + (pkg.bonus || 0))} coins added to your account.`,
                [{text: 'OK', onPress: () => navigation.goBack()}],
              );
            } catch (error) {
              Alert.alert('Error', 'Payment failed. Please try again.');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <LinearGradient
          colors={COLORS.gradientPrimary}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <View style={styles.balanceRow}>
            <Icon name="circle-multiple" size={32} color={COLORS.white} />
            <Text style={styles.balanceValue}>
              {formatNumber(user?.coins || 0)}
            </Text>
          </View>
          <Text style={styles.balanceSubtext}>Coins</Text>
        </LinearGradient>

        {/* Packages */}
        <Text style={styles.sectionTitle}>Choose a Package</Text>
        
        {COIN_PACKAGES.map((pkg) => (
          <PackageCard
            key={pkg.id}
            packageData={pkg}
            onBuy={handleBuyPackage}
            isLoading={isProcessing}
          />
        ))}

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="shield-check" size={20} color={COLORS.success} />
            <Text style={styles.infoText}>Secure payment via Razorpay</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="lightning-bolt" size={20} color={COLORS.accent} />
            <Text style={styles.infoText}>Instant coin credit</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="refresh" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>No refunds on coin purchases</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  balanceCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  balanceLabel: {
    fontSize: FONTS.sm,
    color: COLORS.white,
    opacity: 0.8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  balanceValue: {
    fontSize: FONTS.display,
    fontWeight: '700',
    color: COLORS.white,
    marginLeft: SPACING.sm,
  },
  balanceSubtext: {
    fontSize: FONTS.base,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: FONTS.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  infoCard: {
    marginTop: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  infoText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
});

export default BuyCoinsScreen;
