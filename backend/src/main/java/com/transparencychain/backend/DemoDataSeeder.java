package com.transparencychain.backend;

import com.transparencychain.backend.model.User;
import com.transparencychain.backend.model.Role;
import com.transparencychain.backend.model.NgoProfile;
import com.transparencychain.backend.model.FunderProfile;
import com.transparencychain.backend.model.Project;
import com.transparencychain.backend.model.Milestone;
import com.transparencychain.backend.model.ProofSubmission;
import com.transparencychain.backend.model.Ticket;
import com.transparencychain.backend.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.List;

@Component
public class DemoDataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final NgoProfileRepository ngoProfileRepository;
    private final FunderProfileRepository funderProfileRepository;
    private final PasswordEncoder passwordEncoder;

    public DemoDataSeeder(UserRepository userRepository, 
                          NgoProfileRepository ngoProfileRepository, 
                          FunderProfileRepository funderProfileRepository, 
                          PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.ngoProfileRepository = ngoProfileRepository;
        this.funderProfileRepository = funderProfileRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void run(String... args) throws Exception {
        String targetEmail = "727724eucy040@skcet.ac.in";
        Optional<User> userOpt = userRepository.findByEmail(targetEmail);
        if (userOpt.isEmpty()) {
            System.out.println("Creating demo NGO user: " + targetEmail);
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
            user.setPasswordHash(passwordEncoder.encode("demo"));
            userRepository.save(user);
            
            ngoProfileRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    NgoProfile newProfile = new NgoProfile();
                    newProfile.setUser(user);
                    newProfile.setOrgName("SKCET Demo NGO");
                    newProfile.setContactEmail(targetEmail);
                    newProfile.setVerificationStatus(NgoProfile.VerificationStatus.VERIFIED);
                    return ngoProfileRepository.save(newProfile);
                });

            FunderProfile funder = funderProfileRepository.findAll().stream().findFirst().orElseGet(() -> {
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

            // Also ensure globalfunder@demo.com exists
            Optional<User> globalFunderOpt = userRepository.findByEmail("globalfunder@demo.com");
            if (globalFunderOpt.isEmpty()) {
                User gf = new User();
                gf.setEmail("globalfunder@demo.com");
                gf.setPasswordHash(passwordEncoder.encode("123456"));
                gf.setRole(Role.FUNDER);
                gf.setFullName("Organisation Admin");
                gf.setVerified(true);
                userRepository.save(gf);

                FunderProfile gfp = new FunderProfile();
                gfp.setUser(gf);
                gfp.setOrgName("Global Fund Organization");
                funderProfileRepository.save(gfp);
            }
        }
    }
}
