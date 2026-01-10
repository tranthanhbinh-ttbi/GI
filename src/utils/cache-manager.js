const { LRUCache } = require('lru-cache');

const Options = {
    users: {
        max: 10000,
        ttl: 1000 * 60 * 30,
        updateAgeOnGet: true
    },
    contents: {
        max: 2000,
        ttl: 1000 * 60 * 10
    },
    statsSub: {
        max: 100,
        ttl: 15000
    }
};

const userCache = new LRUCache(Options.users);
const contentCache = new LRUCache(Options.contents);
const statsSubCache = new LRUCache(Options.statsSub);

module.exports = {
    userCache,
    contentCache,
    statsSubCache
};