import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

// Categorías predefinidas para un supermercado/minimercado
const predefinedCategories = [
  { id: 'bebidas', name: 'Bebidas', icon: 'cafe-outline' },
  { id: 'lacteos', name: 'Lácteos', icon: 'nutrition-outline' },
  { id: 'panaderia', name: 'Panadería', icon: 'pizza-outline' },
  { id: 'carnes', name: 'Carnes', icon: 'fast-food-outline' },
  { id: 'frutas', name: 'Frutas y Verduras', icon: 'leaf-outline' },
  { id: 'congelados', name: 'Congelados', icon: 'snow-outline' },
  { id: 'snacks', name: 'Snacks', icon: 'fast-food-outline' },
  { id: 'dulces', name: 'Dulces', icon: 'ice-cream-outline' },
  { id: 'almacen', name: 'Almacén', icon: 'basket-outline' },
  { id: 'limpieza', name: 'Limpieza', icon: 'sparkles-outline' },
  { id: 'higiene', name: 'Higiene Personal', icon: 'water-outline' },
  { id: 'cigarrillos', name: 'Cigarrillos', icon: 'flame-outline' },
  { id: 'bazar', name: 'Bazar', icon: 'home-outline' },
  { id: 'papeleria', name: 'Papelería', icon: 'pencil-outline' },
  { id: 'mascotas', name: 'Mascotas', icon: 'paw-outline' },
  { id: 'otros', name: 'Otros', icon: 'grid-outline' }
];

export default function CategoriesScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  const renderItem = ({ item }) => (
    <View style={styles.categoryItem}>
      <View style={styles.categoryInfo}>
        <Ionicons name={item.icon} size={24} color={colors.primary} />
        <Text style={styles.categoryName}>{item.name}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Categorías</Text>
        <Text style={styles.subtitle}>
          Estas son las categorías disponibles para clasificar tus productos
        </Text>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={predefinedCategories}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={60} color={colors.text.secondary} />
              <Text style={styles.emptyText}>No hay categorías disponibles</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 5,
  },
  loader: {
    marginTop: 50,
  },
  listContainer: {
    padding: 15,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: colors.background,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginLeft: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginTop: 10,
  }
}); 