const { Notification } = require('../models');

class NotificationService {
  constructor() {
    this.clients = new Set();
  }

  /**
   * Add a new SSE client
   * @param {object} res Fastify reply object (raw response used for SSE)
   */
  addClient(res) {
    this.clients.add(res);
    console.log(`[NotificationService] Client connected. Total: ${this.clients.size}`);
    
    // Remove client on close
    res.raw.on('close', () => {
      this.clients.delete(res);
      console.log(`[NotificationService] Client disconnected. Total: ${this.clients.size}`);
    });
  }

  /**
   * Create a notification in DB and broadcast to all connected clients
   * @param {object} data { title, message, type, link, isGlobal }
   */
  async createAndBroadcast(data) {
    try {
      // 1. Save to Database
      const notification = await Notification.create({
        title: data.title,
        message: data.message,
        type: data.type || 'info',
        link: data.link,
        isGlobal: data.isGlobal !== undefined ? data.isGlobal : true
      });

      console.log(`[NotificationService] Created notification: ${notification.title}`);

      // 2. Broadcast to clients
      this.broadcast(notification);
      
      return notification;
    } catch (error) {
      console.error('[NotificationService] Error creating notification:', error);
    }
  }

  /**
   * Send data to all clients
   * @param {object} payload Data to send
   */
  broadcast(payload) {
    const data = `data: ${JSON.stringify(payload)}

`;
    this.clients.forEach(client => {
      try {
        client.raw.write(data);
      } catch (e) {
        console.error('[NotificationService] Error sending to client:', e);
        this.clients.delete(client);
      }
    });
  }
}

module.exports = new NotificationService();
