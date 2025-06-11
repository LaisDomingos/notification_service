const { Expo } = require('expo-server-sdk');
const DeviceToken = require('../models/DeviceToken');
const establishmentsData = require('../../services/establishments.json');
const { isExpiringToday } = require('../utils/dateUtils.js');
const axios = require('axios');

const expo = new Expo();

// Função auxiliar que verifica se o usuário está ativo via API de usuários
async function isUserActive(email) {
  try {
    const response = await axios.get(`http://localhost:4002/api/user/email/${email}`);
    return response.data?.active === true;
  } catch (error) {
    console.error(`⚠️ Erro ao buscar usuário com email ${email}:`, error.message);
    return false; // Se der erro, consideramos inativo por segurança
  }
}

async function sendScheduledNotification() {
  // Aqui o campo agora é 'vigencia' para seu JSON em espanhol
  const todayExpiring = establishmentsData.filter(e => isExpiringToday(e.vigencia));

  if (todayExpiring.length === 0) {
    console.log('Nenhum desconto vencendo hoje para notificar.');
    return;
  }

  const firstExpiring = todayExpiring[0];

  const allTokens = await DeviceToken.find();
  if (!allTokens.length) {
    console.log('Nenhum token registrado para receber notificações.');
    return;
  }

  const messages = [];

  for (const { token, email } of allTokens) {
    if (!Expo.isExpoPushToken(token)) {
      console.log(`Token inválido, ignorando: ${token}`);
      continue;
    }

    const active = await isUserActive(email);
    if (!active) {
      console.log(`Usuário inativo: ${email}`);
      continue;
    }

    messages.push({
      to: token,
      sound: 'default',
      title: '⏰ ¡Última oportunidad hoy!',
      body: `${firstExpiring.nome_estabelecimento} - ${firstExpiring.desconto}`,
      data: { id: firstExpiring.id },
    });
  }

  const chunks = expo.chunkPushNotifications(messages);

  try {
    for (let chunk of chunks) {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      console.log('Receipts:', receipts);
    }
  } catch (error) {
    console.error('Erro ao enviar notificações:', error);
    throw error;
  }
}

module.exports = { sendScheduledNotification };
