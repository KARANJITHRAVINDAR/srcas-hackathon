const path = require('path');
const fs = require('fs');
const solc = require('solc');

const contractPath = path.resolve(__dirname, 'TransparencyAuditAnchor.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
    language: 'Solidity',
    sources: {
        'TransparencyAuditAnchor.sol': {
            content: source
        }
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['abi', 'evm.bytecode']
            }
        }
    }
};

console.log("Compiling contract with solc...");
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
    output.errors.forEach(err => {
        console.error(err.formattedMessage);
    });
}

if (!output.contracts || !output.contracts['TransparencyAuditAnchor.sol']) {
    console.error("Compilation failed. Check errors above.");
    process.exit(1);
}

const contract = output.contracts['TransparencyAuditAnchor.sol']['TransparencyAuditAnchor'];

fs.writeFileSync(
    path.resolve(__dirname, 'TransparencyAuditAnchor.json'),
    JSON.stringify({
        abi: contract.abi,
        bytecode: contract.evm.bytecode.object
    }, null, 2)
);

console.log('Compilation successful! Saved TransparencyAuditAnchor.json');
