import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Platform,
  NativeModules,
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

// Replace with your actual merchant UPI ID - THIS IS IMPORTANT!
const MERCHANT_UPI_ID = 'paytmqr2810050501011y4dvdwldxbl@paytm';
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

      openUPIPayment(orderData.orderId, pkg);
    } catch (error) {
      console.error('Payment initiation error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to initiate payment.');
      setIsProcessing(false);
    }
  };

  // Generate UPI deep link URL
  const generateUPIUrl = (orderId, amount, coins) => {
    // Standard UPI URL format that works across all apps
    const transactionNote = `FrndZone-${coins}coins`;
    
    const params = new URLSearchParams({
      pa: MERCHANT_UPI_ID,                    // Payee address (UPI ID)
      pn: MERCHANT_NAME,                      // Payee name
      tr: orderId,                            // Transaction reference
      tn: transactionNote,                    // Transaction note
      am: amount.toString(),                  // Amount
      cu: 'INR',                              // Currency
      mode: '02',                             // Mode (02 = UPI collect)
    });
    
    return `upi://pay?${params.toString()}`;
  };

  const openUPIPayment = async (orderId, pkg) => {
    const amount = pkg.price;
    const coins = pkg.coins + (pkg.bonus || 0);
    const upiUrl = generateUPIUrl(orderId, amount, coins);
    
    console.log('Opening UPI URL:', upiUrl);
    
    try {
      // Check if any UPI app can handle this
      const canOpen = await Linking.canOpenURL(upiUrl);
      console.log('Can open UPI URL:', canOpen);
      
      if (canOpen) {
        await Linking.openURL(upiUrl);
        
        // Wait a moment then show verification dialog
        setTimeout(() => {
          setIsProcessing(false);
          showPaymentVerification(orderId, pkg);
        }, 2000);
      } else {
        // No UPI app found - try specific app URLs
        setIsProcessing(false);
        showUPIAppOptions(orderId, amount, coins, pkg);
      }
    } catch (error) {
      console.error('UPI open error:', error);
      setIsProcessing(false);
      
      // Try specific apps as fallback
      showUPIAppOptions(orderId, amount, coins, pkg);
    }
  };

  // Show options to open specific UPI apps
  const showUPIAppOptions = (orderId, amount, coins, pkg) => {
    const upiApps = [
      {
        name: 'Google Pay',
        packageName: 'com.google.android.apps.nbu.paisa.user',
        scheme: 'tez://',
      },
      {
        name: 'PhonePe', 
        packageName: 'com.phonepe.app',
        scheme: 'phonepe://',
      },
      {
        name: 'Paytm',
        packageName: 'net.one97.paytm',
        scheme: 'paytmmp://',
      },
      {
        name: 'BHIM',
        packageName: 'in.org.npci.upiapp',
        scheme: 'upi://',
      },
    ];

    Alert.alert(
      'Select Payment App',
      'Choose an app to complete payment.\n\nMake sure you have at least one UPI app installed.',
      [
        ...upiApps.map(app => ({
          text: app.name,
          onPress: () => tryOpenSpecificApp(app, orderId, amount, coins, pkg),
        })),
        {
          text: 'Install UPI App',
          onPress: () => {
            // Open Play Store to install GPay
            Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.nbu.paisa.user');
          },
        },
        {text: 'Cancel', style: 'cancel'},
      ],
    );
  };

  const tryOpenSpecificApp = async (app, orderId, amount, coins, pkg) => {
    setIsProcessing(true);
    
    // Build the standard UPI URL
    const upiUrl = generateUPIUrl(orderId, amount, coins);
    
    try {
      // For Android, try using Intent URL format for specific apps
      if (Platform.OS === 'android') {
        // Try standard UPI URL first (most compatible)
        const canOpenUPI = await Linking.canOpenURL('upi://pay');
        
        if (canOpenUPI) {
          await Linking.openURL(upiUrl);
          setTimeout(() => {
            setIsProcessing(false);
            showPaymentVerification(orderId, pkg);
          }, 2000);
          return;
        }
      }
      
      // Fallback: try the specific app scheme
      const appUrl = `${app.scheme}pay?${upiUrl.split('?')[1]}`;
      const canOpen = await Linking.canOpenURL(appUrl);
      
      if (canOpen) {
        await Linking.openURL(appUrl);
        setTimeout(() => {
          setIsProcessing(false);
          showPaymentVerification(orderId, pkg);
        }, 2000);
      } else {
        setIsProcessing(false);
        Alert.alert(
          `${app.name} Not Found`,
          `${app.name} is not installed on your device. Please install a UPI app to make payments.`,
          [
            {
              text: 'Install',
              onPress: () => Linking.openURL(`https://play.google.com/store/apps/details?id=${app.packageName}`),
            },
            {text: 'Cancel', style: 'cancel'},
          ],
        );
      }
    } catch (error) {
      console.error(`Error opening ${app.name}:`, error);
      setIsProcessing(false);
      Alert.alert('Error', `Could not open ${app.name}. Please try another payment method.`);
    }
  };

  const showPaymentVerification = (orderId, pkg) => {
    Alert.alert(
      'Payment Status',
      'Did you complete the payment in the UPI app?',
      [
        {
          text: 'No, I cancelled',
          style: 'cancel',
          onPress: () => {
            setCurrentOrder(null);
            Alert.alert('Payment Cancelled', 'Your payment was not completed.');
          },
        },
        {
          text: 'Yes, Verify',
          onPress: () => verifyPayment(orderId, pkg),
        },
        {
          text: 'Try Again',
          onPress: () => openUPIPayment(orderId, pkg),
        },
      ],
    );
  };

  const verifyPayment = async (orderId, pkg) => {
    setIsProcessing(true);
    
    try {
      // Call backend to verify payment status
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
        // Payment not yet confirmed
        Alert.alert(
          'Payment Pending',
          'Your payment is being processed. Coins will be added once the payment is confirmed.\n\nThis usually takes a few seconds. Please wait and try verifying again.',
          [
            {
              text: 'Check Again',
              onPress: () => {
                // Wait a moment then retry
                setTimeout(() => verifyPayment(orderId, pkg), 3000);
              },
            },
            {
              text: 'OK',
              style: 'cancel',
              onPress: () => setCurrentOrder(null),
            },
          ],
        );
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      Alert.alert(
        'Verification Issue',
        'Unable to verify payment status right now. If the amount was deducted from your account:\n\n1. Wait a few minutes\n2. Check your coin balance\n3. Contact support if coins are not credited',
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
          <Loading message="Processing payment..." />
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
          <View style={styles.infoHeader}>
            <Icon name="information" size={20} color={COLORS.primary} />
            <Text style={styles.infoTitle}>Payment Information</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="shield-check" size={18} color={COLORS.success} />
            <Text style={styles.infoText}>Secure UPI payment</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="lightning-bolt" size={18} color={COLORS.accent} />
            <Text style={styles.infoText}>Instant coin credit after verification</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="cellphone" size={18} color={COLORS.primary} />
            <Text style={styles.infoText}>Works with GPay, PhonePe, Paytm, BHIM</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="help-circle" size={18} color={COLORS.textMuted} />
            <Text style={styles.infoText}>Contact support if coins not credited within 24 hours</Text>
          </View>
        </Card>

        {/* Troubleshooting */}
        <Card style={styles.troubleCard}>
          <Text style={styles.troubleTitle}>Payment Not Working?</Text>
          <Text style={styles.troubleText}>
            • Make sure you have a UPI app (GPay, PhonePe, Paytm) installed{'\n'}
            • Check your internet connection{'\n'}
            • Try updating your UPI app{'\n'}
            • Ensure your UPI account is active
          </Text>
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
    marginBottom: SPACING.sm,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  infoTitle: {
    fontSize: FONTS.base,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    paddingLeft: SPACING.xs,
  },
  infoText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  troubleCard: {
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surfaceLight,
  },
  troubleTitle: {
    fontSize: FONTS.base,
    fontWeight: '600',
    color: COLORS.warning,
    marginBottom: SPACING.xs,
  },
  troubleText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default BuyCoinsScreen;