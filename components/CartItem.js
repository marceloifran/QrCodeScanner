import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity,
  TextInput
} from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { formatPrice } from '../utils/formatters';

export default function CartItem({ item, onUpdateQuantity, onRemove }) {
  return (
    <View style={styles.container}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>
          {formatPrice(item.price)}
        </Text>
      </View>
      
      <View style={styles.quantityContainer}>
        <TouchableOpacity 
          style={styles.quantityButton}
          onPress={() => onUpdateQuantity(item, Math.max(1, item.quantity - 1))}
        >
          <Ionicons name="remove" size={20} color={colors.text.primary} />
        </TouchableOpacity>

        <TextInput
          style={styles.quantityInput}
          value={item.quantity.toString()}
          onChangeText={(text) => {
            const quantity = parseInt(text) || 1;
            onUpdateQuantity(item, Math.max(1, quantity));
          }}
          keyboardType="numeric"
          selectTextOnFocus
          maxLength={3}
        />

        <TouchableOpacity 
          style={styles.quantityButton}
          onPress={() => onUpdateQuantity(item, item.quantity + 1)}
        >
          <Ionicons name="add" size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>
          {formatPrice(item.price * item.quantity)}
        </Text>
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => onRemove(item)}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productInfo: {
    marginBottom: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityInput: {
    width: 50,
    height: 36,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginHorizontal: 10,
    textAlign: 'center',
    fontSize: 16,
    color: colors.text.primary,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  removeButton: {
    padding: 5,
  },
}); 