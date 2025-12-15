import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch, useSelector} from 'react-redux';

import {COLORS, FONTS, SPACING, RADIUS, COIN_PACKAGES} from '../../config/constants';
import {updateCoins} from '../../redux/slices/authSlice';
import {paymentAPI} from '../../services/api/paymentAPI';
import Card from '../../components/common/Card';
import PackageCard from '../../components/PackageCard';
import {Loading} from '../../components/common/Loading';
import {formatNumber} from '../../utils/helpers';

// Replace with your actual merchant UPI ID
const MERCHANT_UPI_ID = 'paytmqr2810050501011y4dvdwldxbl@paytm'; // Example: yourname@okaxis, yourname@ybl, etc.
const MERCHANT_NAME = 'FrndZone';

const BuyCoinsScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {user} = useSelector((state) => state.auth);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);

  const handleBuyPackage = async (pkg) => {
    Alert.alert(
      'Confirm Purchase',
      `Buy ${formatNumber(pkg.coins + (pkg.bonus || 0))} coins for ₹${pkg.price}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Pay with UPI', onPress: () => initiatePayment(pkg)},
      ],
    );
  };

  const initiatePayment = async (pkg) => {
    setIsProcessing(true);
    try {
      const response = await paymentAPI.createOrder(pkg.id, pkg.price, pkg.coins + (pkg.bonus || 0));
      const orderData = response.data.data;
      
      setCurrentOrder({
        orderId: orderData.orderId,
        amount: pkg.price,
        coins: pkg.coins + (pkg.bonus || 0),
      });

      showPaymentOptions(orderData, pkg);
    } catch (error) {
      console.error('Payment initiation error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to initiate payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate standard UPI URL
  const generateUPIUrl = (orderId, amount, coins) => {
    const params = {
      pa: MERCHANT_UPI_ID,
      pn: encodeURIComponent(MERCHANT_NAME),
      tr: orderId,
      tn: encodeURIComponent(`Buy ${coins} FrndZone Coins`),
      am: amount.toString(),
      cu: 'INR',
    };
    
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    return `upi://pay?${queryString}`;
  };

  const showPaymentOptions = (orderData, pkg) => {
    const amount = pkg.price;
    const orderId = orderData.orderId;
    const coins = pkg.coins + (pkg.bonus || 0);
    
    Alert.alert(
      'Choose Payment Method',
      `Pay ₹${amount} for ${formatNumber(coins)} coins`,
      [
        {
          text: 'Any UPI App',
          onPress: () => openUPIIntent(orderId, amount, coins, pkg),
        },
        {text: 'Cancel', style: 'cancel'},
      ],
    );
  };

  // Open UPI intent - this will show all available UPI apps
  const openUPIIntent = async (orderId, amount, coins, pkg) => {
    const upiUrl = generateUPIUrl(orderId, amount, coins);
    
    console.log('Opening UPI URL:', upiUrl);
    
    try {
      const supported = await Linking.canOpenURL(upiUrl);
      console.log('UPI supported:', supported);
      
      if (supported) {
        await Linking.openURL(upiUrl);
        // Show verification dialog after a delay
        setTimeout(() => {
          showPaymentVerification(orderId, pkg);
        }, 2000);
      } else {
        // Try alternative methods
        tryAlternativeUPIApps(orderId, amount, coins, pkg);
      }
    } catch (error) {
      console.error('UPI open error:', error);
      tryAlternativeUPIApps(orderId, amount, coins, pkg);
    }
  };

  // Try opening specific UPI apps
  const tryAlternativeUPIApps = async (orderId, amount, coins, pkg) => {
    const upiApps = [
      {
        name: 'Google Pay',
        // GPay uses intent scheme on Android
        url: Platform.OS === 'android' 
          ? `intent://pay?pa=${MERCHANT_UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&tr=${orderId}&tn=${encodeURIComponent(`Buy ${coins} coins`)}&am=${amount}&cu=INR#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`
          : `gpay://upi/pay?pa=${MERCHANT_UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&tr=${orderId}&am=${amount}&cu=INR`,
        package: 'com.google.android.apps.nbu.paisa.user',
      },
      {
        name: 'PhonePe',
        url: Platform.OS === 'android'
          ? `intent://pay?pa=${MERCHANT_UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&tr=${orderId}&tn=${encodeURIComponent(`Buy ${coins} coins`)}&am=${amount}&cu=INR#Intent;scheme=upi;package=com.phonepe.app;end`
          : `phonepe://pay?pa=${MERCHANT_UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&tr=${orderId}&am=${amount}&cu=INR`,
        package: 'com.phonepe.app',
      },
      {
        name: 'Paytm',
        url: Platform.OS === 'android'
          ? `intent://pay?pa=${MERCHANT_UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&tr=${orderId}&tn=${encodeURIComponent(`Buy ${coins} coins`)}&am=${amount}&cu=INR#Intent;scheme=upi;package=net.one97.paytm;end`
          : `paytmmp://pay?pa=${MERCHANT_UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&tr=${orderId}&am=${amount}&cu=INR`,
        package: 'net.one97.paytm',
      },
    ];

    // Show options to user
    Alert.alert(
      'Select UPI App',
      'Choose an app to complete payment',
      [
        ...upiApps.map(app => ({
          text: app.name,
          onPress: async () => {
            try {
              // For Android, try the standard UPI URL first
              const standardUrl = generateUPIUrl(orderId, amount, coins);
              await Linking.openURL(standardUrl);
              setTimeout(() => showPaymentVerification(orderId, pkg), 2000);
            } catch (err) {
              console.error(`Error opening ${app.name}:`, err);
              Alert.alert(
                'App Not Available',
                `${app.name} could not be opened. Please install a UPI app.`,
              );
            }
          },
        })),
        {text: 'Cancel', style: 'cancel'},
      ],
    );
  };

  const showPaymentVerification = (orderId, pkg) => {
    Alert.alert(
      'Payment Status',
      'Did you complete the payment successfully?',
      [
        {
          text: 'No, Cancel',
          style: 'cancel',
          onPress: () => setCurrentOrder(null),
        },
        {
          text: 'Yes, Verify Payment',
          onPress: () => verifyPayment(orderId, pkg),
        },
      ],
    );
  };

  const verifyPayment = async (orderId, pkg) => {
    setIsProcessing(true);
    try {
      const response = await paymentAPI.verifyUPIPayment(orderId);
      
      if (response.data.data?.success) {
        const coinsToAdd = pkg.coins + (pkg.bonus || 0);
        const newCoins = (user?.coins || 0) + coinsToAdd;
        dispatch(updateCoins(newCoins));
        
        Alert.alert(
          'Payment Successful! 🎉',
          `${formatNumber(coinsToAdd)} coins have been added to your account!`,
          [{text: 'OK', onPress: () => navigation.goBack()}],
        );
      } else {
        Alert.alert(
          'Payment Pending',
          'Your payment is being processed. Coins will be credited once the payment is confirmed. This may take a few minutes.',
          [
            {text: 'Check Again', onPress: () => verifyPayment(orderId, pkg)},
            {text: 'OK', style: 'cancel'},
          ],
        );
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      Alert.alert(
        'Verification Issue',
        'Unable to verify payment status. If the amount was deducted from your account, please wait a few minutes and check your coin balance. If coins are not credited, please contact support.',
        [{text: 'OK'}],
      );
    } finally {
      setIsProcessing(false);
      setCurrentOrder(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isProcessing && (
        <View style={styles.loadingOverlay}>
          <Loading message="Processing..." />
        </View>
      )}
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <LinearGradient
          colors={COLORS.gradientPrimary}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <View style={styles.balanceRow}>
            <Icon name="circle-multiple" size={32} color={COLORS.white} />
            <Text style={styles.balanceValue}>{formatNumber(user?.coins || 0)}</Text>
          </View>
          <Text style={styles.balanceSubtext}>Coins</Text>
        </LinearGradient>

        {/* Call Rate Info */}
        <Card style={styles.rateCard}>
          <View style={styles.rateRow}>
            <Icon name="phone" size={20} color={COLORS.primary} />
            <Text style={styles.rateText}>40 coins = 1 minute talk time</Text>
          </View>
        </Card>

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
            <Text style={styles.infoText}>Secure UPI payment</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="lightning-bolt" size={20} color={COLORS.accent} />
            <Text style={styles.infoText}>Instant coin credit after verification</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="cellphone" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>Works with any UPI app</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="information" size={20} color={COLORS.textMuted} />
            <Text style={styles.infoText}>Contact support if coins not credited</Text>
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  balanceCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
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
  rateCard: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateText: {
    fontSize: FONTS.base,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: FONTS.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  infoCard: {
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
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
    flex: 1,
  },
});

export default BuyCoinsScreen;