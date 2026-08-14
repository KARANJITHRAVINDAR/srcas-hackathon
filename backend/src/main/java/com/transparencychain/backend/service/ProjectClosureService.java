package com.transparencychain.backend.service;

import com.transparencychain.backend.dto.ProjectClosureStatusDto;
import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ProjectClosureService {

    @Autowired private ProjectRepository projectRepository;
    @Autowired private MilestoneRepository milestoneRepository;
    @Autowired private BeneficiaryVerificationFormRepository formRepository;
    @Autowired private BeneficiaryFormResponseRepository responseRepository;
    @Autowired private ProofSubmissionRepository proofSubmissionRepository;
    @Autowired private AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public ProjectClosureStatusDto getClosureStatus(UUID projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));

        int targetBeneficiaries = (project.getExpectedBeneficiaries() != null && project.getExpectedBeneficiaries() > 0)
                ? project.getExpectedBeneficiaries()
                : 100;

        List<BeneficiaryVerificationForm> forms = formRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        long totalFeedbackCount = 0;
        long positiveFeedbackCount = 0;

        for (BeneficiaryVerificationForm form : forms) {
            List<BeneficiaryFormResponse> responses = responseRepository.findByFormIdOrderBySubmittedAtDesc(form.getId());
            totalFeedbackCount += responses.size();
            positiveFeedbackCount += responses.stream()
                    .filter(r -> r.getOverallResponse() == BeneficiaryFormResponse.OverallResponse.YES || (r.getRating() != null && r.getRating() >= 3))
                    .count();
        }

        double coveragePercentage = (targetBeneficiaries > 0) ? ((double) totalFeedbackCount / targetBeneficiaries) * 100.0 : 0.0;
        double positivePercentage = (totalFeedbackCount > 0) ? ((double) positiveFeedbackCount / totalFeedbackCount) * 100.0 : 0.0;

        boolean coverageMet = ((double) totalFeedbackCount / targetBeneficiaries) >= 0.20;
        boolean positiveMet = totalFeedbackCount > 0 && ((double) positiveFeedbackCount / totalFeedbackCount) >= 0.80;

        // Check NGO closure video (submitted against CLOSURE milestone or containing CLOSURE_VIDEO in fileType/metadata)
        List<Milestone> milestones = milestoneRepository.findByProjectId(projectId);
        Optional<Milestone> closureMs = milestones.stream()
                .filter(m -> m.getMilestoneType() == Milestone.MilestoneType.CLOSURE || "Project Closure & Impact Assessment".equalsIgnoreCase(m.getTitle()))
                .findFirst();

        boolean closureVideoSubmitted = false;
        if (closureMs.isPresent()) {
            List<ProofSubmission> proofs = proofSubmissionRepository.findByMilestoneId(closureMs.get().getId());
            closureVideoSubmitted = !proofs.isEmpty();
        }
        if (!closureVideoSubmitted) {
            // Check any proof submitted across project with metadata CLOSURE_VIDEO
            for (Milestone m : milestones) {
                List<ProofSubmission> proofs = proofSubmissionRepository.findByMilestoneId(m.getId());
                for (ProofSubmission p : proofs) {
                    if ((p.getFileType() != null && p.getFileType().contains("CLOSURE_VIDEO")) ||
                        (p.getMetadata() != null && p.getMetadata().contains("CLOSURE_VIDEO"))) {
                        closureVideoSubmitted = true;
                        break;
                    }
                }
                if (closureVideoSubmitted) break;
            }
        }

        boolean eligible = coverageMet && positiveMet && closureVideoSubmitted;
        boolean isClosed = project.getStatus() == Project.ProjectStatus.CLOSED;

        ProjectClosureStatusDto dto = new ProjectClosureStatusDto();
        dto.setProjectId(projectId);
        dto.setTargetBeneficiaries(targetBeneficiaries);
        dto.setTotalFeedbackCount(totalFeedbackCount);
        dto.setPositiveFeedbackCount(positiveFeedbackCount);
        dto.setCoveragePercentage(Math.round(coveragePercentage * 10.0) / 10.0);
        dto.setPositivePercentage(Math.round(positivePercentage * 10.0) / 10.0);
        dto.setCoverageThresholdMet(coverageMet);
        dto.setPositiveThresholdMet(positiveMet);
        dto.setClosureVideoSubmitted(closureVideoSubmitted);
        dto.setEligibleForClosure(eligible);
        dto.setClosed(isClosed);

        return dto;
    }

    @Transactional
    public ProjectClosureStatusDto evaluateAndTriggerClosure(UUID projectId) {
        ProjectClosureStatusDto status = getClosureStatus(projectId);
        Project project = projectRepository.findById(projectId).orElseThrow();

        if (status.isEligibleForClosure() && project.getStatus() != Project.ProjectStatus.CLOSED) {
            project.setStatus(Project.ProjectStatus.CLOSED);
            projectRepository.save(project);

            List<Milestone> milestones = milestoneRepository.findByProjectId(projectId);
            milestones.stream()
                    .filter(m -> m.getMilestoneType() == Milestone.MilestoneType.CLOSURE || "Project Closure & Impact Assessment".equalsIgnoreCase(m.getTitle()))
                    .findFirst()
                    .ifPresent(m -> {
                        m.setStatus(Milestone.MilestoneStatus.COMPLETED);
                        milestoneRepository.save(m);
                    });

            auditLogService.logAction(
                    projectId,
                    "PROJECT_CLOSED",
                    "Project successfully closed! Beneficiary coverage: " + status.getCoveragePercentage() + "%, Positive: " + status.getPositivePercentage() + "%"
            );

            status.setClosed(true);
        }

        return status;
    }
}
