import mongoose from 'mongoose';

const TokensSchema = new mongoose.Schema(
    {
        username: { type: String, required: false },
        publicCode: { type: String, required: false },
        privateCode: { type: String, required: true },
        redirectLocation: { type: String, required: true },
        method: { type: String, enum: ['cloud', 'comment'], required: false },
        type: { type: String, enum: ['normal', 'instant'], default: 'normal', required: true },
        created: { type: Date, required: true },
    },
    { collection: 'tokens', versionKey: false },
);

TokensSchema.index('privateCode', { unique: true });

const model = mongoose.model('TokensModel', TokensSchema);

export default model;
