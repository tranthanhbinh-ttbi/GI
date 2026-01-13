const { Comment, User, ViolationLog, Notification, UserNotification } = require('../models');

// Gửi thông báo helper
async function notifyUser(userId, title, message, type) {
    try {
        const noti = await Notification.create({ title, message, type, isGlobal: false });
        await UserNotification.create({ userId, notificationId: noti.id, isRead: false });
    } catch (e) { console.error(e); }
}

/**
 * Lấy danh sách comment cần duyệt
 */
async function getModerationQueue(request, reply) {
    // Check Admin (Giả sử có middleware check role, ở đây tạm bỏ qua hoặc check đơn giản)
    // if (!request.user || !request.user.isAdmin) return reply.redirect('/');

    try {
        const flaggedComments = await Comment.findAll({
            where: { status: 'flagged' },
            include: [{ model: User, attributes: ['id', 'name', 'email', 'avatarUrl', 'violationCount'] }],
            order: [['createdAt', 'DESC']]
        });
        
        // Render view Admin (sẽ tạo ở bước sau)
        return reply.view('admin/moderation.ejs', { comments: flaggedComments, user: request.user });
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send('Server Error');
    }
}

/**
 * Admin: Duyệt bài (Bình luận sạch)
 */
async function approveComment(request, reply) {
    const { id } = request.params;
    try {
        const comment = await Comment.findByPk(id);
        if (!comment) return reply.code(404).send({ success: false, message: 'Not found' });

        comment.status = 'approved';
        await comment.save();

        return { success: true, message: 'Đã phê duyệt bình luận.' };
    } catch (error) {
        return reply.code(500).send({ success: false, message: 'Error' });
    }
}

/**
 * Admin: Từ chối (Bình luận độc hại) -> Phạt User
 */
async function rejectComment(request, reply) {
    const { id } = request.params;
    try {
        const comment = await Comment.findByPk(id);
        if (!comment) return reply.code(404).send({ success: false, message: 'Not found' });

        // 1. Cập nhật status comment
        comment.status = 'rejected';
        await comment.save();

        // 2. Xử lý User (Phạt)
        const user = await User.findByPk(comment.userId);
        if (user) {
            // Tăng số lần vi phạm
            const newCount = (user.violationCount || 0) + 1;
            
            // Log lý do reject chính thức
            await ViolationLog.create({
                userId: user.id,
                postSlug: comment.postSlug,
                content: comment.content,
                reason: `Admin Rejected: Vi phạm tiêu chuẩn cộng đồng (Lần ${newCount})`
            });

            if (newCount >= 3) {
                // BAN NICK
                await user.update({ violationCount: newCount, isBanned: true });
                await notifyUser(
                    user.id, 
                    'Tài khoản bị khóa vĩnh viễn', 
                    'Admin đã xác nhận bạn vi phạm tiêu chuẩn cộng đồng quá 3 lần. Tài khoản đã bị khóa.', 
                    'warning'
                );
            } else {
                // CẢNH BÁO
                await user.update({ violationCount: newCount });
                await notifyUser(
                    user.id, 
                    'Bình luận bị xóa', 
                    `Admin đã xóa bình luận của bạn do vi phạm quy định. Đây là lần cảnh cáo thứ ${newCount}/3.`, 
                    'warning'
                );
            }
        }

        return { success: true, message: 'Đã từ chối bình luận và xử lý vi phạm người dùng.' };
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ success: false, message: 'Error' });
    }
}

module.exports = {
    getModerationQueue,
    approveComment,
    rejectComment
};