async function testReg() {
    try {
        const res = await fetch('http://localhost:8080/api/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test' + Math.random() + '@test.com',
                password: 'pass',
                fullName: 'Test NGO',
                phone: '123',
                role: 'NGO',
                orgName: 'My Org',
                darpanId: 'D1',
                panNumber: 'P1',
                orgType: 'COMPANY'
            })
        });
        
        const data = await res.text();
        console.log("Status:", res.status);
        console.log("Response:", data);
    } catch(err) {
        console.log("Error:", err);
    }
}

testReg();
