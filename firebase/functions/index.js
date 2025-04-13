const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });
const mercadopago = require("mercadopago");
const admin = require('firebase-admin');

// Cargar variables de entorno
require('dotenv').config();

// Inicializar Firebase Admin
admin.initializeApp();

// Configurar Mercado Pago
mercadopago.configure({
  access_token: 'APP_USR-7878626425925742-041017-fad7c0a9f79d8558bdcceee2d9b3addf-721448179'
});

// Función para manejar webhooks de Mercado Pago
exports.handleMercadoPagoWebhook = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const { type, data } = req.body;

      if (type !== 'payment') {
        return res.status(200).send('Notificación no procesada');
      }

      const paymentId = data.id;
      
      // Obtener información del pago
      const payment = await mercadopago.payment.get(paymentId);
      const paymentData = payment.body;
      
      // Obtener información del usuario desde external_reference
      const userId = paymentData.external_reference;
      if (!userId) {
        throw new Error('No se encontró referencia al usuario');
      }

      // Actualizar el estado de la suscripción en Firestore
      const userRef = admin.firestore().collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new Error('Usuario no encontrado');
      }

      // Calcular fecha de expiración según el plan
      const expirationDate = new Date();
      const planId = paymentData.items[0].id;
      
      // Determinar la duración de la suscripción según el plan
      switch (planId) {
        case 'monthly':
          expirationDate.setMonth(expirationDate.getMonth() + 1);
          break;
        case 'yearly':
          expirationDate.setFullYear(expirationDate.getFullYear() + 1);
          break;
        default:
          expirationDate.setMonth(expirationDate.getMonth() + 1);
      }

      // Actualizar el documento del usuario
      await userRef.update({
        subscription: {
          status: paymentData.status,
          planId: planId,
          expirationDate: expirationDate,
          lastPayment: {
            id: paymentId,
            amount: paymentData.transaction_amount,
            date: new Date(),
            status: paymentData.status,
            paymentMethod: paymentData.payment_method_id
          }
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Enviar notificación push al usuario
      const userData = userDoc.data();
      if (userData.fcmToken) {
        const message = {
          notification: {
            title: 'Pago procesado',
            body: `Tu pago ha sido ${paymentData.status === 'approved' ? 'aprobado' : 'rechazado'}`
          },
          token: userData.fcmToken
        };

        await admin.messaging().send(message);
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Error en webhook:', error);
      res.status(500).send('Error');
    }
  });
});

// Función para crear preferencia de pago
exports.createPreference = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
      }

      const { planId, planName, price, userId, email } = req.body;

      if (!planId || !planName || !price) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
      }

      const preference = {
        items: [
          {
            id: planId,
            title: `Plan ${planName}`,
            description: `Suscripción al plan ${planName}`,
            quantity: 1,
            currency_id: 'ARS',
            unit_price: parseFloat(price)
          }
        ],
        payer: {
          email: email || 'usuario@test.com'
        },
        external_reference: userId,
        back_urls: {
          success: "qrcodescanner://payment/success",
          failure: "qrcodescanner://payment/failure",
          pending: "qrcodescanner://payment/pending"
        },
        auto_return: "approved",
        statement_descriptor: "QR CODE SCANNER"
      };

      const response = await mercadopago.preferences.create(preference);
      
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
