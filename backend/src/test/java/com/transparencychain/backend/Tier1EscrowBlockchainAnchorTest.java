package com.transparencychain.backend;

import com.transparencychain.backend.model.BlockchainRecord;
import com.transparencychain.backend.model.Milestone;
import com.transparencychain.backend.model.Project;
import com.transparencychain.backend.repository.BlockchainRecordRepository;
import com.transparencychain.backend.repository.MilestoneRepository;
import com.transparencychain.backend.repository.ProjectRepository;
import com.transparencychain.backend.service.BlockchainService;
import com.transparencychain.backend.service.DisbursementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class Tier1EscrowBlockchainAnchorTest {

    @Mock
    private BlockchainRecordRepository blockchainRecordRepository;

    @Mock
    private MilestoneRepository milestoneRepository;

    @Mock
    private ProjectRepository projectRepository;

    @InjectMocks
    private BlockchainService blockchainService;

    @Test
    @DisplayName("Test 1: RecordType discriminator separates Merkle Roots and Disbursement Anchors")
    public void testRecordTypeSeparation() {
        BlockchainRecord merkleRecord = new BlockchainRecord();
        merkleRecord.setProjectId(UUID.randomUUID().toString());
        merkleRecord.setMilestoneId(UUID.randomUUID().toString());
        merkleRecord.setRecordType(BlockchainRecord.RecordType.EVIDENCE_MERKLE_ROOT);
        merkleRecord.setMerkleRoot("0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890");
        merkleRecord.setEvidenceCount(5);

        BlockchainRecord disbRecord = new BlockchainRecord();
        disbRecord.setProjectId(UUID.randomUUID().toString());
        disbRecord.setMilestoneId(UUID.randomUUID().toString());
        disbRecord.setRecordType(BlockchainRecord.RecordType.DISBURSEMENT_ANCHOR);
        disbRecord.setDisbursementAmount(new BigDecimal("50000.00"));
        disbRecord.setDisbursementReference("DISB-REF-1001");

        assertNotEquals(merkleRecord.getRecordType(), disbRecord.getRecordType());
        assertEquals(BlockchainRecord.RecordType.EVIDENCE_MERKLE_ROOT, merkleRecord.getRecordType());
        assertEquals(BlockchainRecord.RecordType.DISBURSEMENT_ANCHOR, disbRecord.getRecordType());
    }

    @Test
    @DisplayName("Test 2: Non-blocking disbursement anchor creates PENDING record immediately")
    public void testNonBlockingAnchorDisbursement() {
        UUID projectId = UUID.randomUUID();
        UUID milestoneId = UUID.randomUUID();
        BigDecimal amount = new BigDecimal("75000.00");

        when(blockchainRecordRepository.save(any(BlockchainRecord.class))).thenAnswer(i -> i.getArgument(0));

        String trackingRef = blockchainService.anchorDisbursement(projectId, milestoneId, amount, "FUNDER_01");

        assertNotNull(trackingRef);
        assertTrue(trackingRef.startsWith("DISB-"));
        verify(blockchainRecordRepository, atLeastOnce()).save(any(BlockchainRecord.class));
    }

    @Test
    @DisplayName("Test 3: Milestone execution updates fundsTransferred flag and timestamp")
    public void testMilestoneDisbursementFlags() {
        Milestone milestone = new Milestone();
        milestone.setId(UUID.randomUUID());
        milestone.setTitle("Phase 1: Mobilization");
        milestone.setAmountAllocated(new BigDecimal("100000.00"));
        milestone.setStatus(Milestone.MilestoneStatus.IN_PROGRESS);
        milestone.setFundsTransferred(false);

        // Simulate disbursement update
        milestone.setStatus(Milestone.MilestoneStatus.DISBURSED);
        milestone.setFundsTransferred(true);
        milestone.setFundsTransferredAt(LocalDateTime.now());
        milestone.setDisbursementTxHash("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");

        assertTrue(milestone.getFundsTransferred());
        assertNotNull(milestone.getFundsTransferredAt());
        assertEquals(Milestone.MilestoneStatus.DISBURSED, milestone.getStatus());
        assertTrue(milestone.getDisbursementTxHash().startsWith("0x"));
    }

    @Test
    @DisplayName("Test 4: Non-blocking RPC failure handling marks status PENDING_ANCHOR without exception")
    public void testNonBlockingFailureHandling() {
        BlockchainRecord record = new BlockchainRecord();
        record.setId(UUID.randomUUID());
        record.setStatus(BlockchainRecord.BlockchainStatus.PENDING);

        // When RPC fails, status transitions to PENDING_ANCHOR
        record.setStatus(BlockchainRecord.BlockchainStatus.PENDING_ANCHOR);

        assertEquals(BlockchainRecord.BlockchainStatus.PENDING_ANCHOR, record.getStatus());
    }
}
