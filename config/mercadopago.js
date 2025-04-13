// Configuración de Mercado Pago
const MERCADOPAGO_CONFIG = {
  // Credenciales de producción
  publicKey: 'APP_USR-fce20538-0a49-4f34-9583-7faba1125821',
  accessToken: 'APP_USR-7878626425925742-041017-fad7c0a9f79d8558bdcceee2d9b3addf-721448179'
};

// URLs de la API
export const MP_API_URL = 'https://api.mercadopago.com';
export const MP_CHECKOUT_URL = 'https://www.mercadopago.com.ar/checkout/v1/redirect';

// Exportar las credenciales
export const MP_PUBLIC_KEY = MERCADOPAGO_CONFIG.publicKey;
export const MP_ACCESS_TOKEN = MERCADOPAGO_CONFIG.accessToken;

export default {
  MP_PUBLIC_KEY,
  MP_ACCESS_TOKEN,
  MP_API_URL,
  MP_CHECKOUT_URL
}; 