import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';

import { PORT } from '#lib/constants.js';

// Connect to MongoDB
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB!');
    })
    .catch((error) => {
        console.log(`Failed to connect to MongoDB! Error: ${error}`);
    });

const app = express();

app.use(express.json());

const asyncMiddleware = function (fn) {
    return function (req, res) {
        Promise.resolve(fn(req, res)).catch((e) => {
            console.log(`Error on ${req.originalUrl}: ${e.toString()}`);
            res.json({
                msg: 'The server has encountered an unhandled exception and could not process your request. Try again later, or contact @Looky1173 on Scratch.',
                error: e.toString(),
                url: req.originalUrl,
            });
        });
    };
};

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

import generateTokens from '#routes/auth/generateTokens.js';
app.use('/auth/getTokens', asyncMiddleware(generateTokens));

import verifyToken from '#routes/auth/verifyToken.js';
app.use('/auth/verifyToken/:privateCode', asyncMiddleware(verifyToken));

import oneClickSignIn from '#routes/auth/oneClickSignIn.js';
app.use('/auth/oneClickSignIn/:username?', asyncMiddleware(oneClickSignIn));

import analytics from '#routes/auth/analytics.js';
app.use('/analytics', asyncMiddleware(analytics));

app.get('/', (req, res) => res.status(200).json({ meta: { version: 'v1', time: new Date(), cleanup: false } }));

app.get(
    '/testError',
    asyncMiddleware(async function route(req, res) {
        throw 'Error testing';
    }),
);

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}...`);
});
