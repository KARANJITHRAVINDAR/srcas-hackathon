package com.transparencychain.backend;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class HashGen {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        System.out.println("HASH FOR demo: " + encoder.encode("demo"));
        System.out.println("HASH FOR 123456: " + encoder.encode("123456"));
    }
}
