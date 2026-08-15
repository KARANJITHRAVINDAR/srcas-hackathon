package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    List<Project> findByFunderId(UUID funderId);
    List<Project> findByNgoId(UUID ngoId);
    List<Project> findByStatus(Project.ProjectStatus status);

    /**
     * Flexible filter query for the org marketplace.
     * All parameters are optional (null = no filter on that dimension).
     */
    @Query("""
        SELECT p FROM Project p
        WHERE p.status IN ('PUBLISHED', 'SUBMITTED', 'DRAFT', 'UNDER_REVIEW', 'APPROVED', 'FUNDED', 'ESCROWED', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CLOSED')
          AND (:sdgGoal    IS NULL OR p.sdgGoal    = :sdgGoal)
          AND (:geography  IS NULL OR LOWER(p.geography) LIKE LOWER(CONCAT('%', :geography, '%')))
          AND (:budgetMin  IS NULL OR p.totalBudget >= :budgetMin)
          AND (:budgetMax  IS NULL OR p.totalBudget <= :budgetMax)
        ORDER BY p.createdAt DESC
        """)
    List<Project> findPublishedWithFilters(
            @Param("sdgGoal")   Project.SdgGoal sdgGoal,
            @Param("geography") String geography,
            @Param("budgetMin") BigDecimal budgetMin,
            @Param("budgetMax") BigDecimal budgetMax
    );
}
