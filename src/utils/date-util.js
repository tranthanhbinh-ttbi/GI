/**
 * Parse Vietnamese date string (e.g. "12 tháng 3, 2025") to Date object
 * @param {string} dateStr 
 * @returns {Date}
 */
function parseVietnameseDate(dateStr) {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;
    if (String(dateStr).includes('-')) return new Date(dateStr); // ISO format

    // Simple mapping
    const months = {
        'tháng 1': '01', 'tháng 2': '02', 'tháng 3': '03', 'tháng 4': '04',
        'tháng 5': '05', 'tháng 6': '06', 'tháng 7': '07', 'tháng 8': '08',
        'tháng 9': '09', 'tháng 10': '10', 'tháng 11': '11', 'tháng 12': '12'
    };

    let processedStr = dateStr.toLowerCase().replace(',', '');
    for (const [key, val] of Object.entries(months)) {
        if (processedStr.includes(key)) {
            processedStr = processedStr.replace(key, val);
            break;
        }
    }

    // Format: "12 03 2025" -> YYYY-MM-DD
    const parts = processedStr.split(' ');
    if (parts.length === 3) {
        // Assuming format "DD MM YYYY"
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return new Date(dateStr);
}

/**
 * Check if date is in range
 */
function isDateInRange(postDateInput, rangeType, customStart, customEnd) {
    const postDate = parseVietnameseDate(postDateInput);
    if (isNaN(postDate)) return false;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    postDate.setHours(0, 0, 0, 0);

    switch (rangeType) {
        case 'today':
            return postDate.getTime() === now.getTime();
        case 'week':
        case 'this_week':
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(now);
            monday.setDate(diff);
            // Comparison by time
            return postDate >= monday;
        case 'month':
        case 'this_month':
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return postDate >= firstDayOfMonth;
        case 'year':
        case 'this_year':
            const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
            return postDate >= firstDayOfYear;
        case 'custom':
            if (customStart && customEnd) {
                const start = new Date(customStart);
                const end = new Date(customEnd);
                return postDate >= start && postDate <= end;
            }
            return true;
        default:
            return true;
    }
}

module.exports = { parseVietnameseDate, isDateInRange };
