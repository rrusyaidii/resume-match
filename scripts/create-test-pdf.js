// Generate a minimal valid PDF for testing
const fs = require("fs");
const path = require("path");

function createTestPDF(outputPath) {
  const content = `
John Doe
Software Engineer
Email: john@example.com | Phone: +1-555-1234

SUMMARY
Full-stack developer with 5 years experience in React, Node.js, and TypeScript.
Built scalable web applications serving 100k+ users.

EXPERIENCE

Senior Software Engineer | TechCorp | 2022 - Present
- Led development of microservices architecture serving 500k+ requests/day
- Migrated legacy monolith to React + Node.js stack, reducing latency by 40%
- Mentored 3 junior developers

Software Engineer | WebStart | 2020 - 2022
- Built RESTful APIs using Node.js/Express and PostgreSQL
- Implemented CI/CD pipeline reducing deployment time by 60%
- Developed real-time dashboard using Socket.io and React

SKILLS
Languages: TypeScript, JavaScript, Python, SQL
Frontend: React, Next.js, Tailwind CSS
Backend: Node.js, Express, REST APIs, GraphQL
Database: PostgreSQL, MongoDB, Redis
DevOps: Docker, AWS (EC2, S3), CI/CD, Nginx
Tools: Git, Jira, Figma

EDUCATION
BSc Computer Science | University of Technology | 2016 - 2020`;
  
  // Build a simple valid PDF
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  
  const objects = [];
  let objNum = 1;
  
  objects.push(`${objNum} 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj`);
  const catalogRef = objNum;
  objNum++;
  
  objects.push(`${objNum} 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj`);
  const pagesRef = objNum;
  objNum++;
  
  const streamContent = `BT /F1 12 Tf 50 750 Td (${esc(content.split('\n')[1] || '')}) Tj ET\n`;
  const lines = content.split('\n').filter(l => l.trim());
  
  let streamData = '';
  let y = 750;
  streamData += `BT /F1 12 Tf 50 ${y} Td (${esc(lines[0] || '')}) Tj ET\n`;
  y -= 20;
  
  for (const line of lines.slice(1)) {
    if (line.trim() === '') { y -= 10; continue; }
    streamData += `BT /F1 10 Tf 50 ${y} Td (${esc(line)}) Tj ET\n`;
    y -= 16;
  }
  
  objects.push(`${objNum} 0 obj<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 612 792] /Contents ${objNum + 1} 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj`);
  const pageRef = objNum;
  objNum++;
  
  objects.push(`${objNum} 0 obj<< /Length ${streamData.length} >>stream\n${streamData}\nendstream\nendobj`);
  const contentRef = objNum;
  objNum++;
  
  objects.push(`${objNum} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj`);
  const fontRef = objNum;
  objNum++;
  
  const body = objects.join('\n');
  const offsets = [];
  let pos = 0;
  
  let pdf = '%PDF-1.4\n';
  const lines2 = body.split('\n');
  for (const l of lines2) {
    offsets.push(pos);
    pdf += l + '\n';
    pos += l.length + 1;
  }
  
  pdf += 'xref\n';
  pdf += `0 ${objNum + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objNum; i++) {
    pdf += String(offsets[i-1]).padStart(10, '0') + ' 00000 n \n';
  }
  
  pdf += `trailer<< /Size ${objNum + 1} /Root ${catalogRef} 0 R >>\n`;
  pdf += 'startxref\n' + pos + '\n%%EOF';
  
  fs.writeFileSync(outputPath, pdf);
  console.log(`✅ Test PDF created: ${outputPath}`);
  console.log(`   Size: ${pdf.length} bytes`);
}

createTestPDF(path.join(__dirname, '..', 'test-resume.pdf'));