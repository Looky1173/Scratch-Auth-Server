import { getAnalytics } from '#lib/analytics.js';

export default async function analytics(req, res) {
    const method = req.method;

    if (method === 'GET') {
        // Return analytics data
        let data = await getAnalytics();
        return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Invalid request method' });
}
