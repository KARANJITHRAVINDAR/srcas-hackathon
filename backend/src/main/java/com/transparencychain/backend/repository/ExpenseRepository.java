package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, UUID> {
    
    List<Expense> findByNgoIdOrderByCreatedAtDesc(UUID ngoId);
    
    List<Expense> findByProjectId(UUID projectId);
    
    List<Expense> findByProjectIdAndNgoIdOrderByCreatedAtDesc(UUID projectId, UUID ngoId);
    
    List<Expense> findByMilestoneId(UUID milestoneId);
    
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.milestone.id = :milestoneId AND e.status != 'REJECTED' AND e.status != 'CANCELLED'")
    BigDecimal calculateTotalSpentForMilestone(@Param("milestoneId") UUID milestoneId);
    
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.project.id = :projectId AND e.status != 'REJECTED' AND e.status != 'CANCELLED'")
    BigDecimal calculateTotalSpentForProject(@Param("projectId") UUID projectId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.ngo.id = :ngoId AND e.status != 'REJECTED' AND e.status != 'CANCELLED'")
    BigDecimal calculateTotalSpentForNgo(@Param("ngoId") UUID ngoId);
    
    long countByNgoIdAndStatus(UUID ngoId, Expense.ExpenseStatus status);
}
