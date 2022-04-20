import queue from '#lib/queue.js';

import Tokens from '#models/tokens.js';
import OneClickSignIn from '#models/oneClickSignIn.js';
import { randomKey, getUUID } from '#lib/crypto.js';

function getOneClickSignInTokenAndAddAccount(authorization, username, redirect) {
    return new Promise(async (resolve, reject) => {
        let token = await OneClickSignIn.findOne({ token: authorization });

        if (token === null) {
            token = getUUID();
            await OneClickSignIn.create({ username: username, token: token, updated: new Date().toISOString() });
        } else if (!((await OneClickSignIn.countDocuments({ username: username })) > 0)) {
            token = authorization;
            await OneClickSignIn.create({ username: username, token: authorization, updated: new Date().toISOString() });
        } else {
            token = authorization;
            await OneClickSignIn.updateOne({ username: username, token: authorization }, { updated: new Date().toISOString() });
        }

        let instantPrivateCode = (await randomKey(64)).toString('hex');
        Tokens.create({ username: username, privateCode: instantPrivateCode, type: 'instant', redirectLocation: Buffer.from(redirect, 'base64').toString('utf-8'), created: new Date().toISOString() });

        resolve({ token: token, instantPrivateCode: instantPrivateCode });
    });
}

export default async function verifyToken(req, res) {
    let redirect = null;
    if (Boolean(req.query.oneClickSignIn) === true) {
        if (!req.query.redirect) return res.status(400).json({ error: 'Missing redirect location' });
        redirect = req.query.redirect;
    }

    let response = {
        valid: false,
        username: null,
        redirect: null,
    };
    const auth = await Tokens.findOne({ privateCode: req.params.privateCode });

    if (auth === null) return res.status(403).json(response);

    await Tokens.deleteOne({ privateCode: req.params.privateCode });

    if (auth.type === 'instant') {
        response = {
            valid: true,
            username: auth.username,
            type: 'instant',
            redirect: auth.redirectLocation,
        };
        return res.status(200).json(response);
    }

    if (auth.method === 'cloud') {
        queue.add(queue.TYPES.CloudDataVerification).then(async (data) => {
            data = data.reverse();
            for (let cloudItem of data) {
                if (cloudItem.value == auth.publicCode) {
                    response = {
                        valid: true,
                        username: cloudItem.user,
                        redirect: auth.redirectLocation,
                    };
                    if (Boolean(req.query.oneClickSignIn) === true) {
                        let oneClickSignIn = await getOneClickSignInTokenAndAddAccount(req.headers?.authorization, response.username, redirect);
                        response['oneClickSignInToken'] = oneClickSignIn.token;
                        response['instantPrivateCode'] = oneClickSignIn.instantPrivateCode;
                    }
                    return res.status(200).json(response);
                }
            }
            return res.status(403).json(response);
        });
    } else if (auth.method === 'comment') {
        queue.add(queue.TYPES.CommentVerification).then(async (data) => {
            data = data.reverse();
            for (let comment of data) {
                if (comment.content == auth.publicCode) {
                    response = {
                        valid: true,
                        username: comment.author.username,
                        redirect: auth.redirectLocation,
                    };
                    if (Boolean(req.query.oneClickSignIn) === true) {
                        let oneClickSignIn = await getOneClickSignInTokenAndAddAccount(req.headers?.authorization, response.username, redirect);
                        response['oneClickSignInToken'] = oneClickSignIn.token;
                        response['instantPrivateCode'] = oneClickSignIn.instantPrivateCode;
                    }
                    return res.status(200).json(response);
                }
            }
            return res.status(403).json(response);
        });
    } else {
        res.status(500).json({ error: 'Got invalid auth method from database' });
    }
}
