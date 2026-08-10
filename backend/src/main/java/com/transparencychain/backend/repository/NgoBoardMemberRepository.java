package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.NgoBoardMember;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface NgoBoardMemberRepository extends JpaRepository<NgoBoardMember, UUID> {
    List<NgoBoardMember> findByNgoProfileId(UUID ngoProfileId);
}
