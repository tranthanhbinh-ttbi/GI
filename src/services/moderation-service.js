const { isContentSafe } = require('../utils/content-filter');

/**
 * Moderation Service
 * Kết hợp bộ lọc từ khóa nội bộ và OpenAI Moderation API
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Gọi OpenAI Moderation API
 * @param {string} input - Nội dung cần kiểm tra
 * @returns {Promise<boolean>} - true nếu an toàn, false nếu vi phạm
 */
async function checkOpenAI(input) {
    if (!OPENAI_API_KEY) {
        // Nếu không có key, bỏ qua bước này (hoặc log warning)
        console.warn('OPENAI_API_KEY not found. Skipping AI moderation.');
        return true;
    }

    try {
        const response = await fetch('https://api.openai.com/v1/moderations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({ input })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            console.error('OpenAI Moderation API Error:', data.error || response.statusText);
            // Nếu lỗi do Key hoặc Quota, nên return true để không chặn user (Fail-open)
            // Tuy nhiên, nếu user muốn debug, họ cần thấy log này.
            return true;
        }

        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            // result.flagged = true nếu vi phạm bất kỳ category nào
            return !result.flagged;
        }
        
        return true;
    } catch (error) {
        console.error('OpenAI Moderation API failed:', error);
        // Fallback: coi như an toàn để không chặn user oan nếu server lỗi, 
        // hoặc return false nếu muốn strict (tùy policy, ở đây chọn fail-open cho UX)
        return true;
    }
}

/**
 * Kiểm duyệt nội dung toàn diện
 * @param {string} text 
 * @returns {Promise<{ isSafe: boolean, reason: string }>}
 */
async function moderateContent(text) {
    // 1. Kiểm tra nhanh bằng bộ lọc từ khóa (Local Regex)
    // Tiết kiệm chi phí API và bắt các lỗi cơ bản
    if (!isContentSafe(text)) {
        return { isSafe: false, reason: 'Nội dung chứa từ ngữ không phù hợp (Local Filter).' };
    }

    // 2. Kiểm tra sâu bằng AI (Context, hate speech, harassment...)
    const aiSafe = await checkOpenAI(text);
    if (!aiSafe) {
        return { isSafe: false, reason: 'Nội dung vi phạm tiêu chuẩn cộng đồng (AI Detected).' };
    }

    return { isSafe: true, reason: null };
}

module.exports = {
    moderateContent
};
