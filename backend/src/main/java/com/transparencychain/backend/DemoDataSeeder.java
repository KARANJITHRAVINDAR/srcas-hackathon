package com.transparencychain.backend;

import com.transparencychain.backend.model.Project;
import com.transparencychain.backend.model.Project.ProjectStatus;
import com.transparencychain.backend.model.User;
import com.transparencychain.backend.model.Role;
import com.transparencychain.backend.model.NgoProfile;
import com.transparencychain.backend.model.FunderProfile;
import com.transparencychain.backend.model.Milestone;
import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

@Component
public class DemoDataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final NgoProfileRepository ngoProfileRepository;
    private final ProjectRepository projectRepository;
    private final FunderProfileRepository funderProfileRepository;
    private final MilestoneRepository milestoneRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    private MilestoneTaskRepository milestoneTaskRepository;

    @Autowired
    private ProjectImpactKpiRepository impactKpiRepository;

    @Autowired
    private ImpactReportRepository impactReportRepository;

    @Autowired
    private ImpactVerificationRepository impactVerificationRepository;

    @Autowired
    private BeneficiaryVerificationFormRepository formRepository;

    @Autowired
    private BeneficiaryFormQuestionRepository questionRepository;

    @Autowired
    private BeneficiaryFormResponseRepository responseRepository;

    @Autowired
    private BeneficiaryFormAnswerRepository answerRepository;

    public DemoDataSeeder(UserRepository userRepository, NgoProfileRepository ngoProfileRepository, ProjectRepository projectRepository, FunderProfileRepository funderProfileRepository, MilestoneRepository milestoneRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.ngoProfileRepository = ngoProfileRepository;
        this.projectRepository = projectRepository;
        this.funderProfileRepository = funderProfileRepository;
        this.milestoneRepository = milestoneRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void run(String... args) throws Exception {
        String targetEmail = "727724eucy040@skcet.ac.in";
        Optional<User> userOpt = userRepository.findByEmail(targetEmail);
        if (userOpt.isEmpty()) {
            System.out.println("Target user not found, creating demo NGO user: " + targetEmail);
            User newUser = new User();
            newUser.setEmail(targetEmail);
            newUser.setPasswordHash(passwordEncoder.encode("123456"));
            newUser.setRole(Role.NGO);
            newUser.setFullName("Demo NGO User");
            newUser.setVerified(true);
            userRepository.save(newUser);
            userOpt = Optional.of(newUser);
        }
        
        User user;
        if (userOpt.isPresent()) {
            user = userOpt.get();
            System.out.println("Found user for seeding: " + targetEmail);
            user.setPasswordHash(passwordEncoder.encode("123456"));
            userRepository.save(user);
            
            NgoProfile ngoProfile = ngoProfileRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    System.out.println("Creating NGO Profile for demo user.");
                    NgoProfile newProfile = new NgoProfile();
                    newProfile.setUser(user);
                    newProfile.setOrgName("SKCET Demo NGO");
                    newProfile.setContactEmail(targetEmail);
                    newProfile.setVerificationStatus(NgoProfile.VerificationStatus.VERIFIED);
                    return ngoProfileRepository.save(newProfile);
                });

            FunderProfile funder = funderProfileRepository.findAll().stream().findFirst().orElseGet(() -> {
                System.out.println("Creating dummy Funder Profile for demo.");
                User funderUser = new User();
                funderUser.setEmail("dummyfunder@demo.com");
                funderUser.setPasswordHash(passwordEncoder.encode("demo")); 
                funderUser.setRole(Role.FUNDER);
                funderUser.setFullName("Demo Funder");
                funderUser.setVerified(true);
                userRepository.save(funderUser);
                
                FunderProfile newFunder = new FunderProfile();
                newFunder.setUser(funderUser);
                newFunder.setOrgName("Global Demo Fund");
                return funderProfileRepository.save(newFunder);
            });

            User funderUser = funder.getUser();
            funderUser.setPasswordHash(passwordEncoder.encode("demo"));
            userRepository.save(funderUser);

            if (projectRepository.findByNgoId(ngoProfile.getId()).isEmpty()) {
                System.out.println("Seeding dummy projects...");

                Project project1 = new Project();
                project1.setTitle("Clean Water Initiative - Rural TN");
                project1.setDescription("Providing clean drinking water facilities to 5 villages in rural Tamil Nadu.");
                project1.setSdgGoal(Project.SdgGoal.SDG6);
                project1.setSdgTarget("6.1 Universal and equitable access to safe and affordable drinking water");
                project1.setTotalBudget(BigDecimal.valueOf(500000.0));
                project1.setGeography("Tamil Nadu, India");
                project1.setExpectedBeneficiaries(500);
                project1.setProjectDuration("12 Months");
                project1.setImpactKpi("Number of borewells installed");
                project1.setLatitude(11.0168);
                project1.setLongitude(76.9558);
                project1.setStatus(Project.ProjectStatus.PUBLISHED);
                project1.setNgo(ngoProfile);
                project1.setFunder(funder);

                Project project2 = new Project();
                project2.setTitle("Digital Literacy for Women");
                project2.setDescription("Empowering 500 women with essential digital skills and internet awareness.");
                project2.setSdgGoal(Project.SdgGoal.SDG4);
                project2.setSdgTarget("4.4 Substantially increase the number of youth and adults who have relevant skills");
                project2.setTotalBudget(BigDecimal.valueOf(350000.0));
                project2.setGeography("Coimbatore, TN");
                project2.setExpectedBeneficiaries(500);
                project2.setProjectDuration("6 Months");
                project2.setImpactKpi("Number of women certified");
                project2.setLatitude(10.9367);
                project2.setLongitude(76.9749);
                project2.setStatus(Project.ProjectStatus.PUBLISHED);
                project2.setNgo(ngoProfile);
                project2.setFunder(funder);

                projectRepository.save(project1);
                projectRepository.save(project2);

                System.out.println("Seeding dummy milestones...");
                
                Milestone m1 = new Milestone();
                m1.setProject(project2);
                m1.setTitle("Phase 1: Registration and Setup");
                m1.setDescription("Registering 250 women and setting up the digital center.");
                m1.setAmountAllocated(BigDecimal.valueOf(150000.0));
                m1.setStatus(Milestone.MilestoneStatus.PENDING);
                m1.setRequiredEvidence("- List of registered women\n- Photos of center setup\n- Invoice for computer equipment");
                m1.setVerificationRequirements("AI check for invoice validity and image verification");
                m1.setDueDate(LocalDate.of(2025, 3, 31));
                m1.setSequenceNumber(1);
                
                Milestone m2 = new Milestone();
                m2.setProject(project2);
                m2.setTitle("Phase 2: Training Completion");
                m2.setDescription("Completion of 6 weeks of digital literacy training for all 500 women.");
                m2.setAmountAllocated(BigDecimal.valueOf(200000.0));
                m2.setStatus(Milestone.MilestoneStatus.PENDING);
                m2.setRequiredEvidence("- Attendance records\n- Certification copies\n- Participant feedback forms");
                m2.setSequenceNumber(2);
                
                milestoneRepository.save(m1);
                milestoneRepository.save(m2);

                // Add milestones for project1 as well so the UI renders for both!
                Milestone p1m1 = new Milestone();
                p1m1.setProject(project1);
                p1m1.setTitle("Phase 1: Site Survey & Material Procurement");
                p1m1.setDescription("Conducting geological survey and procuring borewell materials for 5 villages.");
                p1m1.setAmountAllocated(BigDecimal.valueOf(250000.0));
                p1m1.setStatus(Milestone.MilestoneStatus.PENDING);
                p1m1.setRequiredEvidence("- Geological survey report\n- Material purchase invoices\n- Photos of pipes and drills");
                p1m1.setVerificationRequirements("AI check for invoice validity and image verification");
                p1m1.setSequenceNumber(1);
                milestoneRepository.save(p1m1);
                
                System.out.println("Seeding dummy milestone tasks...");
                MilestoneTask t1 = new MilestoneTask();
                t1.setMilestone(p1m1);
                t1.setTaskName("Geological Survey");
                t1.setDescription("Conduct geological survey to identify suitable borewell locations.");
                t1.setSequenceNumber(1);
                t1.setRequiredEvidenceType("GEO_REPORT");
                t1.setStatus(MilestoneTask.TaskStatus.COMPLETED);
                milestoneTaskRepository.save(t1);

                MilestoneTask t2 = new MilestoneTask();
                t2.setMilestone(p1m1);
                t2.setTaskName("Material Procurement");
                t2.setDescription("Procure required PVC pipes, drilling equipment and cement.");
                t2.setSequenceNumber(2);
                t2.setRequiredEvidenceType("INVOICE");
                t2.setStatus(MilestoneTask.TaskStatus.PENDING);
                milestoneTaskRepository.save(t2);

                MilestoneTask t3 = new MilestoneTask();
                t3.setMilestone(p1m1);
                t3.setTaskName("Site Drilling");
                t3.setDescription("Execute drilling operations at designated site.");
                t3.setSequenceNumber(3);
                t3.setRequiredEvidenceType("PHOTO");
                t3.setStatus(MilestoneTask.TaskStatus.PENDING);
                milestoneTaskRepository.save(t3);
                
                Project proposedProject = new Project();
                proposedProject.setTitle("Renewable Energy for Rural Schools");
                proposedProject.setDescription("Installing solar panels in 3 rural schools to provide uninterrupted power.");
                proposedProject.setSdgGoal(Project.SdgGoal.SDG7);
                proposedProject.setSdgTarget("7.1 Universal access to affordable, reliable and modern energy services");
                proposedProject.setTotalBudget(BigDecimal.valueOf(300000.0));
                proposedProject.setGeography("Maharashtra, India");
                proposedProject.setExpectedBeneficiaries(1200);
                proposedProject.setProjectDuration("6 Months");
                proposedProject.setImpactKpi("Number of schools electrified");
                proposedProject.setLatitude(19.7515);
                proposedProject.setLongitude(75.7139);
                proposedProject.setStatus(Project.ProjectStatus.SUBMITTED);
                proposedProject.setNgo(ngoProfile);
                proposedProject.setFunder(funder);
                projectRepository.save(proposedProject);

                System.out.println("Demo projects and milestones seeded successfully!");
            } else {
                System.out.println("Projects already exist for this NGO. Skipping seed.");
            }
        } else {
            System.out.println("Target user not found: " + targetEmail);
        }

        // --- Safe Impact Seeding for existing Project 1 ---
        Optional<Project> p1Opt = projectRepository.findAll().stream().filter(p -> p.getTitle().equals("Clean Water Initiative - Rural TN")).findFirst();
        if (p1Opt.isPresent()) {
            Project p1 = p1Opt.get();
            if (impactKpiRepository.findByProjectId(p1.getId()).isEmpty()) {
                System.out.println("Seeding Impact KPIs for Project 1...");
                
                ProjectImpactKpi kpi1 = new ProjectImpactKpi();
                kpi1.setProject(p1);
                kpi1.setSdgGoal(Project.SdgGoal.SDG6);
                kpi1.setKpiName("Clean Water Access");
                kpi1.setUnit("People");
                kpi1.setTargetValue(500.0);
                impactKpiRepository.save(kpi1);

                ProjectImpactKpi kpi2 = new ProjectImpactKpi();
                kpi2.setProject(p1);
                kpi2.setSdgGoal(Project.SdgGoal.SDG6);
                kpi2.setKpiName("Wells Completed");
                kpi2.setUnit("Wells");
                kpi2.setTargetValue(2.0);
                impactKpiRepository.save(kpi2);

                ProjectImpactKpi kpi3 = new ProjectImpactKpi();
                kpi3.setProject(p1);
                kpi3.setSdgGoal(Project.SdgGoal.SDG6);
                kpi3.setKpiName("Water Saved");
                kpi3.setUnit("Liters");
                kpi3.setTargetValue(15000.0);
                impactKpiRepository.save(kpi3);

                ImpactReport rep1 = new ImpactReport();
                rep1.setKpi(kpi1);
                rep1.setReportingPeriod("August 2026");
                rep1.setReportedValue(450.0);
                rep1.setDescription("Water access provided to 450 individuals.");
                rep1.setStatus(ImpactReport.ReportStatus.VERIFIED);
                impactReportRepository.save(rep1);

                ImpactVerification ver1 = new ImpactVerification();
                ver1.setImpactReport(rep1);
                ver1.setVerifiedValue(420.0);
                ver1.setVerificationMethod(ImpactVerification.VerificationMethod.FIELD_OFFICER);
                ver1.setComments("420 beneficiaries physically verified.");
                impactVerificationRepository.save(ver1);

                ImpactReport rep2 = new ImpactReport();
                rep2.setKpi(kpi2);
                rep2.setReportingPeriod("August 2026");
                rep2.setReportedValue(2.0);
                rep2.setDescription("Both wells fully constructed.");
                rep2.setStatus(ImpactReport.ReportStatus.VERIFIED);
                impactReportRepository.save(rep2);

                ImpactVerification ver2 = new ImpactVerification();
                ver2.setImpactReport(rep2);
                ver2.setVerifiedValue(2.0);
                ver2.setVerificationMethod(ImpactVerification.VerificationMethod.EVIDENCE);
                impactVerificationRepository.save(ver2);
                
                System.out.println("Impact data seeded successfully.");
            }

            // --- Safe Beneficiary Form Seeding ---
            if (formRepository.findByProjectIdOrderByCreatedAtDesc(p1.getId()).isEmpty()) {
                System.out.println("Seeding Beneficiary Verification Form for Project 1...");
                
                BeneficiaryVerificationForm form = new BeneficiaryVerificationForm();
                form.setProject(p1);
                form.setTitle("Final Impact Verification");
                form.setDescription("Please help us verify the impact of " + p1.getTitle());
                form.setStatus(BeneficiaryVerificationForm.FormStatus.ACTIVE);
                form.setTargetResponses(p1.getExpectedBeneficiaries());
                form.setMinimumResponsePercentage(20);
                form.setMinimumPositivePercentage(80);
                form.setShareToken("demo-water-form");
                form.setPublishedAt(LocalDateTime.now().minusDays(2));
                form = formRepository.save(form);

                BeneficiaryFormQuestion q1 = new BeneficiaryFormQuestion();
                q1.setForm(form);
                q1.setQuestionText("Did the project provide the promised water facility to your area?");
                q1.setQuestionType(BeneficiaryFormQuestion.QuestionType.YES_NO);
                q1.setRequired(true);
                q1.setDisplayOrder(1);
                questionRepository.save(q1);

                BeneficiaryFormQuestion q2 = new BeneficiaryFormQuestion();
                q2.setForm(form);
                q2.setQuestionText("Is the facility currently usable?");
                q2.setQuestionType(BeneficiaryFormQuestion.QuestionType.YES_NO);
                q2.setRequired(true);
                q2.setDisplayOrder(2);
                questionRepository.save(q2);

                BeneficiaryFormQuestion q3 = new BeneficiaryFormQuestion();
                q3.setForm(form);
                q3.setQuestionText("How would you rate the benefit?");
                q3.setQuestionType(BeneficiaryFormQuestion.QuestionType.RATING);
                q3.setRequired(false);
                q3.setDisplayOrder(3);
                questionRepository.save(q3);

                // Seed some YES responses
                for (int i = 0; i < 74; i++) {
                    BeneficiaryFormResponse resp = new BeneficiaryFormResponse();
                    resp.setForm(form);
                    resp.setOverallResponse(BeneficiaryFormResponse.OverallResponse.YES);
                    resp.setRating(5);
                    resp.setSubmittedAt(LocalDateTime.now().minusHours(i));
                    resp.setStatus(BeneficiaryFormResponse.ResponseStatus.VALID);
                    responseRepository.save(resp);
                }

                // Seed some NO responses
                for (int i = 0; i < 8; i++) {
                    BeneficiaryFormResponse resp = new BeneficiaryFormResponse();
                    resp.setForm(form);
                    resp.setOverallResponse(BeneficiaryFormResponse.OverallResponse.NO);
                    resp.setRating(1);
                    resp.setSubmittedAt(LocalDateTime.now().minusHours(i + 74));
                    resp.setStatus(BeneficiaryFormResponse.ResponseStatus.VALID);
                    responseRepository.save(resp);
                }

                System.out.println("Beneficiary Form data seeded successfully.");
            }
        }
    }
}
