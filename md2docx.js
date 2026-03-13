const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const fetch = require('node-fetch');
const htmlDocx = require('html-docx-js');

const MD_FILE = path.join(__dirname, 'P0功能-产品方案1.0.md');
const OUT_FILE = path.join(__dirname, 'P0功能-产品方案1.0.docx');
const IMG_DIR = path.join(__dirname, 'mermaid-images');

if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR);

async function renderMermaidToBase64(code, index) {
  const imgPath = path.join(IMG_DIR, `diagram-${index}.png`);

  if (fs.existsSync(imgPath)) {
    console.log(`  [cache] diagram-${index}.png`);
    return fs.readFileSync(imgPath).toString('base64');
  }

  const payload = Buffer.from(code, 'utf-8').toString('base64');
  const url = `https://kroki.io/mermaid/png/${payload}`;

  console.log(`  [fetch] diagram-${index} from kroki.io ...`);
  const resp = await fetch(url, { timeout: 30000 });

  if (!resp.ok) {
    const encoded = encodeURIComponent(code);
    const altUrl = `https://kroki.io/mermaid/png`;
    console.log(`  [retry] POST to kroki.io ...`);
    const resp2 = await fetch(altUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: code,
      timeout: 30000
    });
    if (!resp2.ok) {
      console.error(`  [FAIL] diagram-${index}: ${resp2.status}`);
      return null;
    }
    const buf = await resp2.buffer();
    fs.writeFileSync(imgPath, buf);
    return buf.toString('base64');
  }

  const buf = await resp.buffer();
  fs.writeFileSync(imgPath, buf);
  return buf.toString('base64');
}

async function main() {
  console.log('Reading markdown...');
  let md = fs.readFileSync(MD_FILE, 'utf-8');

  // Extract mermaid blocks
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  const mermaidBlocks = [];
  let match;
  while ((match = mermaidRegex.exec(md)) !== null) {
    mermaidBlocks.push({ full: match[0], code: match[1].trim() });
  }
  console.log(`Found ${mermaidBlocks.length} Mermaid diagrams.`);

  // Render each diagram
  for (let i = 0; i < mermaidBlocks.length; i++) {
    console.log(`Rendering diagram ${i + 1}/${mermaidBlocks.length}...`);
    const b64 = await renderMermaidToBase64(mermaidBlocks[i].code, i);
    if (b64) {
      md = md.replace(
        mermaidBlocks[i].full,
        `<div style="text-align:center;margin:16px 0;"><img src="data:image/png;base64,${b64}" style="max-width:100%;height:auto;" /></div>`
      );
    } else {
      md = md.replace(
        mermaidBlocks[i].full,
        '<p style="color:red;">[流程图渲染失败，请参阅原始 Mermaid 代码]</p>'
      );
    }
  }

  // Also handle plain code blocks (architecture diagram)
  const plainCodeRegex = /```\n([\s\S]*?)```/g;

  console.log('Converting Markdown to HTML...');
  const htmlBody = marked.parse(md);

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 2cm 2.5cm; }
  body {
    font-family: "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.7;
    color: #333;
    max-width: 700px;
    margin: 0 auto;
  }
  h1 {
    font-size: 22pt;
    color: #1a1a2e;
    border-bottom: 3px solid #4f46e5;
    padding-bottom: 8px;
    margin-top: 20px;
  }
  h2 {
    font-size: 16pt;
    color: #1a1a2e;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 6px;
    margin-top: 28px;
  }
  h3 { font-size: 13pt; color: #333; margin-top: 20px; }
  h4 { font-size: 11.5pt; color: #444; margin-top: 16px; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 10pt;
  }
  th, td {
    border: 1px solid #d0d0d0;
    padding: 6px 10px;
    text-align: left;
    vertical-align: top;
  }
  th { background: #f5f3ff; font-weight: 600; }
  tr:nth-child(even) td { background: #fafafa; }
  code {
    background: #f4f4f5;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 10pt;
    font-family: "Courier New", monospace;
  }
  pre {
    background: #f8f8fa;
    border: 1px solid #e5e5ea;
    border-radius: 6px;
    padding: 12px 16px;
    overflow-x: auto;
    font-size: 9.5pt;
    line-height: 1.5;
  }
  pre code { background: none; padding: 0; }
  blockquote {
    border-left: 4px solid #4f46e5;
    margin: 12px 0;
    padding: 8px 16px;
    background: #f5f3ff;
    color: #555;
  }
  ul, ol { padding-left: 24px; }
  li { margin-bottom: 4px; }
  strong { color: #1a1a2e; }
  hr { border: none; border-top: 1px solid #e5e5ea; margin: 24px 0; }
  img { max-width: 100%; height: auto; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>
${htmlBody}
</body>
</html>`;

  console.log('Generating DOCX...');

  const docxBuf = htmlDocx.asBlob(fullHtml);

  // html-docx-js returns a Blob-like in Node, extract buffer
  let outBuf;
  if (Buffer.isBuffer(docxBuf)) {
    outBuf = docxBuf;
  } else if (docxBuf instanceof ArrayBuffer) {
    outBuf = Buffer.from(docxBuf);
  } else if (docxBuf && docxBuf.arrayBuffer) {
    outBuf = Buffer.from(await docxBuf.arrayBuffer());
  } else {
    // Try treating as Buffer-like
    outBuf = Buffer.from(docxBuf);
  }

  fs.writeFileSync(OUT_FILE, outBuf);
  console.log(`\nDone! DOCX saved to: ${OUT_FILE}`);
  console.log(`File size: ${(outBuf.length / 1024).toFixed(0)} KB`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
