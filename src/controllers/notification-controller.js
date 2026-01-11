const notificationService = require('../services/notification-service');
const { Notification, UserNotification, sequelize } = require('../models');
const { Op } = require('sequelize');

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
      const userId = req.user ? req.user.id : null;
      
      let where = {};
      let include = [];

      if (userId) {
        // If user is logged in, exclude deleted notifications and include read status
        // We want notifications that are NOT deleted by this user
        // Since we are doing a LEFT JOIN, if there is no UserNotification record, it's not deleted.
        // If there IS a record, check isDeleted.
        
        // However, Sequelize doesn't support complex filtering on included models easily in top-level where
        // for exclusion without retrieving everything.
        // A simpler way: Get raw data or use complex queries.
        // Or fetch all recent notifications, then fetch user states.
        
        const notifications = await Notification.findAll({
          order: [['createdAt', 'DESC']],
          limit: limit,
          include: [{
            model: UserNotification,
            required: false,
            where: { userId: userId }
          }]
        });

        // Filter out deleted ones and map isRead
        const result = notifications.filter(n => {
          const userState = n.UserNotifications && n.UserNotifications[0];
          return !userState || !userState.isDeleted;
        }).map(n => {
          const userState = n.UserNotifications && n.UserNotifications[0];
          const plain = n.get({ plain: true });
          plain.isRead = userState ? userState.isRead : false;
          delete plain.UserNotifications;
          return plain;
        });

        return reply.send({ success: true, data: result });
      } else {
        // Guest: just show raw notifications
        const notifications = await Notification.findAll({
          order: [['createdAt', 'DESC']],
          limit: limit
        });
        return reply.send({ success: true, data: notifications });
      }

    } catch (error) {
      req.log.error(error);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  },

  markRead: async (req, reply) => {
    if (!req.user) return reply.code(401).send({ success: false, message: 'Unauthorized' });
    const { id } = req.params;
    
    try {
      const notification = await Notification.findByPk(id);
      if (!notification) return reply.code(404).send({ success: false, message: 'Notification not found' });

      await UserNotification.upsert({
        userId: req.user.id,
        notificationId: id,
        isRead: true
      });

      return reply.send({ success: true });
    } catch (error) {
      req.log.error(error);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  },

  markAllRead: async (req, reply) => {
    if (!req.user) return reply.code(401).send({ success: false, message: 'Unauthorized' });

    try {
      // Find all notifications that this user hasn't read yet
      // This is potentially heavy if many notifications. 
      // Optimized approach: Find IDs of unread notifications, then bulkUpsert.
      // Or simply: Iterate over recent ones? "Mark All Read" usually implies all visible ones or literally all.
      // Let's assume we mark all existing notifications as read.
      
      const allNotifications = await Notification.findAll({ attributes: ['id'] });
      const updates = allNotifications.map(n => ({
        userId: req.user.id,
        notificationId: n.id,
        isRead: true,
        isDeleted: false // Ensure we don't accidentally undelete if upsert defaults trigger, but upsert updates.
        // Actually upsert might reset isDeleted if we don't handle it.
        // Better: Use INSERT ... ON CONFLICT DO UPDATE
      }));

      // Sequelize Bulk Upsert is tricky across dialects.
      // Let's just find ones that need update.
      // Or simpler: just loop and update (slow but safe for now)
      // Or raw query.
      
      // Let's stick to a safe loop for the visible set or reasonable limit?
      // "Mark all read" usually means setting a watermark "read everything before X date".
      // Given the current structure, let's just find all notifications the user currently has NO record for, or has record with isRead: false.
      
      // 1. Get all notification IDs
      const notifIds = allNotifications.map(n => n.id);
      
      // 2. Get existing UserNotifications
      const existing = await UserNotification.findAll({
        where: { userId: req.user.id }
      });
      const existingMap = new Map(existing.map(e => [e.notificationId, e]));
      
      const transaction = await sequelize.transaction();
      try {
        for (const nid of notifIds) {
          const entry = existingMap.get(nid);
          if (!entry) {
             await UserNotification.create({
               userId: req.user.id,
               notificationId: nid,
               isRead: true
             }, { transaction });
          } else if (!entry.isRead) {
             await entry.update({ isRead: true }, { transaction });
          }
        }
        await transaction.commit();
        return reply.send({ success: true });
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    } catch (error) {
      req.log.error(error);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  },

  delete: async (req, reply) => {
    if (!req.user) return reply.code(401).send({ success: false, message: 'Unauthorized' });
    const { ids } = req.body; // Expect array of IDs

    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.code(400).send({ success: false, message: 'Invalid IDs' });
    }

    try {
       const transaction = await sequelize.transaction();
       try {
         for (const nid of ids) {
             // We use upsert to ensure we create the record if it doesn't exist (marking it deleted)
             // or update it if it does.
             // Note: upsert in sequelize might overwrite other fields if not careful.
             // We need to preserve isRead status if it exists.
             
             const existing = await UserNotification.findOne({
                 where: { userId: req.user.id, notificationId: nid },
                 transaction
             });
             
             if (existing) {
                 await existing.update({ isDeleted: true }, { transaction });
             } else {
                 await UserNotification.create({
                     userId: req.user.id,
                     notificationId: nid,
                     isDeleted: true,
                     isRead: true // If deleted, effectively read/ignored
                 }, { transaction });
             }
         }
         await transaction.commit();
         return reply.send({ success: true });
       } catch (err) {
         await transaction.rollback();
         throw err;
       }
    } catch (error) {
      req.log.error(error);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  }
};
