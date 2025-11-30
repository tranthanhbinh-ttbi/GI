const fs = require('fs');
const path = require('path');
const fm = require('front-matter');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();
const glob = require('glob');

const getPosts = (collectionName) => {
    // Sửa lại cách lấy đường dẫn để an toàn hơn trên Vercel (dùng process.cwd())
    // Giả sử cấu trúc: root/src/content/...
    const postsDirectory = path.join(process.cwd(), 'src', 'content', collectionName);
    
    console.log(`[DEBUG] Đang tìm bài viết trong: ${postsDirectory}`); // Log để debug trên Vercel

    if (!fs.existsSync(postsDirectory)){
        console.log(`[DEBUG] Thư mục không tồn tại: ${postsDirectory}`);
        return [];
    }

    const files = glob.sync(`${postsDirectory}/*.md`);
    const posts = [];
    const now = new Date();

    console.log(`[DEBUG] Tìm thấy ${files.length} file markdown.`);

    files.forEach((file) => {
        try {
            const fileContent = fs.readFileSync(file, 'utf8');
            const parsed = fm(fileContent);
            const attributes = parsed.attributes;
            const body = md.render(parsed.body);
            
            // Xử lý ngày tháng
            const postDate = new Date(attributes.date);
            
            // Log để kiểm tra timezone
            console.log(`[DEBUG] Bài: ${attributes.title} | PostDate: ${postDate.toISOString()} | Now: ${now.toISOString()}`);

            // --- GIẢI PHÁP SỬA LỖI ---
            // Tạm thời bỏ điều kiện if (postDate <= now) hoặc chỉ cảnh báo
            // Để hiển thị mọi bài viết, kể cả bài tương lai để test
            
            posts.push({
                ...attributes,
                body: body,
                slug: path.basename(file, '.md'),
                displayDate: postDate.toLocaleDateString('vi-VN', {
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric'
                }),
                originalDate: postDate
            });
            
        } catch (err) {
            console.error(`[ERROR] Lỗi khi đọc file ${file}:`, err);
        }
    });

    // Sắp xếp bài mới nhất lên đầu
    return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
};

module.exports = { getPosts };