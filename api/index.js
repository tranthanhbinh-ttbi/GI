require('pg');
require('pg-hstore');

const app = require('../server.js');

module.exports = async (req, res) => {
    // Ensure services (DB, Search) are initialized before handling request
    if (!app.isServicesInitialized && app.initServices) {
        await app.initServices();
        app.isServicesInitialized = true;
    }

    await app.ready();
    app.server.emit('request', req, res);
};