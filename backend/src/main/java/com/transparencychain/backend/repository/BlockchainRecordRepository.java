package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.BlockchainRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface BlockchainRecordRepository extends JpaRepository<BlockchainRecord, UUID> {
}
