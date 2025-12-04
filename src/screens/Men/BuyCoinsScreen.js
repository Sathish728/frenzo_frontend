import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import {
  fetchPackages,
  createOrder,
  verifyPayment,
} from '../../redux/thunks/paymentThunks';
import {
  selectPaymentPackages,
  selectProcessingPayment,
} from '../../redux/slices/paymentSlice';
import PackageCard from '../../components/PackageCard';
import Loading from '../../components/common/Loading';
import { theme } from '../../config/theme';

const BuyCoinsScreen = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const packages = useAppSelector(selectPaymentPackages);
  const loading = useAppSelector(selectProcessingPayment);

  useEffect(() => {
    dispatch(fetchPackages());
  }, [dispatch]);

  const handlePurchase = async (pkg) => {
    try {
      const orderData = await dispatch(
        createOrder(pkg.amount, pkg.coins)
      ).unwrap();

      const options = {
        description: `Purchase ${pkg.coins} coins`,
        currency: 'INR',
        key: orderData.keyId,
        amount: orderData.amount,
        order_id: orderData.orderId,
        name: 'Calling App',
        theme: { color: theme.colors.primary },
      };

      const data = await RazorpayCheckout.open(options);

      await dispatch(
        verifyPayment(
          orderData.orderId,
          data.razorpay_payment_id,
          data.razorpay_signature
        )
      ).unwrap();

      Alert.alert(
        'Success!',
        `${pkg.coins} coins added to your account`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      if (error.code !== 2) {
        // Error code 2 means user cancelled
        console.error('Payment error:', error);
      }
    }
  };

  if (!packages.length) {
    return <Loading />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Buy Coins</Text>
        <Text style={styles.subtitle}>
          40 coins = 1 minute of talk time
        </Text>
      </View>

      <View style={styles.packageList}>
        {packages.map((pkg, index) => (
          <PackageCard
            key={index}
            pkg={pkg}
            onPress={handlePurchase}
            loading={loading}
          />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
  },
  title: {
    fontSize: theme.fonts.sizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textLight,
  },
  packageList: {
    padding: theme.spacing.md,
  },
});

export default BuyCoinsScreen;