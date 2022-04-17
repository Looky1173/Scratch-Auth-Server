import crypto from 'crypto';

export const randomKey = async (length) => {
    const buffer = await crypto.randomBytes(length);
    return buffer;
};

export const getUUID = () => {
    return crypto.randomUUID();
};
