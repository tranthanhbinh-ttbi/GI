require('dotenv').config();
const nodemailer = require('nodemailer')
const { google } = require('googleapis');

function sanitizeInput(str) {
	if (!str || typeof str !== 'string') return ''
	// Remove CRLF to mitigate header injection and trim whitespace
	return str.replace(/[\r\n]+/g, ' ').trim().slice(0, 5000)
}

async function createTransporter() {
	const oAuth2Client = new google.auth.OAuth2(
		process.env.GMAIL_CLIENT_ID,
		process.env.GMAIL_CLIENT_SECRET,
		process.env.GMAIL_REDIRECT_URI
	);

	oAuth2Client.setCredentials({
		refresh_token: process.env.GMAIL_REFRESH_TOKEN
	});

	return nodemailer.createTransport({
		service: 'gmail',
		auth: {
			type: 'OAuth2',
			user: process.env.GMAIL_USER,
			clientId: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			refreshToken: process.env.GMAIL_REFRESH_TOKEN,
		}
	});
}

async function MailRoutes(fastify) {
	const transporterPromise = createTransporter()

	const preHandlers = []
	if (process.env.NODE_ENV !== 'development') {
		preHandlers.push(fastify.csrfProtection)
	}

	fastify.post('/api/mail', {
		schema: {
			body: {
				type: 'object',
				required: ['email', 'message'],
				properties: {
					email: { type: 'string', format: 'email', maxLength: 254 },
					message: { type: 'string', maxLength: 5000 },
				},
			},
		},
		config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
		// preHandler: [fastify.csrfProtection],
		preHandler: preHandlers,
	}, async (request, reply) => {
		try {
			const { email, message } = request.body || {}
			const safeEmail = sanitizeInput(email)
			const safeMessage = sanitizeInput(message)

			// Recipient fixed per requirement
			const toAddress = 'tranbinh081007@gmail.com'
			const fromAddress = process.env.MAIL_FROM

			const transporter = await transporterPromise
			await transporter.sendMail({
				from: fromAddress,
				to: toAddress,
				subject: `Phản hồi từ mail - ${safeEmail}`,
				text: safeMessage,
				html: `<p>${safeMessage.replace(/</g, '&lt;')}</p>`
			})
			return reply.send({ ok: true })
		} catch (err) {
			fastify.log?.error?.(err)
			return reply.code(500).send({ ok: false })
		}
	})
}

module.exports = MailRoutes