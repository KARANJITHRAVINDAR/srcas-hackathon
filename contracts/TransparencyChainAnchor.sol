// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TransparencyChainAnchor
 * @dev Cryptographic Merkle Root registry for Transparency Chain on Polygon Amoy.
 * Stores tamper-proof commitments for project milestone evidence verification.
 */
contract TransparencyChainAnchor {

    address public immutable owner;

    struct AnchorCommitment {
        bytes32 merkleRoot;
        uint256 timestamp;
        uint256 blockNumber;
        bool exists;
    }

    // Mapping: keccak256(projectId, milestoneId) => AnchorCommitment
    mapping(bytes32 => AnchorCommitment) private commitments;

    event MerkleRootCommitted(
        string indexed projectIdIndexed,
        string indexed milestoneIdIndexed,
        string projectId,
        string milestoneId,
        bytes32 merkleRoot,
        uint256 timestamp,
        uint256 blockNumber
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "TransparencyChainAnchor: Caller is not the authorized owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Commits a Merkle Root representing verified evidence for a given project milestone.
     * Re-commitments for an existing (projectId, milestoneId) are rejected to ensure immutability.
     */
    function commitMerkleRoot(
        string calldata projectId,
        string calldata milestoneId,
        bytes32 merkleRoot
    ) external onlyOwner {
        require(bytes(projectId).length > 0, "TransparencyChainAnchor: Empty projectId");
        require(bytes(milestoneId).length > 0, "TransparencyChainAnchor: Empty milestoneId");
        require(merkleRoot != bytes32(0), "TransparencyChainAnchor: Invalid zero merkleRoot");

        bytes32 key = getCommitmentKey(projectId, milestoneId);
        require(!commitments[key].exists, "TransparencyChainAnchor: Milestone commitment already exists (immutable)");

        commitments[key] = AnchorCommitment({
            merkleRoot: merkleRoot,
            timestamp: block.timestamp,
            blockNumber: block.number,
            exists: true
        });

        emit MerkleRootCommitted(
            projectId,
            milestoneId,
            projectId,
            milestoneId,
            merkleRoot,
            block.timestamp,
            block.number
        );
    }

    /**
     * @dev Retrieves committed Merkle Root for a specific project milestone.
     */
    function getMerkleRoot(
        string calldata projectId,
        string calldata milestoneId
    ) external view returns (bytes32) {
        bytes32 key = getCommitmentKey(projectId, milestoneId);
        require(commitments[key].exists, "TransparencyChainAnchor: No commitment found for milestone");
        return commitments[key].merkleRoot;
    }

    /**
     * @dev Checks if a commitment already exists for a project milestone.
     */
    function hasMerkleRoot(
        string calldata projectId,
        string calldata milestoneId
    ) external view returns (bool) {
        bytes32 key = getCommitmentKey(projectId, milestoneId);
        return commitments[key].exists;
    }

    /**
     * @dev Gets full details of a commitment.
     */
    function getCommitment(
        string calldata projectId,
        string calldata milestoneId
    ) external view returns (bytes32 merkleRoot, uint256 timestamp, uint256 blockNumber) {
        bytes32 key = getCommitmentKey(projectId, milestoneId);
        require(commitments[key].exists, "TransparencyChainAnchor: No commitment found");
        AnchorCommitment memory c = commitments[key];
        return (c.merkleRoot, c.timestamp, c.blockNumber);
    }

    function getCommitmentKey(
        string memory projectId,
        string memory milestoneId
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(projectId, ":", milestoneId));
    }
}
