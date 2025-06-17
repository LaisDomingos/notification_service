const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Notification Service API',
      version: '1.0.0',
      description: 'API para gerenciar as notificações',
    },
  },
  apis: ['./src/routes/notification.js'], 
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
