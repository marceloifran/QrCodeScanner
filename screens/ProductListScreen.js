import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    ScrollView,
    Alert,
    Modal
} from 'react-native';
import { collection, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { colors } from '../theme/colors';
import { predefinedCategories } from '../constants/categories';
import { Ionicons } from '@expo/vector-icons';
import { formatPrice } from '../utils/formatters';
import { useFocusEffect } from '@react-navigation/native';

const ProductListScreen = React.memo(function ProductListScreen({ navigation, route }) {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [lowStockFilter, setLowStockFilter] = useState(false);
    const [categoryCounts, setCategoryCounts] = useState({});
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [activeTab, setActiveTab] = useState('products');
    const [refreshing, setRefreshing] = useState(false);
    const userId = auth.currentUser.uid;

    // Verificar si estamos en modo selección (para ventas)
    const isSelecting = route.params?.isSelecting || false;

    const getProductsQuery = useCallback(() => {
        return query(
            collection(db, 'products'),
            where('userId', '==', userId)
        );
    }, [userId]);

    const loadProducts = useCallback(async () => {
        setLoading(true);
        try {
            const q = getProductsQuery();
            const querySnapshot = await getDocs(q);

            const productsList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setProducts(productsList);

            // Contar productos por categoría
            const counts = {};
            productsList.forEach(product => {
                if (counts[product.category]) {
                    counts[product.category]++;
                } else {
                    counts[product.category] = 1;
                }
            });

            setCategoryCounts(counts);
        } catch (error) {
            console.error('Error al cargar productos:', error);
            Alert.alert('Error', 'No se pudieron cargar los productos');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [getProductsQuery]);


    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    useFocusEffect(
        React.useCallback(() => {
            loadProducts();
        }, [loadProducts])
    );

    useEffect(() => {
        // Si se recibió un parámetro para filtrar por stock bajo, aplicarlo
        if (route.params?.filterLowStock) {
            setLowStockFilter(true);
        } else {
            setLowStockFilter(false);
        }

        // Si se recibió una categoría seleccionada, aplicarla
        if (route.params?.selectedCategory) {
            setSelectedCategory(route.params.selectedCategory);
        }
    }, [route.params]);


    useEffect(() => {
        filterProducts();
    }, [products, searchQuery, selectedCategory, lowStockFilter]);

    const filterProducts = useCallback(() => {
        let filtered = [...products];

        // Filtrar por categoría
        if (selectedCategory) {
            filtered = filtered.filter(product => product.category === selectedCategory);
        }

        // Filtrar por stock bajo
        if (lowStockFilter) {
            filtered = filtered.filter(product => product.stock <= 5);
        }

        // Filtrar por búsqueda
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(query) ||
                product.barcode?.toLowerCase().includes(query) ||
                product.price.toString().includes(query)
            );
        }

        setFilteredProducts(filtered);
    }, [products, searchQuery, selectedCategory, lowStockFilter]);

    const clearFilters = useCallback(() => {
        setSelectedCategory(null);
        setLowStockFilter(false);
        setSearchQuery('');
        navigation.setParams({ filterLowStock: false, selectedCategory: null });
    }, [navigation]);

    const getStockColor = useCallback((stock) => {
        if (stock <= 0) return colors.error;
        if (stock <= 5) return '#FFA500';
        return colors.success;
    }, []);

    const handleProductPress = useCallback((product) => {
        setSelectedProduct(product);
        setShowOptionsModal(true);
    }, []);

    const handleEditProduct = useCallback(() => {
        setShowOptionsModal(false);
        navigation.navigate('EditProduct', { productId: selectedProduct.id });
    }, [navigation, selectedProduct]);

    const handleDeleteProduct = async (productId) => {
        if (!productId) {
            console.error('Error: ID de producto no válido');
            Alert.alert('Error', 'No se pudo eliminar el producto: ID no válido');
            return;
        }
        
        setLoading(true);
        try {
            // Referencia al documento del producto
            const productRef = doc(db, 'products', productId);
            
            // Eliminar el producto
            await deleteDoc(productRef);
            
            // Actualizar la lista de productos
            setProducts(prevProducts => prevProducts.filter(product => product.id !== productId));
            
            // Mostrar mensaje de éxito
            Alert.alert('Éxito', 'Producto eliminado correctamente');
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            Alert.alert('Error', 'No se pudo eliminar el producto: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const confirmDeleteProduct = (productId, productName) => {
        if (!productId) {
            console.error('Error: ID de producto no válido');
            Alert.alert('Error', 'No se puede eliminar: ID de producto no válido');
            return;
        }
        
        // Si el nombre del producto no está disponible, usar un valor predeterminado
        const name = productName || 'este producto';
        
        Alert.alert(
            "Eliminar Producto",
            `¿Estás seguro de que deseas eliminar "${name}"?`,
            [
                {
                    text: "Cancelar",
                    style: "cancel"
                },
                { 
                    text: "Eliminar", 
                    onPress: () => handleDeleteProduct(productId),
                    style: "destructive"
                }
            ]
        );
    };

    const renderCategoryFilter = useCallback(() => (
        <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                    style={[
                        styles.categoryChip,
                        selectedCategory === null && !lowStockFilter && styles.categoryChipSelected
                    ]}
                    onPress={() => {
                        setSelectedCategory(null);
                        setLowStockFilter(false);
                        navigation.setParams({ filterLowStock: false, selectedCategory: null });
                    }}
                >
                    <Text
                        style={[
                            styles.categoryChipText,
                            selectedCategory === null && !lowStockFilter && styles.categoryChipTextSelected
                        ]}
                    >
                        Todos ({products.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.categoryChip,
                        lowStockFilter && styles.categoryChipSelected,
                        { backgroundColor: lowStockFilter ? '#FFA500' : colors.surface }
                    ]}
                    onPress={() => {
                        setLowStockFilter(!lowStockFilter);
                        navigation.setParams({ filterLowStock: !lowStockFilter });
                    }}
                >
                    <Text
                        style={[
                            styles.categoryChipText,
                            lowStockFilter && styles.categoryChipTextSelected
                        ]}
                    >
                        Stock Bajo ({products.filter(p => p.stock <= 5).length})
                    </Text>
                </TouchableOpacity>

                {predefinedCategories.map(cat => {
                    const count = categoryCounts[cat.id] || 0;
                    if (count === 0) return null;

                    return (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.categoryChip,
                                selectedCategory === cat.id && styles.categoryChipSelected
                            ]}
                            onPress={() => {
                                setSelectedCategory(cat.id);
                                setLowStockFilter(false);
                                navigation.setParams({ filterLowStock: false, selectedCategory: cat.id });
                            }}
                        >
                            <Text
                                style={[
                                    styles.categoryChipText,
                                    selectedCategory === cat.id && styles.categoryChipTextSelected
                                ]}
                            >
                                {cat.name} ({count})
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {(selectedCategory || lowStockFilter || searchQuery) && (
                <TouchableOpacity
                    style={styles.clearFiltersButton}
                    onPress={clearFilters}
                >
                    <Ionicons name="close-circle" size={16} color="white" />
                    <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
                </TouchableOpacity>
            )}
        </View>
    ), [products.length, selectedCategory, lowStockFilter, searchQuery, clearFilters, navigation, categoryCounts]);

    const renderItem = useCallback(({ item }) => {
        const stockColor = getStockColor(item.stock);

        return (
            <TouchableOpacity
                style={styles.productCard}
                onPress={() => handleProductPress(item)}
            >
                <View style={styles.productCardContent}>
                    <View style={styles.productMainInfo}>
                        <Text style={styles.productName}>{item.name}</Text>

                        <View style={styles.productMeta}>
                            {item.barcode && (
                                <View style={styles.metaItem}>
                                    <Ionicons name="barcode-outline" size={14} color={colors.text.secondary} />
                                    <Text style={styles.metaText}>{item.barcode}</Text>
                                </View>
                            )}

                            <View style={styles.metaItem}>
                                <Ionicons name="pricetag-outline" size={14} color={colors.primary} />
                                <Text style={[styles.metaText, { color: colors.primary }]}>
                                    {item.category || 'Sin categoría'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.productDetails}>
                        <View style={styles.priceContainer}>
                            <Text style={styles.priceLabel}>Precio</Text>
                            <Text style={styles.priceValue}>${formatPrice(item.price, 0)}</Text>
                        </View>

                        <View style={styles.stockContainer}>
                            <Text style={styles.stockLabel}>Stock</Text>
                            <View style={styles.stockValueContainer}>
                                <Text style={[styles.stockValue, { color: stockColor }]}>
                                    {item.stock}
                                </Text>
                                {item.stock <= 5 && (
                                    <View style={styles.lowStockBadge}>
                                        <Text style={styles.lowStockText}>Bajo</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {isSelecting && (
                        <TouchableOpacity
                            style={styles.addToCartButton}
                            onPress={() => {
                                if (route.params?.onSelectProduct) {
                                    route.params.onSelectProduct(item);
                                    navigation.goBack();
                                }
                            }}
                        >
                            <Ionicons name="add-circle" size={30} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.productActions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('EditProduct', { productId: item.id })}
                    >
                        <Ionicons name="create-outline" size={18} color={colors.primary} />
                        <Text style={styles.actionText}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => confirmDeleteProduct(item.id, item.name)}
                    >
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                        <Text style={[styles.actionText, { color: colors.error }]}>Eliminar</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    }, [getStockColor, navigation, isSelecting, route.params, handleProductPress, confirmDeleteProduct]);

    const renderOptionsModal = useCallback(() => (
        <Modal
            visible={showOptionsModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowOptionsModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Opciones de producto</Text>

                    <TouchableOpacity
                        style={styles.modalOption}
                        onPress={handleEditProduct}
                    >
                        <Ionicons name="create-outline" size={24} color={colors.primary} />
                        <Text style={styles.modalOptionText}>Editar producto</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.modalOption}
                        onPress={() => {
                            setShowOptionsModal(false);
                            handleDeleteProduct(selectedProduct?.id);
                        }}
                    >
                        <Ionicons name="trash-outline" size={24} color={colors.error} />
                        <Text style={styles.modalOptionText}>Eliminar producto</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setShowOptionsModal(false)}
                    >
                        <Text style={styles.closeButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    ), [showOptionsModal, handleEditProduct, handleDeleteProduct, selectedProduct]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadProducts();
        setRefreshing(false);
    }, [loadProducts]);

    const renderContent = useCallback(() => {
        return (
            <>
                {renderCategoryFilter()}

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>Cargando productos...</Text>
                    </View>
                ) : filteredProducts.length > 0 ? (
                    <FlatList
                        data={filteredProducts}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContainer}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="cube-outline" size={50} color="#ccc" />
                        <Text style={styles.emptyText}>
                            {searchQuery
                                ? 'No se encontraron productos que coincidan con la búsqueda'
                                : selectedCategory
                                    ? 'No hay productos en esta categoría'
                                    : lowStockFilter
                                        ? 'No hay productos con stock bajo'
                                        : 'No hay productos registrados'}
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyAddButton}
                            onPress={() => navigation.navigate('AddProduct')}
                        >
                            <Text style={styles.emptyAddButtonText}>Agregar Producto</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </>
        );
    }, [activeTab, renderCategoryFilter, loading, filteredProducts, renderItem, refreshing, onRefresh, searchQuery, selectedCategory, lowStockFilter, navigation]);

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={colors.text.secondary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar productos..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery !== '' && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
                    </TouchableOpacity>
                )}
            </View>

            {renderContent()}

            {!isSelecting && (
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate('AddProduct')}
                >
                    <Ionicons name="add" size={30} color="white" />
                </TouchableOpacity>
            )}

            {renderOptionsModal()}
        </View>
    );
});

export default ProductListScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 10,
        margin: 10,
        paddingHorizontal: 15,
        height: 50,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: colors.text.primary,
    },
    filtersContainer: {
        marginHorizontal: 10,
        marginBottom: 10,
    },
    categoryChip: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: colors.surface,
        borderRadius: 25,
        marginRight: 10,
        marginVertical: 5,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryChipSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    categoryChipText: {
        color: colors.text.secondary,
        fontSize: 14,
        fontWeight: '500',
    },
    categoryChipTextSelected: {
        color: 'white',
        fontWeight: '600',
    },
    clearFiltersButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.error,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        marginTop: 10,
        alignSelf: 'center',
    },
    clearFiltersText: {
        color: 'white',
        marginLeft: 5,
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        marginBottom: 10,
    },
    resultsCount: {
        color: colors.text.secondary,
        fontSize: 14,
    },
    listContainer: {
        padding: 10,
    },
    productCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 15,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    productCardContent: {
        padding: 15,
    },
    productMainInfo: {
        marginBottom: 12,
    },
    productName: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 8,
    },
    productMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
        marginBottom: 4,
    },
    metaText: {
        fontSize: 13,
        color: colors.text.secondary,
        marginLeft: 4,
    },
    productDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 5,
    },
    priceContainer: {
        flex: 1,
    },
    priceLabel: {
        fontSize: 12,
        color: colors.text.secondary,
        marginBottom: 2,
    },
    priceValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.primary,
    },
    stockContainer: {
        alignItems: 'flex-end',
    },
    stockLabel: {
        fontSize: 12,
        color: colors.text.secondary,
        marginBottom: 2,
    },
    stockValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stockValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    lowStockBadge: {
        backgroundColor: colors.error,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8,
    },
    lowStockText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    productActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
    },
    actionText: {
        fontSize: 14,
        color: colors.primary,
        marginLeft: 6,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 50,
    },
    emptyText: {
        fontSize: 16,
        color: colors.text.secondary,
        marginTop: 10,
        textAlign: 'center',
        marginBottom: 20,
    },
    emptyAddButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    },
    emptyAddButtonText: {
        color: 'white',
        fontWeight: '500',
    },
    addButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalOptionText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 15,
    },
    closeButton: {
        marginTop: 20,
        paddingVertical: 12,
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    categoryValueText: {
        fontSize: 10,
        color: colors.text.secondary,
        marginTop: 2,
    },
    categoryValueTextSelected: {
        color: 'white',
    },
});