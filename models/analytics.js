import mongoose from 'mongoose';

const Analytics = new mongoose.Schema(
    {
        type: { type: String, required: true },
        monitoringStart: { type: Date, required: true },
        count: { type: Number, required: true },
    },
    { collection: 'analytics', versionKey: false },
);

const model = mongoose.model('AnalyticsModel', Analytics);

export default model;
