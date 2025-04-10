// Backend simple para integración con Mercado Pago
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mercadopago = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configurar credenciales de Mercado Pago
// IMPORTANTE: En producción, estas credenciales deben estar en variables de entorno
mercadopago.configure({
  access_token: 'TEST-5274144528332475-040910-f2f8e0c9db4a8a8a3a9bd0702a234567-1234567'
  // Reemplazar con tu access token de prueba
});

// Ruta principal para verificar que el servidor está funcionando
app.get('/', (req, res) => {
  res.send('Servidor de integración con Mercado Pago funcionando correctamente');
});

// Ruta para crear una preferencia de pago
app.post('/api/create-preference', async (req, res) => {
  try {
    const { items, payer, external_reference, back_urls, auto_return } = req.body;

    // Validar datos mínimos requeridos
    if (!items || !items.length) {
      return res.status(400).json({
        error: true,
        message: 'Se requiere al menos un item para crear la preferencia'
      });
    }

    // Crear el objeto de preferencia según la documentación de Mercado Pago
    const preference = {
      items,
      payer,
      external_reference,
      back_urls,
      auto_return,
      statement_descriptor: "QR CODE SCANNER",
      // Notificaciones - en producción usar una URL real
      notification_url: process.env.NODE_ENV === 'production' 
        ? "https://tu-dominio.com/webhook" 
        : "https://webhook.site/tu-id-para-pruebas"
    };

    // Crear la preferencia en Mercado Pago
    const response = await mercadopago.preferences.create(preference);
    
    // Devolver los datos necesarios al cliente
    res.json({
      id: response.body.id,
      init_point: response.body.init_point,
      sandbox_init_point: response.body.sandbox_init_point
    });
  } catch (error) {
    console.error('Error al crear preferencia:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

// Ruta para verificar un pago
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { paymentId, preferenceId } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({
        error: true,
        message: 'Se requiere el ID de pago'
      });
    }
    
    // Obtener información del pago desde Mercado Pago
    const payment = await mercadopago.payment.get(paymentId);
    
    // Verificar que el pago existe
    if (!payment || !payment.body) {
      return res.status(404).json({
        error: true,
        message: 'Pago no encontrado'
      });
    }
    
    // Verificar el estado del pago
    const paymentStatus = payment.body.status;
    
    // Verificar que el pago corresponde a la preferencia
    if (preferenceId && payment.body.preference_id !== preferenceId) {
      return res.status(400).json({
        error: true,
        message: 'El ID de preferencia no coincide con el pago'
      });
    }
    
    res.json({
      success: paymentStatus === 'approved',
      status: paymentStatus,
      paymentId: paymentId,
      preferenceId: payment.body.preference_id,
      transactionAmount: payment.body.transaction_amount,
      paymentMethodId: payment.body.payment_method_id,
      paymentTypeId: payment.body.payment_type_id,
      message: getStatusMessage(paymentStatus)
    });
  } catch (error) {
    console.error('Error al verificar pago:', error);
    res.status(500).json({
      success: false,
      error: true,
      message: error.message
    });
  }
});

// Webhook para recibir notificaciones de Mercado Pago
app.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    // Solo procesamos notificaciones de pagos
    if (type === 'payment') {
      const paymentId = data.id;
      
      // Obtener información del pago
      const payment = await mercadopago.payment.get(paymentId);
      
      // Aquí puedes actualizar tu base de datos o realizar otras acciones
      // según el estado del pago
      console.log('Notificación de pago recibida:', {
        id: paymentId,
        status: payment.body.status,
        external_reference: payment.body.external_reference
      });
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(500).send('Error');
  }
});

// Función para obtener un mensaje según el estado del pago
function getStatusMessage(status) {
  const messages = {
    approved: 'Pago aprobado',
    pending: 'Pago pendiente de aprobación',
    in_process: 'Pago en proceso',
    rejected: 'Pago rechazado',
    cancelled: 'Pago cancelado',
    refunded: 'Pago reembolsado',
    charged_back: 'Pago contracargado'
  };
  
  return messages[status] || 'Estado desconocido';
}

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  console.log('Modo:', process.env.NODE_ENV || 'desarrollo');
});
