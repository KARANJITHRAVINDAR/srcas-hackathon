import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.File;
import javax.imageio.ImageIO;

public class GenerateTestImages {
    public static void main(String[] args) {
        try {
            // 1. PAN Card
            createImage("sample_documents/fake_pan_card.png", 
                "INCOME TAX DEPARTMENT\nGOVT OF INDIA\n\nName: Green Earth Foundation\n\nPermanent Account Number\nABCDE1234F", 
                Color.WHITE, Color.BLACK);

            // 2. Cancelled Cheque
            createImage("sample_documents/fake_cancelled_cheque.png", 
                "STATE BANK OF INDIA\nBranch: New Delhi\nIFSC Code: SBIN0001234\n\nPAY: _____________________\n\nBank Account Name: Green Earth Foundation Trust\nA/c No: 12345678901\n\n=== CANCELLED ===", 
                new Color(240, 248, 255), Color.BLUE);
                
            // 3. Darpan Cert
            createImage("sample_documents/fake_darpan_cert.png", 
                "NITI AAYOG\nNGO DARPAN\n\nRegistration Certificate\n\nDarpan ID: TN/2023/0123456\n\nOrg Name: Green Earth Foundation Trust\nAddress: 124 Gandhi Road, Chennai, TN 600001", 
                new Color(255, 250, 240), Color.DARK_GRAY);

            // 4. Trust Deed
            createImage("sample_documents/fake_trust_deed.png", 
                "DEED OF TRUST\n\nOrg Name: Green Earth Foundation Trust\nRegistration Type: TRUST\nRegistration Number: TN/TR/2015/0089\nDate Of Establishment: 2015-08-15\nAddress: 124 Gandhi Road, Chennai, Tamil Nadu 600001", 
                new Color(245, 245, 245), Color.BLACK);

            // 5. CSR-1
            createImage("sample_documents/fake_csr1.png", 
                "MINISTRY OF CORPORATE AFFAIRS\n\nCSR-1 Registration\n\nOrg Name: Green Earth Foundation Trust\nCSR1 Number: CSR00012345\nPAN Number: AAATG1234H", 
                Color.WHITE, Color.BLACK);

            // 6. Board Resolution
            createImage("sample_documents/fake_board_resolution.png", 
                "BOARD RESOLUTION\n\nRESOLVED THAT the following person is authorized:\n\nSignatory Name: Arun Kumar\nSignatory Designation: Managing Trustee\nSignatory PAN: ABCDE1234F", 
                Color.WHITE, Color.DARK_GRAY);

            // 7. 12A Cert
            createImage("sample_documents/fake_12a_cert.png", 
                "INCOME TAX EXEMPTION CERTIFICATE\n\nSection 12A\n\n12A Number: 12A-2016-889\nOrg Name: Green Earth Foundation Trust", 
                Color.WHITE, Color.BLACK);

            // 8. 80G Cert
            createImage("sample_documents/fake_80g_cert.png", 
                "INCOME TAX EXEMPTION CERTIFICATE\n\nSection 80G\n\n80G Number: 80G-2016-442\nOrg Name: Green Earth Foundation Trust", 
                Color.WHITE, Color.BLACK);

            // 9. Fake Valid Invoice (Matches a typical 50,000 INR milestone)
            createImage("sample_documents/fake_valid_invoice.png", 
                "TAX INVOICE\n\nVendor: Global Supplies Ltd\nDate: 2026-08-11\n\nItems:\n- Solar Panels x10\n- Batteries x5\n\nTotal Amount: 50000.00", 
                new Color(255, 255, 240), Color.DARK_GRAY);

            // 10. Fake Fraud Invoice (Total is completely mismatched)
            createImage("sample_documents/fake_fraud_invoice.png", 
                "TAX INVOICE\n\nVendor: Shady Supplies\nDate: 2026-08-11\n\nItems:\n- Solar Panels x10\n\nTotal Amount: 1500.00", 
                new Color(255, 240, 240), Color.BLACK);

            System.out.println("Successfully generated 10 test images in sample_documents!");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void createImage(String path, String text, Color bgColor, Color textColor) throws Exception {
        int width = 800;
        int height = 500;
        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g2d = img.createGraphics();

        // Background
        g2d.setColor(bgColor);
        g2d.fillRect(0, 0, width, height);

        // Text
        g2d.setColor(textColor);
        g2d.setFont(new Font("Arial", Font.BOLD, 24));

        String[] lines = text.split("\n");
        int y = 50;
        for (String line : lines) {
            g2d.drawString(line, 50, y);
            y += 35;
        }

        g2d.dispose();
        ImageIO.write(img, "png", new File(path));
    }
}
