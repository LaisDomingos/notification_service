const { Expo } = require('expo-server-sdk');
const DeviceToken = require('../models/DeviceToken');
const expo = new Expo();

async function sendSimpleNotification() {
  const allTokens = await DeviceToken.find();

  if (!allTokens.length) {
    console.log('Nenhum token registrado para receber notificações.');
    return;
  }

  const messages = [];

  for (const { token } of allTokens) {
    if (!Expo.isExpoPushToken(token)) {
      console.log(`Token inválido, ignorando: ${token}`);
      continue;
    }

    messages.push({
      to: token,
      sound: 'default',
      title: '👋 Olá!',
      body: 'Esta é uma notificação simples para você.',
      data: { message: 'Olá, notification!' },
    });
  }

  const chunks = expo.chunkPushNotifications(messages);

  try {
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    console.log('✅ Notificações simples enviadas com sucesso!');
  } catch (error) {
    console.error('Erro ao enviar notificações:', error);
    throw error;
  }
}

module.exports = { sendSimpleNotification };
