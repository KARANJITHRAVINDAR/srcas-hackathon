package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.BeneficiaryFormQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface BeneficiaryFormQuestionRepository extends JpaRepository<BeneficiaryFormQuestion, UUID> {
}
