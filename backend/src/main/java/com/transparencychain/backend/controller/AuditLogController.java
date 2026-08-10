package com.transparencychain.backend.controller;

import com.transparencychain.backend.service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/audit-log")
public class AuditLogController {
    
    @Autowired
    AuditLogService auditLogService;

    @GetMapping("/project/{id}")
    public ResponseEntity<?> getAuditLogs(@PathVariable UUID id) {
        return ResponseEntity.ok(auditLogService.getLogsForEntity(id));
    }
}
