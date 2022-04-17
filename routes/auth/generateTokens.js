import { AUTH_PROJECT } from '#lib/constants.js';

import Tokens from '#models/tokens.js';
import { randomKey } from '#lib/crypto.js';

export default async function generateTokens(req, res) {
    let authMethod = req.query.method || 'cloud';
    if (authMethod !== 'cloud' && authMethod !== 'comment') authMethod = 'cloud';

    let publicCode;

    if (authMethod === 'cloud') {
        let publicCodeBits = await randomKey(6);

        for (let i = 0; i < 6; i++) {
            publicCode |= publicCodeBits[i] << (i * 8);
        }

        publicCode = Math.abs(publicCode);
    } else if (authMethod === 'comment') {
        // Generate a random string and make sure it doesn't contain 10 consecutive numbers so it won't get censored by Scratch's phone number filter
        do {
            publicCode = (await randomKey(10)).toString('hex');
        } while (/\d{10}/.test(publicCode));
    } else {
        return res.status(500).json({ error: 'Could not determine auth method' });
    }

    const authData = {
        publicCode: publicCode.toString(),
        privateCode: (await randomKey(48)).toString('hex'),
        method: authMethod,
        authProject: AUTH_PROJECT.id,
    };

    await Tokens.create({ ...authData, created: new Date().toISOString() });

    res.status(200).json(authData);
}
