const express = require('express');
const router = express.Router();
const { Expo } = require('expo-server-sdk');
const DeviceToken = require('../models/DeviceToken');

const expo = new Expo();

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
 * /api/notifications/send:
 *   post:
 *     summary: Enviar notificação de teste para todos os dispositivos registrados
 *     tags: [Notificações]
 *     responses:
 *       200:
 *         description: Notificações enviadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Notificações enviadas com sucesso!
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
// POST /notifications/send
router.post('/send', async (req, res) => {
  const messages = [];
  const allTokens = await DeviceToken.find();

  allTokens.forEach(({ token }) => {
    if (!Expo.isExpoPushToken(token)) return;

    messages.push({
      to: token,
      sound: 'default',
      title: '🧨 Oferta Expirando!',
      body: 'Corre que é só até hoje!',
      data: { withSome: 'data' },
    });
  });

  const chunks = expo.chunkPushNotifications(messages);
  try {
    for (let chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    res.status(200).json({ message: 'Notificações enviadas com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar notificações', details: error });
  }
});

/**
 * @swagger
 * /api/notifications/register:
 *   post:
 *     summary: Registrar token do dispositivo para envio de notificações
 *     tags: [Notificações]
 *     description: >
 *       Essa operação envia notificações push baseadas nas preferências e localização dos usuários ativos.
 *       
 *       **Funcionamento detalhado:** Busca todos os tokens de dispositivos registrados.
 *       Verifica se o usuário está ativo consultando um endpoint externo via email.
 *       Para cada usuário ativo, verifica seus favoritos e localização.
 *       Seleciona o estabelecimento com desconto mais próximo da data de validade e, se possível, dentro de 1 km da localização do usuário.
 *       Monta mensagens personalizadas para envio via Expo Push Notifications.
 *       Envia notificações em lotes.
 *
 *       **Funções auxiliares importantes:**
 *       - `isUserActive(email)`: consulta API externa para verificar se o usuário está ativo.
 *       - `getCoordinatesFromAddress(endereco)`: usa OpenStreetMap para converter endereço em coordenadas geográficas.
 *       - `isWithinRadius(...)`: calcula distância geográfica para checar se o usuário está dentro do raio de 1 km.
 *       - `choiceRandom(lista)`: seleciona aleatoriamente um item de uma lista.
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
// POST /notifications/register
router.post('/register', async (req, res) => {
  const { token, email } = req.body;

  console.log('Token:', token);
  console.log('Email:', email);

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


module.exports = router;
