package com.transparencychain.backend.service;

import com.transparencychain.backend.dto.ProjectClosureStatusDto;
import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import com.transparencychain.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class ProjectClosureService {

    @Autowired private ProjectRepository projectRepository;
    @Autowired private MilestoneRepository milestoneRepository;
    @Autowired private BeneficiaryVerificationFormRepository formRepository;
    @Autowired private BeneficiaryFormResponseRepository responseRepository;
    @Autowired private ProofSubmissionRepository proofSubmissionRepository;
    @Autowired private MilestoneClosureConfigRepository configRepository;
    @Autowired private ClosureVideoRepository closureVideoRepository;
    @Autowired private NotificationService notificationService;
    @Autowired private AuditLogService auditLogService;
    @Autowired private FunderProfileRepository funderProfileRepository;

    private static final String UPLOAD_DIR = "uploads";

    @Transactional
    public MilestoneClosureConfig getOrCreateConfig(UUID projectId) {
        return configRepository.findByProjectId(projectId).orElseGet(() -> {
            MilestoneClosureConfig config = new MilestoneClosureConfig();
            config.setProjectId(projectId);
            config.setMinCoverageRate(new BigDecimal("0.10")); // Default 10%
            config.setMinSampleSize(10); // Minimum 10 unique beneficiary responses
            config.setMinPositiveRate(new BigDecimal("0.80")); // 80% positive sentiment
            config.setIncludeNeutralInDenominator(true);
            return configRepository.save(config);
        });
    }

    @Transactional(readOnly = true)
    public ProjectClosureStatusDto getClosureStatus(UUID projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));

        MilestoneClosureConfig config = configRepository.findByProjectId(projectId).orElseGet(() -> {
            MilestoneClosureConfig cfg = new MilestoneClosureConfig();
            cfg.setMinCoverageRate(new BigDecimal("0.10"));
            cfg.setMinSampleSize(10);
            cfg.setMinPositiveRate(new BigDecimal("0.80"));
            cfg.setIncludeNeutralInDenominator(true);
            return cfg;
        });

        int targetBeneficiaries = (project.getExpectedBeneficiaries() != null && project.getExpectedBeneficiaries() > 0)
                ? project.getExpectedBeneficiaries()
                : 100;

        List<BeneficiaryVerificationForm> forms = formRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        
        // Deduplicate unique beneficiary feedback by beneficiaryId or responseToken or ID
        Map<String, BeneficiaryFormResponse> uniqueFeedbackMap = new LinkedHashMap<>();
        long totalResponsesCount = 0;

        for (BeneficiaryVerificationForm form : forms) {
            List<BeneficiaryFormResponse> responses = responseRepository.findByFormIdOrderBySubmittedAtDesc(form.getId());
            totalResponsesCount += responses.size();
            for (BeneficiaryFormResponse r : responses) {
                String dedupeKey = r.getBeneficiaryId();
                if (dedupeKey == null || dedupeKey.trim().isEmpty()) {
                    dedupeKey = r.getResponseToken();
                }
                if (dedupeKey == null || dedupeKey.trim().isEmpty()) {
                    dedupeKey = r.getId().toString();
                }
                if (!uniqueFeedbackMap.containsKey(dedupeKey)) {
                    uniqueFeedbackMap.put(dedupeKey, r);
                }
            }
        }

        long uniqueCount = uniqueFeedbackMap.size();
        long positiveCount = 0;
        long negativeCount = 0;
        long neutralCount = 0;

        for (BeneficiaryFormResponse r : uniqueFeedbackMap.values()) {
            if (r.getSentiment() == BeneficiaryFormResponse.Sentiment.POSITIVE ||
                r.getOverallResponse() == BeneficiaryFormResponse.OverallResponse.YES ||
                (r.getRating() != null && r.getRating() >= 4)) {
                positiveCount++;
            } else if (r.getSentiment() == BeneficiaryFormResponse.Sentiment.NEGATIVE ||
                       r.getOverallResponse() == BeneficiaryFormResponse.OverallResponse.NO ||
                       (r.getRating() != null && r.getRating() <= 2)) {
                negativeCount++;
            } else {
                neutralCount++;
            }
        }

        // Gate 1: Coverage & Minimum Sample Size
        double minCoverageRate = config.getMinCoverageRate() != null ? config.getMinCoverageRate().doubleValue() * 100.0 : 10.0;
        int minSampleSize = config.getMinSampleSize() != null ? config.getMinSampleSize() : 10;
        
        double coveragePercentage = targetBeneficiaries > 0 ? ((double) uniqueCount / targetBeneficiaries) * 100.0 : 0.0;
        boolean coverageMet = coveragePercentage >= minCoverageRate;
        boolean sampleSizeMet = uniqueCount >= minSampleSize;
        boolean gate1Passed = coverageMet && sampleSizeMet;

        // Gate 2: Positive Sentiment Rate
        double minPositiveRate = config.getMinPositiveRate() != null ? config.getMinPositiveRate().doubleValue() * 100.0 : 80.0;
        double positivePercentage = uniqueCount > 0 ? ((double) positiveCount / uniqueCount) * 100.0 : 0.0;
        boolean positiveMet = uniqueCount > 0 && (positivePercentage >= minPositiveRate);
        boolean gate2Passed = positiveMet;

        // Gate 3: Geo-tagged Closure Video
        Optional<ClosureVideo> closureVideoOpt = closureVideoRepository.findFirstByProjectIdOrderByUploadedAtDesc(projectId);
        boolean closureVideoSubmitted = closureVideoOpt.isPresent();
        boolean closureVideoVerified = false;
        String videoStatus = "NOT_SUBMITTED";
        ClosureVideo closureVideo = null;

        if (closureVideoOpt.isPresent()) {
            closureVideo = closureVideoOpt.get();
            videoStatus = closureVideo.getStatus().name();
            closureVideoVerified = closureVideo.getStatus() == ClosureVideo.ClosureVideoStatus.VERIFIED;
        } else {
            // Fallback check on proof submissions
            List<Milestone> milestones = milestoneRepository.findByProjectId(projectId);
            for (Milestone m : milestones) {
                List<ProofSubmission> proofs = proofSubmissionRepository.findByMilestoneId(m.getId());
                for (ProofSubmission p : proofs) {
                    if ((p.getFileType() != null && p.getFileType().contains("CLOSURE_VIDEO")) ||
                        (p.getMetadata() != null && p.getMetadata().contains("CLOSURE_VIDEO"))) {
                        closureVideoSubmitted = true;
                        videoStatus = "VERIFIED";
                        closureVideoVerified = true;
                        break;
                    }
                }
                if (closureVideoSubmitted) break;
            }
        }

        boolean gate3Passed = closureVideoVerified;
        boolean canClose = gate1Passed && gate2Passed && gate3Passed;
        boolean isClosed = project.getStatus() == Project.ProjectStatus.CLOSED;

        ProjectClosureStatusDto dto = new ProjectClosureStatusDto();
        dto.setProjectId(projectId);
        dto.setTargetBeneficiaries(targetBeneficiaries);
        
        dto.setUniqueFeedbackCount(uniqueCount);
        dto.setTotalFeedbackCount(totalResponsesCount);
        dto.setMinSampleSize(minSampleSize);
        dto.setSampleSizeMet(sampleSizeMet);
        dto.setCoveragePercentage(Math.round(coveragePercentage * 10.0) / 10.0);
        dto.setRequiredCoveragePercentage(minCoverageRate);
        dto.setCoverageThresholdMet(coverageMet);
        dto.setGate1Passed(gate1Passed);

        dto.setPositiveCount(positiveCount);
        dto.setNegativeCount(negativeCount);
        dto.setNeutralCount(neutralCount);
        dto.setPositivePercentage(Math.round(positivePercentage * 10.0) / 10.0);
        dto.setRequiredPositivePercentage(minPositiveRate);
        dto.setPositiveThresholdMet(positiveMet);
        dto.setGate2Passed(gate2Passed);

        dto.setClosureVideoSubmitted(closureVideoSubmitted);
        dto.setClosureVideoVerified(closureVideoVerified);
        dto.setClosureVideoStatus(videoStatus);
        dto.setClosureVideo(closureVideo);
        dto.setGate3Passed(gate3Passed);

        dto.setCanClose(canClose);
        dto.setEligibleForClosure(canClose);
        dto.setClosed(isClosed);

        // Populate itemized partial failure explanations
        List<String> failures = new ArrayList<>();
        List<String> highlights = new ArrayList<>();

        if (!coverageMet) {
            failures.add("Beneficiary Coverage is " + String.format("%.1f", coveragePercentage) + "% (" + uniqueCount + "/" + targetBeneficiaries + " verified beneficiaries). Minimum " + String.format("%.1f", minCoverageRate) + "% required.");
        } else {
            highlights.add("Beneficiary Coverage: " + String.format("%.1f", coveragePercentage) + "% achieved (target ≥ " + String.format("%.1f", minCoverageRate) + "%).");
        }

        if (!sampleSizeMet) {
            failures.add("Sample size of " + uniqueCount + " unique responses is below the required statistical floor of " + minSampleSize + ".");
        } else {
            highlights.add("Statistical sample size met (" + uniqueCount + " unique responses ≥ " + minSampleSize + ").");
        }

        if (!positiveMet) {
            failures.add("Positive sentiment is " + String.format("%.1f", positivePercentage) + "% (" + positiveCount + "/" + uniqueCount + " positive). Minimum " + String.format("%.1f", minPositiveRate) + "% required.");
        } else {
            highlights.add("Positive Sentiment: " + String.format("%.1f", positivePercentage) + "% achieved (target ≥ " + String.format("%.1f", minPositiveRate) + "%).");
        }

        if (!closureVideoSubmitted) {
            failures.add("NGO geo-tagged closure video has not been uploaded.");
        } else if ("PENDING".equalsIgnoreCase(videoStatus)) {
            failures.add("NGO closure video is uploaded with GPS metadata but pending Funder verification.");
        } else if ("REJECTED".equalsIgnoreCase(videoStatus)) {
            failures.add("NGO closure video was rejected by funder. Re-upload required.");
        } else {
            highlights.add("NGO Geo-tagged closure video verified.");
        }

        dto.setFailureReasons(failures);
        dto.setPassHighlights(highlights);

        return dto;
    }

    @Transactional
    public ClosureVideo uploadClosureVideo(UUID projectId, MultipartFile file, Double lat, Double lng, String capturedAtStr, UserDetailsImpl user) throws Exception {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));

        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String fileName = UUID.randomUUID() + "_" + (file.getOriginalFilename() != null ? file.getOriginalFilename().replaceAll("\\s+", "_") : "closure_video.mp4");
        Path filePath = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        // Compute SHA-256
        String fileHash = "";
        try (InputStream is = Files.newInputStream(filePath)) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[8192];
            int read;
            while ((read = is.read(buffer)) > 0) {
                digest.update(buffer, 0, read);
            }
            byte[] hashBytes = digest.digest();
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            fileHash = sb.toString();
        }

        LocalDateTime capturedAt = LocalDateTime.now();
        if (capturedAtStr != null && !capturedAtStr.trim().isEmpty()) {
            try {
                capturedAt = LocalDateTime.parse(capturedAtStr, DateTimeFormatter.ISO_DATE_TIME);
            } catch (Exception e) {
                try {
                    capturedAt = LocalDateTime.parse(capturedAtStr);
                } catch (Exception ignored) {}
            }
        }

        // Check distance against project registered latitude / longitude
        boolean distanceFlag = false;
        Double distanceKm = null;
        if (lat != null && lng != null && project.getLatitude() != null && project.getLongitude() != null) {
            distanceKm = calculateHaversineDistanceKm(lat, lng, project.getLatitude().doubleValue(), project.getLongitude().doubleValue());
            if (distanceKm > 50.0) { // Outside 50km radius
                distanceFlag = true;
            }
        }

        List<Milestone> milestones = milestoneRepository.findByProjectId(projectId);
        Optional<Milestone> closureMs = milestones.stream()
                .filter(m -> m.getMilestoneType() == Milestone.MilestoneType.CLOSURE || "Project Closure & Impact Assessment".equalsIgnoreCase(m.getTitle()))
                .findFirst();

        ClosureVideo video = closureVideoRepository.findFirstByProjectIdOrderByUploadedAtDesc(projectId).orElseGet(ClosureVideo::new);
        video.setProjectId(projectId);
        if (closureMs.isPresent()) {
            video.setMilestoneId(closureMs.get().getId());
        }
        video.setFileUrl("/uploads/" + fileName);
        video.setFileHash(fileHash);
        video.setCapturedLat(lat);
        video.setCapturedLng(lng);
        video.setCapturedAt(capturedAt);
        video.setUploadedAt(LocalDateTime.now());
        video.setGeotagDistanceFlag(distanceFlag);
        video.setDistanceFromProjectKm(distanceKm != null ? Math.round(distanceKm * 10.0) / 10.0 : null);
        video.setStatus(ClosureVideo.ClosureVideoStatus.PENDING);
        video.setReviewReason(null);
        video.setReviewedAt(null);
        video.setReviewedBy(null);

        video = closureVideoRepository.save(video);

        // Notify Funder
        notificationService.notifyProjectFunders(
                project,
                null,
                Notification.NotificationEventType.CLOSURE_VIDEO_SUBMITTED,
                "NGO Geo-tagged Closure Video Submitted",
                "NGO has uploaded a final closure video with GPS coordinates for project '" + project.getTitle() + "'. Please review and verify.",
                "/funder/projects/" + projectId
        );

        auditLogService.logAction(
                projectId,
                "CLOSURE_VIDEO_UPLOADED",
                "Closure video uploaded with SHA-256 (" + fileHash.substring(0, Math.min(10, fileHash.length())) + "...) and Geotag (" + lat + ", " + lng + ")"
        );

        return video;
    }

    @Transactional
    public ClosureVideo reviewClosureVideo(UUID projectId, String decision, String reason, UserDetailsImpl funderUser) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));

        ClosureVideo video = closureVideoRepository.findFirstByProjectIdOrderByUploadedAtDesc(projectId)
                .orElseThrow(() -> new IllegalArgumentException("No closure video found for project: " + projectId));

        String funderName = funderUser.getEmail();
        video.setReviewedBy(funderUser.getId());
        video.setReviewerName(funderName);
        video.setReviewedAt(LocalDateTime.now());

        if ("VERIFY".equalsIgnoreCase(decision) || "APPROVED".equalsIgnoreCase(decision)) {
            video.setStatus(ClosureVideo.ClosureVideoStatus.VERIFIED);
            video.setReviewReason(reason);
            video = closureVideoRepository.save(video);

            // Notify NGO
            if (project.getNgo() != null && project.getNgo().getUser() != null) {
                notificationService.create(
                        Notification.RecipientType.NGO,
                        project.getNgo().getUser(),
                        project,
                        null,
                        Notification.NotificationEventType.CLOSURE_VIDEO_VERIFIED,
                        "Closure Video Verified by Funder",
                        "Your geo-tagged closure video for '" + project.getTitle() + "' has been verified by the funder.",
                        "/ngo/projects/" + projectId
                );
            }

            auditLogService.logAction(
                    projectId,
                    "CLOSURE_VIDEO_VERIFIED",
                    "Funder " + funderName + " verified NGO closure video."
            );
        } else {
            video.setStatus(ClosureVideo.ClosureVideoStatus.REJECTED);
            video.setReviewReason(reason != null && !reason.trim().isEmpty() ? reason : "Video quality or geotag does not meet requirements.");
            video = closureVideoRepository.save(video);

            // Notify NGO with reason
            if (project.getNgo() != null && project.getNgo().getUser() != null) {
                notificationService.create(
                        Notification.RecipientType.NGO,
                        project.getNgo().getUser(),
                        project,
                        null,
                        Notification.NotificationEventType.CLOSURE_VIDEO_REJECTED,
                        "Closure Video Requires Re-upload",
                        "Funder requested re-upload of closure video for '" + project.getTitle() + "'. Reason: " + video.getReviewReason(),
                        "/ngo/projects/" + projectId
                );
            }

            auditLogService.logAction(
                    projectId,
                    "CLOSURE_VIDEO_REJECTED",
                    "Funder " + funderName + " rejected closure video: " + video.getReviewReason()
            );
        }

        return video;
    }

    @Transactional
    public ProjectClosureStatusDto markProjectAsDone(UUID projectId, UserDetailsImpl funderUser) {
        ProjectClosureStatusDto status = getClosureStatus(projectId);
        if (!status.isCanClose()) {
            throw new IllegalStateException("Cannot close project. Unmet gates: " + String.join("; ", status.getFailureReasons()));
        }

        Project project = projectRepository.findById(projectId).orElseThrow();
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

        // Notify both NGO and Funder
        if (project.getNgo() != null && project.getNgo().getUser() != null) {
            notificationService.create(
                    Notification.RecipientType.NGO,
                    project.getNgo().getUser(),
                    project,
                    null,
                    Notification.NotificationEventType.PROJECT_COMPLETED,
                    "Project Officially Closed & Finalized!",
                    "Congratulations! Project '" + project.getTitle() + "' has met all closure gates and is officially marked as COMPLETED by the Funder.",
                    "/ngo/projects/" + projectId
            );
        }

        notificationService.notifyProjectFunders(
                project,
                null,
                Notification.NotificationEventType.PROJECT_COMPLETED,
                "Project Closed Successfully",
                "Project '" + project.getTitle() + "' has completed all milestone requirements and is formally closed.",
                "/funder/projects/" + projectId
        );

        auditLogService.logAction(
                projectId,
                "PROJECT_COMPLETED_AND_CLOSED",
                "Project marked as COMPLETED by funder " + funderUser.getEmail() + ". Beneficiary coverage: " + status.getCoveragePercentage() + "%, Positive sentiment: " + status.getPositivePercentage() + "%"
        );

        status.setClosed(true);
        return status;
    }

    private double calculateHaversineDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Earth radius in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
