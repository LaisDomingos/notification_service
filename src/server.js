// Carrega as variáveis de ambiente
require('dotenv').config();

const express = require('express');
const notificationRoutes = require('./routes/notification');
const connectToDatabase = require('./config/database');
const cron = require('node-cron');

// Função que envia as notificações agendadas
const { sendScheduledNotification } = require('./controllers/notificationController.js');

const app = express();
const PORT = process.env.PORT || 4003;
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 18 * * *'; // Fallback: 18h todo dia

// Conecta ao banco de dados
connectToDatabase();

app.use(express.json());

// Usa a rota de notificações
app.use('/api/notification', notificationRoutes);

// Cron job agendado via .env
cron.schedule(CRON_SCHEDULE, async () => {
  console.log('⌛ Rodando tarefa agendada: enviando notificações...', CRON_SCHEDULE);
  try {
    await sendScheduledNotification();
    console.log('✅ Notificações enviadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao enviar notificações:', error);
  }
});

// Inicializa o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
