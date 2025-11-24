const SAMPLES = Object.freeze([
  { id: 'n1', title: 'Tin tức công nghệ mới nhất', page: 'tin-tuc', popularity: 98, type: 'news', topic: 'tech', status: 'published', date: '2025-10-01' },
  { id: 's1', title: 'Series học JavaScript nâng cao', page: 'series', popularity: 91, type: 'series', topic: 'javascript', status: 'published', date: '2025-09-20' },
  { id: 'k1', title: 'Khám phá AI và máy học', page: 'kham-pha', popularity: 87, type: 'explore', topic: 'ai', status: 'published', date: '2025-09-15' },
  { id: 'e1', title: 'Sự kiện lập trình tháng 11', page: 'su-kien', popularity: 76, type: 'event', topic: 'community', status: 'scheduled', date: '2025-11-05' },
])

async function SearchRoutes(fastify) {
  fastify.get('/api/search/suggest', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', maxLength: 120 },
          page: { type: 'string' },
          type: { type: 'string' },
          topic: { type: 'string' },
          status: { type: 'string' },
          sort: { type: 'string', enum: ['newest', 'oldest', 'popular'] },
          from: { type: 'string' },
          to: { type: 'string' },
        },
        required: ['q'],
      },
    },
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async (request) => {
    const { q, page, type, topic, status, sort, from, to } = request.query
    const qn = q.trim().toLowerCase()
    let results = SAMPLES.filter((s) => s.title.toLowerCase().includes(qn))
    if (page) results = results.filter((s) => s.page === page)
    if (type) results = results.filter((s) => s.type === type)
    if (topic) results = results.filter((s) => s.topic === topic)
    if (status) results = results.filter((s) => s.status === status)
    if (from) results = results.filter((s) => s.date >= from)
    if (to) results = results.filter((s) => s.date <= to)
    if (sort === 'newest') results = results.sort((a, b) => b.date.localeCompare(a.date))
    if (sort === 'oldest') results = results.sort((a, b) => a.date.localeCompare(b.date))
    if (sort === 'popular') results = results.sort((a, b) => b.popularity - a.popularity)
    return { suggestions: results.slice(0, 8) }
  })
}

module.exports = SearchRoutes


