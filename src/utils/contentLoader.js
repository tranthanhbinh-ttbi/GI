const fs = require('fs').promises;
const path = require('path');
const fm = require('front-matter');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt({html: true});
const { glob } = require('glob'); // glob v10+ returns promise if signal not passed, or use glob package correctly. Check version.
// package.json says "glob": "^13.0.0" -> Sync API requires specific import or use async glob method.
// Actually glob 13 exports { glob }.

const { LRUCache } = require('lru-cache');

// Initialize Cache (Max 100 items, 5 minutes TTL)
const postCache = new LRUCache({
    max: 100,
    ttl: 1000 * 60 * 5,
});

/**
 * Helper to get Vietnam Time
 */
function getVietnamTime() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
}

/**
 * Async Get Posts with Caching
 * @param {string} collectionName - 'series' or 'news'
 */
const getPosts = async (collectionName) => {
    const cacheKey = `posts-${collectionName}`;
    if (postCache.has(cacheKey)) {
        return postCache.get(cacheKey);
    }

    const postsDirectory = path.join(process.cwd(), 'src', 'content', collectionName);

    // Check dir exists
    try {
        await fs.access(postsDirectory);
    } catch {
        return [];
    }

    // Async Glob
    // glob v13: const files = await glob(`${postsDirectory}/*.md`);
    const files = await glob(`${postsDirectory.replace(/\\/g, '/')}/*.md`);

    const posts = [];
    const nowVietnam = getVietnamTime();

    // Read files concurrently
    await Promise.all(files.map(async (file) => {
        try {
            const fileContent = await fs.readFile(file, 'utf8');
            const parsed = fm(fileContent);
            const attributes = parsed.attributes;
            // Only render Markdown if needed for list? Usually list only needs excerpt. 
            // But current logic renders body. We keep it for consistency.
            const body = md.render(parsed.body || '');

            const postDate = new Date(attributes.date);

            // Logic: Compare with Vietnam Time
            // If postDate <= now -> Show
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
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`[SCHEDULED] "${attributes.title}" @ ${postDate.toISOString()}`);
                }
            }
        } catch (err) {
            console.error(`Error reading file ${file}:`, err);
        }
    }));

    // Sort: Newest first
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Save to Cache
    postCache.set(cacheKey, posts);

    return posts;
};

module.exports = { getPosts };