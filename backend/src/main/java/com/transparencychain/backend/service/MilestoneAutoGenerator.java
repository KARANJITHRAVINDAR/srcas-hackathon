package com.transparencychain.backend.service;

import com.transparencychain.backend.model.Milestone;
import com.transparencychain.backend.model.Project;
import com.transparencychain.backend.repository.MilestoneRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Auto-generates sensible default milestones for a newly created project
 * based on its budget and duration using OpenRouter AI LLM.
 */
@Service
public class MilestoneAutoGenerator {

    @Autowired
    private MilestoneRepository milestoneRepository;

    @Autowired
    private OpenRouterAiService openRouterAiService;

    private int extractPhaseNumber(Map<String, Object> map) {
        if (map == null) return 99;
        String title = (String) map.get("title");
        if (title != null) {
            Matcher matcher = Pattern.compile("Phase\\s*(\\d+)", Pattern.CASE_INSENSITIVE).matcher(title);
            if (matcher.find()) {
                return Integer.parseInt(matcher.group(1));
            }
        }
        Object seqObj = map.get("sequenceNumber");
        if (seqObj instanceof Number) {
            return ((Number) seqObj).intValue();
        }
        return 99;
    }

    /**
     * Parse a project-duration string like "12 Months", "6months", "24 MONTHS", "3"
     * and return the number of months. Defaults to 6 if unparseable.
     */
    public int parseDurationMonths(String duration) {
        if (duration == null || duration.isBlank()) return 6;
        Matcher m = Pattern.compile("(\\d+)").matcher(duration.trim());
        if (m.find()) {
            int val = Integer.parseInt(m.group(1));
            return val > 0 ? val : 6;
        }
        return 6;
    }

    /**
     * Generates and persists auto-milestones for the given project using AI.
     * Falls back to standard template if AI generation fails or is offline.
     */
    public List<Milestone> generate(Project project) {
        int months = parseDurationMonths(project.getProjectDuration());
        BigDecimal budget = project.getTotalBudget() != null ? project.getTotalBudget() : BigDecimal.ZERO;
        LocalDate startDate = LocalDate.now();

        // 1. Try AI-powered custom milestone generation via OpenRouter
        try {
            String sdgStr = project.getSdgGoal() != null ? project.getSdgGoal().name() : "SDG1";
            List<Map<String, Object>> aiMilestones = openRouterAiService.generateCustomMilestones(
                project.getTitle(),
                project.getDescription(),
                budget,
                project.getProjectDuration(),
                sdgStr
            );

            if (aiMilestones != null && !aiMilestones.isEmpty()) {
                // Sort aiMilestones by phase number extracted from title or sequenceNumber
                aiMilestones.sort((a, b) -> {
                    int phaseA = extractPhaseNumber(a);
                    int phaseB = extractPhaseNumber(b);
                    return Integer.compare(phaseA, phaseB);
                });

                List<Milestone> milestones = new ArrayList<>();
                int count = aiMilestones.size();
                int monthsPerPhase = Math.max(1, months / count);

                for (int i = 0; i < count; i++) {
                    Map<String, Object> aiMs = aiMilestones.get(i);
                    Milestone ms = new Milestone();
                    ms.setProject(project);
                    ms.setTitle((String) aiMs.get("title"));
                    ms.setDescription((String) aiMs.get("description"));
                    ms.setSequenceNumber(i + 1);
                    ms.setStatus(Milestone.MilestoneStatus.PENDING);
                    ms.setAmountAllocated((BigDecimal) aiMs.get("suggestedBudget"));
                    ms.setDueDate(startDate.plusMonths((long) monthsPerPhase * (i + 1)));
                    milestones.add(ms);
                }
                appendClosureMilestone(project, milestones, startDate, months);
                return milestoneRepository.saveAll(milestones);
            }
        } catch (Exception e) {
            System.err.println("AI Milestone generation fallback to template: " + e.getMessage());
        }

        // 2. Template-based fallback generator
        List<MilestoneTemplate> templates = getTemplates(months);
        int count = templates.size();

        // Even budget split; remainder goes to the last milestone
        BigDecimal perMilestone = count > 0
                ? budget.divide(BigDecimal.valueOf(count), 2, RoundingMode.DOWN)
                : BigDecimal.ZERO;
        BigDecimal remainder = budget.subtract(perMilestone.multiply(BigDecimal.valueOf(count)));

        int monthsPerPhase = Math.max(1, months / count);

        List<Milestone> milestones = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            MilestoneTemplate tmpl = templates.get(i);

            Milestone ms = new Milestone();
            ms.setProject(project);
            ms.setTitle(tmpl.title);
            ms.setDescription(tmpl.description);
            ms.setSequenceNumber(i + 1);
            ms.setStatus(Milestone.MilestoneStatus.PENDING);

            // Budget allocation
            BigDecimal allocation = (i == count - 1)
                    ? perMilestone.add(remainder) // last milestone gets the remainder
                    : perMilestone;
            ms.setAmountAllocated(allocation);

            // Due date — evenly spaced
            ms.setDueDate(startDate.plusMonths((long) monthsPerPhase * (i + 1)));

            milestones.add(ms);
        }

        appendClosureMilestone(project, milestones, startDate, months);
        return milestoneRepository.saveAll(milestones);
    }

    private void appendClosureMilestone(Project project, List<Milestone> milestones, LocalDate startDate, int months) {
        Milestone closureMs = new Milestone();
        closureMs.setProject(project);
        closureMs.setTitle("Phase " + (milestones.size() + 1) + ": Project Closure & Impact Assessment");
        closureMs.setDescription("Final project closure gate: requires >= 20% beneficiary feedback coverage with >= 80% positive sentiment and NGO geo-tagged closure video.");
        closureMs.setSequenceNumber(milestones.size() + 1);
        closureMs.setStatus(Milestone.MilestoneStatus.PENDING);
        closureMs.setAmountAllocated(BigDecimal.ZERO);
        closureMs.setMilestoneType(Milestone.MilestoneType.CLOSURE);
        closureMs.setDueDate(startDate.plusMonths(months > 0 ? months : 6));
        milestones.add(closureMs);
    }

    // -----------------------------------------------------------------------
    // Template selection
    // -----------------------------------------------------------------------

    private List<MilestoneTemplate> getTemplates(int months) {
        if (months <= 3) {
            return List.of(
                new MilestoneTemplate(
                    "Phase 1: Planning & Setup",
                    "Initial planning, stakeholder mapping, resource procurement, and site preparation."
                ),
                new MilestoneTemplate(
                    "Phase 2: Implementation & Delivery",
                    "Core project execution, service delivery to beneficiaries, and completion reporting."
                )
            );
        } else if (months <= 6) {
            return List.of(
                new MilestoneTemplate(
                    "Phase 1: Planning & Mobilization",
                    "Needs assessment, stakeholder engagement, procurement of materials, and team onboarding."
                ),
                new MilestoneTemplate(
                    "Phase 2: Core Implementation",
                    "Primary execution of project activities, service delivery, and interim progress documentation."
                ),
                new MilestoneTemplate(
                    "Phase 3: Monitoring & Closure",
                    "Impact measurement, beneficiary verification, final reporting, and project handover."
                )
            );
        } else if (months <= 12) {
            return List.of(
                new MilestoneTemplate(
                    "Phase 1: Planning & Foundation",
                    "Comprehensive needs assessment, baseline study, stakeholder consultations, and procurement."
                ),
                new MilestoneTemplate(
                    "Phase 2: Core Implementation",
                    "Primary project activities execution and initial service delivery to target communities."
                ),
                new MilestoneTemplate(
                    "Phase 3: Scaling & Outreach",
                    "Expanding coverage, training local capacity, and strengthening delivery mechanisms."
                ),
                new MilestoneTemplate(
                    "Phase 4: Monitoring & Closure",
                    "Impact assessment, beneficiary feedback collection, final audit, and sustainability handover."
                )
            );
        } else {
            return List.of(
                new MilestoneTemplate(
                    "Phase 1: Planning & Baseline",
                    "Detailed project plan, baseline data collection, stakeholder mapping, and resource mobilization."
                ),
                new MilestoneTemplate(
                    "Phase 2: Initial Implementation",
                    "First phase of core project activities, pilot delivery, and early course corrections."
                ),
                new MilestoneTemplate(
                    "Phase 3: Expansion & Deepening",
                    "Scaling to additional beneficiaries/geographies, capacity building, and mid-term review."
                ),
                new MilestoneTemplate(
                    "Phase 4: Impact Assessment",
                    "Comprehensive impact measurement, beneficiary feedback, and documentation of outcomes."
                ),
                new MilestoneTemplate(
                    "Phase 5: Final Reporting & Closure",
                    "Final audit, sustainability plan, knowledge transfer, and formal project closure."
                )
            );
        }
    }

    private record MilestoneTemplate(String title, String description) {}
}
