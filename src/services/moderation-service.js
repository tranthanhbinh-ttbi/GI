const { Worker } = require('worker_threads');
const path = require('path');
const { Comment, User, ViolationLog, Notification, UserNotification, sequelize } = require('../models');
const { isContentSafe } = require('../utils/content-filter');

// === WORKER SETUP ===
const workerPath = path.resolve(__dirname, '../workers/toxicity-worker.js');
let worker = null;

function initWorker() {
    if (worker) return;

    worker = new Worker(workerPath);

    worker.on('message', async (result) => {
        // result: { success, id, toxicityScore, isToxic, label, error }
        if (!result.success) {
            console.error(`[ModerationService] Worker failed for comment ${result.id}:`, result.error);
            return;
        }

        try {
            await handleAnalysisResult(result);
        } catch (err) {
            console.error(`[ModerationService] Error handling result for comment ${result.id}:`, err);
        }
    });

    worker.on('error', (err) => {
        console.error('[ModerationService] Worker error:', err);
        // Restart worker on crash?
        setTimeout(() => {
            worker = null;
            initWorker();
        }, 5000);
    });

    worker.on('exit', (code) => {
        if (code !== 0) console.error(`[ModerationService] Worker stopped with exit code ${code}`);
    });
    
    console.log('[ModerationService] Toxicity Worker initialized.');
}

// === LOGIC XỬ LÝ KẾT QUẢ ===
async function handleAnalysisResult({ id, toxicityScore, isToxic, label }) {
    const comment = await Comment.findByPk(id);
    if (!comment) return;

    // Update score regardless
    comment.toxicityScore = toxicityScore;
    
    if (isToxic) {
        // === TOXIC LOGIC (UPDATED) ===
        // 1. Chỉ đánh dấu là cần xem xét (Flagged)
        comment.status = 'flagged'; 
        await comment.save();

        // 2. Ghi log để Admin tham khảo lý do AI bắt lỗi
        const user = await User.findByPk(comment.userId);
        if (user) {
            await ViolationLog.create({
                userId: user.id,
                postSlug: comment.postSlug,
                content: comment.content,
                reason: `AI Suspicion: ${label} (Score: ${toxicityScore.toFixed(2)}) - Waiting for Admin Decision`
            });
            
            // 3. (Optional) Gửi thông báo cho user biết comment đang bị giữ lại để duyệt
            // Không tăng count, không ban ở đây.
        }
    } else {
        // === CLEAN LOGIC ===
        // Nếu comment đang pending, chuyển sang approved
        if (comment.status === 'pending') {
            comment.status = 'approved';
            await comment.save();
        }
    }
}

async function sendNotification(userId, title, message, type) {
    try {
        const noti = await Notification.create({ title, message, type, isGlobal: false });
        await UserNotification.create({ userId, notificationId: noti.id, isRead: false });
    } catch (e) {
        console.error('Notify Error:', e);
    }
}

// === PUBLIC METHODS ===

// Initialize worker on module load (or call explicitly in server.js)
initWorker();

/**
 * Kiểm tra nhanh bằng Regex (Synchronous)
 * @returns { isSafe, reason }
 */
function quickCheck(text) {
    if (!isContentSafe(text)) {
        return { isSafe: false, reason: 'Nội dung chứa từ ngữ cấm (Local Filter).' };
    }
    return { isSafe: true };
}

/**
 * Gửi comment vào hàng đợi xử lý AI (Asynchronous)
 */
function submitForAnalysis(comment) {
    if (!worker) initWorker();
    
    // Gửi message sang worker
    worker.postMessage({
        id: comment.id,
        content: comment.content
    });
}

module.exports = {
    quickCheck,
    submitForAnalysis
};