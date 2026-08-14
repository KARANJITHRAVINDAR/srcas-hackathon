package com.transparencychain.backend;

import com.transparencychain.backend.controller.ProofController;
import com.transparencychain.backend.dto.MessageResponse;
import com.transparencychain.backend.model.Milestone;
import com.transparencychain.backend.model.Project;
import com.transparencychain.backend.repository.MilestoneRepository;
import com.transparencychain.backend.repository.ProofSubmissionRepository;
import com.transparencychain.backend.repository.OrgProjectEngagementRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SubmitEvidenceDisbursementGatingTest {

    @Mock
    private MilestoneRepository milestoneRepository;

    @Mock
    private ProofSubmissionRepository proofRepository;

    @Mock
    private OrgProjectEngagementRepository engagementRepository;

    @Mock
    private com.transparencychain.backend.service.AuditLogService auditLogService;

    @Mock
    private com.transparencychain.backend.service.NotificationService notificationService;

    @Mock
    private com.transparencychain.backend.service.ImpactGenerationService impactGenerationService;

    @Mock
    private com.transparencychain.backend.service.AiFraudDetectionService aiFraudDetectionService;

    @Mock
    private com.transparencychain.backend.repository.UserRepository userRepository;

    @InjectMocks
    private ProofController proofController;

    @Test
    @DisplayName("Test 1: Evidence submission fails if milestoneType is CLOSURE")
    public void testClosureMilestoneRejectsStandardEvidence() {
        UUID milestoneId = UUID.randomUUID();
        Milestone closureMilestone = new Milestone();
        closureMilestone.setId(milestoneId);
        closureMilestone.setMilestoneType(Milestone.MilestoneType.CLOSURE);
        closureMilestone.setStatus(Milestone.MilestoneStatus.IN_PROGRESS);
        closureMilestone.setFundsTransferred(true);

        when(milestoneRepository.findById(milestoneId)).thenReturn(Optional.of(closureMilestone));

        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", "dummy content".getBytes());
        ResponseEntity<?> response = proofController.submitProof(milestoneId, file, null, "INVOICE");

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        MessageResponse msg = (MessageResponse) response.getBody();
        assertNotNull(msg);
        assertTrue(msg.getMessage().contains("Closure milestones require beneficiary feedback"));
    }

    @Test
    @DisplayName("Test 2: Evidence submission fails if milestone status is not IN_PROGRESS")
    public void testStatusNotInProgressRejectsEvidence() {
        UUID milestoneId = UUID.randomUUID();
        Milestone milestone = new Milestone();
        milestone.setId(milestoneId);
        milestone.setMilestoneType(Milestone.MilestoneType.STANDARD);
        milestone.setStatus(Milestone.MilestoneStatus.AWAITING_FUNDER_APPROVAL);
        milestone.setFundsTransferred(true);

        when(milestoneRepository.findById(milestoneId)).thenReturn(Optional.of(milestone));

        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", "dummy content".getBytes());
        ResponseEntity<?> response = proofController.submitProof(milestoneId, file, null, "INVOICE");

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        MessageResponse msg = (MessageResponse) response.getBody();
        assertNotNull(msg);
        assertTrue(msg.getMessage().contains("Milestone must be IN_PROGRESS"));
    }

    @Test
    @DisplayName("Test 3: Evidence submission fails if funds_transferred is false (not disbursed)")
    public void testUndisbursedMilestoneRejectsEvidence() {
        UUID milestoneId = UUID.randomUUID();
        Milestone milestone = new Milestone();
        milestone.setId(milestoneId);
        milestone.setMilestoneType(Milestone.MilestoneType.STANDARD);
        milestone.setStatus(Milestone.MilestoneStatus.IN_PROGRESS);
        milestone.setSequenceNumber(2);
        milestone.setTitle("Phase 2: Foundation");
        milestone.setFundsTransferred(false); // Funds not disbursed

        when(milestoneRepository.findById(milestoneId)).thenReturn(Optional.of(milestone));

        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", "dummy content".getBytes());
        ResponseEntity<?> response = proofController.submitProof(milestoneId, file, null, "INVOICE");

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        MessageResponse msg = (MessageResponse) response.getBody();
        assertNotNull(msg);
        assertTrue(msg.getMessage().contains("funds have not yet been disbursed"));
    }

    @Test
    @DisplayName("Test 4: Evidence submission passes validation if IN_PROGRESS, funds_transferred is true, and sequential rules met")
    public void testValidDisbursedMilestonePassesGating() {
        UUID milestoneId = UUID.randomUUID();
        Project project = new Project();
        project.setId(UUID.randomUUID());

        Milestone milestone = new Milestone();
        milestone.setId(milestoneId);
        milestone.setProject(project);
        milestone.setMilestoneType(Milestone.MilestoneType.STANDARD);
        milestone.setStatus(Milestone.MilestoneStatus.IN_PROGRESS);
        milestone.setSequenceNumber(1);
        milestone.setTitle("Phase 1: Mobilization");
        milestone.setFundsTransferred(true); // Funds disbursed at commitment

        when(milestoneRepository.findById(milestoneId)).thenReturn(Optional.of(milestone));
        when(engagementRepository.findByProjectId(project.getId())).thenReturn(Collections.emptyList());

        // File save will attempt to write to uploads/
        MockMultipartFile file = new MockMultipartFile("file", "test_invoice.pdf", "application/pdf", "invoice content".getBytes());
        ResponseEntity<?> response = proofController.submitProof(milestoneId, file, null, "INVOICE");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(proofRepository, times(1)).save(any());
        assertEquals(Milestone.MilestoneStatus.AWAITING_FUNDER_APPROVAL, milestone.getStatus());
    }
}
