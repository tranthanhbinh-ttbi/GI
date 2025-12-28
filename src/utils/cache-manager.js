const { LRUCache } = require('lru-cache');

const Options = {
    user: {
        max: 10000,
        ttl: 1000 * 60 * 30,
        updateAgeOnGet: true
    },
    content: {
        max: 2000,
        ttl: 1000 * 60 * 10
    }
};

const userCache = new LRUCache(Options.user);
const contentCache = new LRUCache(Options.content);

module.exports = {
    userCache,
    contentCache
};