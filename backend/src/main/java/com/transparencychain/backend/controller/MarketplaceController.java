package com.transparencychain.backend.controller;

import com.transparencychain.backend.dto.MessageResponse;
import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import com.transparencychain.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1")
public class MarketplaceController {
    
    @Autowired
    NeedPostingRepository needRepository;
    
    @Autowired
    MatchRequestRepository matchRequestRepository;
    
    @Autowired
    NgoProfileRepository ngoProfileRepository;
    
    @Autowired
    FunderProfileRepository funderProfileRepository;
    
    @Autowired
    ProjectRepository projectRepository;

    @PostMapping("/needs")
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<?> createNeed(@RequestBody NeedPosting request) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        NgoProfile ngo = ngoProfileRepository.findByUserId(userDetails.getId()).orElseThrow();
        
        request.setNgo(ngo);
        request.setStatus(NeedPosting.NeedStatus.OPEN);
        needRepository.save(request);
        
        return ResponseEntity.ok(request);
    }
    
    @GetMapping("/public/needs")
    public ResponseEntity<?> getAllNeeds() {
        return ResponseEntity.ok(needRepository.findAll());
    }
    
    @PostMapping("/needs/{id}/express-interest")
    @PreAuthorize("hasRole('FUNDER')")
    public ResponseEntity<?> expressInterest(@PathVariable UUID id) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        FunderProfile funder = funderProfileRepository.findByUserId(userDetails.getId()).orElseThrow();
        NeedPosting need = needRepository.findById(id).orElseThrow();
        
        MatchRequest mr = new MatchRequest();
        mr.setFunder(funder);
        mr.setNeed(need);
        mr.setStatus(MatchRequest.MatchStatus.PENDING);
        matchRequestRepository.save(mr);
        
        return ResponseEntity.ok(new MessageResponse("Interest expressed successfully!"));
    }
    
    @PostMapping("/match-requests/{id}/accept")
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<?> acceptMatch(@PathVariable UUID id) {
        MatchRequest mr = matchRequestRepository.findById(id).orElseThrow();
        mr.setStatus(MatchRequest.MatchStatus.ACCEPTED);
        matchRequestRepository.save(mr);
        
        NeedPosting need = mr.getNeed();
        need.setStatus(NeedPosting.NeedStatus.MATCHED);
        needRepository.save(need);
        
        Project p = new Project();
        p.setFunder(mr.getFunder());
        p.setNgo(need.getNgo());
        p.setTitle(need.getTitle());
        p.setSdgGoal(need.getSdgGoal());
        p.setDescription(need.getDescription());
        p.setTotalBudget(need.getEstimatedBudgetMax() != null ? need.getEstimatedBudgetMax() : java.math.BigDecimal.ZERO);
        p.setGeography((need.getGeographyVillage() != null ? need.getGeographyVillage() + ", " : "") + 
                       (need.getGeographyDistrict() != null ? need.getGeographyDistrict() + ", " : "") + 
                       (need.getGeographyState() != null ? need.getGeographyState() : ""));
        p.setLatitude(need.getLatitude());
        p.setLongitude(need.getLongitude());
        p.setStatus(Project.ProjectStatus.DRAFT);
        projectRepository.save(p);
        
        return ResponseEntity.ok(p);
    }
    
    @Autowired
    NeedPostingDocumentRepository needPostingDocumentRepository;
    
    @PostMapping("/needs/{id}/documents")
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<?> uploadNeedDocument(@PathVariable UUID id,
                                                @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
                                                @RequestParam("documentType") NeedPostingDocument.DocumentType documentType) {
        NeedPosting need = needRepository.findById(id).orElseThrow();
        
        // Stubbing IPFS
        String stubbedIpfsCid = "Qm" + UUID.randomUUID().toString().replace("-", "") + "StubbedNeedDoc";
        
        NeedPostingDocument doc = new NeedPostingDocument();
        doc.setNeedPosting(need);
        doc.setDocumentType(documentType);
        doc.setIpfsCid(stubbedIpfsCid);
        doc.setSha256Hash("sha256-" + UUID.randomUUID().toString());
        
        needPostingDocumentRepository.save(doc);
        
        return ResponseEntity.ok(doc);
    }
}
