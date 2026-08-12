package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.FundTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface FundTransactionRepository extends JpaRepository<FundTransaction, UUID> {
    List<FundTransaction> findByProjectIdOrderByTransactionDateDesc(UUID projectId);
    List<FundTransaction> findByMilestoneIdOrderByTransactionDateDesc(UUID milestoneId);
}
