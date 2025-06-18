const { Expo } = require('expo-server-sdk');
const DeviceToken = require('../models/DeviceToken');
const axios = require('axios');
const expo = new Expo();

const fs = require('fs').promises;
const path = require('path');


const apiUrl = process.env.API_URL;

// API - Verifica se o usuário está ativo
async function isUserActive(email) {
  try {
    const response = await axios.get(`${apiUrl}/user/email/${email}`);
    console.log("user: ", response.data)
    return response.data;
  } catch (error) {
    console.error(`⚠️ Erro ao buscar usuário com email ${email}:`, error.message);
    return false;
  }
}

// Coordenadas a partir do endereço
async function getCoordinatesFromAddress(endereco) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`;
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'x42-f222w' }
    });

    if (response.data && response.data.length > 0) {
      const { lat, lon } = response.data[0];
      return { lat: parseFloat(lat), lon: parseFloat(lon) };
    } else {
      console.warn(`📍 Endereço não encontrado: ${endereco}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Erro ao converter endereço: ${endereco}`, error.message);
    return null;
  }
}

// Verifica se está dentro do raio OU retorna a distância
function isWithinRadius(lat1, lon1, lat2, lon2, radiusKm = 1, returnDistance = false) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return returnDistance ? distance : distance <= radiusKm;
}

// Envia notificação programada
// Util para escolher um aleatório de um array
function choiceRandom(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

// Função principal
async function sendScheduledNotification() {
  // Lê o JSON toda vez que roda a notificação:
  const dataRaw = await fs.readFile(path.resolve(__dirname, '../../services/establishments.json'), 'utf-8');
  const establishmentsData = JSON.parse(dataRaw);

  const allTokens = await DeviceToken.find();
  if (!allTokens.length) {
    console.log('Nenhum token registrado para receber notificações.');
    return;
  }

  const mensagens = [];

  for (const { token, email } of allTokens) {
    if (!Expo.isExpoPushToken(token)) {
      console.log(`Token inválido, ignorando: ${token}`);
      continue;
    }

    // Busca dados do usuário (já vem com favorites e localização)
    const userData = await isUserActive(email);
    if (!userData || !userData.active) {
      console.log(`Usuário inativo ou não encontrado: ${email}`);
      continue;
    }

    const favs = userData.favorites || [];
    const userLatitude = userData.latitude;
    const userLongitude = userData.longitude;

    const temFavoritos = favs.length > 0;
    const temLocalizacao = userLatitude != null && userLongitude != null;

    let estabelecimentoParaNotificar = null;

    // Filtra estabelecimentos que são favoritos do usuário
    const favoritosEncontrados = temFavoritos
      ? establishmentsData.filter(estab => favs.includes(estab.nome_estabelecimento))
      : [];

    const hoje = new Date().toISOString().split('T')[0];

    function escolherMaisProximoAVencer(lista) {
      const candidatos = lista.filter(e => e.vigencia >= hoje);
      if (!candidatos.length) return null;

      const ordenados = candidatos.sort((a, b) => new Date(a.vigencia) - new Date(b.vigencia));
      const maisProximaData = ordenados[0]?.vigencia;
      const empatados = ordenados.filter(e => e.vigencia === maisProximaData);
      return choiceRandom(empatados);
    }

    if (!temFavoritos) {
      estabelecimentoParaNotificar = escolherMaisProximoAVencer(establishmentsData);
    } else if (temFavoritos && !temLocalizacao) {
      estabelecimentoParaNotificar = escolherMaisProximoAVencer(favoritosEncontrados);
    } else if (temFavoritos && temLocalizacao) {
      let dentroDoRaio = null;
      let maisProximoAVencer = null;

      for (const estab of favoritosEncontrados) {
        if (!estab.endereco) continue;

        const coords = await getCoordinatesFromAddress(estab.endereco);
        if (!coords) continue;

        const distancia = isWithinRadius(
          userLatitude,
          userLongitude,
          coords.lat,
          coords.lon,
          999999,
          true
        );

        if (distancia <= 1) {
          dentroDoRaio = estab;
          break;
        }

        if (
          !maisProximoAVencer ||
          new Date(estab.vigencia) < new Date(maisProximoAVencer.vigencia)
        ) {
          maisProximoAVencer = estab;
        }
      }

      if (!dentroDoRaio) {
        if (!maisProximoAVencer) {
          maisProximoAVencer = escolherMaisProximoAVencer(favoritosEncontrados);
        }
        if (maisProximoAVencer) {
          const mesmaData = favoritosEncontrados.filter(
            e => e.vigencia === maisProximoAVencer.vigencia
          );
          estabelecimentoParaNotificar = choiceRandom(mesmaData);
        }
      } else {
        estabelecimentoParaNotificar = dentroDoRaio;
      }
    }

    if (!estabelecimentoParaNotificar) {
      console.log(`Nenhum estabelecimento válido para o usuário ${email}.`);
      continue;
    }

    const bodyMsg =
      temFavoritos && temLocalizacao
        ? `¡Estás cerca de ${estabelecimentoParaNotificar.nome_estabelecimento}! Aprovecha el descuento de ${estabelecimentoParaNotificar.desconto}.`
        : `${estabelecimentoParaNotificar.nome_estabelecimento} tiene un descuento especial: ${estabelecimentoParaNotificar.desconto}.`;

    mensagens.push({
      to: token,
      sound: 'default',
      title: '📢 ¡Descuento especial!',
      body: bodyMsg,
      data: { id: estabelecimentoParaNotificar.id },
    });
  }

  const chunks = expo.chunkPushNotifications(mensagens);
  try {
    for (let chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (error) {
    console.error('Erro ao enviar notificações:', error);
    throw error;
  }
}


module.exports = { sendScheduledNotification };
