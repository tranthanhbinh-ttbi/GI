const crypto = require('node:crypto')

fastify.get('/auth', async (request, reply) => {
    const { provider } = request.query;
    if (provider === 'github') {
        const client_id = process.env.OAUTH_CLIENT_ID;
        const redirect_uri = `https://${request.hostname}/callback`;
        const scope = 'repo,user';
        const state = crypto.randomUUID();

        const authorizationUri = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}&state=${state}`;

        return reply.redirect(authorizationUri);
    }
    return reply.code(400).send('Unsupported provider');
});

fastify.get('/callback', async (request, reply) => {
    const { code } = request.query;

    if (!code) {
        return reply.code(400).send('Missing code');
    }

    try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: process.env.OAUTH_CLIENT_ID,
                client_secret: process.env.OAUTH_CLIENT_SECRET,
                code: code,
                redirect_uri: `https://${request.hostname}/callback`
            })
        });

        const data = await response.json();
        const token = data.access_token;

        const script = `
        <script>
            (function() {
            function receiveMessage(e) {
                window.opener.postMessage(
                'authorization:github:success:{"token":"${token}","provider":"github"}', 
                e.origin
                );
            }
            window.addEventListener("message", receiveMessage, false);
            window.opener.postMessage("authorizing:github", "*");
            })()
        </script>
        `;

        reply.type('text/html').send(script);

    } catch (error) {
        console.error('GitHub Auth Error:', error);
        return reply.code(500).send('Authentication failed');
    }
});