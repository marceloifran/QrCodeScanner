# Guía de Integración con Mercado Pago

Esta guía te ayudará a configurar y probar la integración con Mercado Pago en tu aplicación Ifsin Negocios.

## Paso 1: Crear una cuenta de desarrollador en Mercado Pago

1. Ve a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers)
2. Regístrate o inicia sesión con tu cuenta de Mercado Pago
3. Accede al [Panel de Desarrolladores](https://www.mercadopago.com.ar/developers/panel)

## Paso 2: Obtener credenciales de prueba

1. En el Panel de Desarrolladores, ve a la sección "Credenciales"
2. Selecciona el modo "Sandbox" para pruebas
3. Copia el "Access Token" de prueba
4. Reemplaza el token en el archivo `server.js`:

```javascript
mercadopago.configure({
  access_token: 'TU-ACCESS-TOKEN-DE-PRUEBA'
});
```

## Paso 3: Configurar el backend

1. Instala las dependencias:
```
cd backend
npm install
```

2. Inicia el servidor:
```
npm run dev
```

3. El servidor estará disponible en `http://localhost:3000`

## Paso 4: Configurar la aplicación para usar el backend local

1. Abre el archivo `services/PaymentService.js`
2. Modifica la constante `BACKEND_URL` para que apunte a tu servidor local:

```javascript
const BACKEND_URL = 'http://localhost:3000';
```

## Paso 5: Crear usuarios de prueba

Para realizar pruebas completas, necesitas crear usuarios de prueba:

1. Ve a [Mercado Pago - Usuarios de prueba](https://www.mercadopago.com.ar/developers/panel/test-users)
2. Crea dos usuarios de prueba: uno como vendedor y otro como comprador
3. Inicia sesión con el usuario vendedor y configura tu integración
4. Usa el usuario comprador para realizar pagos de prueba

## Paso 6: Realizar pruebas de pago

1. Ejecuta tu aplicación React Native
2. Navega a la pantalla de planes de suscripción
3. Selecciona un plan y continúa al pago
4. Cuando se abra el WebView de Mercado Pago, usa las siguientes tarjetas de prueba:

### Tarjetas de prueba de Mercado Pago

| Tipo | Número | CVV | Fecha Venc. |
|------|--------|-----|-------------|
| Mastercard | 5031 7557 3453 0604 | 123 | 11/25 |
| Visa | 4509 9535 6623 3704 | 123 | 11/25 |
| American Express | 3711 8030 3257 522 | 1234 | 11/25 |

Para diferentes resultados de pago:

- Aprobado: Cualquier número de documento
- Rechazado: Documento terminado en "0"
- Pendiente: Documento terminado en "1"

## Paso 7: Verificar las notificaciones

Para recibir notificaciones en desarrollo local:

1. Instala [ngrok](https://ngrok.com/)
2. Ejecuta `ngrok http 3000`
3. Copia la URL HTTPS generada
4. Actualiza la `notification_url` en el archivo `server.js` con esta URL + "/webhook"
5. Reinicia el servidor

## Solución de problemas comunes

- **Error CORS**: Asegúrate de que el middleware cors esté configurado correctamente
- **Error de conexión**: Verifica que el backend esté ejecutándose y accesible
- **Pagos rechazados**: Verifica que estés usando las tarjetas de prueba correctamente
- **Webhook no recibe notificaciones**: Usa ngrok para exponer tu servidor local

## Recursos adicionales

- [Documentación oficial de Mercado Pago](https://www.mercadopago.com.ar/developers/es/guides)
- [Referencia de la API de Mercado Pago](https://www.mercadopago.com.ar/developers/es/reference)
