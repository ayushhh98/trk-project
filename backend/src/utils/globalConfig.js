const systemConfig = {
    minDepositTier1: 10,
    minDepositTier2: 100,
    referralPercentages: [5, 4, 3, 2, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, 0.1, 0.1, 0.1, 0.1],
    cashbackPercent: 1.5,
    cashbackCaps: {
        phase1: 100,
        phase2: 200,
        phase3: 400,
        phase4: 800
    },
    practiceBonus: 100,
    maxPracticeUsers: 1000,
    practiceExpiryDays: 30,
    geoRestrictions: {
        enabled: false,
        blockedCountries: []
    },
    emergencyFlags: {
        pauseRegistrations: false,
        pauseDeposits: false,
        pauseLuckyDraw: false,
        maintenanceMode: false,
        pauseWithdrawals: false
    },
    lastUpdated: new Date(),
    updatedBy: null
};

module.exports = {
    systemConfig
};
