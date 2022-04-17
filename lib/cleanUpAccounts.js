import OneClickSignIn from '#models/oneClickSignIn.js';
import { ONE_CLICK_SIGN_IN_ACCOUNT_VALIDITY } from '#lib/constants.js';

// Removes one click signed in accounts that were not used to signed in for more than a time of N
export default async function cleanUpTokens(N = ONE_CLICK_SIGN_IN_ACCOUNT_VALIDITY) {
    await OneClickSignIn.deleteMany({ updated: { $lt: new Date(Date.now() - N) } });
}
