const hre = require("hardhat");

async function main() {
    console.log("Starting TRKLuckyDraw deployment...");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const networkName = hre.network.name;
    let usdtAddress;

    // 1. Determine USDT Address
    if (networkName === "bscTestnet" || networkName === "localhost" || networkName === "hardhat") {
        console.log("Network is Testnet/Local. checking for existing MockUSDT or deploying new...");
        // For simplicity in this targeted script, we'll deploy a new MockUSDT if we can't find one, 
        // OR user should provide it. 
        // Better approach: Deploy a fresh one to be sure, or hardcode a known testnet one if available.
        // Let's deploy a fresh one to ensure it works for the user immediately.
        const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
        const mockUsdt = await MockUSDT.deploy();
        await mockUsdt.waitForDeployment();
        usdtAddress = await mockUsdt.getAddress();
        console.log(`MockUSDT deployed to: ${usdtAddress}`);
    } else {
        // Mainnet - BSC USDT
        console.log("Network is Mainnet. Using real USDT address.");
        usdtAddress = "0x55d398326f99059fF775485246999027B3197955";
    }

    console.log(`Deploying TRKLuckyDraw with USDT: ${usdtAddress}`);

    // 2. Deploy TRKLuckyDraw
    const TRKLuckyDraw = await hre.ethers.getContractFactory("TRKLuckyDraw");
    const luckyDraw = await TRKLuckyDraw.deploy(usdtAddress);

    await luckyDraw.waitForDeployment();
    const luckyDrawAddress = await luckyDraw.getAddress();

    console.log("----------------------------------------------------");
    console.log(`✅ TRKLuckyDraw deployed to: ${luckyDrawAddress}`);
    console.log("----------------------------------------------------");

    // 3. Verification Command
    console.log("\nTo verify this contract run:");
    console.log(`npx hardhat verify --network ${networkName} ${luckyDrawAddress} "${usdtAddress}"`);
    console.log("\n⚠️  IMPORTANT: Add this address to your .env file as LUCKY_DRAW_ADDRESS");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
