import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

export default function ProfileScreen({ navigation }) {
    return (
        <View style={styles.container}>
            {/* Sección de Configuración de Notificaciones */}
            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('NotificationSettings')}
            >
                <Text style={styles.buttonText}>Configuración de Notificaciones</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    button: {
        backgroundColor: colors.primary,
        padding: 20,
        borderRadius: 5,
    },
    buttonText: {
        color: colors.text.inverse,
        fontSize: 16,
    }
}); 