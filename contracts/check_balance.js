const { ethers } = require('ethers');

async function main() {
    const rpcUrl = process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/";
    const address = "0xdFcf3C28CcBcb5bA9E83DbE3f77D96474C74Aba2";
    console.log(`Connecting to RPC: ${rpcUrl}`);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(address);
    console.log(`Address: ${address}`);
    console.log(`Balance: ${ethers.formatEther(balance)} POL`);
}

main().catch(console.error);
