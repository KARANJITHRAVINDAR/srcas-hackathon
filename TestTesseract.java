import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import java.io.File;

public class TestTesseract {
    public static void main(String[] args) {
        try {
            ITesseract tesseract = new Tesseract();
            tesseract.setDatapath("C:\\Program Files\\Tesseract-OCR\\tessdata");
            
            System.out.println("--- TRUST DEED ---");
            System.out.println(tesseract.doOCR(new File("sample_documents/fake_trust_deed.png")));
            
            System.out.println("--- CSR1 ---");
            System.out.println(tesseract.doOCR(new File("sample_documents/fake_csr1.png")));
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
