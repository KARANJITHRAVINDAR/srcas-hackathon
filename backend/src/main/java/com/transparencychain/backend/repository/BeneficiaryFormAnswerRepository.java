package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.BeneficiaryFormAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface BeneficiaryFormAnswerRepository extends JpaRepository<BeneficiaryFormAnswer, UUID> {
}
