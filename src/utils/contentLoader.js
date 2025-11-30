const fs = require('fs');
const path = require('path');
const fm = require('front-matter');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();
const glob = require('glob');

const getPosts = (collectionName) => {
    // SỬA ĐỔI QUAN TRỌNG: Dùng process.cwd() để lấy đúng đường dẫn gốc trên Vercel
    const postsDirectory = path.join(process.cwd(), 'src', 'content', collectionName);
    
    console.log('Đang đọc file từ:', postsDirectory); // Log để debug trên Vercel

    if (!fs.existsSync(postsDirectory)){
        console.log(`Thư mục không tồn tại: ${postsDirectory}`);
        return [];
    }

    // Dùng path.join để glob hoạt động đúng trên mọi hệ điều hành
    const pattern = path.join(postsDirectory, '*.md');
    const files = glob.sync(pattern);
    
    const posts = [];
    const now = new Date();

    files.forEach((file) => {
        const fileContent = fs.readFileSync(file, 'utf8');
        const parsed = fm(fileContent);
        const attributes = parsed.attributes;
        const body = md.render(parsed.body);
        
        const postDate = new Date(attributes.date);

        // Tạm thời bỏ qua check ngày tháng để đảm bảo bài viết hiện lên
        if (postDate <= now) {
            posts.push({
                ...attributes,
                body: body,
                slug: path.basename(file, '.md'),
                date: postDate.toLocaleDateString('vi-VN'),
                // Thêm thuộc tính gốc để sort
                originalDate: postDate 
            });
        }
    });

    // Sắp xếp bài mới nhất lên đầu
    return posts.sort((a, b) => b.originalDate - a.originalDate);
};

module.exports = { getPosts };