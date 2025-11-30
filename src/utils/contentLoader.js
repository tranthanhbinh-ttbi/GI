const fs = require('fs');
const path = require('path');
const fm = require('front-matter');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();
const glob = require('glob');

const getPosts = (collectionName) => {
    const postsDirectory = path.join(process.cwd(), 'src', 'content', collectionName);
    
    if (!fs.existsSync(postsDirectory)){
        return [];
    }

    const files = glob.sync(`${postsDirectory}/*.md`);
    const posts = [];

    // --- XỬ LÝ GIỜ VIỆT NAM (Quan trọng) ---
    // 1. Lấy giờ UTC hiện tại của server
    const nowUTC = new Date(); 
    // 2. Cộng thêm 7 tiếng (7 * 60 phút * 60 giây * 1000 mili giây)
    const nowVietnam = new Date(nowUTC.getTime() + (7 * 60 * 60 * 1000));
    // ----------------------------------------

    files.forEach((file) => {
        try {
            const fileContent = fs.readFileSync(file, 'utf8');
            const parsed = fm(fileContent);
            const attributes = parsed.attributes;
            const body = md.render(parsed.body);
            
            const postDate = new Date(attributes.date);

            // LOGIC HẸN GIỜ:
            // So sánh giờ bài viết với giờ Việt Nam hiện tại
            // Nếu bài viết có giờ <= giờ hiện tại -> HIỆN
            // Nếu bài viết có giờ > giờ hiện tại -> ẨN (tự động hiện khi đến giờ)
            
            if (postDate <= nowVietnam) {
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
            } else {
                // (Tùy chọn) Log ra những bài chưa đến giờ đăng để debug
                 console.log(`[SCHEDULED] Bài "${attributes.title}" sẽ đăng lúc ${postDate.toISOString()}`);
            }

        } catch (err) {
            console.error(`Lỗi đọc file ${file}:`, err);
        }
    });

    // Sắp xếp bài mới nhất lên đầu
    return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
};

module.exports = { getPosts };