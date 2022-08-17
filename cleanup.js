import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';

import { CLEAN_UP_TOKENS_INTERVAL, CLEAN_UP_ONE_CLICK_SIGN_IN_ACCOUNTS_INTERVAL, CLEAN_UP_PORT as PORT } from '#lib/constants.js';

// Terminal colors: https://stackoverflow.com/a/41407246
console.log('\x1b[37m\x1b[44m%s\x1b[0m', '[INFO] Running in clean-up mode!')

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

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.get('/', (req, res) => res.status(200).json({ meta: { version: 'v1', time: new Date(), cleanup: true } }));

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}...`);
});

// Clean up tokens and one click sign in accounts on a regular interval
import cleanUpTokens from '#lib/cleanUpTokens.js';
import cleanUpAccounts from '#lib/cleanUpAccounts.js';
setInterval(cleanUpTokens, CLEAN_UP_TOKENS_INTERVAL);
setInterval(cleanUpAccounts, CLEAN_UP_ONE_CLICK_SIGN_IN_ACCOUNTS_INTERVAL);
