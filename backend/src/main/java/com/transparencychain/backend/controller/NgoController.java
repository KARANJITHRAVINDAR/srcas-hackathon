package com.transparencychain.backend.controller;

import com.transparencychain.backend.dto.MessageResponse;
import com.transparencychain.backend.model.NgoDocument;
import com.transparencychain.backend.model.NgoProfile;
import com.transparencychain.backend.repository.NgoDocumentRepository;
import com.transparencychain.backend.repository.NgoProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1")
public class NgoController {

    @Autowired
    NgoProfileRepository ngoProfileRepository;

    @Autowired
    NgoDocumentRepository ngoDocumentRepository;

    @Autowired
    com.transparencychain.backend.repository.ProjectRepository projectRepository;

    @Autowired
    com.transparencychain.backend.repository.EscrowAccountRepository escrowAccountRepository;

    @PostMapping("/ngo/{id}/documents")
    public ResponseEntity<?> uploadDocument(@PathVariable UUID id,
                                            @RequestParam("file") MultipartFile file,
                                            @RequestParam("documentType") NgoDocument.DocumentType documentType) {
        
        NgoProfile ngo = ngoProfileRepository.findByUserId(id).orElse(null);
        if (ngo == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("NGO not found"));
        }

        // Stubbing IPFS upload for the demo
        String stubbedIpfsCid = "Qm" + UUID.randomUUID().toString().replace("-", "") + "StubbedCID";
        String stubbedSha256 = "sha256-" + UUID.randomUUID().toString();

        NgoDocument doc = new NgoDocument();
        doc.setNgoProfile(ngo);
        doc.setDocumentType(documentType);
        doc.setFileName(file.getOriginalFilename());
        doc.setIpfsCid(stubbedIpfsCid);
        doc.setSha256Hash(stubbedSha256);
        doc.setVerifiedStatus(NgoDocument.VerifiedStatus.PENDING);
        
        ngoDocumentRepository.save(doc);

        return ResponseEntity.ok(doc);
    }

    @GetMapping("/ngo/{id}/registration-status")
    public ResponseEntity<?> getRegistrationStatus(@PathVariable UUID id) {
        NgoProfile ngo = ngoProfileRepository.findByUserId(id).orElse(null);
        if (ngo == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("NGO not found"));
        }

        List<NgoDocument> documents = ngoDocumentRepository.findByNgoProfileId(ngo.getId());
        
        Map<String, Object> status = new HashMap<>();
        status.put("verificationStatus", ngo.getVerificationStatus());
        status.put("uploadedDocuments", documents.stream().map(NgoDocument::getDocumentType).toList());
        status.put("trustScore", ngo.getTrustScore());
        
        // Checklist missing
        // In a real app, we'd check if all required enum types are in the list.
        return ResponseEntity.ok(status);
    }

    @PatchMapping("/admin/ngo/{id}/verify")
    public ResponseEntity<?> verifyNgo(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        NgoProfile ngo = ngoProfileRepository.findById(id).orElse(null);
        if (ngo == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("NGO not found"));
        }

        String statusStr = request.get("status");
        if (statusStr != null) {
            ngo.setVerificationStatus(NgoProfile.VerificationStatus.valueOf(statusStr));
            ngoProfileRepository.save(ngo);
        }

        return ResponseEntity.ok(new MessageResponse("NGO verification status updated to " + statusStr));
    }
    @GetMapping("/ngo/{id}/dashboard-stats")
    public ResponseEntity<?> getDashboardStats(@PathVariable UUID id) {
        NgoProfile ngo = ngoProfileRepository.findByUserId(id).orElse(null);
        if (ngo == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("NGO not found"));
        }

        List<com.transparencychain.backend.model.Project> projects = projectRepository.findByNgoId(ngo.getId());
        
        long activeProjects = projects.stream()
            .filter(p -> p.getStatus() != com.transparencychain.backend.model.Project.ProjectStatus.COMPLETED && p.getStatus() != com.transparencychain.backend.model.Project.ProjectStatus.CANCELLED)
            .count();

        java.math.BigDecimal totalAllocated = java.math.BigDecimal.ZERO;
        java.math.BigDecimal released = java.math.BigDecimal.ZERO;
        java.math.BigDecimal pending = java.math.BigDecimal.ZERO;

        for (com.transparencychain.backend.model.Project p : projects) {
            totalAllocated = totalAllocated.add(p.getTotalBudget() != null ? p.getTotalBudget() : java.math.BigDecimal.ZERO);
            com.transparencychain.backend.model.EscrowAccount escrow = escrowAccountRepository.findByProjectId(p.getId()).orElse(null);
            if (escrow != null) {
                released = released.add(escrow.getReleasedAmount() != null ? escrow.getReleasedAmount() : java.math.BigDecimal.ZERO);
                pending = pending.add(escrow.getBalanceAmount());
            }
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("activeProjects", activeProjects);
        stats.put("totalAllocated", totalAllocated);
        stats.put("released", released);
        stats.put("pending", pending);
        stats.put("trustScore", ngo.getTrustScore());
        stats.put("projects", projects); // Send the raw projects for the active projects list

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/ngos/verified")
    public ResponseEntity<List<NgoProfile>> getVerifiedNgos() {
        // Return all NGOs for now, but in production, we should filter by VERIFIED
        return ResponseEntity.ok(ngoProfileRepository.findAll());
    }
}
