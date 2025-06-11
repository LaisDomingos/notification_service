const express = require('express');
const router = express.Router();
const { Expo } = require('expo-server-sdk');
const DeviceToken = require('../models/DeviceToken');

const expo = new Expo();

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
