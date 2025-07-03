const express = require('express');
const router = express.Router();
const { Expo } = require('expo-server-sdk');
const DeviceToken = require('../models/DeviceToken');

const expo = new Expo();

const { sendSimpleNotification } = require('../controllers/notificationController');

/**
 * @swagger
 * components:
 *   schemas:
 *     DeviceToken:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 6650c78a9cf6ab0012eec5a1
 *         token:
 *           type: string
 *           example: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
 *         email:
 *           type: string
 *           example: usuario@email.com
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/notification/register:
 *   post:
 *     summary: Registrar token do dispositivo para envio de notificações
 *     tags: [Notificações]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - email
 *             properties:
 *               token:
 *                 type: string
 *                 example: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@email.com
 *     responses:
 *       201:
 *         description: Token e email registrados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Token e email registrados com sucesso!
 *       200:
 *         description: Token já registrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Token já registrado
 *       400:
 *         description: Dados inválidos ou campos ausentes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Token inválido
 */

/**
 * @swagger
 * /api/notification/send-simple:
 *   post:
 *     summary: Enviar notificação simples "Olá" para todos os dispositivos registrados
 *     tags: [Notificações]
 *     responses:
 *       200:
 *         description: Notificações simples enviadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Notificações simples enviadas com sucesso!
 *       500:
 *         description: Erro ao enviar notificações
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Erro ao enviar notificações
 *                 details:
 *                   type: string
 *                   example: Alguma mensagem de erro do servidor
 */

// POST /api/notification/register
router.post('/register', async (req, res) => {
  const { token, email } = req.body;

  if (!token || !Expo.isExpoPushToken(token)) {
    return res.status(400).json({ error: 'Token inválido' });
  }

  if (!email) {
    return res.status(400).json({ error: 'Email é obrigatório' });
  }

  const exists = await DeviceToken.findOne({ token });
  if (exists) return res.status(200).json({ message: 'Token já registrado' });

  await DeviceToken.create({ token, email });
  res.status(201).json({ message: 'Token e email registrados com sucesso!' });
});

// POST /api/notification/send-simple
router.post('/send-simple', async (req, res) => {
  try {
    await sendSimpleNotification();
    res.status(200).json({ message: 'Notificações simples enviadas com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar notificações', details: error.message });
  }
});

module.exports = router;
