import mongoose from 'mongoose';

const OneClickSignInSchema = new mongoose.Schema(
    {
        username: { type: String, required: true },
        token: { type: String, required: true },
        updated: { type: Date, required: true },
    },
    { collection: 'oneClickSignIn', versionKey: false },
);

const model = mongoose.model('OneClickSignInModel', OneClickSignInSchema);

export default model;
