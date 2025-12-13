import { useCart } from '@/contexts/cart-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import type { ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type DetailVisual = {
  icon: IoniconName;
  color: string;
  background: string;
};

const DETAIL_VISUALS = {
  when: { icon: 'time-outline', color: '#D97706', background: '#FFF7ED' },
  items: { icon: 'receipt-outline', color: '#0EA5E9', background: '#ECF8FF' },
  pickupLocation: { icon: 'storefront-outline', color: '#047857', background: '#ECFDF5' },
  deliveryLocation: { icon: 'navigate-circle-outline', color: '#9333EA', background: '#F5F3FF' },
  recipient: { icon: 'person-circle-outline', color: '#1F2937', background: '#E5E7EB' },
  instruction: { icon: 'location-outline', color: '#1F2937', background: '#E5E7EB' },
} satisfies Record<
  'when' | 'items' | 'pickupLocation' | 'deliveryLocation' | 'recipient' | 'instruction',
  DetailVisual
>;

export default function OrderSummaryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { state } = useCart();
  const { items, total } = state;


  // Get delivery details from params or use defaults
  const fulfillmentTypeParam = params.fulfillmentType as string;
  const fulfillmentType: 'delivery' | 'pickup' =
    fulfillmentTypeParam === 'pickup' ? 'pickup' : 'delivery';
  const isPickup = fulfillmentType === 'pickup';
  const pickupEta =
    (params.pickupEta as string) ??
    'Ready within 15 minutes once the store confirms your order.';
  const pickupLocation =
    (params.pickupLocation as string) ??
    '617 Alabama Ave SW Birmingham, AL 35211';
  const pickupLocationName =
    (params.pickupLocationName as string) ?? 'Basket Market';
  const selectedDate = params.date as string;
  const timeSlotStart = params.timeSlotStart as string;
  const timeSlotEnd = params.timeSlotEnd as string;
  const timeSlotTz = params.timeSlotTz as string;
  const deliveryFeeParam = params.deliveryFee as string;
  
  // Format delivery date
  const getDeliveryDate = () => {
    if (selectedDate === 'today') return 'Today';
    if (selectedDate?.startsWith('day-')) {
      const dayNum = parseInt(selectedDate.split('-')[1]) || 1;
      const date = new Date();
      date.setDate(date.getDate() + dayNum);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const day = date.getDate();
      return `${dayName}, ${month} ${day}`;
    }
    return 'Tomorrow, November 9';
  };
  
  const deliveryDate = getDeliveryDate();
  const deliveryTime = timeSlotStart && timeSlotEnd && timeSlotTz 
    ? `${timeSlotStart} - ${timeSlotEnd} ${timeSlotTz}`
    : '4:00 - 5:00 AM CST';
  const fulfillmentTiming = isPickup ? pickupEta : `${deliveryDate}, ${deliveryTime}`;
  const deliveryAddress = '617 Alabama Ave SW Birmingham, AL 35211';
  const recipientName = 'Pranav Sailor';
  const recipientPhone = '732-322-9646';
  const whenVisual = DETAIL_VISUALS.when;
  const itemsVisual = DETAIL_VISUALS.items;
  const locationVisual = isPickup ? DETAIL_VISUALS.pickupLocation : DETAIL_VISUALS.deliveryLocation;
  const recipientVisual = DETAIL_VISUALS.recipient;
  const instructionVisual = DETAIL_VISUALS.instruction;

  // Calculate totals
  const deliveryFee = isPickup
    ? 0
    : deliveryFeeParam
    ? parseFloat(deliveryFeeParam)
    : 6.95;
  const krogerSavings = 0.50;
  const taxRate = 0.075;
  const tax = total * taxRate;
  const estimatedTotal = total - krogerSavings + deliveryFee + tax;

  const handlePlaceOrder = () => {
    // TODO: Implement order placement
    console.log('Placing order...');
    // router.push('/order-confirmation');
  };

  return (
    <SafeAreaView style={[styles.container]}>
      <View
        style={[
          styles.pageHeaderBackground,
          { paddingTop: insets.top + 8, marginTop: -insets.top },
        ]}
      >
        <View style={styles.pageHeaderContent}>
          <View style={styles.pageHeaderLeading}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.pageHeaderTitle}>Order Summary</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {isPickup ? 'Pickup Details' : 'Delivery Details'}
          </Text>
          
          <View style={styles.detailRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: whenVisual.background },
              ]}
            >
              <Ionicons name={whenVisual.icon} size={18} color={whenVisual.color} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>When</Text>
              <Text style={styles.detailText}>{fulfillmentTiming}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: itemsVisual.background },
              ]}
            >
              <Ionicons name={itemsVisual.icon} size={18} color={itemsVisual.color} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Items</Text>
              <Text style={styles.detailText}>{items.length} items</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: locationVisual.background },
              ]}
            >
              <Ionicons
                name={locationVisual.icon}
                size={18}
                color={locationVisual.color}
              />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{isPickup ? 'Pickup Location' : 'Delivery Address'}</Text>
              <Text style={styles.detailText}>
                {isPickup ? pickupLocationName : deliveryAddress}
              </Text>
              {isPickup && (
                <Text style={styles.detailSubtext}>{pickupLocation}</Text>
              )}
            </View>
          </View>

          <View style={[styles.detailRow, styles.detailRowLast]}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: recipientVisual.background },
              ]}
            >
              <Ionicons
                name={recipientVisual.icon}
                size={18}
                color={recipientVisual.color}
              />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Recipient</Text>
              <Text style={styles.detailText}>{recipientName}</Text>
              <Text style={styles.detailSubtext}>{recipientPhone}</Text>
            </View>
          </View>
        </View>

        {/* Fulfillment Instructions */}
        {!isPickup ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Delivery Instructions</Text>
            
          <View style={styles.instructionItem}>
            <View
              style={[
                styles.instructionIconWrapper,
                { backgroundColor: instructionVisual.background },
              ]}
            >
              <Ionicons
                name={instructionVisual.icon}
                size={18}
                color={instructionVisual.color}
              />
            </View>
            <Text style={styles.instructionText}>Meet me at my door</Text>
          </View>
            
            <TouchableOpacity style={styles.addNoteButton}>
              <Text style={styles.addNoteText}>Add a note for your driver</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pickup Instructions</Text>
            <Text style={styles.instructionText}>
              Head to the pickup counter once you get the ready notification and have your confirmation and ID handy.
            </Text>
          </View>
        )}

        {/* Payment Summary Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${total.toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Savings</Text>
            <Text style={[styles.summaryValue, styles.savingsValue]}>
              -${krogerSavings.toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>${deliveryFee.toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
          </View>
        </View>

        {/* Estimated Total */}
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Estimated Total</Text>
            <Text style={styles.totalValue}>${estimatedTotal.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.placeOrderButton}
          onPress={handlePlaceOrder}
          activeOpacity={0.85}
        >
          <Text style={styles.placeOrderButtonText}>
            {isPickup ? 'Place Pickup Order' : 'Place Delivery Order'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F7FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageHeaderBackground: {
    backgroundColor: '#f97316',
    borderBottomWidth: 1,
    borderBottomColor: '#ea580c',
    marginBottom: 16,
    marginTop: 0,
  },
  pageHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  pageHeaderLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pageHeaderTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111322',
    marginBottom: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F3F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  detailRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: '#667085',
    marginBottom: 4,
    fontWeight: '500',
  },
  detailText: {
    fontSize: 15,
    color: '#111322',
    fontWeight: '600',
  },
  detailSubtext: {
    fontSize: 14,
    color: '#667085',
    marginTop: 2,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 15,
    color: '#111322',
    marginLeft: 12,
    fontWeight: '500',
  },
  addNoteButton: {
    marginTop: 8,
  },
  addNoteText: {
    fontSize: 15,
    color: '#111322',
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#667085',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    color: '#111322',
    fontWeight: '600',
  },
  savingsValue: {
    color: '#10B981',
  },
  totalCard: {
    backgroundColor: '#111322',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E4E7EC',
  },
  placeOrderButton: {
    backgroundColor: '#111322',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
