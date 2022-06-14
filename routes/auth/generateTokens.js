import { AUTH_PROJECT } from '#lib/constants.js';
import registerAnalyticsEvent from '#lib/analytics.js';
import { randomKey } from '#lib/crypto.js';
import Tokens from '#models/tokens.js';

export default async function generateTokens(req, res) {
    if (!req.query.redirect) return res.status(400).json({ error: 'Missing redirect location' });

    let authMethod = req.query.method || 'cloud';
    if (authMethod !== 'cloud' && authMethod !== 'comment' && authMethod !== 'profile-comment') authMethod = 'cloud';

    let publicCode;

    if (authMethod === 'cloud') {
        let publicCodeBits = await randomKey(6);

        for (let i = 0; i < 6; i++) {
            publicCode |= publicCodeBits[i] << (i * 8);
        }

        publicCode = Math.abs(publicCode);
    } else if (authMethod === 'comment' || authMethod === 'profile-comment') {
        // Generate a random string and make sure it doesn't contain 10 consecutive numbers so it won't get censored by Scratch's phone number filter
        do {
            publicCode = (await randomKey(10)).toString('hex');
        } while (/\d{10}/.test(publicCode));
    } else {
        return res.status(500).json({ error: 'Could not determine auth method' });
    }

    if (authMethod === 'profile-comment' && !req.query.username) return res.status(400).json({ error: 'Missing username for profile-comment authentication' });

    let authData = {
        publicCode: publicCode.toString(),
        privateCode: (await randomKey(48)).toString('hex'),
        redirectLocation: Buffer.from(req.query.redirect, 'base64').toString('utf-8'),
        method: authMethod,
    };

    if (authMethod === 'profile-comment') {
        authData = { ...authData, username: req.query.username };
    } else {
        authData = { ...authData, authProject: AUTH_PROJECT.id };
    }

    await Tokens.create({ ...authData, created: new Date().toISOString() });

    res.status(200).json(authData);

    await registerAnalyticsEvent(authMethod);
}
