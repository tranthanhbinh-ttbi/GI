const { LRUCache } = require('lru-cache');

const cacheOptions = {
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

const userCache = new LRUCache(cacheOptions.user);
const contentCache = new LRUCache(cacheOptions.content);

module.exports = {
    userCache,
    contentCache
};