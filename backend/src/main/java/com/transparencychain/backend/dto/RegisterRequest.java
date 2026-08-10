package com.transparencychain.backend.dto;

import com.transparencychain.backend.model.FunderProfile;
import com.transparencychain.backend.model.NgoProfile;
import com.transparencychain.backend.model.Role;
import lombok.Data;

@Data
public class RegisterRequest {
    private String email;
    private String password;
    private String fullName;
    private String phone;
    private Role role;
    
    // NGO specific - Identity
    private String orgName;
    private NgoProfile.RegistrationType registrationType;
    private String registrationNumber;
    private String darpanId;
    private String panNumber;
    private String csr1RegistrationNumber;
    private String reg12aNumber;
    private String reg80gNumber;
    private String fcraNumber;
    private String gstin;
    private java.time.LocalDateTime dateOfEstablishment;
    private String registeredAddress;
    
    // NGO specific - Governance
    private java.util.List<BoardMemberDto> boardMembers;
    
    // NGO specific - Banking
    private String bankAccountName;
    private String bankAccountNumber;
    private String ifscCode;
    
    // NGO specific - Contact
    private String authorizedSignatoryName;
    private String authorizedSignatoryDesignation;
    private String authorizedSignatoryPan;
    private String auditorName;
    private String auditorMembershipNumber;
    private String contactEmail;
    private String contactPhone;
    private String website;
    private String operationalStates; // JSON String
    private String focusSdgGoals; // JSON String
    
    // Funder specific
    private FunderProfile.FunderType orgType;
    private String cinNumber;

    @Data
    public static class BoardMemberDto {
        private String fullName;
        private String designation;
        private String panNumber;
        private String dinNumber;
    }
}
