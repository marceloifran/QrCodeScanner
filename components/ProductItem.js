import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { formatPrice } from '../utils/formatters';

const ProductItem = ({ item, onPress, isSelecting, onSelectProduct }) => {
  const stockColor = item.stock <= 0 ? colors.error : item.stock <= 5 ? '#FFA500' : colors.success;

  return (
    <TouchableOpacity style={styles.productCard} onPress={() => onPress(item)}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        {item.barcode && <Text style={styles.productBarcode}>{item.barcode}</Text>}
        <Text style={styles.productCategory}>{item.category || 'Sin categoría'}</Text>
        <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
        <Text style={[styles.productStock, { color: stockColor }]}>
          Stock: {item.stock} {item.stock <= 5 ? '(Bajo)' : ''}
        </Text>
      </View>

      {isSelecting && (
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={() => {
            if (onSelectProduct) {
              onSelectProduct(item);
            }
          }}
        >
          <Ionicons name="add-circle" size={30} color={colors.primary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  productBarcode: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  productCategory: {
    fontSize: 14,
    color: colors.primary,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  productStock: {
    fontSize: 14,
    fontWeight: '500',
  },
  addToCartButton: {
    marginLeft: 15,
  },
});

export default memo(ProductItem);
