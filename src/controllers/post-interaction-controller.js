const { PostRating, Comment, User, PostMeta, Notification, UserNotification, ViolationLog, PostViewLog, sequelize } = require('../models');
const { Op } = require('sequelize');
const { moderateContent } = require('../services/moderation-service');

const VIEW_THROTTLE_MS = 60 * 60 * 1000; // 1 giờ

/**
 * Helper: Gửi thông báo cá nhân cho user
 */
async function sendUserNotification(userId, title, message, type = 'info', link = null) {
    try {
        // 1. Tạo Notification
        const noti = await Notification.create({
            title,
            message,
            type,
            link,
            isGlobal: false
        });

        // 2. Link với User
        await UserNotification.create({
            userId,
            notificationId: noti.id,
            isRead: false
        });
    } catch (e) {
        console.error('Failed to send notification:', e);
    }
}

/**
 * Tăng lượt xem bài viết
 */
async function increaseView(request, reply) {
    const { slug } = request.params;
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown-ip';
    
    // DB-based Throttle Check
    const oneHourAgo = new Date(Date.now() - VIEW_THROTTLE_MS);

    try {
        // OPTIMIZATION: Probabilistic Cleanup (5% chance)
        // Helps keep the table small without needing a separate Cron job (works on Serverless)
        if (Math.random() < 0.05) {
            PostViewLog.destroy({
                where: {
                    createdAt: {
                        [Op.lt]: oneHourAgo
                    }
                }
            }).catch(err => console.error('Cleanup view logs failed:', err));
        }

        // 1. Check if IP viewed this slug in last 1 hour
        const existingLog = await PostViewLog.findOne({
            where: {
                ip: ip,
                slug: slug,
                createdAt: {
                    [Op.gt]: oneHourAgo
                }
            }
        });

        if (existingLog) {
             return { success: true, message: 'View throttled (already viewed recently)' };
        }

        // 2. Log new view
        await PostViewLog.create({
            ip: ip,
            slug: slug
        });

        // 3. Increment View Counter
        const [meta] = await PostMeta.findOrCreate({
            where: { slug },
            defaults: { views: 0, avgRating: 0, totalRatings: 0 }
        });

        await meta.increment('views');

        return { success: true, views: meta.views + 1 };
    } catch (error) {
        request.log.error(error);
        return { success: false, message: 'Error tracking view' };
    }
}

/**
 * Lấy thông tin rating của bài viết
 */
async function getPostRating(request, reply) {
    const { slug } = request.params;
    try {
        // 1. Try fetching from PostMeta first (Faster)
        const meta = await PostMeta.findByPk(slug);
        
        let avgScore = 0;
        let totalRatings = 0;
        let views = 0;

        if (meta) {
            avgScore = meta.avgRating;
            totalRatings = meta.totalRatings;
            views = meta.views;
        } else {
            // Fallback: Calculate if not in Meta yet
            const stats = await PostRating.findOne({
                where: { postSlug: slug },
                attributes: [
                    [sequelize.fn('AVG', sequelize.col('score')), 'avgScore'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'totalRatings']
                ],
                raw: true
            });
            avgScore = parseFloat(stats.avgScore || 0);
            totalRatings = parseInt(stats.totalRatings || 0);
        }

        let userScore = 0;
        if (request.isAuthenticated()) {
            const userRating = await PostRating.findOne({
                where: { postSlug: slug, userId: request.user.id },
                attributes: ['score']
            });
            if (userRating) userScore = userRating.score;
        }

        return {
            success: true,
            avgScore: parseFloat(avgScore).toFixed(1),
            totalRatings: parseInt(totalRatings),
            userScore,
            views
        };
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
}

/**
 * Gửi đánh giá bài viết
 */
async function ratePost(request, reply) {
    if (!request.isAuthenticated()) {
        return reply.code(401).send({ success: false, message: 'Vui lòng đăng nhập để đánh giá' });
    }

    // Check Ban
    if (request.user.isBanned) {
        return reply.code(403).send({ 
            success: false, 
            message: 'Tài khoản của bạn đã bị khóa do vi phạm tiêu chuẩn cộng đồng.' 
        });
    }

    const { slug } = request.params;
    const { score } = request.body;

    if (!score || score < 1 || score > 5) {
        return reply.code(400).send({ success: false, message: 'Điểm đánh giá không hợp lệ' });
    }

    try {
        const [rating, created] = await PostRating.upsert({
            userId: request.user.id,
            postSlug: slug,
            score: score
        });

        // Recalculate stats
        const stats = await PostRating.findOne({
            where: { postSlug: slug },
            attributes: [
                [sequelize.fn('AVG', sequelize.col('score')), 'avgScore'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalRatings']
            ],
            raw: true
        });

        const newAvg = parseFloat(stats.avgScore || 0);
        const newCount = parseInt(stats.totalRatings || 0);

        // Update PostMeta
        await PostMeta.upsert({
            slug: slug,
            avgRating: newAvg,
            totalRatings: newCount
        });

        return { success: true, message: 'Cảm ơn bạn đã đánh giá!' };
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ success: false, message: 'Không thể lưu đánh giá' });
    }
}

/**
 * Hủy đánh giá
 */
async function deleteRating(request, reply) {
    if (!request.isAuthenticated()) {
        return reply.code(401).send({ success: false, message: 'Vui lòng đăng nhập' });
    }

    // Check Ban
    if (request.user.isBanned) {
        return reply.code(403).send({ success: false, message: 'Tài khoản đã bị khóa.' });
    }

    const { slug } = request.params;

    try {
        const deleted = await PostRating.destroy({
            where: {
                userId: request.user.id,
                postSlug: slug
            }
        });

        if (deleted) {
            // Sync Meta
            await syncPostMeta(slug);
            return { success: true, message: 'Đã hủy đánh giá thành công' };
        } else {
            return { success: false, message: 'Bạn chưa đánh giá bài viết này' };
        }
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ success: false, message: 'Lỗi khi hủy đánh giá' });
    }
}

/**
 * Lấy danh sách bình luận
 */
async function getComments(request, reply) {
    const { slug } = request.params;
    try {
        const comments = await Comment.findAll({
            where: { postSlug: slug, parentId: null },
            include: [
                {
                    model: User,
                    attributes: ['name', 'avatarUrl']
                },
                {
                    model: Comment,
                    as: 'replies',
                    include: [{ model: User, attributes: ['name', 'avatarUrl'] }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return { success: true, comments };
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
}

/**
 * Gửi bình luận (Updated with Moderation & Ban Logic & Evidence Logging)
 */
async function postComment(request, reply) {
    if (!request.isAuthenticated()) {
        return reply.code(401).send({ success: false, message: 'Vui lòng đăng nhập để bình luận' });
    }

    const user = request.user; // User instance from Passport

    // 1. Kiểm tra trạng thái Ban
    if (user.isBanned) {
        return reply.code(403).send({ 
            success: false, 
            message: 'Tài khoản của bạn đã bị khóa vĩnh viễn do vi phạm nhiều lần.' 
        });
    }

    const { slug } = request.params;
    const { content, parentId } = request.body;

    if (!content || content.trim().length === 0) {
        return reply.code(400).send({ success: false, message: 'Nội dung bình luận không được để trống' });
    }

    // 2. Kiểm duyệt Nội dung (AI + Local)
    try {
        const { isSafe, reason } = await moderateContent(content);

        if (!isSafe) {
            // A. Lưu bằng chứng vi phạm (Violation Log)
            // Comment KHÔNG được tạo trong bảng Comments (coi như xóa ngay lập tức khỏi hiển thị)
            await ViolationLog.create({
                userId: user.id,
                postSlug: slug,
                content: content,
                reason: reason
            });

            // B. Tăng số lần vi phạm
            const newCount = (user.violationCount || 0) + 1;
            
            if (newCount > 3) {
                // Ban ngay lập tức nếu vượt quá 3 lần
                await user.update({ violationCount: newCount, isBanned: true });
                
                // Gửi thông báo Ban
                await sendUserNotification(
                    user.id,
                    'Tài khoản bị khóa',
                    'Bạn đã vi phạm tiêu chuẩn cộng đồng quá 3 lần. Tài khoản của bạn đã bị khóa vĩnh viễn. Nếu có nhầm lẫn, vui lòng khiếu nại qua email: support@example.com',
                    'warning'
                );

                return reply.code(403).send({ 
                    success: false, 
                    message: 'Nội dung độc hại! Bạn đã vi phạm quá 3 lần. Tài khoản của bạn đã bị khóa. Vui lòng kiểm tra thông báo để biết thêm chi tiết.' 
                });
            } else {
                // Cảnh báo
                await user.update({ violationCount: newCount });
                
                // Gửi thông báo Cảnh báo
                await sendUserNotification(
                    user.id,
                    'Cảnh báo vi phạm nội dung',
                    `Nội dung bình luận của bạn đã bị hệ thống xóa ngay lập tức vì lý do: ${reason}. Đây là lần vi phạm thứ ${newCount}/3.`,
                    'warning'
                );

                return reply.code(400).send({ 
                    success: false, 
                    message: `Nội dung không phù hợp (${reason})! Cảnh báo vi phạm lần ${newCount}/3. Nếu vi phạm quá 3 lần tài khoản sẽ bị khóa.` 
                });
            }
        }
    } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ success: false, message: 'Lỗi hệ thống khi kiểm duyệt nội dung.' });
    }

    // 3. Chống Spam: Rate Limiting (30s)
    try {
        const lastComment = await Comment.findOne({
            where: { userId: user.id },
            order: [['createdAt', 'DESC']]
        });

        if (lastComment) {
            const diffMs = Date.now() - new Date(lastComment.createdAt).getTime();
            if (diffMs < 30000) { 
                const remaining = Math.ceil((30000 - diffMs) / 1000);
                return reply.code(429).send({ 
                    success: false, 
                    message: `Bạn đang bình luận quá nhanh. Vui lòng đợi ${remaining} giây.` 
                });
            }
        }

        // 4. Tạo comment (Nội dung sạch)
        const comment = await Comment.create({
            userId: user.id,
            postSlug: slug,
            content: content, 
            parentId: parentId || null
        });

        const fullComment = await Comment.findByPk(comment.id, {
            include: [{ model: User, attributes: ['name', 'avatarUrl'] }]
        });

        return { success: true, comment: fullComment };
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ success: false, message: 'Không thể gửi bình luận' });
    }
}

/**
 * Xóa bình luận
 */
async function deleteComment(request, reply) {
    if (!request.isAuthenticated()) {
        return reply.code(401).send({ success: false, message: 'Vui lòng đăng nhập' });
    }

    const { id } = request.params;
    const userId = request.user.id;

    try {
        const comment = await Comment.findByPk(id);

        if (!comment) {
            return reply.code(404).send({ success: false, message: 'Bình luận không tồn tại' });
        }

        // Kiểm tra quyền sở hữu
        if (comment.userId !== userId) {
            return reply.code(403).send({ success: false, message: 'Bạn không có quyền xóa bình luận này' });
        }

        // Xóa các reply trước (nếu có) - giả lập CASCADE nếu DB chưa set
        await Comment.destroy({ where: { parentId: id } });
        
        // Xóa comment chính
        await comment.destroy();

        return { success: true, message: 'Đã xóa bình luận' };
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ success: false, message: 'Lỗi khi xóa bình luận' });
    }
}

/**
 * Recalculate helper (internal)
 */
async function syncPostMeta(slug) {
    try {
        const stats = await PostRating.findOne({
            where: { postSlug: slug },
            attributes: [
                [sequelize.fn('AVG', sequelize.col('score')), 'avgScore'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalRatings']
            ],
            raw: true
        });

        await PostMeta.upsert({
            slug: slug,
            avgRating: parseFloat(stats.avgScore || 0),
            totalRatings: parseInt(stats.totalRatings || 0)
        });
    } catch (e) {
        console.error('Failed to sync PostMeta:', e);
    }
}

module.exports = {
    getPostRating,
    ratePost,
    deleteRating,
    getComments,
    postComment,
    deleteComment,
    increaseView
};
