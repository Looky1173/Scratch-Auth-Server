import Analytics from '#models/analytics.js';
import OneClickSignIn from '#models/oneClickSignIn.js';

const TYPES = ['comment', 'cloud', 'profile-comment', 'one-click-sign-in', 'verified-comment', 'verified-cloud', 'verified-profile-comment', 'added-one-click-sign-in-accounts'];

export default async function registerAnalyticsEvent(type) {
    if (!TYPES.includes(type)) return;
    let count = await Analytics.countDocuments({ type: type }, { limit: 1 });
    if (count < 1) await Analytics.create({ type: type, monitoringStart: new Date().toISOString(), count: 0 });
    await Analytics.updateOne({ type: type }, { $inc: { count: 1 } });
}

export async function getAnalytics() {
    let data = await Analytics.find({});

    const getDataByType = (type, verified = false) => {
        let result = data.filter((obj) => {
            return obj.type === type;
        });
        result = result[0];
        if (verified === false) {
            if (type === 'one-click-sign-in' || type === 'added-one-click-sign-in-accounts') {
                return result ? { monitoringStart: result.monitoringStart, count: result.count } : null;
            } else {
                let verifiedData = getDataByType(`verified-${type}`, true);
                return result
                    ? { monitoringStart: result.monitoringStart, count: result.count, verified: verifiedData ? { monitoringStart: verifiedData.monitoringStart, count: verifiedData.count } : null }
                    : null;
            }
        } else {
            return result;
        }
    };

    let analyticsData = {
        comment: getDataByType('comment'),
        cloud: getDataByType('cloud'),
        'profile-comment': getDataByType('profile-comment'),
        'one-click-sign-in': getDataByType('one-click-sign-in'),
    };

    const countCumulativeTokens = (verified = false) => {
        const types = ['comment', 'cloud', 'profile-comment'];
        let count = 0;
        let dates = [];
        if (verified === false) {
            for (const type of types) {
                count += analyticsData[type]?.count ? analyticsData[type].count : 0;
                if (analyticsData[type]?.monitoringStart) dates.push(analyticsData[type].monitoringStart);
            }
        } else {
            for (const type of types) {
                count += analyticsData[type]?.verified?.count ? analyticsData[type].verified.count : 0;
                if (analyticsData[type]?.verified?.monitoringStart) dates.push(analyticsData[type].verified.monitoringStart);
            }
        }
        let orderedDates = dates.sort((a, b) => {
            return Date.parse(a) - Date.parse(b);
        });
        return { count: count, earliestMonitoringStart: orderedDates[0] };
    };

    analyticsData = { ...analyticsData, cumulativeTokensGenerated: countCumulativeTokens(), cumulativeTokensVerified: countCumulativeTokens(true) };

    const oneClickSignInCountByUsername = await OneClickSignIn.aggregate([
        {
            $group: {
                _id: '$username',
                count: {
                    $sum: 1,
                },
            },
        },
    ]);

    analyticsData['one-click-sign-in'] = {
        ...analyticsData['one-click-sign-in'],
        uniqueActiveAccounts: { count: oneClickSignInCountByUsername.length, retrieved: new Date().toISOString() },
        cumulativeOneClickSignInAccounts: getDataByType('added-one-click-sign-in-accounts'),
    };

    return analyticsData;
}
