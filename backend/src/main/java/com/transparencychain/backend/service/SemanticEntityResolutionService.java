package com.transparencychain.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * General-purpose Semantic Entity Resolution and Format Validation Engine.
 * Does NOT rely on hardcoded keyword signatures or debug labels.
 * Evaluates semantic equivalence across organization names, addresses, and official government format standards.
 */
@Service
public class SemanticEntityResolutionService {

    private static final Logger log = LoggerFactory.getLogger(SemanticEntityResolutionService.class);

    // Standard legal entity suffixes and stop words in Indian NGO / Trust ecosystem
    private static final Set<String> LEGAL_ENTITY_STOP_WORDS = new HashSet<>(Arrays.asList(
            "the", "a", "an", "of", "for", "and", "&", "in",
            "trust", "charitable", "charity", "foundation", "society",
            "association", "mission", "initiative", "federation", "institution",
            "sanstha", "seva", "mandal", "samiti", "kendra", "vidya",
            "section", "8", "company", "pvt", "ltd", "private", "limited",
            "educational", "welfare", "rural", "urban", "development", "national", "global"
    ));

    // Recognized 2-letter state codes in India (for Darpan & Address compatibility)
    private static final Set<String> INDIAN_STATE_CODES = new HashSet<>(Arrays.asList(
            "AP", "AR", "AS", "BR", "CG", "DL", "GA", "GJ", "HR", "HP",
            "JK", "JH", "KA", "KL", "MP", "MH", "MN", "ML", "MZ", "NL",
            "OR", "PB", "RJ", "SK", "TN", "TS", "TR", "UP", "UK", "WB",
            "AN", "CH", "DN", "DD", "LD", "PY"
    ));

    public static class EntityInstance {
        public String rawValue;
        public String sourceDocument;
        public String fieldName;

        public EntityInstance(String rawValue, String sourceDocument, String fieldName) {
            this.rawValue = rawValue;
            this.sourceDocument = sourceDocument;
            this.fieldName = fieldName;
        }
    }

    public static class EntityClusterResult {
        public boolean isConverged;
        public int distinctClusterCount;
        public List<List<EntityInstance>> clusters = new ArrayList<>();
        public List<String> discrepancyDescriptions = new ArrayList<>();
    }

    /**
     * Determines whether two organization name strings refer to the same real-world entity.
     * Allows for legal suffixes, prefix variations ("The"), abbreviations, and minor OCR character noise.
     */
    public boolean isSameOrganization(String nameA, String nameB) {
        if (nameA == null || nameB == null) return false;

        String cleanA = cleanString(nameA);
        String cleanB = cleanString(nameB);

        if (cleanA.equalsIgnoreCase(cleanB)) return true;
        if (cleanA.isEmpty() || cleanB.isEmpty()) return false;

        // Tokenize and extract core distinct keywords
        List<String> tokensA = extractSignificantTokens(cleanA);
        List<String> tokensB = extractSignificantTokens(cleanB);

        // If either has no significant tokens left (e.g. pure legal generic words), fallback to full token comparison
        if (tokensA.isEmpty()) tokensA = Arrays.asList(cleanA.split("\\s+"));
        if (tokensB.isEmpty()) tokensB = Arrays.asList(cleanB.split("\\s+"));

        Set<String> setA = new HashSet<>(tokensA);
        Set<String> setB = new HashSet<>(tokensB);

        // Jaccard similarity of significant tokens
        Set<String> intersection = new HashSet<>(setA);
        intersection.retainAll(setB);

        Set<String> union = new HashSet<>(setA);
        union.addAll(setB);

        double jaccard = (double) intersection.size() / union.size();

        // High token overlap (>= 60%) indicates same core entity (e.g., "Pratham Education" in Foundation vs Trust)
        if (jaccard >= 0.60) {
            return true;
        }

        // Check if one significant set is a complete subset of the other
        if (setA.containsAll(setB) || setB.containsAll(setA)) {
            if (Math.min(setA.size(), setB.size()) >= 1) {
                return true;
            }
        }

        // Fuzzy edit distance on concatenated core roots for OCR typo tolerance (e.g. 1-2 char noise)
        String coreA = String.join("", tokensA);
        String coreB = String.join("", tokensB);
        int distance = computeLevenshteinDistance(coreA, coreB);
        int maxLen = Math.max(coreA.length(), coreB.length());
        if (maxLen > 5 && distance <= 2) {
            return true;
        }

        return false;
    }

    /**
     * Clusters all organization-identifying entities across all uploaded documents.
     * If the entity instances do not converge into a single cluster, flags genuine identity divergence.
     */
    public EntityClusterResult clusterOrganizationEntities(List<EntityInstance> instances) {
        EntityClusterResult result = new EntityClusterResult();
        if (instances == null || instances.isEmpty()) {
            result.isConverged = true;
            result.distinctClusterCount = 0;
            return result;
        }

        List<List<EntityInstance>> clusters = new ArrayList<>();

        for (EntityInstance instance : instances) {
            if (instance.rawValue == null || instance.rawValue.trim().isEmpty()) continue;

            boolean addedToExisting = false;
            for (List<EntityInstance> cluster : clusters) {
                // Check if instance matches the cluster representative
                if (isSameOrganization(cluster.get(0).rawValue, instance.rawValue)) {
                    cluster.add(instance);
                    addedToExisting = true;
                    break;
                }
            }

            if (!addedToExisting) {
                List<EntityInstance> newCluster = new ArrayList<>();
                newCluster.add(instance);
                clusters.add(newCluster);
            }
        }

        result.clusters = clusters;
        result.distinctClusterCount = clusters.size();
        result.isConverged = clusters.size() <= 1;

        if (!result.isConverged) {
            for (int i = 0; i < clusters.size(); i++) {
                for (int j = i + 1; j < clusters.size(); j++) {
                    EntityInstance repA = clusters.get(i).get(0);
                    EntityInstance repB = clusters.get(j).get(0);
                    result.discrepancyDescriptions.add(String.format(
                            "Identity Divergence: '%s' (from %s) and '%s' (from %s) represent distinct legal organizations.",
                            repA.rawValue, repA.sourceDocument, repB.rawValue, repB.sourceDocument
                    ));
                }
            }
        }

        return result;
    }

    /**
     * Determines whether two address strings refer to the same physical location or compatible city/jurisdiction.
     */
    public boolean isSameOrCompatibleAddress(String addrA, String addrB) {
        if (addrA == null || addrB == null) return false;
        String cleanA = cleanString(addrA);
        String cleanB = cleanString(addrB);

        if (cleanA.equalsIgnoreCase(cleanB)) return true;

        // Extract Pincodes if present (6 digits in India)
        String pinA = extractPincode(cleanA);
        String pinB = extractPincode(cleanB);

        if (pinA != null && pinB != null) {
            // First 2 digits of Indian Pincode represent the Postal Circle/State region
            if (!pinA.substring(0, 2).equals(pinB.substring(0, 2))) {
                return false; // Incompatible states/regions (e.g. 56xxxx Karnataka vs 20xxxx UP vs 40xxxx Mumbai)
            }
            if (pinA.equals(pinB)) return true;
        }

        // Significant token comparison (street, locality, city)
        List<String> tokensA = extractAddressTokens(cleanA);
        List<String> tokensB = extractAddressTokens(cleanB);

        Set<String> setA = new HashSet<>(tokensA);
        Set<String> setB = new HashSet<>(tokensB);

        Set<String> intersection = new HashSet<>(setA);
        intersection.retainAll(setB);

        // If at least 2 key location keywords match (e.g. "bengaluru", "karnataka"), consider compatible
        return intersection.size() >= 2;
    }

    /**
     * Validates official PAN format structure according to Income Tax Department standards:
     * - Length: exactly 10 alphanumeric characters
     * - Pattern: 5 uppercase letters, 4 digits, 1 uppercase letter
     * - 4th Character (Status): T (Trust), A (AOP), B (BOI), C (Company), F (Firm), G (Govt), H (HUF), L (Local), J (Artificial Juridical), P (Individual)
     */
    public boolean isValidPanStructure(String pan) {
        if (pan == null) return false;
        String clean = pan.trim().toUpperCase();
        if (!Pattern.matches("^[A-Z]{5}[0-9]{4}[A-Z]$", clean)) {
            return false;
        }
        char fourthChar = clean.charAt(3);
        // Must be a valid entity code in India
        return "TABCPFHGLJ".indexOf(fourthChar) >= 0;
    }

    /**
     * Validates official Indian Financial System Code (IFSC) structure according to RBI standards:
     * - Length: exactly 11 characters
     * - Pattern: 4 letters (Bank Code), followed by '0', followed by 6 alphanumeric characters (Branch Code)
     * - Branch code cannot be all zeros
     */
    public boolean isValidIfscStructure(String ifsc) {
        if (ifsc == null) return false;
        String clean = ifsc.trim().toUpperCase();
        if (!Pattern.matches("^[A-Z]{4}0[A-Z0-9]{6}$", clean)) {
            return false;
        }
        String branch = clean.substring(5);
        return !branch.equals("000000"); // Branch code cannot be purely 000000
    }

    /**
     * Validates NITI Aayog NGO-DARPAN ID structure:
     * - Format: 2-letter state code + / + 4-digit registration year + / + unique numeric ID
     * - Example: "KA/2021/0012345" or "MH/2018/0099887"
     */
    public boolean isValidDarpanStructure(String darpanId) {
        if (darpanId == null || darpanId.isBlank()) return true; // Optional field
        String clean = darpanId.trim().toUpperCase();
        Pattern p = Pattern.compile("^([A-Z]{2})/([0-9]{4})/([0-9]+)$");
        Matcher m = p.matcher(clean);
        if (!m.matches()) return false;

        String stateCode = m.group(1);
        int year = Integer.parseInt(m.group(2));
        int currentYear = java.time.Year.now().getValue();

        return INDIAN_STATE_CODES.contains(stateCode) && year >= 1950 && year <= currentYear;
    }

    private List<String> extractSignificantTokens(String s) {
        String[] words = s.toLowerCase().split("[^a-z0-9]+");
        List<String> result = new ArrayList<>();
        for (String w : words) {
            if (w.length() >= 2 && !LEGAL_ENTITY_STOP_WORDS.contains(w)) {
                result.add(w);
            }
        }
        return result;
    }

    private List<String> extractAddressTokens(String s) {
        String[] words = s.toLowerCase().split("[^a-z0-9]+");
        List<String> result = new ArrayList<>();
        Set<String> stop = new HashSet<>(Arrays.asList("road", "street", "lane", "building", "flat", "plot", "near", "opposite", "opp", "floor", "premises", "address", "registered", "office"));
        for (String w : words) {
            if (w.length() >= 3 && !stop.contains(w)) {
                result.add(w);
            }
        }
        return result;
    }

    private String extractPincode(String text) {
        Pattern p = Pattern.compile("\\b([1-9][0-9]{5})\\b");
        Matcher m = p.matcher(text);
        if (m.find()) {
            return m.group(1);
        }
        return null;
    }

    private String cleanString(String s) {
        if (s == null) return "";
        return s.trim().replaceAll("\\s+", " ");
    }

    private int computeLevenshteinDistance(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 0; i <= a.length(); i++) dp[i][0] = i;
        for (int j = 0; j <= b.length(); j++) dp[0][j] = j;

        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = (a.charAt(i - 1) == b.charAt(j - 1)) ? 0 : 1;
                dp[i][j] = Math.min(Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1), dp[i - 1][j - 1] + cost);
            }
        }
        return dp[a.length()][b.length()];
    }
}
