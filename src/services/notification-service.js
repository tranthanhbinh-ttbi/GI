const { Notification } = require('../models');

class NotificationService {
  /**
   * Create a notification in DB
   * @param {object} data { title, message, type, link, isGlobal }
   */
  async createNotification(data) {
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
      
      return notification;
    } catch (error) {
      console.error('[NotificationService] Error creating notification:', error);
    }
  }

  // Legacy alias for backward compatibility if needed temporarily
  async createAndBroadcast(data) {
    return this.createNotification(data);
  }
}

module.exports = new NotificationService();