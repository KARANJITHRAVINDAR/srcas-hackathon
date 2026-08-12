package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.MilestoneTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MilestoneTaskRepository extends JpaRepository<MilestoneTask, UUID> {
    List<MilestoneTask> findByMilestoneId(UUID milestoneId);
}
