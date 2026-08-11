import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class TestRegex {
    public static void main(String[] args) {
        String extractedText = "DEED OF TRUST\n\nOrg Name: Green Earth Foundation Trust\n\nRegistration Type: TRUST\n\nRegistration Number: TN/TR/2015/0089\n\nDate Of Establishment: 2015-08-15\n\nAddress: 124 Gandhi Road, Chennai, Tamil Nadu 600001";
        
        System.out.println("Org Name: " + extractRegex(extractedText, "(?i)Org Name:\\s*(.+)"));
        System.out.println("Registration Number: " + extractRegex(extractedText, "(?i)Registration Number:\\s*(.+)"));
        System.out.println("Date Of Establishment: " + extractRegex(extractedText, "(?i)Date Of Establishment:\\s*(.+)"));
    }
    
    private static String extractRegex(String text, String regex) {
        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(matcher.groupCount() > 0 ? 1 : 0).trim();
        }
        return null;
    }
}
