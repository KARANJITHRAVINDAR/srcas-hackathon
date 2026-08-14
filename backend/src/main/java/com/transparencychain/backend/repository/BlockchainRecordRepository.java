package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.BlockchainRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BlockchainRecordRepository extends JpaRepository<BlockchainRecord, UUID> {

    List<BlockchainRecord> findByProjectId(String projectId);

    List<BlockchainRecord> findByProjectIdAndMilestoneId(String projectId, String milestoneId);

    List<BlockchainRecord> findByProjectIdAndRecordType(String projectId, BlockchainRecord.RecordType recordType);

    List<BlockchainRecord> findByProjectIdAndMilestoneIdAndRecordType(
            String projectId, String milestoneId, BlockchainRecord.RecordType recordType);

    Optional<BlockchainRecord> findTopByProjectIdAndMilestoneIdOrderByTimestampDesc(
            String projectId, String milestoneId);

    Optional<BlockchainRecord> findTopByProjectIdAndMilestoneIdAndRecordTypeOrderByTimestampDesc(
            String projectId, String milestoneId, BlockchainRecord.RecordType recordType);

    Optional<BlockchainRecord> findByTransactionHash(String transactionHash);

    List<BlockchainRecord> findByStatus(BlockchainRecord.BlockchainStatus status);
}
