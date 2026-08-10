package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.ExtractedField;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExtractedFieldRepository extends JpaRepository<ExtractedField, UUID> {
    List<ExtractedField> findByDraftId(UUID draftId);
    void deleteByDraftId(UUID draftId);
}
