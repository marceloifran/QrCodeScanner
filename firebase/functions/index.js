const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });
const mercadopago = require("mercadopago");

// Cargar variables de entorno
require('dotenv').config();

// Configurar Mercado Pago con el access token
// IMPORTANTE: En producción, este token debe estar en variables de entorno
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN || "TEST-5274144528332475-040910-f2f8e0c9db4a8a8a3a9bd0702a234567-1234567"
});

// Función para crear una preferencia de pago
exports.createPreference = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // Verificar que sea una solicitud POST
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
      }

      // Obtener datos del cuerpo de la solicitud
      const { planId, planName, price, userId, email } = req.body;

      // Validar datos requeridos
      if (!planId || !planName || !price) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
      }

      // Crear el objeto de preferencia según la documentación de Mercado Pago
      const preference = {
        items: [
          {
            id: planId,
            title: `Plan ${planName}`,
            description: `Suscripción al plan ${planName}`,
            quantity: 1,
            currency_id: 'ARS', // Moneda Argentina, cambia según tu país
            unit_price: parseFloat(price)
          }
        ],
        payer: {
          email: email || 'usuario@test.com'
        },
        external_reference: userId, // Referencia para identificar al usuario
        back_urls: {
          success: "qrcodescanner://payment/success",
          failure: "qrcodescanner://payment/failure",
          pending: "qrcodescanner://payment/pending"
        },
        auto_return: "approved",
        statement_descriptor: "QR CODE SCANNER"
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
});

// Función para verificar un pago
exports.verifyPayment = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // Verificar que sea una solicitud POST
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
      }

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
