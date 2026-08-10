package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.FraudCheck;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface FraudCheckRepository extends JpaRepository<FraudCheck, UUID> {
}
