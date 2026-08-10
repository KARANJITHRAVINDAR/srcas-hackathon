package com.transparencychain.backend.controller;

import com.transparencychain.backend.dto.JwtResponse;
import com.transparencychain.backend.dto.LoginRequest;
import com.transparencychain.backend.dto.MessageResponse;
import com.transparencychain.backend.dto.RegisterRequest;
import com.transparencychain.backend.model.FunderProfile;
import com.transparencychain.backend.model.NgoProfile;
import com.transparencychain.backend.model.Role;
import com.transparencychain.backend.model.User;
import com.transparencychain.backend.repository.FunderProfileRepository;
import com.transparencychain.backend.repository.NgoProfileRepository;
import com.transparencychain.backend.repository.UserRepository;
import com.transparencychain.backend.security.JwtUtils;
import com.transparencychain.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    NgoProfileRepository ngoProfileRepository;

    @Autowired
    FunderProfileRepository funderProfileRepository;

    @Autowired
    com.transparencychain.backend.repository.NgoBoardMemberRepository ngoBoardMemberRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);
        String refresh = jwtUtils.generateRefreshToken(authentication);
        
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        String role = userDetails.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");

        return ResponseEntity.ok(new JwtResponse(jwt, refresh, userDetails.getId(), role));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegisterRequest signUpRequest) {
        if (userRepository.findByEmail(signUpRequest.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Email is already in use!"));
        }

        User user = new User();
        user.setEmail(signUpRequest.getEmail());
        user.setPasswordHash(encoder.encode(signUpRequest.getPassword()));
        user.setRole(signUpRequest.getRole());
        user.setFullName(signUpRequest.getFullName());
        user.setPhone(signUpRequest.getPhone());
        user.setVerified(false);
        userRepository.save(user);

        if (signUpRequest.getRole() == Role.FUNDER) {
            FunderProfile funder = new FunderProfile();
            funder.setUser(user);
            funder.setOrgName(signUpRequest.getOrgName());
            funder.setOrgType(signUpRequest.getOrgType());
            funder.setCinNumber(signUpRequest.getCinNumber());
            funderProfileRepository.save(funder);
        }

        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }
}
