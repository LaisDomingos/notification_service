# 📲 Notification Service

Este é um microserviço de notificações push desenvolvido com **Node.js**, **Express**, **MongoDB** e **Expo Push Notifications**. Ele permite:

- Registrar tokens de dispositivos móveis.
- Agendar o envio de notificações automáticas.
- Enviar mensagens push personalizadas ou simples para todos os dispositivos registrados.
- Documentação interativa via Swagger.

---

## 🚀 Tecnologias

- Node.js
- Express
- MongoDB + Mongoose
- Expo Server SDK (Push Notifications)
- Node-Cron (para agendamento)
- OpenStreetMap (Nominatim API para geolocalização)
- Swagger (OpenAPI 3.0)

---

## 📦 Instalação

```bash
git clone https://github.com/seu-usuario/notification-service.git
cd notification-service
npm install
```

## ⚙️ Configuração
Crie um arquivo .env na raiz do projeto com as seguintes variáveis:

env
```bash
PORT=4003
MONGO_URI=mongodb://localhost:27017/notification_service
API_URL=http://seu-outro-servico.com/api
CRON_SCHEDULE=00 19 * * *  # Agendamento diário (19:00)
```

## 🧪 Testando Endpoints
Registrar Token
POST /api/notification/register

json
```bash
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "email": "usuario@email.com"
}
```

Enviar Notificação Simples
POST /api/notification/send-simple

Resposta esperada:

json
```bash
{
  "message": "Notificações simples enviadas com sucesso!"
}
```

## 📚 Documentação com Swagger
Acesse a documentação Swagger na URL: 
