import { useCart } from '@/contexts/cart-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OrderSummaryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { state } = useCart();
  const { items, total } = state;

  const [textMessageUpdates, setTextMessageUpdates] = useState(false);
  const [promoCodesExpanded, setPromoCodesExpanded] = useState(false);

  // Get delivery details from params or use defaults
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
  const deliveryAddress = '617 Alabama Ave SW Birmingham, AL 35211';
  const recipientName = 'Pranav Sailor';
  const recipientPhone = '732-322-9646';

  // Calculate totals
  const deliveryFee = deliveryFeeParam ? parseFloat(deliveryFeeParam) : 6.95;
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Summary</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressStep}>
          <View style={[styles.progressIcon, styles.progressIconComplete]}>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </View>
          <Text style={[styles.progressLabel, styles.progressLabelComplete]}>Schedule</Text>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressStep}>
          <View style={[styles.progressIcon, styles.progressIconActive]}>
            <Ionicons name="wallet" size={20} color="#007AFF" />
          </View>
          <Text style={[styles.progressLabel, styles.progressLabelActive]}>Pay</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Delivery Order Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Order Details</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailText}>{deliveryDate}, {deliveryTime}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="cart-outline" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailText}>Items: {items.length}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="car-outline" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailText}>{deliveryAddress}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailText}>{recipientName}</Text>
              <Text style={styles.detailSubtext}>{recipientPhone}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </View>
          
          <View style={styles.checkboxRow}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setTextMessageUpdates(!textMessageUpdates)}
            >
              {textMessageUpdates && (
                <Ionicons name="checkmark" size={16} color="#007AFF" />
              )}
            </TouchableOpacity>
            <View style={styles.checkboxLabelContainer}>
              <Text style={styles.checkboxLabel}>
                I'd like to receive text message updates about my order.
              </Text>
              <Text style={styles.checkboxDisclaimer}>
                Message frequency may vary. Message and data rates may apply. Text "STOP" to 53744 to unsubscribe. For help, text "HELP" to 53744.
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Instructions (Optional)</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={20} color="#666" />
            <Text style={styles.detailText}>Meet me at my door</Text>
          </View>
          
          <TouchableOpacity style={styles.addNoteButton}>
            <Text style={styles.addNoteText}>Add a note for your driver</Text>
            <Ionicons name="chevron-forward" size={20} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={styles.safetyText}>
            Your driver may reach out if more information is needed. For everyone's safety, please secure your pets.
          </Text>
        </View>

        {/* Promo Codes Section */}
        <TouchableOpacity
          style={styles.promoCodesSection}
          onPress={() => setPromoCodesExpanded(!promoCodesExpanded)}
        >
          <Text style={styles.promoCodesTitle}>Promo Codes</Text>
          <Ionicons 
            name={promoCodesExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </TouchableOpacity>

        {/* Payment Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({items.length} items)</Text>
            <Text style={styles.summaryValue}>${total.toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Kroger Savings</Text>
            <Text style={[styles.summaryValue, styles.savingsValue]}>
              -${krogerSavings.toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>${deliveryFee.toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sales Tax</Text>
            <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tip Amount</Text>
            <Text style={styles.summaryValue}>N/A</Text>
          </View>
          
          <TouchableOpacity style={styles.tippingPolicyLink}>
            <Text style={styles.tippingPolicyText}>Tipping Policy</Text>
          </TouchableOpacity>
        </View>

        {/* Estimated Total */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Estimated Total</Text>
            <Text style={styles.totalValue}>${estimatedTotal.toFixed(2)}</Text>
          </View>
          <Text style={styles.totalDisclaimer}>
            Prices are estimates and may change with coupons, substitutions, taxes, weighted items, or price updates. We'll place a hold on your payment method for the estimated total. You'll be charged the final amount when you receive your order.
          </Text>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={[styles.footer]}>
        <TouchableOpacity
          style={styles.placeOrderButton}
          onPress={handlePlaceOrder}
          activeOpacity={0.8}
        >
          <Text style={styles.placeOrderButtonText}>Place Delivery Order</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
  },
  headerSpacer: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressIconActive: {
    backgroundColor: '#e3f2fd',
  },
  progressIconComplete: {
    backgroundColor: '#34c759',
  },
  progressLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  progressLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  progressLabelComplete: {
    color: '#34c759',
    fontWeight: '600',
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
    marginTop: -20,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  promoCodesSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  promoCodesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  savingsValue: {
    color: '#34c759',
  },
  tippingPolicyLink: {
    marginTop: 8,
  },
  tippingPolicyText: {
    fontSize: 14,
    color: '#007AFF',
  },
  totalSection: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  totalDisclaimer: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailText: {
    fontSize: 16,
    color: '#000',
  },
  detailSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxLabelContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },
  checkboxDisclaimer: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    lineHeight: 18,
  },
  addNoteButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  addNoteText: {
    fontSize: 16,
    color: '#007AFF',
  },
  safetyText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  placeOrderButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

