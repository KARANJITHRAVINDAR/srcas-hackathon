package com.transparencychain.backend.service;

import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.NotificationRepository;
import com.transparencychain.backend.repository.OrgProjectEngagementRepository;
import com.transparencychain.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrgProjectEngagementRepository engagementRepository;

    @Transactional
    public Notification create(
            Notification.RecipientType recipientType,
            User recipient,
            Project project,
            Milestone milestone,
            Notification.NotificationEventType eventType,
            String title,
            String body,
            String linkTo
    ) {
        if (recipient == null) return null;

        Notification notification = new Notification();
        notification.setRecipientType(recipientType);
        notification.setRecipient(recipient);
        notification.setProject(project);
        notification.setMilestone(milestone);
        notification.setEventType(eventType);
        notification.setTitle(title);
        notification.setBody(body);
        notification.setLinkTo(linkTo);
        notification.setReadStatus(Notification.ReadStatus.UNREAD);
        notification.setCreatedAt(LocalDateTime.now());

        return notificationRepository.save(notification);
    }

    @Transactional
    public void notifyProjectFunders(
            Project project,
            Milestone milestone,
            Notification.NotificationEventType eventType,
            String title,
            String body,
            String linkTo
    ) {
        if (project == null) return;

        List<OrgProjectEngagement> engagements = engagementRepository.findByProjectId(project.getId());
        Set<UUID> notifiedUserIds = new HashSet<>();

        for (OrgProjectEngagement e : engagements) {
            if (e.getFunder() != null && e.getFunder().getUser() != null) {
                User funderUser = e.getFunder().getUser();
                if (!notifiedUserIds.contains(funderUser.getId())) {
                    notifiedUserIds.add(funderUser.getId());
                    create(
                            Notification.RecipientType.FUNDER,
                            funderUser,
                            project,
                            milestone,
                            eventType,
                            title,
                            body,
                            linkTo
                    );
                }
            }
        }

        // If no engagements found, notify all users with ROLE FUNDER/AUDITOR
        if (notifiedUserIds.isEmpty()) {
            List<User> funderUsers = userRepository.findAll().stream()
                    .filter(u -> u.getRole() == Role.FUNDER || u.getRole() == Role.AUDITOR)
                    .toList();
            for (User u : funderUsers) {
                create(
                        Notification.RecipientType.FUNDER,
                        u,
                        project,
                        milestone,
                        eventType,
                        title,
                        body,
                        linkTo
                );
            }
        }
    }

    @Transactional
    public void notifyAuditors(
            Project project,
            Milestone milestone,
            Notification.NotificationEventType eventType,
            String title,
            String body,
            String linkTo
    ) {
        List<User> auditors = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.AUDITOR)
                .toList();

        for (User a : auditors) {
            create(
                    Notification.RecipientType.FUNDER,
                    a,
                    project,
                    milestone,
                    eventType,
                    title,
                    body,
                    linkTo
            );
        }
    }

    @Transactional(readOnly = true)
    public List<Notification> getNotificationsForUser(UUID userId) {
        return notificationRepository.findByRecipient_IdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByRecipient_IdAndReadStatus(userId, Notification.ReadStatus.UNREAD);
    }

    @Transactional
    public Notification markAsRead(UUID notificationId, UUID userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found: " + notificationId));

        if (!notification.getRecipient().getId().equals(userId)) {
            throw new SecurityException("Cannot modify another user's notification");
        }

        notification.setReadStatus(Notification.ReadStatus.READ);
        notification.setReadAt(LocalDateTime.now());
        return notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(UUID userId) {
        notificationRepository.markAllAsReadForUser(userId);
    }
}
