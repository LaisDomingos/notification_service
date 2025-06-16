const { Expo } = require('expo-server-sdk');
const DeviceToken = require('../models/DeviceToken');
const establishmentsData = require('../../services/establishments.json');
const { isExpiringToday } = require('../utils/dateUtils.js');
const axios = require('axios');
const expo = new Expo();

const apiUrl = process.env.API_URL;

// API - Verifica se o usuário está ativo
async function isUserActive(email) {
  try {
    const response = await axios.get(`${apiUrl}/user/email/${email}`);
    return response.data;
  } catch (error) {
    console.error(`⚠️ Erro ao buscar usuário com email ${email}:`, error.message);
    return false;
  }
}

// API - Busca favoritos
async function favoritesUser(userRut) {
  try {
    const response = await axios.get(`${apiUrl}/favorite/${userRut}`);
    return response.data.favorites;
  } catch (error) {
    console.error(`⚠️ Erro ao buscar favoritos do usuário ${userRut}:`, error.message);
    return false;
  }
}

// API - Localização
async function locationUser(email) {
  try {
    const response = await axios.get(`${apiUrl}/location/${email}`);
    return response.data;
  } catch (error) {
    console.error(`⚠️ Erro ao buscar localização do usuário ${email}:`, error.message);
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
    // Verifica se o usuário existe e está ativo
    const userData = await isUserActive(email);
    if (!userData || !userData.active) {
      console.log(`Usuário inativo ou não encontrado: ${email}`);
      continue;
    }

    // Pega os estabelecimentos favoritos e a última localização do usuário
    const favs = await favoritesUser(userData.rut);
    console.log("[]: ", favs)
    const [userLocation] = await locationUser(email);

    // Checa se o usuário tem favoritos e localização. 
    const temFavoritos = favs && favs.length > 0;
    const temLocalizacao = userLocation?.latitude && userLocation?.longitude;

    // Variável que vai guardar o escolhido para notificação
    let estabelecimentoParaNotificar = null;

    // Filtra os dados gerais de estabelecimentos e pega só os que são favoritos desse usuário
    const favoritosEncontrados = temFavoritos
      ? establishmentsData.filter(estab => favs.includes(estab.nome_estabelecimento))
      : [];

    // Define o dia de hoje no formato YYYY-MM-DD (pra comparar com datas de validade dos descontos).
    const hoje = new Date().toISOString().split('T')[0];

    // Filtra os que ainda estão válidos, ordena por data de validade e se não escolhe um aletatório
    function escolherMaisProximoAVencer(lista) {
      const candidatos = lista.filter(e => e.vigencia >= hoje);

      if (!candidatos.length) return null;

      const ordenados = candidatos.sort((a, b) => new Date(a.vigencia) - new Date(b.vigencia));
      const maisProximaData = ordenados[0]?.vigencia;

      // Filtra todos com mesma data
      const empatados = ordenados.filter(e => e.vigencia === maisProximaData);
      return choiceRandom(empatados); // Escolhe aleatório entre os empatados
    }
    // Regra 1: Se não tem favoritos, pega qualquer estabelecimento que vence mais cedo.
    if (!temFavoritos) {
      console.log("não tem favoritos")
      estabelecimentoParaNotificar = escolherMaisProximoAVencer(establishmentsData);

    }
    // Regra 2: Tem favoritos, mas não tem localização. Escolhe o favorito mais próximo a vencer.
    else if (temFavoritos && !temLocalizacao) {
      console.log("Tem favoritos, mas não tem localização")
      estabelecimentoParaNotificar = escolherMaisProximoAVencer(favoritosEncontrados);

    }
    //  Regras 3 e 4: Tem favoritos e localização
    else if (temFavoritos && temLocalizacao) {
      console.log("tem tudo")
      let dentroDoRaio = null;
      let maisProximoAVencer = null;

      for (const estab of favoritosEncontrados) {
        // Se não tem endereço, não dá pra calcular distância, então pula.
        if (!estab.endereco) continue;

        const coords = await getCoordinatesFromAddress(estab.endereco);
        if (!coords) continue;

        const distancia = isWithinRadius(
          userLocation.latitude,
          userLocation.longitude,
          coords.lat,
          coords.lon,
          999999,
          true
        );

        if (distancia <= 1) {
          dentroDoRaio = estab;
          break;
        }
        // Caso não tenha nenhum proximo, guarda o favorito com vencimento mais próximo como plano B
        if (
          !maisProximoAVencer ||
          new Date(estab.vigencia) < new Date(maisProximoAVencer.vigencia)
        ) {
          maisProximoAVencer = estab;
        }
      }
      // Se ninguém está perto, mas tem favoritos prestes a vencer, escolhe um deles aleatoriamente. 
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
      temFavoritos && temLocalizacao && estabelecimentoParaNotificar === estabelecimentoParaNotificar
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
