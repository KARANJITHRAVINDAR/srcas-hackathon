package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.EvidenceAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EvidenceAnalysisRepository extends JpaRepository<EvidenceAnalysis, UUID> {
    List<EvidenceAnalysis> findByVendorNameIgnoreCaseAndInvoiceNumberIgnoreCase(String vendorName, String invoiceNumber);
    EvidenceAnalysis findByProofId(UUID proofId);
}
