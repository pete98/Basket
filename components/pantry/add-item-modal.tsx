import { DEFAULT_ITEM_IMAGE, PANTRY_CATEGORIES } from '@/constants/pantry';
import { usePantry } from '@/contexts/pantry-context';
import { PantryCategory } from '@/lib/types/pantry';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AddItemModalProps {
  visible: boolean;
  onClose: () => void;
  editingItem?: {
    id: string;
    name: string;
    image: string;
    quantity: number;
    quantityUnit?: string;
    expiryDate?: string;
    category: PantryCategory;
  } | null;
}

export function AddItemModal({ visible, onClose, editingItem }: AddItemModalProps) {
  const insets = useSafeAreaInsets();
  const { addItem, updateItem } = usePantry();
  const [name, setName] = useState(editingItem?.name || '');
  const [image, setImage] = useState(editingItem?.image || DEFAULT_ITEM_IMAGE);
  const [quantity, setQuantity] = useState(editingItem?.quantity?.toString() || '1');
  const [quantityUnit, setQuantityUnit] = useState(editingItem?.quantityUnit || '');
  const [expiryDate, setExpiryDate] = useState(
    editingItem?.expiryDate ? editingItem.expiryDate.split('T')[0] : ''
  );
  const [category, setCategory] = useState<PantryCategory>(
    editingItem?.category || 'Staples'
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    const quantityNum = parseInt(quantity, 10);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    setIsSaving(true);

    try {
      const itemData = {
        name: name.trim(),
        image: image.trim() || DEFAULT_ITEM_IMAGE,
        quantity: quantityNum,
        quantityUnit: quantityUnit.trim() || undefined,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        category: category === 'All' ? 'Staples' : category,
      };

      if (editingItem) {
        updateItem({
          ...itemData,
          id: editingItem.id,
          addedDate: new Date().toISOString(), // Keep original added date
          status: 'fresh',
        });
      } else {
        addItem(itemData);
      }

      onClose();
      resetForm();
    } catch (error) {
      Alert.alert('Error', 'Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setImage(DEFAULT_ITEM_IMAGE);
    setQuantity('1');
    setQuantityUnit('');
    setExpiryDate('');
    setCategory('Staples');
  };

  const handleClose = () => {
    if (!isSaving) {
      resetForm();
      onClose();
    }
  };

  const validCategories = PANTRY_CATEGORIES.filter((c) => c !== 'All' && c !== 'Running Low' && c !== 'Expiring Soon');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{editingItem ? 'Edit Item' : 'Add Pantry Item'}</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={24} color="#666" />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Item Name *</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Milk, Bread, Tomatoes"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Image URL</Text>
                <TextInput
                  style={styles.input}
                  value={image}
                  onChangeText={setImage}
                  placeholder="https://..."
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Quantity *</Text>
                  <TextInput
                    style={styles.input}
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="1"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.field, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Unit</Text>
                  <TextInput
                    style={styles.input}
                    value={quantityUnit}
                    onChangeText={setQuantityUnit}
                    placeholder="e.g., pack, kg, lb"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Expiry Date</Text>
                <TextInput
                  style={styles.input}
                  value={expiryDate}
                  onChangeText={setExpiryDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryContainer}>
                  {validCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          category === cat && styles.categoryChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#F9FAFB',
  },
  row: {
    flexDirection: 'row',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
    marginBottom: 8,
  },
  categoryChipActive: {
    backgroundColor: '#f97316',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#f97316',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

