// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title TransparencyEscrow
 * @dev Escrow contract for CSR funding with AI-verified milestone releases.
 */
contract TransparencyEscrow {
    
    struct Project {
        address funder;
        address ngo;
        uint256 totalBudget;
        uint256 balance;
        bool isCompleted;
    }
    
    // Mapping from off-chain Project ID (UUID string) to Project details
    mapping(string => Project) public projects;
    
    address public backendAuthority; // The backend wallet authorized to release funds based on AI verification
    
    event ProjectCreated(string projectId, address indexed funder, address indexed ngo, uint256 amount);
    event FundsReleased(string projectId, uint256 amount, string milestoneId);
    event ProjectCompleted(string projectId);

    modifier onlyAuthority() {
        require(msg.sender == backendAuthority, "Only the backend AI authority can call this");
        _;
    }

    constructor() {
        backendAuthority = msg.sender;
    }

    /**
     * @dev Funders call this to lock funds in escrow for a specific project.
     */
    function createProjectEscrow(string memory projectId, address ngoAddress) external payable {
        require(msg.value > 0, "Must escrow a positive amount");
        require(projects[projectId].funder == address(0), "Project escrow already exists");
        
        projects[projectId] = Project({
            funder: msg.sender,
            ngo: ngoAddress,
            totalBudget: msg.value,
            balance: msg.value,
            isCompleted: false
        });
        
        emit ProjectCreated(projectId, msg.sender, ngoAddress, msg.value);
    }

    /**
     * @dev Backend AI authority calls this when a milestone is verified.
     */
    function releaseMilestoneFunds(string memory projectId, string memory milestoneId, uint256 amount) external onlyAuthority {
        Project storage p = projects[projectId];
        require(p.funder != address(0), "Project does not exist");
        require(!p.isCompleted, "Project already completed");
        require(p.balance >= amount, "Insufficient escrow balance");
        
        p.balance -= amount;
        
        // Transfer funds to the NGO
        (bool success, ) = p.ngo.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit FundsReleased(projectId, amount, milestoneId);
        
        if (p.balance == 0) {
            p.isCompleted = true;
            emit ProjectCompleted(projectId);
        }
    }
}
