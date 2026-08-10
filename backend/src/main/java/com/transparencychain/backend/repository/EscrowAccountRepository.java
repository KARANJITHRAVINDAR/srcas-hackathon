package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.EscrowAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface EscrowAccountRepository extends JpaRepository<EscrowAccount, UUID> {
    Optional<EscrowAccount> findByProjectId(UUID projectId);
}
