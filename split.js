const fs = require('fs');
const path = 'C:\\\\Users\\\\Admin\\\\.gemini\\\\antigravity\\\\scratch\\\\';
const file = path + 'baocao.html';
const html = fs.readFileSync(file, 'utf8');

const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>', styleStart) + 8;
const cssContent = html.substring(styleStart + 7, styleEnd - 8).trim();

const jsStart = html.indexOf('<script>\\n  const SCRIPT_URL');
const jsEnd = html.lastIndexOf('</script>');
let jsContent = html.substring(jsStart + 8, jsEnd).trim();

// Construct index.html
let htmlContent = html.substring(0, styleStart);
htmlContent += '<link rel="stylesheet" href="style.css">\\n';
let midHtml = html.substring(styleEnd, jsStart);

// Add PapaParse
midHtml = midHtml.replace(
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>',
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>\\n<script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>'
);

htmlContent += midHtml;
htmlContent += '<script src="script.js"></script>\\n</body>\\n</html>\\n';

fs.writeFileSync(path + 'index.html', htmlContent);
fs.writeFileSync(path + 'style.css', cssContent);

// Fix authentication in JS
const regexAuth = /const ADMIN_TOKENS = \\["zxc", "vi123"\\];.*?if \\(ADMIN_TOKENS\\.includes\\(token\\)\\) \\{.*?sessionStorage\\.setItem\\('user_role', 'admin'\\);.*?\\} else \\{.*?sessionStorage\\.setItem\\('user_role', 'staff'\\);.*?\\}/s;
jsContent = jsContent.replace(regexAuth, "if (data.role === 'admin') {\\n        sessionStorage.setItem('user_role', 'admin');\\n      } else {\\n        sessionStorage.setItem('user_role', 'staff');\\n      }");

fs.writeFileSync(path + 'script.js', jsContent);
console.log('Split success');
