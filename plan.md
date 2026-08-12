# Transparency Chain - Organisation/Funder Module Plan

<!-- Paste your prompt or detailed requirements here -->
# Transparency Chain — Organisation/Funder Module: Build Specification

## 1. Role Framing

You are building the Organisation/Funder module of Transparency Chain, a Spring Boot-based CSR verification platform. NGOs create projects with milestone-based budgets. Organisations browse these projects, verify NGO credibility, optionally renegotiate milestone scope/cost, commit funding, and respond to fund-release tickets raised by NGOs as work progresses. This module sits between Project Service and Funding Service in the existing architecture — it does not own escrow logic or evidence verification, it consumes and drives them.

---

## 2. Core Flow (Funder Perspective)

```
NGO creates PROJECT (status: DRAFT -> PUBLISHED)
        |
        v
Org browses PUBLISHED projects (marketplace/discovery view)
        |
        v
Org opens Project Detail
        |
        v
Org reviews NGO Trust Profile (multi-dimensional, not a single score)
        |
        v
Org reviews Milestones (as proposed by NGO)
        |
        |-- Org ACCEPTS milestones as-is -----------------+
        |                                                  |
        +-- Org MODIFIES milestones                        |
               |  (add / remove / re-cost / re-sequence)   |
               v                                           |
        MILESTONE_CHANGE_REQUEST created                   |
               |                                           |
               v                                           |
        NGO reviews change request                         |
               |                                           |
        +------+------+                                    |
        v             v                                    |
    NGO ACCEPTS    NGO COUNTERS / REJECTS                   |
        |                     |                             |
        v                     v                             |
  Milestones locked      Renegotiation loop                 |
        |                                                   |
        +---------------------------------------------------+
                              |
                              v
                    FUNDING COMMITMENT created
                    (org commits money to project, per milestone)
                              |
                              v
                    Simulated Escrow Ledger funded
                              |
                              v
              --- per milestone, repeating ---
                              |
                    NGO executes milestone work
                              |
                    NGO submits Evidence Package
                    (invoice + photo + payment proof)
                              |
                    NGO raises FUND RELEASE TICKET
                              |
                              v
                    Verification Layer runs
                    (OCR -> Risk Engine -> LOW/HIGH risk)
                              |
                    +---------+---------+
                    v                   v
               LOW RISK            HIGH RISK
                    |                   |
                    v                   v
          Ticket surfaced to Org   Ticket + Auditor flag
          for final acceptance     surfaced to Org
                    |                   |
                    +---------+---------+
                              v
                Org reviews ticket (evidence, risk report,
                auditor notes if any)
                              |
                +-------------+-------------+
                v             v             v
            ACCEPT        REQUEST         REJECT
                |        CLARIFICATION       |
                v             |              v
        Disbursement      back to NGO   Ticket closed,
        triggered                        escalation flow
                |
                v
        Beneficiary verification -> Impact tracking ->
        Trust score update -> Blockchain audit anchor
```

Key design decision: milestone cost changes by the organisation are never a silent overwrite. Every change is versioned and requires NGO acknowledgment before funding is committed. This preserves auditability and prevents disputes later — treat it like a pull-request review, not a direct edit.

---

## 3. New/Extended Entities (Funder Module Scope)

```
org_project_engagements
 - id
 - funder_id
 - project_id
 - status            (DISCOVERED, UNDER_REVIEW, NEGOTIATING,
                       COMMITTED, ACTIVE, COMPLETED, WITHDRAWN)
 - viewed_at
 - committed_at

milestone_versions
 - id
 - milestone_id          (FK to original milestone)
 - version_number
 - proposed_by           (NGO | FUNDER)
 - name
 - budget
 - sequence
 - due_date
 - change_reason
 - status                (PROPOSED, ACCEPTED, REJECTED, SUPERSEDED)
 - created_at

milestone_change_requests
 - id
 - milestone_id
 - requested_by_org_id
 - original_version_id
 - proposed_version_id
 - status                (PENDING, ACCEPTED, COUNTERED, REJECTED)
 - ngo_response_note
 - responded_at

funding_commitments
 - id
 - funder_id
 - project_id
 - total_committed_amount
 - committed_milestone_breakdown (JSON or child table)
 - status                (PENDING, ACTIVE, PARTIALLY_RELEASED,
                           FULLY_RELEASED, CANCELLED)
 - created_at

tickets
 - id
 - milestone_id
 - raised_by_ngo_id
 - evidence_id            (FK to evidence package)
 - risk_score
 - risk_level              (LOW, MEDIUM, HIGH, CRITICAL)
 - status                  (OPEN, UNDER_ORG_REVIEW,
                             CLARIFICATION_REQUESTED,
                             ACCEPTED, REJECTED, ESCALATED)
 - raised_at
 - resolved_at

ticket_reviews
 - id
 - ticket_id
 - reviewed_by_org_user_id
 - decision                (ACCEPT, REQUEST_CLARIFICATION, REJECT)
 - comment
 - reviewed_at
```

Important: never mutate `milestones.budget` directly once a project is committed. Always insert a new `milestone_versions` row and update a pointer (`current_version_id`) on the parent milestone. This gives a full negotiation history for audit purposes — blockchain only proves what was recorded, not truth, so the recorded history has to be complete.

---

## 4. State Machines to Implement

Project Engagement (per org, per project):
`DISCOVERED -> UNDER_REVIEW -> NEGOTIATING -> COMMITTED -> ACTIVE -> COMPLETED`
(`WITHDRAWN` reachable from any pre-COMMITTED state)

Milestone (per milestone, within a committed project):
`PROPOSED -> (MODIFIED)* -> LOCKED -> IN_PROGRESS -> EVIDENCE_SUBMITTED -> TICKET_RAISED -> UNDER_REVIEW -> ACCEPTED/REJECTED -> DISBURSED -> CLOSED`

Ticket:
`OPEN -> UNDER_ORG_REVIEW -> { ACCEPTED | CLARIFICATION_REQUESTED -> OPEN | REJECTED -> ESCALATED }`

Enforce these transitions server-side with a guard (do not allow, e.g., a ticket to be accepted if the milestone isn't in `TICKET_RAISED`/`UNDER_REVIEW`).

---

## 5. API Surface (Funder Controller Group)

```
GET    /api/org/projects                     - browse published projects (filters: SDG, budget range, location, NGO trust level)
GET    /api/org/projects/{id}                 - project detail incl. NGO trust profile + milestone list
POST   /api/org/projects/{id}/review           - mark UNDER_REVIEW

POST   /api/org/projects/{id}/milestones/{milestoneId}/change-request
       body: { name?, budget?, sequence?, dueDate?, reason }
GET    /api/org/change-requests/{id}
POST   /api/org/change-requests/{id}/withdraw

POST   /api/org/projects/{id}/commit
       body: { totalAmount, milestoneBreakdown[] }
GET    /api/org/commitments/{id}
POST   /api/org/commitments/{id}/cancel        - only if not yet ACTIVE

GET    /api/org/tickets?status=OPEN            - inbox of pending tickets
GET    /api/org/tickets/{id}                   - ticket + evidence + risk report
POST   /api/org/tickets/{id}/decision
       body: { decision: ACCEPT|REQUEST_CLARIFICATION|REJECT, comment }
```

NGO-side counterpart endpoints (needed for the loop to close, not this module's build responsibility):
```
GET    /api/ngo/change-requests?status=PENDING
POST   /api/ngo/change-requests/{id}/respond   (ACCEPT | COUNTER | REJECT)
POST   /api/ngo/milestones/{id}/tickets         (raise ticket)
```

---

## 6. Business Rules to Enforce

1. No unilateral cost changes. An org's milestone edit is a proposal (`milestone_change_requests`), never a direct write. Funding only becomes `ACTIVE` once every milestone has a `LOCKED` (mutually accepted) version.
2. Budget conservation check. Sum of milestone budgets in `funding_commitments.committed_milestone_breakdown` must equal `total_committed_amount`, and cannot exceed the NGO's originally requested project budget by more than a configurable tolerance (flag for review if it does — don't hard-block).
3. Ticket review needs the risk report, not just a yes/no. The org's decision screen must show an explainability block (why it was flagged), not a bare AI verdict.
4. HIGH/CRITICAL risk tickets require a second reviewer or auditor sign-off before the org can hit ACCEPT — enforce this at the service layer, not just UI.
5. Every state transition writes an audit_log row (funder_id, action, before/after JSON diff, timestamp) — this feeds the blockchain anchor layer later without needing to redesign anything.
6. Withdrawal after commitment should be a real business state (`CANCELLED`), not a delete — since money may already be partially disbursed.

---

## 7. Suggested Screens

1. Project Marketplace — card list, filters (SDG, location, budget, NGO trust level), sort by trust/recency
2. Project Detail — NGO trust profile panel + milestone table (read-only initially)
3. Milestone Negotiation — inline edit per milestone -> diff view (original vs proposed) -> send to NGO
4. Commitment Confirmation — summary + escrow simulation preview -> confirm commit
5. Ticket Inbox — filterable by risk level/status, badge counts
6. Ticket Review — evidence viewer (invoice/photo/payment) + risk explainability panel + decision buttons
7. Funding Dashboard — per-project disbursement progress, committed vs released vs remaining

---

## 8. Build Order (Phased)

1. Project discovery + detail view (read-only) — no negotiation yet
2. Milestone versioning + change-request flow (org <-> NGO loop)
3. Funding commitment + simulated escrow
4. Ticket inbox + review + decision flow
5. Wire ticket ACCEPT -> trigger existing Disbursement Engine (from main architecture doc)
6. Audit logging across all of the above, then hook into blockchain anchor layer last

---

## 9. Instruction to the Agent

Read this entire specification before writing any code. Build strictly in the phased order defined in Section 8. After completing each phase, stop and summarize what was built, then wait for review before starting the next phase. Do not skip ahead, do not silently merge phases, and do not implement escrow, blockchain anchoring, or evidence-verification logic yourself — those belong to other services already defined in the wider system architecture; this module only calls into them.