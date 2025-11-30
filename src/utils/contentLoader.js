const fs = require('fs');
const path = require('path');
const fm = require('front-matter');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();
const glob = require('glob');

const getPosts = (collectionName) => {
    // Đường dẫn trỏ vào src/content/...
    const postsDirectory = path.join(__dirname, `../content/${collectionName}`);
    
    if (!fs.existsSync(postsDirectory)){
        console.log(`Creating directory: ${postsDirectory}`);
        fs.mkdirSync(postsDirectory, { recursive: true });
        return [];
    }

    const files = glob.sync(`${postsDirectory}/*.md`);
    const posts = [];
    const now = new Date();

    files.forEach((file) => {
        const fileContent = fs.readFileSync(file, 'utf8');
        const parsed = fm(fileContent);
        const attributes = parsed.attributes;
        const body = md.render(parsed.body);
        
        const postDate = new Date(attributes.date);

        // Logic hẹn giờ: Chỉ hiện bài nếu ngày đăng nhỏ hơn hoặc bằng hiện tại
        // Muốn test bài tương lai thì tạm thời comment dòng if bên dưới lại
        if (postDate <= now) {
            posts.push({
                ...attributes,
                body: body,
                slug: path.basename(file, '.md'), // Lấy slug từ tên file
                displayDate: postDate.toLocaleDateString('vi-VN', {
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric'
                }), // Kết quả: "30 tháng 11, 2025"

                // Giữ biến date gốc hoặc biến phụ để dùng cho việc sắp xếp (Sort)
                originalDate: postDate
            });
        }
    });

    // Sắp xếp bài mới nhất lên đầu
    return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
};

module.exports = { getPosts };