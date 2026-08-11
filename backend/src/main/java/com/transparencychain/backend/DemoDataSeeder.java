package com.transparencychain.backend;

import com.transparencychain.backend.model.Project;
import com.transparencychain.backend.model.Project.ProjectStatus;
import com.transparencychain.backend.model.User;
import com.transparencychain.backend.model.Role;
import com.transparencychain.backend.model.NgoProfile;
import com.transparencychain.backend.model.FunderProfile;
import com.transparencychain.backend.model.Milestone;
import com.transparencychain.backend.repository.ProjectRepository;
import com.transparencychain.backend.repository.UserRepository;
import com.transparencychain.backend.repository.NgoProfileRepository;
import com.transparencychain.backend.repository.FunderProfileRepository;
import com.transparencychain.backend.repository.MilestoneRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

@Component
public class DemoDataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final NgoProfileRepository ngoProfileRepository;
    private final ProjectRepository projectRepository;
    private final FunderProfileRepository funderProfileRepository;
    private final MilestoneRepository milestoneRepository;

    public DemoDataSeeder(UserRepository userRepository, NgoProfileRepository ngoProfileRepository, ProjectRepository projectRepository, FunderProfileRepository funderProfileRepository, MilestoneRepository milestoneRepository) {
        this.userRepository = userRepository;
        this.ngoProfileRepository = ngoProfileRepository;
        this.projectRepository = projectRepository;
        this.funderProfileRepository = funderProfileRepository;
        this.milestoneRepository = milestoneRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        String targetEmail = "727724eucy040@skcet.ac.in";
        Optional<User> userOpt = userRepository.findByEmail(targetEmail);
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            System.out.println("Found user for seeding: " + targetEmail);
            
            // Check if NgoProfile exists
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

            // Create or get a FunderProfile
            FunderProfile funder = funderProfileRepository.findAll().stream().findFirst().orElseGet(() -> {
                System.out.println("Creating dummy Funder Profile for demo.");
                User funderUser = new User();
                funderUser.setEmail("dummyfunder@demo.com");
                funderUser.setPasswordHash("demo");
                funderUser.setRole(Role.FUNDER);
                funderUser.setFullName("Demo Funder");
                funderUser.setVerified(true);
                userRepository.save(funderUser);
                
                FunderProfile newFunder = new FunderProfile();
                newFunder.setUser(funderUser);
                newFunder.setOrgName("Global Demo Fund");
                return funderProfileRepository.save(newFunder);
            });

            // Create some dummy projects assigned to this NGO
            if (projectRepository.findByNgoId(ngoProfile.getId()).isEmpty()) {
                System.out.println("Seeding dummy projects...");

                Project project1 = new Project();
                project1.setTitle("Clean Water Initiative - Rural TN");
                project1.setDescription("Providing clean drinking water facilities to 5 villages in rural Tamil Nadu.");
                project1.setSdgGoal(Project.SdgGoal.SDG6);
                project1.setSdgTarget("6.1 Universal and equitable access to safe and affordable drinking water");
                project1.setTotalBudget(BigDecimal.valueOf(500000.0));
                project1.setGeography("Tamil Nadu, India");
                project1.setExpectedBeneficiaries(1500);
                project1.setProjectDuration("12 Months");
                project1.setImpactKpi("Number of borewells installed");
                project1.setLatitude(11.0168);
                project1.setLongitude(76.9558);
                project1.setStatus(ProjectStatus.ESCROWED);
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
                project2.setStatus(ProjectStatus.IN_PROGRESS);
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
                
                Milestone m2 = new Milestone();
                m2.setProject(project2);
                m2.setTitle("Phase 2: Training Completion");
                m2.setDescription("Completion of 6 weeks of digital literacy training for all 500 women.");
                m2.setAmountAllocated(BigDecimal.valueOf(200000.0));
                m2.setStatus(Milestone.MilestoneStatus.PENDING);
                m2.setRequiredEvidence("- Attendance records\n- Certification copies\n- Participant feedback forms");
                
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
                milestoneRepository.save(p1m1);

                System.out.println("Demo projects and milestones seeded successfully!");
            } else {
                System.out.println("Projects already exist for this NGO. Skipping seed.");
            }
        } else {
            System.out.println("Target user not found: " + targetEmail);
        }
    }
}
