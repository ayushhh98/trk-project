const fs = require('fs');
const path = require('path');

const apiPath = path.resolve(__dirname, '../../lib/api.ts');
console.log('Reading:', apiPath);

let content = fs.readFileSync(apiPath, 'utf8');

const target = `    // Get live games feed
    getLive: async () => {
        return apiRequest('/game/live');
    },
};`;

const replacement = `    // Get live games feed
    getLive: async () => {
        return apiRequest('/game/live');
    },

    // Get Lucky Draw Status
    getLuckyDrawStatus: async () => {
        return apiRequest('/lucky-draw/status');
    },

    // Buy Lucky Draw Tickets
    buyLuckyDrawTickets: async (quantity: number) => {
        return apiRequest('/lucky-draw/buy-ticket', {
            method: 'POST',
            body: JSON.stringify({ quantity })
        });
    },

    // Get User Tickets
    getMyTickets: async () => {
        return apiRequest('/lucky-draw/my-tickets');
    }
};`;

// formatting check: normalize newlines
const normalizedTarget = target.replace(/\r\n/g, '\n');
const normalizedContent = content.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
    console.log('Target found. Patching...');
    const newContent = normalizedContent.replace(normalizedTarget, replacement);
    fs.writeFileSync(apiPath, newContent, 'utf8');
    console.log('Successfully patched lib/api.ts');
} else {
    console.error('Target NOT found in content.');
    // Try simpler match
    const simplerTarget = `    getLive: async () => {
        return apiRequest('/game/live');
    },`;

    if (normalizedContent.includes(simplerTarget)) {
        console.log('Simpler target found. Patching...');
        const simplerReplacement = `    getLive: async () => {
        return apiRequest('/game/live');
    },

    // Get Lucky Draw Status
    getLuckyDrawStatus: async () => {
        return apiRequest('/lucky-draw/status');
    },

    // Buy Lucky Draw Tickets
    buyLuckyDrawTickets: async (quantity: number) => {
        return apiRequest('/lucky-draw/buy-ticket', {
            method: 'POST',
            body: JSON.stringify({ quantity })
        });
    },

    // Get User Tickets
    getMyTickets: async () => {
        return apiRequest('/lucky-draw/my-tickets');
    }`;
        const newContent = normalizedContent.replace(simplerTarget, simplerReplacement);
        fs.writeFileSync(apiPath, newContent, 'utf8');
        console.log('Successfully patched lib/api.ts with simpler match');
    } else {
        console.error('Simpler target also NOT found.');
        console.log('Last 200 chars of file:', content.slice(-200));
        process.exit(1);
    }
}
