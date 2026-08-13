const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

async function main() {
    const rpcUrl = process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/";
    const privateKey = process.env.POLYGON_AMOY_PRIVATE_KEY;

    if (!privateKey) {
        console.log("==================================================================");
        console.log("❌ POLYGON_AMOY_PRIVATE_KEY is not defined in your environment.");
        console.log("Generating a temporary throwaway wallet for you:");
        const wallet = ethers.Wallet.createRandom();
        console.log(`Address:     ${wallet.address}`);
        console.log(`Private Key: ${wallet.privateKey}`);
        console.log("==================================================================");
        console.log("Please fund this address with testnet POL from the Amoy faucet:");
        console.log("👉 https://faucet.polygon.technology/");
        console.log("Then set it in your environment/application.properties and re-run:");
        console.log("export POLYGON_AMOY_PRIVATE_KEY=" + wallet.privateKey);
        console.log("==================================================================");
        process.exit(1);
    }

    console.log(`Connecting to RPC: ${rpcUrl}`);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`Deployer address: ${wallet.address}`);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`Deployer balance: ${ethers.formatEther(balance)} POL`);

    if (balance === 0n) {
        console.error("❌ Deployer balance is 0. Please fund the wallet with testnet POL.");
        process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'TransparencyAuditAnchor.json'), 'utf8'));
    
    console.log("Deploying contract...");
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const contract = await factory.deploy();
    
    console.log("Waiting for deployment transaction to be mined...");
    await contract.waitForDeployment();
    
    const address = await contract.getAddress();
    console.log(`\n==================================================`);
    console.log(`🎉 Contract successfully deployed to Polygon Amoy!`);
    console.log(`Contract Address: ${address}`);
    console.log(`==================================================\n`);
}

main().catch(err => {
    console.error("Deployment failed:", err);
    process.exit(1);
});
