package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "match_requests")
public class MatchRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "need_id", nullable = false)
    private NeedPosting need;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "funder_id", nullable = false)
    private FunderProfile funder;

    @Enumerated(EnumType.STRING)
    private MatchStatus status;
    
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum MatchStatus {
        PENDING, ACCEPTED, DECLINED
    }
}
