package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.NeedPostingDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface NeedPostingDocumentRepository extends JpaRepository<NeedPostingDocument, UUID> {
    List<NeedPostingDocument> findByNeedPostingId(UUID needPostingId);
}
