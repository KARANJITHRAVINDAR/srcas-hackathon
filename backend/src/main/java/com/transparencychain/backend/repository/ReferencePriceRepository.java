package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.ReferencePrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ReferencePriceRepository extends JpaRepository<ReferencePrice, Long> {
    Optional<ReferencePrice> findByItemNameIgnoreCase(String itemName);
}
