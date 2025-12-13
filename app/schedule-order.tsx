// import { DeliverySlot } from '@/lib/types/cart'; // Delivery feature temporarily disabled
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
// import { useState } from 'react'; // Delivery feature temporarily disabled
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScheduleOrderScreen() {
  const router = useRouter();
  /*
  const [selectedDate, setSelectedDate] = useState<string>('today');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<DeliverySlot | null>(null);
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>('delivery');
  const isDelivery = fulfillmentType === 'delivery';
  */
  const pickupEtaMessage = 'Ready within about 15 minutes once the store confirms your order.';
  const pickupLocationLabel = 'Basket Market - Birmingham';
  const pickupLocationAddress = '617 Alabama Ave SW Birmingham, AL 35211';

  /*
  const getDates = () => {
    const dates = [];
    const today = new Date();

    dates.push({
      id: 'today',
      label: 'Today',
      date: today,
      display: 'Today',
    });

    for (let i = 1; i <= 6; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const month = date.getMonth() + 1;
      const day = date.getDate();
      dates.push({
        id: `day-${i}`,
        label: `${dayName} ${month}/${day}`,
        date,
        display: `${dayName} ${month}/${day}`,
      });
    }

    return dates;
  };

  const dates = getDates();

  const timeSlots: DeliverySlot[] = [
    { id: '1', startTime: '4:00', endTime: '5:00', timeZone: 'AM CST', deliveryFee: 6.95, available: true },
    { id: '2', startTime: '5:00', endTime: '6:00', timeZone: 'AM CST', deliveryFee: 6.95, available: true },
    { id: '3', startTime: '6:00', endTime: '7:00', timeZone: 'AM CST', deliveryFee: 6.95, available: true },
    { id: '4', startTime: '7:00', endTime: '8:00', timeZone: 'AM CST', deliveryFee: 6.95, available: true },
    { id: '5', startTime: '9:00', endTime: '10:00', timeZone: 'AM CST', deliveryFee: 6.95, available: true },
    { id: '6', startTime: '10:00', endTime: '11:00', timeZone: 'PM CST', deliveryFee: 3.95, available: true },
  ];

  const isContinueDisabled = isDelivery && !selectedTimeSlot;
  */

  const handleContinue = () => {
    router.replace({
      pathname: '/order-summary',
      params: {
        fulfillmentType: 'pickup',
        pickupEta: pickupEtaMessage,
        pickupLocation: pickupLocationAddress,
        pickupLocationName: pickupLocationLabel,
        deliveryFee: '0',
      },
    });
  };

  /*
  const renderSlot = ({ item }: { item: DeliverySlot }) => (
    <TouchableOpacity
      style={[
        styles.timeSlot,
        selectedTimeSlot?.id === item.id && styles.timeSlotSelected,
      ]}
      onPress={() => setSelectedTimeSlot(item)}
    >
      <Text
        style={[
          styles.timeSlotTime,
          selectedTimeSlot?.id === item.id && styles.timeSlotTimeSelected,
        ]}
      >
        {item.startTime} - {item.endTime} {item.timeZone}
      </Text>
      <Text
        style={[
          styles.timeSlotFee,
          selectedTimeSlot?.id === item.id && styles.timeSlotFeeSelected,
        ]}
      >
        ${item.deliveryFee.toFixed(2)}
      </Text>
    </TouchableOpacity>
  );

  const deliveryListHeader = (
    <View>
      <View style={styles.addressSection}>
        <Text style={styles.addressLabel}>Deliver to</Text>
        <View style={styles.addressRow}>
          <Text style={styles.addressText}>617 Alabama Ave SW</Text>
          <TouchableOpacity>
            <Text style={styles.changeLink}>Change</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose a day and time</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateContainer}
        >
          {dates.map((date) => (
            <TouchableOpacity
              key={date.id}
              style={[
                styles.dateButton,
                selectedDate === date.id && styles.dateButtonSelected,
              ]}
              onPress={() => setSelectedDate(date.id)}
            >
              <Text
                style={[
                  styles.dateButtonText,
                  selectedDate === date.id && styles.dateButtonTextSelected,
                ]}
              >
                {date.display}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.slotHeader}>Available slots</Text>
    </View>
  );

  const deliveryListFooter = (
    <Text style={styles.disclaimer}>
      *$20 order minimum. Restrictions apply. Subject to availability. Delivery time not guaranteed.
    </Text>
  );
  */

  return (
    <View style={styles.modalOverlay}>
      <Pressable style={styles.dismissZone} onPress={() => router.back()} />
      <SafeAreaView
        style={[
          styles.sheet
        ]}
      >
        <View style={styles.dragHandle} />

        <View style={styles.header}>
          <View>
            <Text style={styles.headerKicker}>Step 1 of 2</Text>
            <Text style={styles.headerTitle}>Choose fulfillment</Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="#111322" />
          </TouchableOpacity>
        </View>

        {/* Delivery toggle temporarily disabled */}
        {/*
        <View style={styles.fulfillmentToggle}>
          <TouchableOpacity
            style={[
              styles.fulfillmentOption,
              isDelivery && styles.fulfillmentOptionActive,
            ]}
            onPress={() => setFulfillmentType('delivery')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="car-outline"
              size={20}
              color={isDelivery ? '#111322' : '#5D6B82'}
            />
            <Text
              style={[
                styles.fulfillmentOptionTitle,
                isDelivery && styles.fulfillmentOptionTitleActive,
              ]}
            >
              Delivery
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.fulfillmentOption,
              !isDelivery && styles.fulfillmentOptionActive,
            ]}
            onPress={() => setFulfillmentType('pickup')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="bag-outline"
              size={20}
              color={!isDelivery ? '#111322' : '#5D6B82'}
            />
            <Text
              style={[
                styles.fulfillmentOptionTitle,
                !isDelivery && styles.fulfillmentOptionTitleActive,
              ]}
            >
              Pickup
            </Text>
          </TouchableOpacity>
        </View>
        */}
        <View style={styles.sheetBody}>
          {/* Delivery list temporarily removed; only pickup available */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.pickupScroll}
            contentContainerStyle={styles.pickupContent}
          >
            <View style={styles.addressSection}>
              <Text style={styles.addressLabel}>Pickup from</Text>
              <Text style={styles.addressText}>{pickupLocationLabel}</Text>
              <Text style={styles.pickupAddress}>{pickupLocationAddress}</Text>
            </View>

            <View style={styles.pickupEtaCard}>
              <Ionicons name="time-outline" size={20} color="#111322" />
              <View style={styles.pickupEtaCopy}>
                <Text style={styles.pickupEtaTitle}>Ready shortly</Text>
                <Text style={styles.pickupEtaText}>{pickupEtaMessage}</Text>
              </View>
            </View>

            <View style={styles.pickupInfoCard}>
              <Ionicons name="notifications-outline" size={18} color="#5D6B82" />
              <Text style={styles.pickupInfoText}>
                We'll notify you when the store confirms your order. Bring your ID and confirmation email when you arrive.
              </Text>
            </View>
          </ScrollView>
          {/*
          {isDelivery ? (
            <FlatList
              data={timeSlots}
              keyExtractor={(item) => item.id}
              renderItem={renderSlot}
              ListHeaderComponent={deliveryListHeader}
              ListFooterComponent={deliveryListFooter}
              showsVerticalScrollIndicator={false}
              style={styles.slotList}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.pickupScroll}
              contentContainerStyle={styles.pickupContent}
            >
              <View style={styles.addressSection}>
                <Text style={styles.addressLabel}>Pickup from</Text>
                <Text style={styles.addressText}>{pickupLocationLabel}</Text>
                <Text style={styles.pickupAddress}>{pickupLocationAddress}</Text>
              </View>

              <View style={styles.pickupEtaCard}>
                <Ionicons name="time-outline" size={20} color="#111322" />
                <View style={styles.pickupEtaCopy}>
                  <Text style={styles.pickupEtaTitle}>Ready shortly</Text>
                  <Text style={styles.pickupEtaText}>{pickupEtaMessage}</Text>
                </View>
              </View>

              <View style={styles.pickupInfoCard}>
                <Ionicons name="notifications-outline" size={18} color="#5D6B82" />
                <Text style={styles.pickupInfoText}>
                  We'll notify you when the store confirms your order. Bring your ID and confirmation email when you arrive.
                </Text>
              </View>
            </ScrollView>
          )}
          */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.continueButton,
              ]}
              onPress={handleContinue}
              activeOpacity={0.85}
            >
              <Text style={styles.continueButtonText}>Review order</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  dismissZone: {
    flex: 1,
    width: '100%',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '95%',
    minHeight: '80%',
    width: '100%',
    alignSelf: 'center',
    flexShrink: 0,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E4E7EC',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  fulfillmentToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  fulfillmentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    backgroundColor: '#fff',
    gap: 12,
  },
  fulfillmentOptionActive: {
    borderColor: '#111322',
    backgroundColor: '#F2F2F2',
  },
  fulfillmentOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111322',
  },
  fulfillmentOptionTitleActive: {
    color: '#111322',
  },
  headerKicker: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#98A2B3',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111322',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    flex: 1,
  },
  slotList: {
    flex: 1,
  },
  pickupScroll: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  pickupContent: {
    paddingBottom: 24,
  },
  addressSection: {
    backgroundColor: '#F2F2F2',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },
  addressLabel: {
    fontSize: 14,
    color: '#667085',
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111322',
    flex: 1,
  },
  pickupAddress: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 6,
  },
  changeLink: {
    fontSize: 14,
    color: '#111322',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111322',
    marginBottom: 16,
  },
  slotHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667085',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  dateContainer: {
    gap: 12,
    paddingRight: 8,
  },
  dateButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D9D9D9',
  },
  dateButtonSelected: {
    backgroundColor: '#111322',
    borderColor: '#111322',
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111322',
  },
  dateButtonTextSelected: {
    color: '#fff',
  },
  boostSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F0F2F5',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  boostContent: {
    flex: 1,
  },
  boostLogo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff1493',
    marginBottom: 4,
  },
  boostText: {
    fontSize: 14,
    color: '#666',
  },
  boostLink: {
    fontSize: 14,
    color: '#111322',
    fontWeight: '600',
  },
  pickupEtaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F2F2F2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  pickupEtaCopy: {
    flex: 1,
  },
  pickupEtaTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111322',
    marginBottom: 4,
  },
  pickupEtaText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  pickupInfoCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F2F2F2',
    borderRadius: 16,
    padding: 16,
  },
  pickupInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  timeSlot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D9D9D9',
  },
  timeSlotSelected: {
    backgroundColor: '#F2F2F2',
    borderColor: '#111322',
  },
  timeSlotTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111322',
  },
  timeSlotTimeSelected: {
    color: '#111322',
  },
  timeSlotFee: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111322',
  },
  timeSlotFeeSelected: {
    color: '#111322',
  },
  disclaimer: {
    fontSize: 12,
    color: '#98A2B3',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  footer: {
    paddingTop: 12,
    paddingBottom: 0,
    marginBottom: 0,
  },
  continueButton: {
    backgroundColor: '#111322',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    shadowColor: '#111322',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
  },
  continueButtonDisabled: {
    backgroundColor: '#D0D5DD',
    shadowOpacity: 0,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  cancelButtonText: {
    color: '#111322',
    fontSize: 16,
    fontWeight: '600',
  },
});
