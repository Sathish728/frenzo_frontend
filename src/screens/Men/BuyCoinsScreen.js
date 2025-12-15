import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
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
      Alert.alert('Error', error.response?.data?.message || 'Failed to initiate payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateUPIUrl = (params) => {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    return `upi://pay?${queryString}`;
  };

  const showPaymentOptions = (orderData, pkg) => {
    const amount = pkg.price;
    const orderId = orderData.orderId;
    
    Alert.alert(
      'Choose Payment Method',
      'Select your preferred UPI app',
      [
        {text: 'Google Pay', onPress: () => openUPIApp('gpay', orderId, amount, pkg)},
        {text: 'PhonePe', onPress: () => openUPIApp('phonepe', orderId, amount, pkg)},
        {text: 'Paytm', onPress: () => openUPIApp('paytm', orderId, amount, pkg)},
        {text: 'Other UPI', onPress: () => openGenericUPI(orderId, amount, pkg)},
        {text: 'Cancel', style: 'cancel'},
      ],
    );
  };

  const openUPIApp = async (app, orderId, amount, pkg) => {
    // Replace 'merchant@upi' with your actual merchant UPI ID
    const merchantUPI = 'merchant@okaxis';
    
    const upiUrls = {
      gpay: `tez://upi/pay?pa=${merchantUPI}&pn=FrndZone&tr=${orderId}&tn=Buy%20Coins&am=${amount}&cu=INR`,
      phonepe: `phonepe://pay?pa=${merchantUPI}&pn=FrndZone&tr=${orderId}&tn=Buy%20Coins&am=${amount}&cu=INR`,
      paytm: `paytmmp://pay?pa=${merchantUPI}&pn=FrndZone&tr=${orderId}&tn=Buy%20Coins&am=${amount}&cu=INR`,
    };

    const url = upiUrls[app];

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        setTimeout(() => showPaymentVerification(orderId, pkg), 1000);
      } else {
        Alert.alert('App Not Found', `${app} is not installed. Try another method.`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open payment app.');
    }
  };

  const openGenericUPI = async (orderId, amount, pkg) => {
    const merchantUPI = 'merchant@okaxis';
    const url = generateUPIUrl({
      pa: merchantUPI,
      pn: 'FrndZone',
      tr: orderId,
      tn: `Buy ${pkg.coins + (pkg.bonus || 0)} coins`,
      am: amount.toString(),
      cu: 'INR',
    });

    try {
      await Linking.openURL(url);
      setTimeout(() => showPaymentVerification(orderId, pkg), 1000);
    } catch (error) {
      Alert.alert('Error', 'No UPI app found. Please install Google Pay or PhonePe.');
    }
  };

  const showPaymentVerification = (orderId, pkg) => {
    Alert.alert(
      'Payment Status',
      'Did you complete the payment?',
      [
        {text: 'No, Cancel', style: 'cancel', onPress: () => setCurrentOrder(null)},
        {text: 'Yes, Verify', onPress: () => verifyPayment(orderId, pkg)},
      ],
    );
  };

  const verifyPayment = async (orderId, pkg) => {
    setIsProcessing(true);
    try {
      const response = await paymentAPI.verifyUPIPayment(orderId);
      
      if (response.data.data?.success) {
        const newCoins = (user?.coins || 0) + (pkg.coins + (pkg.bonus || 0));
        dispatch(updateCoins(newCoins));
        
        Alert.alert(
          'Payment Successful! 🎉',
          `${formatNumber(pkg.coins + (pkg.bonus || 0))} coins added!`,
          [{text: 'OK', onPress: () => navigation.goBack()}],
        );
      } else {
        Alert.alert('Payment Pending', 'Coins will be credited once payment is confirmed.');
      }
    } catch (error) {
      Alert.alert('Verification Failed', 'If amount was deducted, please contact support.');
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

        <Card style={styles.rateCard}>
          <View style={styles.rateRow}>
            <Icon name="phone" size={20} color={COLORS.primary} />
            <Text style={styles.rateText}>40 coins = 1 minute talk time</Text>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Choose a Package</Text>
        
        {COIN_PACKAGES.map((pkg) => (
          <PackageCard
            key={pkg.id}
            packageData={pkg}
            onBuy={handleBuyPackage}
            isLoading={isProcessing}
          />
        ))}

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="shield-check" size={20} color={COLORS.success} />
            <Text style={styles.infoText}>Secure UPI payment</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="lightning-bolt" size={20} color={COLORS.accent} />
            <Text style={styles.infoText}>Instant coin credit</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="cellphone" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>Pay via Google Pay, PhonePe, Paytm</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  scrollContent: { padding: SPACING.lg },
  balanceCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  balanceLabel: { fontSize: FONTS.sm, color: COLORS.white, opacity: 0.8 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm },
  balanceValue: { fontSize: FONTS.display, fontWeight: '700', color: COLORS.white, marginLeft: SPACING.sm },
  balanceSubtext: { fontSize: FONTS.base, color: COLORS.white, opacity: 0.8, marginTop: 4 },
  rateCard: { marginBottom: SPACING.lg, padding: SPACING.md },
  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rateText: { fontSize: FONTS.base, color: COLORS.text, marginLeft: SPACING.sm, fontWeight: '500' },
  sectionTitle: { fontSize: FONTS.lg, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.md },
  infoCard: { marginTop: SPACING.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  infoText: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginLeft: SPACING.sm },
});

export default BuyCoinsScreen;