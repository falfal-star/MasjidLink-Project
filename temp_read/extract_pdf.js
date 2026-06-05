const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function extractText() {
    const basePath = path.join(__dirname, '..', 'docs');
    const pdfPath = path.join(basePath, 'MasjidLink_Blueprint_ThifalYumnaNazihah (1).pdf');
    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdf(dataBuffer);
        fs.writeFileSync('pdf_text.txt', data.text);
        console.log('PDF extracted successfully');
    } catch (err) {
        console.error('Error reading PDF:', err);
    }
}

extractText();
