import Tokens from '#models/tokens.js';
import { TOKEN_VALIDITY } from '#lib/constants.js';

// Removes tokens created over N minutes ago
export default async function cleanUpTokens(N = TOKEN_VALIDITY) {
    await Tokens.deleteMany({ created: { $lt: new Date(Date.now() - N) } });
}
