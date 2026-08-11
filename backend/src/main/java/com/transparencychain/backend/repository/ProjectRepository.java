package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    List<Project> findByFunderId(UUID funderId);
    List<Project> findByNgoId(UUID ngoId);
    List<Project> findByStatus(Project.ProjectStatus status);
}
