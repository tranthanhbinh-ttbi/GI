const notificationService = require('../services/notification-service');
const { Notification } = require('../models');

module.exports = {
  stream: (req, reply) => {
    // Set headers for SSE
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial comment to keep connection open and establish stream
    reply.raw.write(': connected\n\n');

    // Add client to service
    notificationService.addClient(reply);
  },

  getRecent: async (req, reply) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 20;
      const notifications = await Notification.findAll({
        order: [['createdAt', 'DESC']],
        limit: limit
      });
      return reply.send({ success: true, data: notifications });
    } catch (error) {
      req.log.error(error);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  }
};
