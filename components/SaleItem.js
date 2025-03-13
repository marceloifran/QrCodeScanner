import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { formatPrice } from '../utils/formatters';

const SaleItem = ({ item }) => {
  const formatDate = (date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.saleCard}>
      <View style={styles.saleHeader}>
        <Text style={styles.saleDate}>{formatDate(item.date)}</Text>
        <Text style={styles.saleTotal}>{formatPrice(item.total)}</Text>
      </View>
      <View style={styles.itemsList}>
        {item.items.map((product, index) => (
          <Text key={index} style={styles.itemText}>
            {product.quantity}x {product.name} - {formatPrice(product.price)}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  saleCard: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  saleDate: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  saleTotal: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  itemsList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  itemText: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: 5,
  },
});

export default memo(SaleItem);
