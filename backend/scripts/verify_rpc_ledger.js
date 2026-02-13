const { ethers } = require('ethers');
require('dotenv').config({ path: '../.env' });

async function verifyRPC() {
    const contractAddress = process.env.GAME_CONTRACT_ADDRESS || '0xD03507EE1A28A5CA433D790E5F1a82848316BBd5';
    const rpcUrl = "https://rpc.ankr.com/bsc";

    console.log('--- RPC Verification ---');
    console.log('Contract:', contractAddress);
    console.log('RPC URL:', rpcUrl);

    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const checksummedAddress = ethers.getAddress(contractAddress);

        console.log('Connecting to provider...');
        const latestBlock = await provider.getBlockNumber();
        console.log('Latest Block:', latestBlock);

        console.log('Fetching logs (last 10 blocks) for:', checksummedAddress);
        const logs = await provider.getLogs({
            address: checksummedAddress,
            fromBlock: latestBlock - 10,
            toBlock: 'latest'
        });

        console.log('Logs found:', logs.length);

        if (logs.length > 0) {
            const recentLogs = logs.slice(-5).reverse();
            for (const log of recentLogs) {
                let method = 'Contract Interaction';
                let amount = "Checking...";
                const abiCoder = ethers.AbiCoder.defaultAbiCoder();

                try {
                    if (log.topics[0] === ethers.id("BetPlaced(address,uint256,uint256,uint256,bool)")) {
                        method = 'PlaceBet';
                        const decoded = abiCoder.decode(['uint256', 'uint256', 'bool'], log.data);
                        amount = ethers.formatUnits(decoded[0], 18);
                    }
                    else if (log.topics[0] === ethers.id("Transfer(address,address,uint256)")) {
                        method = 'Transfer';
                        const decoded = abiCoder.decode(['uint256'], log.data);
                        amount = ethers.formatUnits(decoded[0], 18);
                    }
                    else if (log.topics[0] === ethers.id("WinClaimed(address,uint256,uint256)")) {
                        method = 'WinClaimed';
                        const decoded = abiCoder.decode(['uint256', 'uint256'], log.data);
                        amount = ethers.formatUnits(decoded[0], 18);
                    }
                } catch (e) {
                    console.log('Decode error:', e.message);
                }

                console.log(`- Hash: ${log.transactionHash.slice(0, 10)}... | Method: ${method} | Amount: ${amount} | Block: ${log.blockNumber}`);
            }
        } else {
            console.log('No recent logs found in last 50 blocks.');
            console.log('Checking last 500 blocks...');
            const wideLogs = await provider.getLogs({
                address: checksummedAddress,
                fromBlock: latestBlock - 500,
                toBlock: 'latest'
            });
            console.log('Logs in 500 block range:', wideLogs.length);
        }

        console.log('\nSUCCESS: RPC connectivity and event fetching validated.');
    } catch (error) {
        console.error('\nFAILURE:', error.message);
        if (error.code) console.error('Error Code:', error.code);
    }
}

verifyRPC();
