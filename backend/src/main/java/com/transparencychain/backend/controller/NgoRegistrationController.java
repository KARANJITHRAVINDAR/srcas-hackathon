package com.transparencychain.backend.controller;

import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import com.transparencychain.backend.service.DocumentClassifierService;
import com.transparencychain.backend.service.FieldMergeService;
import com.transparencychain.backend.service.OcrExtractionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/v1/ngo/register")
@CrossOrigin(origins = "*")
public class NgoRegistrationController {

    @Autowired private RegistrationDraftRepository draftRepository;
    @Autowired private ExtractedFieldRepository fieldRepository;
    @Autowired private DocumentClassifierService classifierService;
    @Autowired private OcrExtractionService ocrService;
    @Autowired private FieldMergeService mergeService;
    
    @Autowired private NgoProfileRepository ngoProfileRepository;
    @Autowired private NgoBoardMemberRepository boardMemberRepository;
    @Autowired private NgoDocumentRepository documentRepository;
    @Autowired private UserRepository userRepository;

    @PostMapping("/documents")
    public ResponseEntity<?> uploadDocuments(@RequestParam("userId") UUID userId,
                                             @RequestParam("files") MultipartFile[] files) {
        
        // Ensure user exists
        if (!userRepository.existsById(userId)) {
            return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
        }

        // Create or reset Draft
        RegistrationDraft draft = draftRepository.findByUserId(userId).orElse(new RegistrationDraft());
        draft.setUserId(userId);
        draft.setStatus(RegistrationDraft.DraftStatus.EXTRACTING);
        draft = draftRepository.save(draft);

        // Delete previous extractions if re-uploading
        fieldRepository.deleteByDraftId(draft.getId());

        // Process files asynchronously (simulated here synchronously for simplicity in hackathon)
        Map<String, List<OcrExtractionService.OcrResult>> allResults = new HashMap<>();
        
        for (MultipartFile file : files) {
            String docType = classifierService.classifyDocument(file);
            if (!docType.equals("UNKNOWN")) {
                List<OcrExtractionService.OcrResult> results = ocrService.extractFields(file, docType);
                allResults.put(docType, results);
            }
        }

        // Merge fields
        mergeService.mergeAndSaveFields(draft.getId(), allResults);
        
        draft.setStatus(RegistrationDraft.DraftStatus.READY_FOR_REVIEW);
        draftRepository.save(draft);

        return ResponseEntity.ok(Map.of("draftId", draft.getId()));
    }

    @GetMapping("/draft/{id}")
    public ResponseEntity<?> getDraft(@PathVariable UUID id) {
        Optional<RegistrationDraft> draftOpt = draftRepository.findById(id);
        if (draftOpt.isEmpty()) return ResponseEntity.notFound().build();
        
        RegistrationDraft draft = draftOpt.get();
        List<ExtractedField> fields = fieldRepository.findByDraftId(id);
        
        Map<String, Object> response = new HashMap<>();
        response.put("draft", draft);
        response.put("fields", fields);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/draft/{id}/fields")
    public ResponseEntity<?> resolveField(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        String fieldName = request.get("fieldName");
        String resolvedValue = request.get("resolvedValue");
        
        List<ExtractedField> fields = fieldRepository.findByDraftId(id);
        for (ExtractedField field : fields) {
            if (field.getFieldName().equals(fieldName)) {
                field.setResolvedValue(resolvedValue);
                field.setResolvedBy("MANAGER");
                field.setHasConflict(false);
                // Boost confidence to 100 since a human verified it
                field.setConfidenceScore(new BigDecimal("100.00"));
                fieldRepository.save(field);
                return ResponseEntity.ok(field);
            }
        }
        
        // If field didn't exist in OCR, create it as a manually added field
        ExtractedField newField = new ExtractedField();
        newField.setDraftId(id);
        newField.setFieldName(fieldName);
        newField.setExtractedValue("");
        newField.setResolvedValue(resolvedValue);
        newField.setResolvedBy("MANAGER");
        newField.setConfidenceScore(new BigDecimal("100.00"));
        newField.setSourceDocumentType("MANUAL_ENTRY");
        fieldRepository.save(newField);
        
        return ResponseEntity.ok(newField);
    }

    @PostMapping("/draft/{id}/confirm")
    public ResponseEntity<?> confirmDraft(@PathVariable UUID id) {
        Optional<RegistrationDraft> draftOpt = draftRepository.findById(id);
        if (draftOpt.isEmpty()) return ResponseEntity.notFound().build();
        
        List<ExtractedField> fields = fieldRepository.findByDraftId(id);
        Map<String, String> finalValues = new HashMap<>();
        
        for (ExtractedField f : fields) {
            if (f.getConfidenceScore() == null || f.getConfidenceScore().compareTo(new BigDecimal("70.00")) < 0) {
                if (f.getResolvedValue() == null || f.getResolvedValue().isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Field " + f.getFieldName() + " has low confidence and must be manually resolved."));
                }
            }
            finalValues.put(f.getFieldName(), f.getResolvedValue() != null ? f.getResolvedValue() : f.getExtractedValue());
        }

        RegistrationDraft draft = draftOpt.get();
        User user = userRepository.findById(draft.getUserId()).orElseThrow();
        
        NgoProfile profile = new NgoProfile();
        profile.setUser(user);
        profile.setOrgName(finalValues.get("orgName"));
        profile.setDarpanId(finalValues.get("darpanId"));
        profile.setPanNumber(finalValues.get("panNumber"));
        
        try {
            if (finalValues.get("registrationType") != null) {
                profile.setRegistrationType(NgoProfile.RegistrationType.valueOf(finalValues.get("registrationType").toUpperCase()));
            }
        } catch (Exception e) {
            profile.setRegistrationType(NgoProfile.RegistrationType.TRUST); // fallback
        }
        
        profile.setRegistrationNumber(finalValues.get("registrationNumber"));
        profile.setCsr1RegistrationNumber(finalValues.get("csr1RegistrationNumber"));
        profile.setBankAccountName(finalValues.get("bankAccountName"));
        profile.setBankAccountNumberEncrypted(finalValues.get("bankAccountNumber")); // The entity encrypts this
        profile.setIfscCode(finalValues.get("ifscCode"));
        profile.setVerificationStatus(NgoProfile.VerificationStatus.PENDING);
        
        profile = ngoProfileRepository.save(profile);
        
        // Handle Board Members (Mocking 1 for now since OCR extraction of arrays is complex)
        if (finalValues.containsKey("authorizedSignatoryName")) {
            NgoBoardMember member = new NgoBoardMember();
            member.setNgoProfile(profile);
            member.setFullName(finalValues.get("authorizedSignatoryName"));
            member.setDesignation(finalValues.get("authorizedSignatoryDesignation"));
            member.setPanNumber(finalValues.get("authorizedSignatoryPan"));
            boardMemberRepository.save(member);
        }
        
        draft.setStatus(RegistrationDraft.DraftStatus.CONFIRMED);
        draftRepository.save(draft);

        return ResponseEntity.ok(Map.of("message", "NGO Profile created successfully", "ngoId", profile.getId()));
    }
}
