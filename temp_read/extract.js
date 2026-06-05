const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

async function extractText() {
    const basePath = path.join(__dirname, '..', 'docs');
    
    // Read PDF
    const pdfPath = path.join(basePath, 'MasjidLink_Blueprint_ThifalYumnaNazihah (1).pdf');
    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdfParse(dataBuffer);
        fs.writeFileSync('pdf_text.txt', data.text);
        console.log('PDF extracted successfully');
    } catch (err) {
        console.error('Error reading PDF:', err.message);
    }

    // Read Docx
    const docxPath = path.join(basePath, '01_PRD_MasjidLink.md (1).docx');
    try {
        const result = await mammoth.extractRawText({path: docxPath});
        fs.writeFileSync('docx_text.txt', result.value);
        console.log('Docx extracted successfully');
    } catch (err) {
        console.error('Error reading Docx:', err.message);
    }
}

extractText();
