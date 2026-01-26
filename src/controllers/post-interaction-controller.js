const { PostRating, Comment, CommentReport, User, PostMeta, Notification, UserNotification, ViolationLog, PostViewLog, sequelize } = require('../models');
const { Op } = require('sequelize');
const { quickCheck, submitForAnalysis } = require('../services/moderation-service');

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
    
    // Safety check for auth
    const isAuthenticated = request.isAuthenticated && request.isAuthenticated();
    const userId = (isAuthenticated && request.user) ? request.user.id : null;

    try {
        const whereClause = {
            postSlug: slug,
            parentId: null
        };

        const replyWhere = {};

        if (userId) {
            // Logged in: Show approved OR (pending/flagged AND mine)
            const visibilityCondition = {
                [Op.or]: [
                    { status: 'approved' },
                    {
                        [Op.and]: [
                            { status: { [Op.in]: ['pending', 'flagged'] } },
                            { userId: userId }
                        ]
                    }
                ]
            };

            // Merge into whereClause (using Object.assign to handle Symbols if needed, though direct assignment is better)
            Object.assign(whereClause, visibilityCondition);
            Object.assign(replyWhere, visibilityCondition);
        } else {
            // Guest: Show approved only
            whereClause.status = 'approved';
            replyWhere.status = 'approved';
        }

        const comments = await Comment.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    attributes: ['name', 'avatarUrl']
                },
                {
                    model: Comment,
                    as: 'replies',
                    where: replyWhere,
                    required: false,
                    include: [{ model: User, attributes: ['name', 'avatarUrl'] }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return { success: true, comments };
    } catch (error) {
        console.error('getComments Error:', error); // Fallback logging
        if (request.log) request.log.error(error);
        
        // Return detailed error for debugging
        return reply.code(500).send({ 
            success: false, 
            message: 'Internal Server Error', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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

    // 2. Kiểm duyệt nhanh (Local Regex - Synchronous)
    // Nếu vi phạm từ cấm cứng -> Chặn ngay lập tức
    const { isSafe, reason } = quickCheck(content);

    if (!isSafe) {
        // A. Lưu bằng chứng vi phạm (Violation Log)
        await ViolationLog.create({
            userId: user.id,
            postSlug: slug,
            content: content,
            reason: reason
        });

        // B. Tăng số lần vi phạm & Xử lý Ban
        const newCount = (user.violationCount || 0) + 1;
        
        if (newCount > 3) {
            await user.update({ violationCount: newCount, isBanned: true });
            await sendUserNotification(
                user.id,
                'Tài khoản bị khóa',
                'Bạn đã vi phạm tiêu chuẩn cộng đồng quá 3 lần.',
                'warning'
            );
            return reply.code(403).send({ success: false, message: 'Nội dung chứa từ ngữ cấm! Tài khoản đã bị khóa.' });
        } else {
            await user.update({ violationCount: newCount });
            await sendUserNotification(
                user.id,
                'Cảnh báo vi phạm',
                `Nội dung chứa từ ngữ cấm (${reason}). Vi phạm ${newCount}/3.`,
                'warning'
            );
            return reply.code(400).send({ 
                success: false, 
                message: `Phát hiện nội dung đáng ngờ (${reason}). Bình luận này sẽ không được hiển thị.` 
            });
        }
    }

    // 3. Chống Spam: Rate Limiting (30s)
    try {
        const lastComment = await Comment.findOne({
            where: { userId: user.id },
            order: [['createdAt', 'DESC']]
        });

        if (lastComment) {
            const diffMs = Date.now() - new Date(lastComment.createdAt).getTime();
            // GIẢM XUỐNG 3s ĐỂ TEST
            if (diffMs < 3000) { 
                const remaining = Math.ceil((3000 - diffMs) / 1000);
                return reply.code(429).send({ 
                    success: false, 
                    message: `Bạn bình luận quá nhanh. Vui lòng đợi ${remaining} giây.` 
                });
            }
        }

        // 4. Tạo comment (Status: Pending)
        // Optimistic: Coi như OK, nhưng hệ thống sẽ check ngầm
        const comment = await Comment.create({
            userId: user.id,
            postSlug: slug,
            content: content, 
            parentId: parentId || null,
            status: 'pending' // Chờ AI check
        });

        // 5. Gửi sang Worker để check AI (Fire & Forget)
        submitForAnalysis(comment);

        const fullComment = await Comment.findByPk(comment.id, {
            include: [{ model: User, attributes: ['name', 'avatarUrl'] }]
        });

        return { success: true, comment: fullComment, message: 'Bình luận đang được kiểm tra an toàn.' };
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

/**
 * Báo cáo bình luận xấu
 */
async function reportComment(request, reply) {
    if (!request.isAuthenticated()) {
        return reply.code(401).send({ success: false, message: 'Vui lòng đăng nhập' });
    }

    const { commentId, reason } = request.body;
    const userId = request.user.id;

    if (!reason) {
        return reply.code(400).send({ success: false, message: 'Vui lòng cung cấp lý do báo cáo' });
    }

    try {
        await CommentReport.create({
            commentId,
            reporterId: userId,
            reason,
            status: 'pending'
        });

        return { success: true, message: 'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét.' };
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ success: false, message: 'Lỗi khi gửi báo cáo' });
    }
}

module.exports = {
    getPostRating,
    ratePost,
    deleteRating,
    getComments,
    postComment,
    deleteComment,
    reportComment,
    increaseView
};
