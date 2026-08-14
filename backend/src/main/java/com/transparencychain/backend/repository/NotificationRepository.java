package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    
    List<Notification> findByRecipient_IdOrderByCreatedAtDesc(UUID recipientId);

    List<Notification> findByRecipient_IdAndReadStatusOrderByCreatedAtDesc(UUID recipientId, Notification.ReadStatus readStatus);

    long countByRecipient_IdAndReadStatus(UUID recipientId, Notification.ReadStatus readStatus);

    @Modifying
    @Query("UPDATE Notification n SET n.readStatus = 'READ', n.readAt = CURRENT_TIMESTAMP WHERE n.recipient.id = :recipientId AND n.readStatus = 'UNREAD'")
    void markAllAsReadForUser(@Param("recipientId") UUID recipientId);
}
