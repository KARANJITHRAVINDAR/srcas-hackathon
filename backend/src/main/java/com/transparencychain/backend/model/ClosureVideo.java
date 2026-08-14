package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "closure_videos")
public class ClosureVideo {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID projectId;

    private UUID milestoneId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String fileUrl;

    private String fileHash; // SHA-256 hash for tamper-evidence

    private Double capturedLat;
    private Double capturedLng;

    private LocalDateTime capturedAt;
    private LocalDateTime uploadedAt;

    private Boolean geotagDistanceFlag = false; // Flagged if outside expected radius (> 50km)
    private Double distanceFromProjectKm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClosureVideoStatus status = ClosureVideoStatus.PENDING;

    private UUID reviewedBy;
    private String reviewerName;

    @Column(columnDefinition = "TEXT")
    private String reviewReason; // Required if REJECTED

    private LocalDateTime reviewedAt;

    @PrePersist
    protected void onCreate() {
        if (uploadedAt == null) uploadedAt = LocalDateTime.now();
        if (status == null) status = ClosureVideoStatus.PENDING;
    }

    public enum ClosureVideoStatus {
        PENDING,
        VERIFIED,
        REJECTED
    }
}
