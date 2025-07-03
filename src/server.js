// Carrega as variáveis de ambiente
require('dotenv').config();

const cors = require("cors");
const express = require('express');
const notificationRoutes = require('./routes/notification');
const connectToDatabase = require('./config/database');
const cron = require('node-cron');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swagger');

// Função que envia as notificações agendadas
const { sendSimpleNotification } = require('./controllers/notificationController.js');

const app = express();
const PORT = process.env.PORT || 4003;
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '00 19 * * *'; // Fallback: 19h todo dia

// Conecta ao banco de dados
connectToDatabase();

app.use(express.json());

app.use(cors());
// Usa a rota de notificações
app.use('/api/notification', notificationRoutes);
// Rota para servir JSON do Swagger
app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
// Rota para abrir Swagger UI com a documentação interativa
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// Cron job agendado via .env
cron.schedule(CRON_SCHEDULE, async () => {
  console.log('⌛ Rodando tarefa agendada: enviando notificações...', CRON_SCHEDULE);
  try {
    await sendSimpleNotification();
  } catch (error) {
    console.error('❌ Erro ao enviar notificações:', error);
  }
}, {
  timezone: 'Europe/Lisbon'
});

// Inicializa o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
