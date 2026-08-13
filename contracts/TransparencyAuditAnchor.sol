// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TransparencyAuditAnchor {
    struct Record {
        string projectId;
        string milestoneId;
        string evidenceHash;
        string verificationResult;
        string verifierId;
        uint256 timestamp;
        string disbursementRef;
    }

    Record[] public records;

    event RecordAnchored(
        string indexed projectId,
        string indexed milestoneId,
        string evidenceHash,
        string verificationResult,
        string verifierId,
        uint256 timestamp,
        string disbursementRef
    );

    function anchorRecord(
        string memory projectId,
        string memory milestoneId,
        string memory evidenceHash,
        string memory verificationResult,
        string memory verifierId,
        uint256 timestamp,
        string memory disbursementRef
    ) external {
        records.push(Record({
            projectId: projectId,
            milestoneId: milestoneId,
            evidenceHash: evidenceHash,
            verificationResult: verificationResult,
            verifierId: verifierId,
            timestamp: timestamp,
            disbursementRef: disbursementRef
        }));

        emit RecordAnchored(
            projectId,
            milestoneId,
            evidenceHash,
            verificationResult,
            verifierId,
            timestamp,
            disbursementRef
        );
    }

    function getRecordCount() external view returns (uint256) {
        return records.length;
    }
}
