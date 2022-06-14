import Tokens from '#models/tokens.js';
import OneClickSignIn from '#models/oneClickSignIn.js';
import { ONE_CLICK_SIGN_IN_ACCOUNT_VALIDITY } from '#lib/constants.js';
import { randomKey } from '#lib/crypto.js';
import registerAnalyticsEvent from '#lib/analytics.js';

export default async function oneClickSignIn(req, res) {
    const method = req.method;

    if (method === 'GET') {
        // Return a list of accounts (with a token matching the authorization header) that can be used for one click sign in
        let list = (await OneClickSignIn.find({ token: req.headers.authorization }).sort({ updated: -1 })) || {};
        return res.status(200).json(list);
    }
    if (method === 'POST') {
        if (!req.query.redirect) return res.status(400).json({ error: 'Missing redirect location' });

        // Generate an instant sign in code for one click sign in

        // Verify that the given account can be used for one click sign in
        let account = await OneClickSignIn.findOne({ username: req.params.username, token: req.headers.authorization });
        if (account === null) return res.status(403).json({ error: 'There is no one click sign in account with the given authorization token' });

        // Verify that the given account was renewed no more than 30 days ago
        if (new Date(account.updated) < new Date(Date.now() - ONE_CLICK_SIGN_IN_ACCOUNT_VALIDITY)) return res.status(403).json({ error: 'The requested one click sign in account has expired' });

        // Generate an instant sign in code
        let instantPrivateCode = (await randomKey(64)).toString('hex');
        await Tokens.create({
            username: account.username,
            privateCode: instantPrivateCode,
            type: 'instant',
            redirectLocation: Buffer.from(req.query.redirect, 'base64').toString('utf-8'),
            created: new Date().toISOString(),
        });

        // Update the token expiry date
        await OneClickSignIn.updateOne({ username: account.username, token: req.headers.authorization }, { updated: new Date().toISOString() });

        res.status(200).json({ instantPrivateCode: instantPrivateCode });
        
        return await registerAnalyticsEvent('one-click-sign-in');
    }
    if (method === 'DELETE') {
        // Remove all or a specified account from the one click sign in database with a given authorization token

        if (!req.params.username) {
            // Remove all accounts from the one click sign in database with a given authorization token, as no specific account was defined
            await OneClickSignIn.deleteMany({ token: req.headers.authorization });
        } else {
            // Remove a specified account
            await OneClickSignIn.deleteOne({ username: req.params.username, token: req.headers.authorization });
        }

        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Invalid request method' });
}
