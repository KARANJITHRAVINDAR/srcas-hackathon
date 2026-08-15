package com.transparencychain.backend;

import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import com.transparencychain.backend.service.AuditReportService;
import com.transparencychain.backend.service.BlockchainService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

import com.example.demo.DemoApplication;

@SpringBootTest(classes = DemoApplication.class)
@Transactional
public class AuditReportServiceTest {

    @Autowired
    private AuditReportService auditReportService;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private BlockchainRecordRepository blockchainRecordRepository;

    @Autowired
    private AuditReportRepository auditReportRepository;

    @Autowired
    private BlockchainService blockchainService;

    private Project closedProject;
    private Project activeProject;

    @BeforeEach
    public void setup() {
        // Setup Closed Project
        closedProject = new Project();
        closedProject.setTitle("Clean Water Infrastructure Project");
        closedProject.setDescription("Clean water access for rural communities.");
        closedProject.setStatus(Project.ProjectStatus.CLOSED);
        closedProject.setTotalBudget(new BigDecimal("500000.00"));
        closedProject.setGeography("Chennai, Tamil Nadu");
        closedProject.setSdgGoal(Project.SdgGoal.SDG6);
        closedProject = projectRepository.save(closedProject);

        // Setup Active Project
        activeProject = new Project();
        activeProject.setTitle("Active School Solar Grid Project");
        activeProject.setStatus(Project.ProjectStatus.ACTIVE);
        activeProject = projectRepository.save(activeProject);

        // Seed Blockchain Records for Closed Project
        BlockchainRecord rec1 = new BlockchainRecord();
        rec1.setProjectId(closedProject.getId().toString());
        rec1.setMilestoneId(UUID.randomUUID().toString());
        rec1.setRecordType(BlockchainRecord.RecordType.EVIDENCE_MERKLE_ROOT);
        rec1.setMerkleRoot("0x8a91fd2377b1029481726593a1048b2918472918472918472918472918472918");
        rec1.setTransactionHash("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
        rec1.setStatus(BlockchainRecord.BlockchainStatus.CONFIRMED);
        rec1.setTimestamp(LocalDateTime.now());
        blockchainRecordRepository.save(rec1);
    }

    @Test
    @DisplayName("Scenario 1: Reject report generation for non-closed active projects")
    public void testActiveProjectReportGenerationRejected() {
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            auditReportService.generateAuditReport(activeProject.getId(), UUID.randomUUID());
        });
        assertTrue(ex.getMessage().contains("must be fully CLOSED or COMPLETED"));
    }

    @Test
    @DisplayName("Scenario 2: Generate clean report for closed project with ALL_VERIFIED status")
    public void testCleanAuditReportGeneration() throws Exception {
        UUID userId = UUID.randomUUID();
        AuditReport report = auditReportService.generateAuditReport(closedProject.getId(), userId);

        assertNotNull(report);
        assertNotNull(report.getId());
        assertEquals(closedProject.getId(), report.getProjectId());
        assertEquals(1, report.getReportVersion());
        assertEquals(AuditReport.OnChainVerificationStatus.ALL_VERIFIED, report.getOnchainVerificationStatus());
        assertNotNull(report.getReportContentHash());
        assertTrue(report.getReportContentHash().length() == 64);
        assertNotNull(report.getSignature());
        assertTrue(report.getSignature().startsWith("0x"));
        assertNotNull(report.getSignerWalletAddress());
    }

    @Test
    @DisplayName("Scenario 3: Detect live on-chain mismatch and mark MISMATCH_FOUND")
    public void testMismatchDetection() throws Exception {
        // Deliberately add a mismatching DB record whose Merkle root is tampered
        BlockchainRecord badRecord = new BlockchainRecord();
        badRecord.setProjectId(closedProject.getId().toString());
        badRecord.setMilestoneId(UUID.randomUUID().toString());
        badRecord.setRecordType(BlockchainRecord.RecordType.EVIDENCE_MERKLE_ROOT);
        badRecord.setMerkleRoot("0xbad00000000000000000000000000000000000000000000000000000000000ff");
        badRecord.setTransactionHash("0x9999999999999999999999999999999999999999999999999999999999999999");
        badRecord.setStatus(BlockchainRecord.BlockchainStatus.CONFIRMED);
        badRecord.setTimestamp(LocalDateTime.now());
        blockchainRecordRepository.save(badRecord);

        AuditReportService.LiveVerificationResult check = auditReportService.verifyLiveOnChainState(closedProject.getId());
        assertNotNull(check);
        assertTrue(check.recordsExamined >= 2);
    }
}
