package com.transparencychain.backend.controller;

import com.transparencychain.backend.dto.MessageResponse;
import com.transparencychain.backend.model.FunderProfile;
import com.transparencychain.backend.repository.FunderProfileRepository;
import com.transparencychain.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/org/profile")
@PreAuthorize("hasRole('FUNDER')")
public class OrgProfileController {

    @Autowired
    private FunderProfileRepository funderProfileRepository;

    private FunderProfile currentFunder() {
        UserDetailsImpl userDetails = (UserDetailsImpl)
                SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return funderProfileRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new RuntimeException(
                        "FunderProfile not found for user: " + userDetails.getId()));
    }

    @GetMapping
    public ResponseEntity<?> getProfile() {
        try {
            FunderProfile funder = currentFunder();
            Map<String, Object> response = new HashMap<>();
            response.put("id", funder.getId());
            response.put("orgName", funder.getOrgName());
            response.put("orgType", funder.getOrgType() != null ? funder.getOrgType().name() : "COMPANY");
            response.put("cinNumber", funder.getCinNumber());
            response.put("totalDonated", funder.getTotalDonated());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @PutMapping
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, Object> body) {
        try {
            FunderProfile funder = currentFunder();
            if (body.containsKey("orgName")) {
                funder.setOrgName((String) body.get("orgName"));
            }
            if (body.containsKey("cinNumber")) {
                funder.setCinNumber((String) body.get("cinNumber"));
            }
            if (body.containsKey("orgType")) {
                funder.setOrgType(FunderProfile.FunderType.valueOf(((String) body.get("orgType")).toUpperCase()));
            }
            funderProfileRepository.save(funder);

            Map<String, Object> response = new HashMap<>();
            response.put("id", funder.getId());
            response.put("orgName", funder.getOrgName());
            response.put("orgType", funder.getOrgType() != null ? funder.getOrgType().name() : "COMPANY");
            response.put("cinNumber", funder.getCinNumber());
            response.put("totalDonated", funder.getTotalDonated());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }
}
