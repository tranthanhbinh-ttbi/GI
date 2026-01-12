/**
 * Bộ lọc nội dung độc hại (Strict Mode)
 * Được thiết kế để phát hiện các biến thể lách luật cơ bản
 */

// Danh sách từ khóa nhạy cảm (Gốc)
const BAD_WORDS_ROOT = [
    'dm', 'dcm', 'dit', 'du', 'lon', 'buoi', 'cac', 'cu', 'ngu', 'cho', 'di', 'pho', 'cave',
    'sex', 'fuck', 'shit', 'bitch', 'ass',
    'chich', 'xoac', 'phe', 'duma', 'vcl', 'vl', 'loz', 'cc', 'concac', 'dmm', 'clmm'
];

/**
 * Tạo Regex bắt các biến thể của từ khóa
 * Ví dụ: "d.m", "d m", "d-m", "d_m"
 */
function buildRegex(word) {
    // Chèn ký tự đặc biệt (chấm, phẩy, cách, gạch...) vào giữa các chữ cái
    const pattern = word.split('').join('[^a-z0-9]*'); 
    return new RegExp(`\\b${pattern}\\b`, 'i');
}

// Pre-build danh sách Regex để tối ưu hiệu năng
const BAD_REGEX_LIST = BAD_WORDS_ROOT.map(word => buildRegex(word));

/**
 * Chuẩn hóa chuỗi Tiếng Việt: Bỏ dấu, về chữ thường
 */
function normalizeText(text) {
    return text.toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͤ]/g, "")
        .replace(/đ/g, "d");
}

/**
 * Kiểm tra nội dung có chứa từ cấm không
 * @returns {boolean} true nếu nội dung sạch, false nếu vi phạm
 */
function isContentSafe(text) {
    if (!text) return true;
    
    // 1. Chuẩn hóa về dạng không dấu
    const normalized = normalizeText(text);
    
    // 2. Check bằng Regex nâng cao (bắt lách luật)
    for (const regex of BAD_REGEX_LIST) {
        if (regex.test(normalized)) {
            return false;
        }
    }
    
    return true;
}

module.exports = {
    isContentSafe
};