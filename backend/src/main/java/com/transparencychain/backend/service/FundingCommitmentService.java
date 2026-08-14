package com.transparencychain.backend.service;

import com.transparencychain.backend.dto.CommitRequest;
import com.transparencychain.backend.dto.MilestoneCommitmentDto;
import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FundingCommitmentService {

    @Autowired private FundingCommitmentRepository fundingCommitmentRepository;
    @Autowired private ProjectRepository projectRepository;
    @Autowired private MilestoneRepository milestoneRepository;
    @Autowired private MilestoneVersionRepository versionRepository;
    @Autowired private FunderProfileRepository funderProfileRepository;
    @Autowired private OrgProjectEngagementRepository engagementRepository;
    @Autowired private EscrowAccountRepository escrowAccountRepository;
    @Autowired private BlockchainService blockchainService;
    @Autowired private AuditLogService auditLogService;

    @Transactional
    public FundingCommitment createCommitment(UUID projectId, UUID funderUserId, CommitRequest request) {
        FunderProfile funder = funderProfileRepository.findByUserId(funderUserId)
                .orElseThrow(() -> new IllegalArgumentException("Funder profile not found for user ID: " + funderUserId));

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));

        List<FundingCommitment.FundingCommitmentStatus> lockedStatuses = List.of(
                FundingCommitment.FundingCommitmentStatus.PENDING,
                FundingCommitment.FundingCommitmentStatus.ACTIVE,
                FundingCommitment.FundingCommitmentStatus.PARTIALLY_RELEASED,
                FundingCommitment.FundingCommitmentStatus.FULLY_RELEASED
        );
        boolean slotLocked = fundingCommitmentRepository.existsByProjectIdAndStatusIn(projectId, lockedStatuses);
        if (slotLocked) {
            throw new IllegalStateException("Cannot commit funding: This project slot is already locked by an active commitment.");
        }

        // Check if there is an existing ACTIVE or committed engagement/commitment
        Optional<OrgProjectEngagement> existingEngagement = engagementRepository.findByFunderIdAndProjectId(funder.getId(), projectId);
        if (existingEngagement.isPresent()) {
            OrgProjectEngagement.EngagementStatus status = existingEngagement.get().getStatus();
            if (status == OrgProjectEngagement.EngagementStatus.COMMITTED || status == OrgProjectEngagement.EngagementStatus.ACTIVE) {
                throw new IllegalStateException("An active funding commitment already exists for this project.");
            }
        }

        // Enforce: every milestone must be LOCKED
        List<Milestone> milestones = milestoneRepository.findByProjectId(projectId);
        if (milestones.isEmpty()) {
            throw new IllegalStateException("Cannot commit funding: Project has no milestones defined.");
        }

        for (Milestone milestone : milestones) {
            if (milestone.getStatus() == Milestone.MilestoneStatus.PENDING) {
                milestone.setStatus(Milestone.MilestoneStatus.LOCKED);
                milestoneRepository.save(milestone);
            } else if (milestone.getStatus() != Milestone.MilestoneStatus.LOCKED) {
                throw new IllegalStateException("Cannot commit funding: Milestone '" + milestone.getTitle() + "' is not LOCKED.");
            }
        }

        // Budget conservation checks
        if (request.getMilestoneBreakdown() == null || request.getMilestoneBreakdown().isEmpty()) {
            throw new IllegalArgumentException("Milestone breakdown must be provided.");
        }

        if (request.getMilestoneBreakdown().size() != milestones.size()) {
            throw new IllegalArgumentException("Breakdown must contain all " + milestones.size() + " milestones of the project.");
        }

        BigDecimal breakdownSum = BigDecimal.ZERO;
        Set<UUID> requestMilestoneIds = new HashSet<>();
        Map<UUID, Milestone> milestoneMap = milestones.stream().collect(Collectors.toMap(Milestone::getId, m -> m));

        for (MilestoneCommitmentDto breakdownDto : request.getMilestoneBreakdown()) {
            if (breakdownDto.getMilestoneId() == null) {
                throw new IllegalArgumentException("Milestone ID in breakdown cannot be null.");
            }
            if (breakdownDto.getAmount() == null || breakdownDto.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Committed amount must be greater than zero.");
            }
            Milestone milestone = milestoneMap.get(breakdownDto.getMilestoneId());
            if (milestone == null) {
                throw new IllegalArgumentException("Milestone " + breakdownDto.getMilestoneId() + " does not belong to this project.");
            }
            if (!requestMilestoneIds.add(breakdownDto.getMilestoneId())) {
                throw new IllegalArgumentException("Duplicate milestone ID in breakdown: " + breakdownDto.getMilestoneId());
            }

            // Determine active budget
            BigDecimal activeBudget = milestone.getAmountAllocated();
            if (milestone.getCurrentVersionId() != null) {
                MilestoneVersion activeVersion = versionRepository.findById(milestone.getCurrentVersionId())
                        .orElseThrow(() -> new IllegalStateException("Active version not found for milestone: " + milestone.getId()));
                activeBudget = activeVersion.getBudget();
            }

            if (breakdownDto.getAmount().compareTo(activeBudget) != 0) {
                throw new IllegalArgumentException("Committed amount (" + breakdownDto.getAmount() + ") for milestone '" 
                        + milestone.getTitle() + "' does not match its locked budget (" + activeBudget + ").");
            }

            breakdownSum = breakdownSum.add(breakdownDto.getAmount());
        }

        if (request.getTotalAmount() == null || request.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Total committed amount must be greater than zero.");
        }

        if (breakdownSum.compareTo(request.getTotalAmount()) != 0) {
            throw new IllegalArgumentException("Sum of milestone budgets (" + breakdownSum + ") does not equal total committed amount (" + request.getTotalAmount() + ").");
        }

        // Check if committed budget exceeds the NGO's originally requested budget by more than 10%
        boolean budgetExceededWarning = false;
        BigDecimal originalBudget = project.getTotalBudget();
        if (originalBudget != null && originalBudget.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal toleranceLimit = originalBudget.multiply(BigDecimal.valueOf(1.10));
            if (request.getTotalAmount().compareTo(toleranceLimit) > 0) {
                budgetExceededWarning = true;
            }
        }

        // Create FundingCommitment
        FundingCommitment commitment = new FundingCommitment();
        commitment.setFunder(funder);
        commitment.setProject(project);
        commitment.setTotalCommittedAmount(request.getTotalAmount());
        commitment.setStatus(FundingCommitment.FundingCommitmentStatus.PENDING);
        commitment.setBudgetExceededWarning(budgetExceededWarning);

        List<FundingMilestoneCommitment> breakdown = request.getMilestoneBreakdown().stream()
                .map(dto -> {
                    FundingMilestoneCommitment fmc = new FundingMilestoneCommitment();
                    fmc.setMilestoneId(dto.getMilestoneId());
                    fmc.setCommittedAmount(dto.getAmount());
                    return fmc;
                }).collect(Collectors.toList());
        commitment.setCommittedMilestoneBreakdown(breakdown);

        commitment = fundingCommitmentRepository.save(commitment);

        // Update OrgProjectEngagement to COMMITTED
        OrgProjectEngagement engagement = existingEngagement.orElseGet(() -> {
            OrgProjectEngagement e = new OrgProjectEngagement();
            e.setFunder(funder);
            e.setProject(project);
            return e;
        });
        engagement.setStatus(OrgProjectEngagement.EngagementStatus.COMMITTED);
        engagementRepository.save(engagement);

        auditLogService.logAction(projectId, "COMMITMENT_CREATED",
                "Funder committed " + commitment.getTotalCommittedAmount() + " to project. Commitment ID: " + commitment.getId() + " (PENDING)");

        return commitment;
    }

    @Transactional
    public FundingCommitment activateCommitment(UUID commitmentId, UUID funderUserId) {
        FunderProfile funder = funderProfileRepository.findByUserId(funderUserId)
                .orElseThrow(() -> new IllegalArgumentException("Funder profile not found for user ID: " + funderUserId));

        FundingCommitment commitment = fundingCommitmentRepository.findById(commitmentId)
                .orElseThrow(() -> new IllegalArgumentException("Funding commitment not found: " + commitmentId));

        if (!commitment.getFunder().getId().equals(funder.getId())) {
            throw new SecurityException("Unauthorized access to funding commitment.");
        }

        if (commitment.getStatus() != FundingCommitment.FundingCommitmentStatus.PENDING) {
            throw new IllegalStateException("Commitment must be in PENDING status to activate.");
        }

        Project project = commitment.getProject();

        // 1. simulated escrow ledger funding
        EscrowAccount escrow = escrowAccountRepository.findByProjectId(project.getId())
                .orElseGet(() -> {
                    EscrowAccount e = new EscrowAccount();
                    e.setProject(project);
                    return e;
                });
        escrow.setLockedAmount(commitment.getTotalCommittedAmount());
        escrow.setReleasedAmount(BigDecimal.ZERO);
        escrow.setStatus(EscrowAccount.EscrowStatus.LOCKED);
        escrowAccountRepository.save(escrow);

        // 2. deploy escrow (blockchain service simulation)
        String txHash = blockchainService.deployEscrow(
                project.getId(),
                commitment.getTotalCommittedAmount(),
                project.getNgo() != null ? project.getNgo().getId().toString() : "0x0"
        );
        auditLogService.logAction(project.getId(), "BLOCKCHAIN_ESCROW_DEPLOYED",
                "Simulated Escrow contract deployed on-chain. Tx Hash: " + txHash);

        // 3. update milestones status to LOCKED
        List<Milestone> milestones = milestoneRepository.findByProjectId(project.getId());
        for (Milestone milestone : milestones) {
            milestone.setStatus(Milestone.MilestoneStatus.LOCKED);
            milestoneRepository.save(milestone);
        }

        // 4. update project status to ESCROWED
        project.setStatus(Project.ProjectStatus.ESCROWED);
        projectRepository.save(project);

        // 5. update engagement status to ACTIVE
        OrgProjectEngagement engagement = engagementRepository.findByFunderIdAndProjectId(funder.getId(), project.getId())
                .orElseThrow(() -> new IllegalStateException("Engagement not found for the project."));
        engagement.setStatus(OrgProjectEngagement.EngagementStatus.ACTIVE);
        engagement.setCommittedAt(LocalDateTime.now());
        engagementRepository.save(engagement);

        // 6. update commitment status to ACTIVE
        commitment.setStatus(FundingCommitment.FundingCommitmentStatus.ACTIVE);
        commitment = fundingCommitmentRepository.save(commitment);

        auditLogService.logAction(project.getId(), "COMMITMENT_ACTIVATED",
                "Funding commitment activated (ACTIVE). Escrow loaded with " + commitment.getTotalCommittedAmount() + ". Milestones moved to IN_PROGRESS.");

        return commitment;
    }

    @Transactional
    public FundingCommitment cancelCommitment(UUID commitmentId, UUID funderUserId) {
        FunderProfile funder = funderProfileRepository.findByUserId(funderUserId)
                .orElseThrow(() -> new IllegalArgumentException("Funder profile not found for user ID: " + funderUserId));

        FundingCommitment commitment = fundingCommitmentRepository.findById(commitmentId)
                .orElseThrow(() -> new IllegalArgumentException("Funding commitment not found: " + commitmentId));

        if (!commitment.getFunder().getId().equals(funder.getId())) {
            throw new SecurityException("Unauthorized access to funding commitment.");
        }

        if (commitment.getStatus() != FundingCommitment.FundingCommitmentStatus.PENDING) {
            throw new IllegalStateException("Commitment can only be cancelled if it is not yet ACTIVE (current: " + commitment.getStatus() + ").");
        }

        commitment.setStatus(FundingCommitment.FundingCommitmentStatus.CANCELLED);
        commitment = fundingCommitmentRepository.save(commitment);

        // Revert project engagement to NEGOTIATING so they can edit and commit again
        OrgProjectEngagement engagement = engagementRepository.findByFunderIdAndProjectId(funder.getId(), commitment.getProject().getId())
                .orElseThrow(() -> new IllegalStateException("Engagement not found for the project."));
        engagement.setStatus(OrgProjectEngagement.EngagementStatus.NEGOTIATING);
        engagementRepository.save(engagement);

        auditLogService.logAction(commitment.getProject().getId(), "COMMITMENT_CANCELLED",
                "Funding commitment cancelled by funder. Engagement reverted to NEGOTIATING.");

        return commitment;
    }

    @Transactional(readOnly = true)
    public FundingCommitment getCommitment(UUID id, UUID funderUserId) {
        FunderProfile funder = funderProfileRepository.findByUserId(funderUserId)
                .orElseThrow(() -> new IllegalArgumentException("Funder profile not found for user ID: " + funderUserId));

        FundingCommitment commitment = fundingCommitmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Funding commitment not found: " + id));

        if (!commitment.getFunder().getId().equals(funder.getId())) {
            throw new SecurityException("Unauthorized access to funding commitment.");
        }

        return commitment;
    }

    @Transactional(readOnly = true)
    public Optional<FundingCommitment> getCommitmentByProject(UUID projectId, UUID funderUserId) {
        FunderProfile funder = funderProfileRepository.findByUserId(funderUserId)
                .orElseThrow(() -> new IllegalArgumentException("Funder profile not found for user ID: " + funderUserId));

        return fundingCommitmentRepository.findByProjectId(projectId).stream()
                .filter(c -> c.getFunder().getId().equals(funder.getId()))
                .findFirst();
    }

    @Transactional(readOnly = true)
    public EscrowAccount getEscrowByProject(UUID projectId) {
        return escrowAccountRepository.findByProjectId(projectId)
                .orElseThrow(() -> new IllegalArgumentException("No escrow account found for project: " + projectId));
    }

    @Transactional(readOnly = true)
    public List<FundingCommitment> getAllCommitmentsForFunder(UUID funderUserId) {
        FunderProfile funder = funderProfileRepository.findByUserId(funderUserId)
                .orElseThrow(() -> new IllegalArgumentException("Funder profile not found for user ID: " + funderUserId));
        return fundingCommitmentRepository.findByFunderId(funder.getId());
    }
}
