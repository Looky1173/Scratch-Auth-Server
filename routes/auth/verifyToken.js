import queue from '#lib/queue.js';

import Tokens from '#models/tokens.js';
import OneClickSignIn from '#models/oneClickSignIn.js';
import { randomKey, getUUID } from '#lib/crypto.js';

function getOneClickSignInTokenAndAddAccount(authorization, username) {
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
        Tokens.create({ username: username, privateCode: instantPrivateCode, type: 'instant', created: new Date().toISOString() });

        resolve({ token: token, instantPrivateCode: instantPrivateCode });
    });
}

export default async function verifyToken(req, res) {
    let response = {
        valid: false,
        username: null,
    };
    const auth = await Tokens.findOne({ privateCode: req.params.privateCode });

    if (auth === null) return res.status(403).json(response);

    await Tokens.deleteOne({ privateCode: req.params.privateCode });

    if (auth.type === 'instant') {
        response = {
            valid: true,
            username: auth.username,
            type: 'instant',
        };
        return res.status(200).json(response);
    }

    if (auth.method === 'cloud') {
        queue.add(queue.TYPES.CloudDataVerification).then(async (data) => {
            for (let cloudItem of data) {
                if (cloudItem.value == auth.publicCode) {
                    response = {
                        valid: true,
                        username: cloudItem.user,
                    };
                    if (Boolean(req.query.oneClickSignIn) === true) {
                        let oneClickSignIn = await getOneClickSignInTokenAndAddAccount(req.headers?.authorization, response.username);
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
            for (let comment of data) {
                if (comment.content == auth.publicCode) {
                    response = {
                        valid: true,
                        username: comment.author.username,
                    };
                    if (Boolean(req.query.oneClickSignIn) === true) {
                        let oneClickSignIn = await getOneClickSignInTokenAndAddAccount(req.headers?.authorization, response.username);
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
