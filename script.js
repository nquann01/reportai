const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby2y8N1gRjZ6trrX5wUllu8rs463Z8qGV_E-JHyOfLIXPLZ5DrIDVJ9UuzyTnOR2nL8/exec';

async function checkToken() {
  const token = document.getElementById('token-input').value.trim();
  const errEl = document.getElementById('auth-error');
  const btn = document.querySelector('#auth-screen button');

  if (!token) {
    errEl.textContent = 'Vui lòng nhập mã truy cập!';
    errEl.style.display = 'block';
    return;
  }

  btn.textContent = 'Đang kiểm tra...';
  btn.disabled = true;
  errEl.style.display = 'none';

  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    const data = await res.json();

    if (data.valid) {
      sessionStorage.setItem('auth_token', token);
      sessionStorage.setItem('auth_name', data.name);
      
      // === PHÂN QUYỀN MỚI ===
      if (data.role === 'admin') {
        sessionStorage.setItem('user_role', 'admin');
      } else {
        sessionStorage.setItem('user_role', 'staff');
      }
      // =======================

      // Ghi log đăng nhập (chạy ngầm)
      fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'login', token: token })
      }).catch(() => {});
      
      document.getElementById('auth-screen').style.display = 'none';
      initApp(); 

    } else {
      errEl.textContent = data.message || 'Mã không hợp lệ!';
      errEl.style.display = 'block';
      btn.textContent = 'Xác nhận →';
      btn.disabled = false;
    }
  } catch (error) {
    console.error("Lỗi xác thực:", error);
    errEl.textContent = 'Lỗi kết nối máy chủ! Vui lòng kiểm tra lại F12 (Console).';
    errEl.style.display = 'block';
    btn.textContent = 'Xác nhận →';
    btn.disabled = false;
  }
}

// Cho phép nhấn Enter
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('token-input');
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') checkToken();
    });
  }
});
function initApp() {
  // Kiểm tra đã auth chưa
  if (!sessionStorage.getItem('auth_token')) {
    return; // Chờ user nhập token
  }
  
  // === GIỚI HẠN TÍNH NĂNG THEO QUYỀN (LÀM MỜ VÀ KHÓA) ===
  const role = sessionStorage.getItem('user_role');
  if (role !== 'admin') {
    // 1. Ép chọn mặc định vào tab Dashboard (Vì báo cáo tuần/tháng bị khóa)
    document.getElementById('db').checked = true;
    
    // 2. Gom các nút cần khóa lại (Đã mở khóa tab Gunze & MP, chỉ khóa Báo cáo)
    const restrictedTabs = [
      document.querySelector('label[for="tw"]'),     // Tab Báo cáo Tuần
      document.querySelector('label[for="tm"]')      // Tab Báo cáo Tháng
    ];

    // 3. Làm mờ và khóa click từng nút
    restrictedTabs.forEach(tab => {
      if (tab) {
        tab.style.opacity = '0.3';
        tab.style.filter = 'grayscale(1)';
        tab.style.cursor = 'not-allowed';
        tab.style.pointerEvents = 'none'; // Chốt chặn: Khóa hoàn toàn khả năng click
        tab.title = 'Bạn không được cấp quyền dùng tính năng này';
      }
    });
  }
  // =======================================================

  loadHistList();
  const savedKey = localStorage.getItem('gemini_api_key');
  const keyInput = document.getElementById('api-key-input');
  if (savedKey) { keyInput.value = savedKey; keyInput.style.borderColor = 'var(--acc2)'; }
  updateUI();
}

async function saveApiKey() {
  const keyInput = document.getElementById('api-key-input');
  const key = keyInput.value.trim();
  const btn = document.querySelector('.btn-save-key');
  if (!key) { alert("Vui lòng nhập API Key trước khi lưu!"); return; }
  
  const ogText = btn.textContent; 
  btn.textContent = "Đang kiểm tra..."; 
  btn.disabled = true;
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    const res = await fetch(url, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }) 
    });
    
    if (res.ok) { 
      localStorage.setItem('gemini_api_key', key); 
      keyInput.style.borderColor = "var(--acc2)"; 
      alert("✅ API Key hợp lệ và đã được lưu!"); 
    } else { 
      const errData = await res.json(); 
      keyInput.style.borderColor = "var(--danger)"; 
      
      // Phân loại riêng lỗi quá tải (503, 429) và lỗi sai Key (400, 403)
      if (res.status === 503 || res.status === 429) {
        alert("⏳ Hệ thống AI của Google đang quá tải. API Key của bạn không sai. Vui lòng đợi khoảng 1 phút rồi bấm lưu lại nhé!");
      } else {
        alert(`❌ API Key bị lỗi (${res.status}):\n${errData.error?.message}`); 
      }
    }
  } catch (e) { 
    keyInput.style.borderColor = "var(--warn)"; 
    alert("⚠️ Lỗi mạng, không thể kiểm tra lúc này."); 
  } finally { 
    btn.textContent = ogText; 
    btn.disabled = false; 
  }
}

function clearApiKey() {
  localStorage.removeItem('gemini_api_key');
  const keyInput = document.getElementById('api-key-input');
  keyInput.value = ''; keyInput.style.borderColor = "var(--bdr)";
  alert("Đã xoá API Key khỏi trình duyệt!");
}

function getApiKey() { return localStorage.getItem('gemini_api_key') || document.getElementById('api-key-input').value.trim(); }
function getApiUrl() { const key = getApiKey() || ""; const model = key ? "gemini-2.5-flash" : "gemini-2.5-flash-preview-09-2025"; return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`; }

function updateUI() {
  const ptype = document.querySelector('input[name="ptype"]:checked').value;
  const rtype = document.querySelector('input[name="rtype"]:checked').value;

  document.getElementById('tab-main-dashboard').classList.add('d-none');
  document.getElementById('zone-main').classList.add('d-none');
  document.getElementById('zone-kosu').classList.add('d-none');
  document.getElementById('tab-main-tuan').classList.add('d-none');
  document.getElementById('tab-main-thang').classList.add('d-none');
  document.getElementById('tab-kosu-tuan').classList.add('d-none');
  document.getElementById('tab-kosu-thang').classList.add('d-none');
  document.getElementById('tab-kosu-dashboard')?.classList.add('d-none');

  if (ptype === 'Main') {
    document.getElementById('zone-main').classList.remove('d-none');
    if (rtype === 'Tuần') document.getElementById('tab-main-tuan').classList.remove('d-none');
    else if (rtype === 'Tháng') document.getElementById('tab-main-thang').classList.remove('d-none');
    else { document.getElementById('tab-main-dashboard').classList.remove('d-none'); }
  } else {
    document.getElementById('zone-kosu').classList.remove('d-none');
    if (rtype === 'Tuần') document.getElementById('tab-kosu-tuan').classList.remove('d-none');
    else if (rtype === 'Tháng') document.getElementById('tab-kosu-thang').classList.remove('d-none');
    else document.getElementById('tab-kosu-dashboard').classList.remove('d-none');
  }
}

const STORAGE_KEY = 'ai_report_history';
async function loadHistList() {
  const token = sessionStorage.getItem('auth_token') || '';
  const sel = document.getElementById('hist-sel');
  const delAllBtn = document.getElementById('del-all-btn');
  
  // Hiện thông báo đang tải
  sel.innerHTML = '<option value="">-- Đang tải từ Cloud... --</option>';

  try {
    // Gọi lên Google Sheets xin dữ liệu
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'fetchHistory', token: token })
    });
    
    // NHÉT TOÀN BỘ DỮ LIỆU VÀO CACHE Ở ĐÂY
    cloudReportsCache = await res.json(); 
    
    // Đổ danh sách vào menu xổ xuống (Select)
    sel.innerHTML = '<option value="">-- Xem lịch sử báo cáo --</option>';
    cloudReportsCache.forEach(rpt => {
      // Dùng rpt.id làm value, hiển thị thời gian và loại báo cáo
      const label = `[${rpt.time}] ${rpt.type} ${rpt.period}`;
      sel.innerHTML += `<option value="${rpt.id}">${label}</option>`;
    });
    
    // Ẩn nút xoá hết đi cho an toàn
    delAllBtn.style.display = 'none'; 
  } catch (e) {
    sel.innerHTML = '<option value="">⚠️ Lỗi tải dữ liệu Cloud</option>';
    console.error("Lỗi tải lịch sử:", e);
  }
}

function viewHist() {
  const reportId = document.getElementById('hist-sel').value; // Lấy ID báo cáo sếp vừa chọn
  const delBtn = document.getElementById('del-btn'); 
  const delAllBtn = document.getElementById('del-all-btn'); // Nút xoá hết
  const magicBtn = document.getElementById('magic-btn'); 
  const forecastBtn = document.getElementById('forecast-btn');
  const chatBox = document.getElementById('ai-chat-box');
  const role = sessionStorage.getItem('user_role'); // Lấy quyền user
  
  resetChat(); 
  
  // Nếu sếp chọn ô "-- Xem lịch sử --" (không có giá trị)
  if(!reportId) {
    document.getElementById('out').innerHTML = `<div class="s-empty"><div class="ico">🗂️</div><p>Chọn một báo cáo từ lịch sử để xem</p></div>`;
    delBtn.style.display = 'none'; 
    delAllBtn.style.display = 'none';
    magicBtn.style.display = 'none'; 
    forecastBtn.style.display = 'none'; 
    if(chatBox) chatBox.style.display = 'none'; 
    return;
  }

  // TÌM BÁO CÁO TRONG CACHE DỰA VÀO ID
  const rpt = cloudReportsCache.find(item => item.id === reportId);
  
  if(rpt) {
    // Bơm mã HTML của báo cáo vào màn hình
    document.getElementById('out').innerHTML = rpt.html;
    
    // Bật các nút chức năng lên
    magicBtn.style.display = 'inline-block'; 
    forecastBtn.style.display = 'inline-block'; 
    if(chatBox) chatBox.style.display = 'flex';

    // === XỬ LÝ NÚT XOÁ THEO QUYỀN ===
    delBtn.style.display = 'block';
    if (role === 'admin') {
        delBtn.disabled = false;
        delBtn.title = "Xoá báo cáo đang xem";
        delAllBtn.style.display = 'inline-block'; // Admin thấy nút xoá sạch
    } else {
        delBtn.disabled = true;
        delBtn.title = "Bạn chỉ có quyền xem, không thể xoá";
        delAllBtn.style.display = 'none'; // Giấu nút xoá sạch đi
    }
  }
}

async function saveHist(type, periodStr, htmlStr) {
    const token = sessionStorage.getItem('auth_token') || '';
    const userName = sessionStorage.getItem('auth_name') || 'Ẩn danh';
    
    // Hiển thị trạng thái đang lưu cho sếp yên tâm
    const gbtn = document.getElementById('gbtn');
    const ogText = gbtn.textContent;
    gbtn.textContent = "⏳ Đang lưu lên Cloud...";

    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'saveReport',
                token: token,
                userName: userName,
                reportType: type,
                period: periodStr || '—',
                html: htmlStr
            })
        });
        const data = await res.json();
        if(data.success) {
            console.log("Đã lưu lên Sheets thành công");
            await loadHistList(); // Tải lại danh sách sau khi lưu
        }
    } catch (e) {
        console.error("Lỗi lưu Cloud:", e);
        // Nếu lỗi cloud thì sếp có thể dùng LocalStorage làm dự phòng ở đây
    } finally {
        gbtn.textContent = ogText;
    }
}

async function deleteHist() {
    const role = sessionStorage.getItem('user_role');
    if (role !== 'admin') return; // Nhân viên bấm tàng hình cũng ko chạy

    const reportId = document.getElementById('hist-sel').value;
    if(!reportId) return;
    const token = sessionStorage.getItem('auth_token'); 
    
    // Ép kiểu String để tìm chính xác báo cáo trong bộ nhớ, lấy ra ID nguyên bản
    const rpt = cloudReportsCache.find(item => String(item.id) === String(reportId));
    if (!rpt) return;
    
    const rptName = `${rpt.type} ${rpt.period}`;

    if(!confirm(`⚠️ Bạn có chắc muốn xoá báo cáo "${rptName}" trên mây không?`)) return;
    
    const delBtn = document.getElementById('del-btn');
    const ogText = delBtn.textContent;
    delBtn.textContent = "⏳...";
    delBtn.disabled = true;

    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'deleteReport', 
                reportId: rpt.id, // Gửi đúng ID gốc lên Cloud
                token: token
            })
        });
        const result = await res.json();
        
        if(!result.success) {
            alert(result.message || "Máy chủ từ chối xoá báo cáo này!"); 
        } else {
            alert("✅ Đã xoá báo cáo thành công!");
            document.getElementById('hist-sel').value = "";
            document.getElementById('out').innerHTML = `<div class="s-empty"><div class="ico">🗂️</div><p>Báo cáo đã bị xoá. Vui lòng chọn báo cáo khác.</p></div>`;
            await loadHistList(); 
            viewHist(); 
        }
    } catch (e) {
        alert("Lỗi mạng khi xóa dữ liệu trên Cloud!");
    } finally {
        delBtn.textContent = "🗑️";
        delBtn.disabled = false;
    }
}

async function deleteAllHist() {
    const role = sessionStorage.getItem('user_role');
    if (role !== 'admin') return; 

    if (!cloudReportsCache || cloudReportsCache.length === 0) {
        alert("Lịch sử đang trống, không có báo cáo nào để xoá!");
        return;
    }

    if(!confirm(`⚠️ CẢNH BÁO TỐI CAO: Bạn có chắc chắn muốn xoá SẠCH SẼ toàn bộ ${cloudReportsCache.length} báo cáo trên mây không? Hành động này không thể hoàn tác!`)) return;
    
    const delAllBtn = document.getElementById('del-all-btn');
    const ogText = delAllBtn.textContent;
    delAllBtn.textContent = "⏳ Đang dọn...";
    delAllBtn.disabled = true;

    const token = sessionStorage.getItem('auth_token');

    try {
        let deletedCount = 0;
        // Lặp qua xoá từng file
        for (const rpt of cloudReportsCache) {
            const res = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ 
                    action: 'deleteReport', 
                    reportId: rpt.id, 
                    token: token 
                })
            });
            const result = await res.json();
            if(result.success) deletedCount++;
        }
        
        alert(`✅ Đã dọn dẹp thành công ${deletedCount} báo cáo cũ!`);
        document.getElementById('hist-sel').value = "";
        document.getElementById('out').innerHTML = `<div class="s-empty"><div class="ico">🧹</div><p>Lịch sử đã được dọn sạch sẽ!</p></div>`;
        await loadHistList(); 
        viewHist(); 
    } catch (e) {
        alert("⚠️ Lỗi mạng khi đang dọn dẹp dữ liệu trên Cloud!");
    } finally {
        delAllBtn.textContent = ogText;
        delAllBtn.disabled = false;
    }
}
  
const parseCSVAsync = async (file) => {
    return new Promise((resolve) => {
        if(!file) return resolve([]);
        const r = new FileReader();
        r.onload = e => {
            let text = '';
            if (file.name.match(/\.(xlsx|xls)$/i)) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                text = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
            } else {
                // Đọc buffer và tự động nhận diện font Tiếng Việt
                try { 
                    text = new TextDecoder('utf-8', { fatal: true }).decode(e.target.result); 
                } catch (err) { 
                    text = new TextDecoder('windows-1258').decode(e.target.result); 
                }
            }
            
            Papa.parse(text, {
                skipEmptyLines: true,
                complete: function(results) {
                    const cleanedData = results.data.map(row => 
                        row.map(item => (item || '').replace(/^"|"$/g, '').trim())
                    );
                    resolve(cleanedData);
                }
            });
        };
        // QUAN TRỌNG: Luôn đọc file dưới dạng ArrayBuffer thay vì Text
        r.readAsArrayBuffer(file);
    });
};
  
function handleDbFile(files, key) {
  if(files.length > 0) {
      dbFiles[key] = files[0];
      document.getElementById('prev_db_' + key).innerHTML = `<div style="font-size:10px; color:var(--acc2); margin-top:5px; font-weight:600;">✓ Đã tải: ${files[0].name}</div>`;
  }
}

function handleFiles(files, region) {
  Array.from(files).forEach(f => {
    if (f.type.startsWith('image/')) {
      const r = new FileReader();
      r.onload = e => { 
        const res = e.target.result;
        if (typeof res === 'string' && res.includes(',')) {
          imgs[region].push({ data: res.split(',')[1], type: f.type, name: f.name }); renderPrev(region); 
        }
      };
      r.readAsDataURL(f);
    } else if (f.name.match(/\.(xlsx|xls|csv)$/i)) {
      const r = new FileReader();
      r.onload = e => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        let text = `\n--- DỮ LIỆU EXCEL: ${f.name} ---\n`;
        workbook.SheetNames.forEach(sheet => { text += `[Sheet: ${sheet}]\n` + XLSX.utils.sheet_to_csv(workbook.Sheets[sheet]) + '\n'; });
        excels[region].push({ text: text, name: f.name }); renderPrev(region);
      };
      r.readAsArrayBuffer(f);
    }
  });
}

function renderPrev(region) {
  let html = imgs[region].map((img, i) => `<div class="thumb"><img src="data:${img.type};base64,${img.data}"><button onclick="rmImg(${i}, '${region}')">✕</button></div>`).join('');
  html += excels[region].map((ex, i) => `<div class="thumb-excel">📊 ${ex.name}<button onclick="rmExcel(${i}, '${region}')">✕</button></div>`).join('');
  document.getElementById(`previews-${region}`).innerHTML = html;
}
function rmImg(i, region) { imgs[region].splice(i, 1); renderPrev(region); }
function rmExcel(i, region) { excels[region].splice(i, 1); renderPrev(region); }

function handleSpecialExcelFile(files) {
  if (!files || files.length === 0) return;
  const f = files[0];
  const r = new FileReader();
  r.onload = e => { 
    if (f.name.match(/\.(xlsx|xls)$/i)) {
      const data = new Uint8Array(e.target.result); 
      const workbook = XLSX.read(data, {type: 'array'}); 
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]; 
      processSpecialCSV(XLSX.utils.sheet_to_csv(firstSheet), f.name); 
    } else {
      let text = '';
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(e.target.result); } 
      catch(err) { text = new TextDecoder('windows-1258').decode(e.target.result); }
      processSpecialCSV(text, f.name);
    }
  };
  r.readAsArrayBuffer(f);
}

function processSpecialCSV(rawText, filename) {
  try { excelTextData = aggregateCSV(rawText); } 
  catch(err) { excelTextData = "DỮ LIỆU EXCEL THÔ:\n" + (rawText ? rawText.substring(0, 5000) : ""); }
  document.getElementById('preview-excel').innerHTML = `<div style="font-size:11px; font-weight:600; color:var(--acc2); padding-top:5px;">✓ Đã xử lý Ads File: ${filename}</div>`;
}

function handleKosuAdsFile(files) {
  if (!files || files.length === 0) return;
  const f = files[0];
  const r = new FileReader();
  r.onload = e => {
    let rawText = '';
    if (f.name.match(/\.(xlsx|xls)$/i)) {
      const data = new Uint8Array(e.target.result); 
      const workbook = XLSX.read(data, {type: 'array'}); 
      rawText = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
    } else {
      try { rawText = new TextDecoder('utf-8', { fatal: true }).decode(e.target.result); } 
      catch(err) { rawText = new TextDecoder('windows-1258').decode(e.target.result); }
    }
    processKosuAdsCSV(rawText, f.name);
  };
  r.readAsArrayBuffer(f);
}

function processKosuAdsCSV(rawText, filename) {
  try {
    // Sếp dán code bóc tách số liệu FB Ads của sếp vào đây nhé
    // Nếu sếp cần em viết lại logic bóc tách cột Chi tiêu, Hiển thị... thì bảo em.
    
    kosuAdsTextData = `\n=== DỮ LIỆU ADS KOSU (${filename}) ===\n` + rawText.substring(0, 3000); // Tạm thời gửi text thô cho AI đọc
    
    document.getElementById('preview-kosu-ads').innerHTML = `<div style="font-size:11px; font-weight:600; color:var(--kosu); padding-top:5px;">✓ Đã tải File Ads: ${filename}</div>`;
  } catch (err) {
    document.getElementById('preview-kosu-ads').innerHTML = `<div style="font-size:11px; color:var(--danger); padding-top:5px;">❌ Lỗi đọc Ads: ${err.message}</div>`;
  }
}

function handleKosuSapoFile(files) {
  if (!files || files.length === 0) return;
  const f = files[0];
  const r = new FileReader();
  r.onload = e => {
    let rawText = '';
    if (f.name.match(/\.(xlsx|xls)$/i)) {
      const data = new Uint8Array(e.target.result); 
      const workbook = XLSX.read(data, {type: 'array'}); 
      rawText = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
    } else {
      try { rawText = new TextDecoder('utf-8', { fatal: true }).decode(e.target.result); } 
      catch(err) { rawText = new TextDecoder('windows-1258').decode(e.target.result); }
    }
    processKosuSapoCSV(rawText, f.name);
  };
  r.readAsArrayBuffer(f);
}

function processKosuSapoCSV(csvText, filename) {
  try {
    let lines = csvText.split(/\r?\n/); 
    function parseCSVRow(str) { if (!str) return []; let arr = []; let quote = false; let cell = ''; for (let c = 0; c < str.length; c++) { if (str[c] === '"') { quote = !quote; } else if (str[c] === ',' && !quote) { arr.push(cell.trim()); cell = ''; } else { cell += str[c]; } } arr.push(cell.trim()); return arr; }
    
    let sourceIdx = -1, dtIdx = -1, prodIdx = -1, qtyIdx = -1, cityIdx = -1;
    let startRow = 0;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      let row = parseCSVRow(lines[i]); let strRow = row.join('').toLowerCase();
      if (strRow.includes('tên nguồn') || strRow.includes('doanh thu thuần')) {
        let headers = row.map(h => h.toLowerCase().trim());
        sourceIdx = headers.findIndex(h => h.includes('nguồn'));
        dtIdx = headers.findIndex(h => h.includes('doanh thu thuần'));
        prodIdx = headers.findIndex(h => h.includes('tên sản phẩm'));
        qtyIdx = headers.findIndex(h => h.includes('hàng thực bán'));
        cityIdx = headers.findIndex(h => h.includes('tỉnh/thành phố') || h.includes('tỉnh') || h.includes('thành phố'));
        startRow = i + 1; break;
      }
    }

    if (sourceIdx === -1 || dtIdx === -1) throw new Error("Không tìm thấy cột 'Tên nguồn đơn hàng' hoặc 'Doanh thu thuần' trong file Sapo.");

    let stats = {
      "Page Chính": { dt: 0, don: 0 },
      "Page Phụ": { dt: 0, don: 0 },
      "Livestream": { dt: 0, don: 0 },
      "Zalo": { dt: 0, don: 0 },
      "CSL": { dt: 0, don: 0 },
      "Web Google (Uy)": { dt: 0, don: 0 },
      "Web Nhân sự": { dt: 0, don: 0 },
      "LDP": { dt: 0, don: 0 },
      "Khác": { dt: 0, don: 0 }
    };
    
    let regionalDt = { hn: 0, hcm: 0, conlai: 0 };
    let pagePhuChiTiet = {}; 
    let productStats = {}; 
    let totalDt = 0;

    for (let i = startRow; i < lines.length; i++) {
      if (!lines[i].trim()) continue; 
      let row = parseCSVRow(lines[i]); 
      if (row.length <= Math.max(sourceIdx, dtIdx)) continue;
      
      let sourceName = (row[sourceIdx] || "").trim();
      if (sourceName.toLowerCase().includes("park hill")) {
        sourceName = sourceName.replace(/park hill/gi, "Times city");
      }

      let sourceLower = sourceName.toLowerCase();
      let dt = parseAnyNum(row[dtIdx]);
      let prodName = prodIdx !== -1 ? (row[prodIdx] || "").trim() : "";
      let qty = qtyIdx !== -1 ? parseAnyNum(row[qtyIdx]) : 1;
      let city = cityIdx !== -1 ? (row[cityIdx] || "").trim().toLowerCase() : "";
      
      if (!sourceName || dt === 0) continue;

      totalDt += dt;
      if (prodName && qty > 0) {
        productStats[prodName] = (productStats[prodName] || 0) + qty;
      }

      let normalizedCity = city.replace(/\s+/g, ' '); 
      if (normalizedCity.includes("hà nội") || normalizedCity.includes("ha noi")) { regionalDt.hn += dt; }
      else if (normalizedCity.includes("hồ chí minh") || normalizedCity.includes("ho chi minh") || normalizedCity === "hcm") { regionalDt.hcm += dt; }
      else { regionalDt.conlai += dt; }

      if (sourceLower === "facebook") {
        stats["Page Chính"].dt += dt; stats["Page Chính"].don += 1;
      } else if (sourceLower.includes("page") && !sourceLower.includes("web fanpage")) {
        stats["Page Phụ"].dt += dt; stats["Page Phụ"].don += 1;
        pagePhuChiTiet[sourceName] = (pagePhuChiTiet[sourceName] || 0) + dt;
      } else if (sourceLower.includes("livestream") || sourceLower.includes("live")) {
        stats["Livestream"].dt += dt; stats["Livestream"].don += 1;
      } else if (sourceLower.includes("zalo")) {
        stats["Zalo"].dt += dt; stats["Zalo"].don += 1;
      } else if (sourceLower.includes("csl")) {
        stats["CSL"].dt += dt; stats["CSL"].don += 1;
      } else if (sourceLower.includes("ldp")) {
        stats["LDP"].dt += dt; stats["LDP"].don += 1;
      } else if (sourceLower === "web") {
        stats["Web Google (Uy)"].dt += dt; stats["Web Google (Uy)"].don += 1;
      } else if (sourceLower.includes("web")) {
        stats["Web Nhân sự"].dt += dt; stats["Web Nhân sự"].don += 1;
      } else {
        stats["Khác"].dt += dt; stats["Khác"].don += 1;
      }
    }

    let topProducts = Object.entries(productStats).sort((a, b) => b[1] - a[1]).slice(0, 10).map(p => `${p[0]}`);

    function fmt(num) { return Math.round(num).toLocaleString('vi-VN'); }
    
    window.kosuSapoStats = { 
        totalDt: totalDt, 
        dtHn: regionalDt.hn, 
        dtHcm: regionalDt.hcm, 
        dtConLai: regionalDt.conlai,
        dtPageChinh: stats["Page Chính"].dt,
        dtPagePhu: stats["Page Phụ"].dt,
        topProducts: topProducts.join(", ") 
    };

    kosuSapoTextData = `=== DỮ LIỆU DOANH THU THỰC TẾ TỪ SAPO ===\n`;
    kosuSapoTextData += `- Tổng Doanh Thu Sapo: ${fmt(totalDt)} VND\n`;
    kosuSapoTextData += `- Doanh thu Online HN: ${fmt(regionalDt.hn)} VND\n`;
    kosuSapoTextData += `- Doanh thu Online HCM: ${fmt(regionalDt.hcm)} VND\n`;
    kosuSapoTextData += `- Doanh thu Online Nơi khác: ${fmt(regionalDt.conlai)} VND\n\n`;
    kosuSapoTextData += `- Page Chính (Nguồn Facebook): ${fmt(stats["Page Chính"].dt)} VND\n`;
    kosuSapoTextData += `- Page Phụ (Nguồn chứa "page" trừ "Web Fanpage"): ${fmt(stats["Page Phụ"].dt)} VND\n`;
    kosuSapoTextData += `- Livestream: ${fmt(stats["Livestream"].dt)} VND\n`;
    kosuSapoTextData += `- Zalo (OA/Cá nhân): ${fmt(stats["Zalo"].dt)} VND\n`;
    kosuSapoTextData += `- CSL (Chăm sóc lại): ${fmt(stats["CSL"].dt)} VND\n`;
    kosuSapoTextData += `- Web Google (Uy): ${fmt(stats["Web Google (Uy)"].dt)} VND\n`;
    kosuSapoTextData += `- Web Nhân sự: ${fmt(stats["Web Nhân sự"].dt)} VND\n`;
    kosuSapoTextData += `- LDP (Tất cả Page): ${fmt(stats["LDP"].dt)} VND\n`;
    
    if (Object.keys(pagePhuChiTiet).length > 0) {
      kosuSapoTextData += `  Chi tiết các Page Phụ:\n`;
      for (let k in pagePhuChiTiet) {
        kosuSapoTextData += `    + ${k}: ${fmt(pagePhuChiTiet[k])} VND\n`;
      }
    }

    kosuSapoTextData += `\n=== TOP 10 SẢN PHẨM BÁN CHẠY NHẤT (TỪ SAPO) ===\n`;
    kosuSapoTextData += topProducts.join(", ") + "\n";

    document.getElementById('preview-kosu-sapo').innerHTML = `<div style="font-size:11px; font-weight:600; color:var(--acc2); padding-top:5px;">✓ Đã xử lý Vùng Miền, Nguồn Sapo & Top SP: ${filename}</div>`;
  } catch (err) {
    kosuSapoTextData = "";
    document.getElementById('preview-kosu-sapo').innerHTML = `<div style="font-size:11px; color:var(--danger); padding-top:5px;">❌ Lỗi đọc Sapo: ${err.message}</div>`;
  }
}

// --- CÁC HÀM TÍNH TOÁN & HIỂN THỊ UI ---
function parseAnyNum(str) {
  if(!str) return 0; let s = String(str).trim().replace(/"/g, ''); if (s === '-' || s === '') return 0;
  if (s.includes(',') && s.includes('.')) { if (s.indexOf(',') > s.indexOf('.')) { s = s.replace(/\./g, '').replace(',', '.'); } else { s = s.replace(/,/g, ''); } } 
  else if (s.includes(',')) { let parts = s.split(','); if (parts.length > 2) s = s.replace(/,/g, ''); else { if (parts[1] && parts[1].length === 3) s = s.replace(/,/g, ''); else s = s.replace(',', '.'); } } 
  else if (s.includes('.')) { let parts = s.split('.'); if (parts.length > 2) s = s.replace(/\./g, ''); else { if (parts[1] && parts[1].length === 3) s = s.replace(/\./g, ''); } }
  return parseFloat(s.replace(/[^\d.-]/g, '')) || 0;
}
function parseNum(str) { if (!str || str === '—' || str === '') return null; const n = parseFloat(String(str).replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')); return isNaN(n) ? null : n; }
function fmtPct(n) { return (n === null || n === undefined) ? '—' : (n * 100).toFixed(2).replace('.', ',') + '%'; }
function fmtNum(n) { return (n === null || n === undefined) ? '—' : Math.round(n).toLocaleString('vi-VN'); }
function pctFormat(num, den) { if (!den || den === 0 || isNaN(num) || isNaN(den)) return '—'; return ((num / den) * 100).toFixed(0).replace('.', ',') + '%'; }
function safeAdd(a, b) { return (a === null && b === null) ? null : (a || 0) + (b || 0); }
function sumKhmByCategory(stores, catName) {
  let total = 0, found = false;
  (stores || []).forEach(store => { (store.rows || []).forEach(row => { if (row.cat && String(row.cat).trim().toLowerCase() === catName.toLowerCase()) { const v = parseNum(row.khm_dt); if (v !== null) { total += v; found = true; } } }); });
  return found ? total : null;
}
function calcMetrics(raw, khmTotal, manualSpend) {
  const chitieu = manualSpend !== null ? manualSpend : parseNum(raw.chitieu); if (manualSpend !== null) raw.chitieu = fmtNum(manualSpend);
  const dtt = parseNum(raw.dtt); let dths = null, qcol = null, qcst = null, qchs = null;
  if (dtt !== null && khmTotal !== null) dths = dtt + khmTotal;
  if (chitieu !== null && dtt !== null && dtt > 0) qcol = chitieu / dtt;
  if (chitieu !== null && dtt !== null && dtt > 0) qcst = (chitieu * 1.10) / (dtt / 1.08);
  if (chitieu !== null && dths !== null && dths > 0) qchs = chitieu / dths;
  return { dths, qcol, qcst, qchs };
}
function aggregateCSV(csvText) {
  if (typeof csvText !== 'string' || !csvText) return "DỮ LIỆU RỖNG"; 
  
  const parsed = Papa.parse(csvText, { skipEmptyLines: true }).data;
  let nameIdx = -1, spendIdx = -1, impIdx = -1, reachIdx = -1;
  let startRow = 0;
  
  for (let i = 0; i < Math.min(15, parsed.length); i++) {
    let row = parsed[i]; 
    let strRow = row.join('').toLowerCase();
    if (strRow.includes('amount spent') || strRow.includes('chi tiêu') || strRow.includes('hiển thị') || strRow.includes('impressions')) {
      let headers = row.map(h => String(h).toLowerCase().trim()); 
      nameIdx = headers.findIndex(h => h.includes('name') || h.includes('tên')); 
      spendIdx = headers.findIndex(h => h.includes('amount spent') || h.includes('chi tiêu') || h.includes('chi phí') || h.includes('số tiền')); 
      impIdx = headers.findIndex(h => h.includes('impressions') || h.includes('hiển thị')); 
      reachIdx = headers.findIndex(h => (h.includes('reach') || h.includes('tiếp cận')) && !h.includes('cost') && !h.includes('chi phí') && !h.includes('trên') && !h.includes('rate')); 
      startRow = i + 1; 
      break;
    }
  }
  
  if (nameIdx === -1 || spendIdx === -1) return "DỮ LIỆU EXCEL THÔ:\n" + csvText.substring(0, 5000);
  
  let stats = { "Đỗ Quang": { spend: 0, imp: 0, reach: 0 }, "Trung Hoà": { spend: 0, imp: 0, reach: 0 }, "Hà Đông": { spend: 0, imp: 0, reach: 0 }, "Mỹ Đình": { spend: 0, imp: 0, reach: 0 }, "Trần Đăng Ninh": { spend: 0, imp: 0, reach: 0 }, "Times City": { spend: 0, imp: 0, reach: 0 }, "Ngoại Giao Đoàn": { spend: 0, imp: 0, reach: 0 }, "Lê Văn Sỹ": { spend: 0, imp: 0, reach: 0 }, "Nguyễn Thị Thập": { spend: 0, imp: 0, reach: 0 }, "Hai Bà Trưng": { spend: 0, imp: 0, reach: 0 }, "Tổng": { spend: 0, imp: 0, reach: 0 } };
  let actualTotalReach = 0; 
  
  for (let i = startRow; i < parsed.length; i++) {
    let row = parsed[i]; if (row.length <= Math.max(nameIdx, spendIdx, reachIdx)) continue;
    let n = String(row[nameIdx] || ""); let nLower = n.toLowerCase(); 
    let spend = parseAnyNum(row[spendIdx]); let imp = parseAnyNum(row[impIdx]); let reach = parseAnyNum(row[reachIdx]);
    if (!nLower || nLower === "total" || nLower.includes("tổng cộng") || nLower === "—") { if (reach > 0) actualTotalReach = reach; continue; } 
    
    let isStore = false;
    const storeMappings = [
        { keys: ["đq"], name: "Đỗ Quang" }, { keys: ["trung h"], name: "Trung Hoà" }, { keys: ["hđ"], name: "Hà Đông" },
        { keys: ["quantm"], excl: "tđn", name: "Mỹ Đình" }, { keys: ["tđn"], name: "Trần Đăng Ninh" }, { keys: ["times city"], name: "Times City" },
        { keys: ["ngđ"], name: "Ngoại Giao Đoàn" }, { keys: ["lvs"], name: "Lê Văn Sỹ" }, { keys: ["ntt"], name: "Nguyễn Thị Thập" },
        { keys: ["hbt"], name: "Hai Bà Trưng" }
    ];
    
    for (const mapping of storeMappings) {
        if (nLower.includes(mapping.keys[0]) && (!mapping.excl || !nLower.includes(mapping.excl))) {
            stats[mapping.name].spend += spend;
            stats[mapping.name].imp += imp;
            stats[mapping.name].reach += reach;
            isStore = true;
            break;
        }
    }
    
    if (isStore) { stats["Tổng"].spend += spend; stats["Tổng"].imp += imp; stats["Tổng"].reach += reach; }
  }
  
  if (actualTotalReach > 0) stats["Tổng"].reach = actualTotalReach;
  function fmt(num) { return Math.round(num).toLocaleString('vi-VN'); } 
  let res = "DỮ LIỆU EXCEL CỬA HÀNG ĐÃ ĐƯỢC CỘNG TỔNG CHÍNH XÁC:\n\n";
  for (let k in stats) { if (k === "Tổng") res += `- TỔNG HỆ THỐNG: Chi phí: ${fmt(stats[k].spend)} | Hiển thị: ${fmt(stats[k].imp)} | Tiếp cận: ${fmt(stats[k].reach)}\n`; else res += `- Cửa hàng ${k}: Chi phí: ${fmt(stats[k].spend)} | Hiển thị: ${fmt(stats[k].imp)} | Tiếp cận: ${fmt(stats[k].reach)}\n`; }
  return res;
}

async function fetchWithRetry(url, options, retries = 5) {
  let delay = 1000;
  for (let i = 0; i < retries; i++) {
    try { const res = await fetch(url, options); if (res.ok) return res; if (i === retries - 1) throw new Error(`Lỗi HTTP ${res.status}: Không kết nối được Google Gemini API.`); } 
    catch (e) { if (i === retries - 1) throw e; }
    await new Promise(r => setTimeout(r, delay)); delay *= 2;
  }
}
function sortHtmlTable(th, colIdx) {
    const table = th.closest('table'); const tbody = table.querySelector('tbody'); const rows = Array.from(tbody.querySelectorAll('tr')); let isAsc = th.classList.contains('asc');
    table.querySelectorAll('th').forEach(h => { h.classList.remove('asc', 'desc'); h.innerHTML = h.innerHTML.replace(' ↑', '').replace(' ↓', '').replace(' ↕', '') + ' ↕'; });
    th.classList.toggle('asc', !isAsc); th.classList.toggle('desc', isAsc); th.innerHTML = th.innerHTML.replace(' ↕', '') + (isAsc ? ' ↓' : ' ↑');
    rows.sort((a, b) => {
        let valA = a.cells[colIdx].innerText.trim(); let valB = b.cells[colIdx].innerText.trim(); let numA = parseAnyNum(valA.replace('%', '')); let numB = parseAnyNum(valB.replace('%', ''));
        if (!isNaN(numA) && !isNaN(numB) && valA !== '—' && valB !== '—') return isAsc ? numA - numB : numB - numA; return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }); tbody.innerHTML = ''; rows.forEach(r => tbody.appendChild(r));
}
function showLoad() { document.getElementById('out').innerHTML = `<div class="s-load"><div class="spinner"></div><div class="lsteps"><div class="lstep on" id="ls0"><div class="sdot"></div>Đang gửi dữ liệu cho AI...</div><div class="lstep" id="ls1"><div class="sdot"></div>AI đang phân tích số liệu...</div><div class="lstep" id="ls2"><div class="sdot"></div>Đang tổng hợp báo cáo...</div></div></div>`; }
function setStep(n) { for (let i = 0; i < n; i++) { const e = document.getElementById('ls' + i); if (e) { e.classList.remove('on'); e.classList.add('dn'); } } const c = document.getElementById('ls' + n); if (c) c.classList.add('on'); }
function mcHtml(lbl, val, cls = '', formula = '') {
  // 1. Truy cập vào khuôn đúc
  const template = document.getElementById('tpl-mc');
  if (!template) return ''; // Phòng hờ lỗi

  // 2. Tạo một bản sao từ khuôn
  const clone = template.content.cloneNode(true);
  const container = clone.querySelector('.mc');

  // 3. Bơm dữ liệu vào các vị trí tương ứng (Dùng textContent để an toàn)
  container.querySelector('.lbl-text').textContent = lbl;
  
  const mvalEl = container.querySelector('.mval');
  mvalEl.textContent = val || '—';
  if (cls) mvalEl.classList.add(cls);

  // 4. Xử lý logic hiển thị công thức
  if (formula) {
    container.querySelector('.calc-badge').classList.remove('d-none');
    const mcalcEl = container.querySelector('.mcalc');
    mcalcEl.textContent = formula;
    mcalcEl.classList.remove('d-none');
  }

  // 5. Trả về mã HTML dưới dạng chuỗi (Để tương thích với cách innerHTML hiện tại của bạn)
  return container.outerHTML;
}
function nguonHtml(list) {
  if (!list || !list.length || !list[0].kenh || list[0].kenh === '—') return '';
  const tpl = document.getElementById('tpl-nguon');
  const rowTpl = document.getElementById('tpl-nguon-row');
  if (!tpl || !rowTpl) return '';

  const clone = tpl.content.cloneNode(true);
  const tbody = clone.querySelector('.nguon-tbody');

  list.forEach(n => {
    const rowClone = rowTpl.content.cloneNode(true);
    rowClone.querySelector('.n-kenh').textContent = n.kenh || '—';
    rowClone.querySelector('.n-dt').textContent = n.sotien || '—';
    rowClone.querySelector('.n-pct').textContent = n.pct || '—';
    tbody.appendChild(rowClone);
  });

  const wrapper = document.createElement('div');
  wrapper.appendChild(clone);
  return wrapper.innerHTML;
}

function spHtml(list) {
  if (!list || !list.length) return '';
  const tpl = document.getElementById('tpl-sp');
  const chipTpl = document.getElementById('tpl-sp-chip');
  if (!tpl || !chipTpl) return '';

  const clone = tpl.content.cloneNode(true);
  const container = clone.querySelector('.sp-container');

  list.forEach(s => {
    const chipClone = chipTpl.content.cloneNode(true);
    chipClone.querySelector('.chip').textContent = s;
    container.appendChild(chipClone);
    container.appendChild(document.createTextNode(' ')); // Thêm khoảng trắng giữa các chip
  });

  const wrapper = document.createElement('div');
  wrapper.appendChild(clone);
  return wrapper.innerHTML;
}

function dgHtml(dg, yoy) {
  if (!dg && (!yoy || yoy === '—')) return '';
  const tpl = document.getElementById('tpl-dg');
  if (!tpl) return '';

  const clone = tpl.content.cloneNode(true);
  
  if (dg) {
    const dgBox = clone.querySelector('.dg-box');
    dgBox.classList.remove('d-none');
    dgBox.querySelector('.dg-text').textContent = dg;
  }
  
  if (yoy && yoy !== '—') {
    const yoyBox = clone.querySelector('.yoy-box');
    yoyBox.classList.remove('d-none');
    yoyBox.querySelector('.yoy-text').textContent = yoy;
  }

  const wrapper = document.createElement('div');
  wrapper.appendChild(clone);
  return wrapper.innerHTML;
}
function storeTbl(s, regionName) {
  if (!s || !s.rows || s.rows.length === 0) return '';
  
  const tpl = document.getElementById('tpl-store-tbl');
  const rowTpl = document.getElementById('tpl-store-row');
  if (!tpl || !rowTpl) return '';

  const clone = tpl.content.cloneNode(true);
  const tbody = clone.querySelector('.store-tbody');
  
  // Gán tên cửa hàng/khu vực
  clone.querySelector('.store-name').textContent = s.name || regionName;

  s.rows.forEach(r => {
    const rowClone = rowTpl.content.cloneNode(true);
    const tr = rowClone.querySelector('.store-row');
    const catCell = rowClone.querySelector('.s-cat');
    const dtCell = rowClone.querySelector('.s-dt');
    const khmCell = rowClone.querySelector('.s-khm');

    // Logic kiểm tra ngành hàng
    const cat = (r.cat || '').trim().toLowerCase();
    const isGunze = cat === 'đồ lót'; 
    const isMp = cat === 'mp'; 
    const isKosu = cat === 'giày' || cat === 'kosu';

    // 1. Xử lý màu nền và class màu sắc cho số liệu
    if (isGunze || isMp || isKosu) {
      tr.style.background = 'rgba(255,255,255,.02)';
      const cls = isGunze ? 'proj-g' : (isMp ? 'proj-m' : 'proj-k');
      catCell.classList.add(cls);
      khmCell.classList.add(cls);
    }

    // 2. Đổ dữ liệu ngành hàng và thêm nhãn phụ (Badge)
    catCell.textContent = r.cat || '—';
    if (isGunze || isMp || isKosu) {
      const badge = document.createElement('span');
      badge.style.cssText = 'font-size:9px; opacity:.7; margin-left:4px;';
      if (isGunze) { badge.textContent = 'Gunze'; badge.style.color = 'var(--gunze)'; }
      else if (isMp) { badge.textContent = 'MP'; badge.style.color = 'var(--mp)'; }
      else if (isKosu) { badge.textContent = 'Kosu'; badge.style.color = 'var(--kosu)'; }
      catCell.appendChild(badge);
    }

    // 3. Đổ dữ liệu doanh thu
    dtCell.textContent = r.dt || '—';
    khmCell.textContent = r.khm_dt || '—';

    tbody.appendChild(rowClone);
  });

  const wrapper = document.createElement('div');
  wrapper.appendChild(clone);
  return wrapper.innerHTML;
}

function renderTuan(d, gc, mc, gTot, gHCM, gHN, mTot, mHCM, mHN, period, from, to) {
  const layoutTpl = document.getElementById('tpl-report-layout');
  const pbTpl = document.getElementById('tpl-pb');
  if (!layoutTpl || !pbTpl) return;

  const report = layoutTpl.content.cloneNode(true);
  const contentArea = report.querySelector('.report-content');

  // 1. Thiết lập Header
  report.querySelector('.rweek').textContent = period ? `Tuần ${period}` : '';
  report.querySelector('.rtitle').textContent = `Báo Cáo Tuần${(from && to) ? ` — ${from} đến ${to}` : ''}`;

  // 2. Hàm hỗ trợ tạo khối Dự Án (Gunze/Mỹ Phẩm)
  const createProjectBlock = (config) => {
    const pb = pbTpl.content.cloneNode(true);
    const container = pb.querySelector('.pb');
    
    pb.querySelector('.pdot').style.background = config.color;
    const nameEl = pb.querySelector('.pname');
    nameEl.textContent = config.name;
    nameEl.style.color = config.color;

    // Chèn Grid chỉ số (Sử dụng hàm mcHtml đã refactor)
    pb.querySelector('.mgrid').innerHTML = config.metrics.join('');

    // Chèn các phần bổ trợ (Nguồn, SP, Đánh giá)
    const afterGrid = pb.querySelector('.pb-after-grid');
    afterGrid.innerHTML = config.extraHtml;

    return container;
  };

  // --- KHỐI GUNZE ---
  const g = d.gunze || {};
  const gunzeBlock = createProjectBlock({
    name: 'Dự án Gunze',
    color: 'var(--gunze)',
    metrics: [
      mcHtml('Chi tiêu', g.chitieu), mcHtml('Số lượng data', g.data), mcHtml('Tỷ lệ chốt đơn', g.tlchot),
      mcHtml('Doanh thu thuần', g.dtt, 'g'), mcHtml('% KPI tuần', g.dtt_kpi, (g.dtt_kpi && parseInt(g.dtt_kpi) >= 100 ? 'g' : 'w')), mcHtml('GTTB đơn hàng', g.gttb),
      mcHtml('DT hệ thống', gc.dths !== null ? fmtNum(gc.dths) : '—', 'g', 'DT thuần Sale + Tổng KHM Đồ lót'),
      mcHtml('CP QC Online', gc.qcol !== null ? fmtPct(gc.qcol) : '—', 'w', 'Chi tiêu ÷ DT thuần'),
      mcHtml('CP QC Online sau thuế', gc.qcst !== null ? fmtPct(gc.qcst) : '—', 'w', '(Chi tiêu×110%) ÷ (DT thuần÷1,08)'),
      mcHtml('CP QC hệ thống', gc.qchs !== null ? fmtPct(gc.qchs) : '—', 'w', 'Chi tiêu ÷ DT hệ thống'),
      mcHtml('Chiết khấu', g.chietkhau ? g.chietkhau + (g.chietkhau_pct ? ' (' + g.chietkhau_pct + ')' : '') : '—'),
      mcHtml('Hàng trả lại', g.hangtralai ? g.hangtralai + (g.hangtralai_pct ? ' (' + g.hangtralai_pct + ')' : '') : '—')
    ],
    extraHtml: nguonHtml(g.nguon) + spHtml(g.sp) + dgHtml(g.danhgia, g.yoy)
  });
  contentArea.appendChild(gunzeBlock);

  // --- KHỐI MỸ PHẨM ---
  const m = d.mp || {};
  const mpBlock = createProjectBlock({
    name: 'Dự án Mỹ phẩm',
    color: 'var(--mp)',
    metrics: [
      mcHtml('Chi tiêu', m.chitieu), mcHtml('Doanh thu thuần', m.dtt, 'g'), mcHtml('% KPI tuần', m.dtt_kpi, (m.dtt_kpi && parseInt(m.dtt_kpi) >= 100 ? 'g' : 'w')),
      mcHtml('GTTB', m.gttb), mcHtml('DT hệ thống', mc.dths !== null ? fmtNum(mc.dths) : '—', 'g', 'DT thuần Sale + Tổng KHM MP'),
      mcHtml('CP QC Online', mc.qcol !== null ? fmtPct(mc.qcol) : '—', 'w', 'Chi tiêu ÷ DT thuần'),
      mcHtml('CP QC Online sau thuế', mc.qcst !== null ? fmtPct(mc.qcst) : '—', 'w', '(Chi tiêu×110%) ÷ (DT thuần÷1,08)'),
      mcHtml('CP QC hệ thống', mc.qchs !== null ? fmtPct(mc.qchs) : '—', 'w', 'Chi tiêu ÷ DT hệ thống'),
      mcHtml('Chiết khấu', m.chietkhau ? m.chietkhau + (m.chietkhau_pct ? ' (' + m.chietkhau_pct + ')' : '') : '—'),
      mcHtml('Hàng trả lại', m.hangtralai ? m.hangtralai + (m.hangtralai_pct ? ' (' + m.hangtralai_pct + ')' : '') : '—')
    ],
    extraHtml: `
      <div class="mgrid" style="border-top:1px solid var(--bdr)">
        <div class="mc"><div class="mlbl">Data Web</div><div class="mval">${m.web_sl || '—'} <span style="font-size:10px;color:var(--tx2)">${m.web_dat ? '(' + m.web_dat + ')' : ''}</span></div>${m.web_chot ? `<div class="mcalc">Tỷ lệ chốt: ${m.web_chot}</div>` : ''}</div>
        <div class="mc"><div class="mlbl">Data Page</div><div class="mval">${m.page_sl || '—'} <span style="font-size:10px;color:var(--tx2)">${m.page_dat ? '(' + m.page_dat + ')' : ''}</span></div>${m.page_chot ? `<div class="mcalc">Tỷ lệ chốt: ${m.page_chot}</div>` : ''}</div>
        <div class="mc"></div>
      </div>
    ` + nguonHtml(m.nguon) + spHtml(m.sp) + dgHtml(m.danhgia, m.yoy)
  });
  contentArea.appendChild(mpBlock);

  // --- KHỐI CỬA HÀNG (Dữ liệu Store) ---
  let storesContent = '';
  if (d.stores_hcm && d.stores_hcm.length) storesContent += d.stores_hcm.map(s => storeTbl(s, 'Cửa hàng HCM')).join('<div class="sdiv"></div>');
  if (d.stores_hn && d.stores_hn.length) { 
    if (storesContent) storesContent += '<div class="sdiv"></div>'; 
    storesContent += d.stores_hn.map(s => storeTbl(s, 'Cửa hàng HN')).join('<div class="sdiv"></div>'); 
  }

  if (storesContent || gTot !== null || mTot !== null) {
    const storePB = pbTpl.content.cloneNode(true);
    const storeContainer = storePB.querySelector('.pb');
    storePB.querySelector('.pdot').style.background = 'var(--warn)';
    const stName = storePB.querySelector('.pname');
    stName.textContent = 'Dữ liệu từ Cửa hàng';
    stName.style.color = 'var(--warn)';

    // Xử lý KHM Note nếu có
    if (gTot !== null || mTot !== null) {
      const khmNoteTpl = document.getElementById('tpl-khm-note');
      const khmItemTpl = document.getElementById('tpl-khm-item');
      const noteClone = khmNoteTpl.content.cloneNode(true);
      const noteContent = noteClone.querySelector('.khm-note');

      const addKhmItem = (label, total, hcm, hn, color) => {
        const item = khmItemTpl.content.cloneNode(true);
        item.querySelector('.khm-label').textContent = label;
        let details = [];
        if (hcm !== null) details.push(`HCM: ${fmtNum(hcm)}`);
        if (hn !== null) details.push(`HN: ${fmtNum(hn)}`);
        item.querySelector('.khm-detail').textContent = details.length > 0 ? `(${details.join(' + ')})` : '';
        const val = item.querySelector('.khm-value');
        val.textContent = fmtNum(total);
        val.style.color = color;
        noteContent.appendChild(item);
      };

      if (gTot !== null) addKhmItem('Tổng KHM Đồ lót:', gTot, gHCM, gHN, 'var(--gunze)');
      if (mTot !== null) addKhmItem('Tổng KHM Mỹ phẩm:', mTot, mHCM, mHN, 'var(--mp)');
      
      storePB.querySelector('.pb-before-grid').appendChild(noteClone);
    }

    storePB.querySelector('.pb-after-grid').innerHTML = `<div class="ssec">${storesContent}</div>`;
    contentArea.appendChild(storeContainer);
  }

  // Hiển thị kết quả
  const out = document.getElementById('out');
  out.innerHTML = '';
  out.appendChild(report);
}
// Thêm 1 biến toàn cục để nhớ vị trí gốc của báo cáo
let originalRptParent = null;

function openFullscreen() {
  const rpt = document.getElementById('rpt');
  if (!rpt) { 
    alert('Chưa có báo cáo! Vui lòng tạo báo cáo trước.'); 
    return; 
  }
  
  const area = document.getElementById('fs-content-area');
  
  // 1. Ghi nhớ vị trí cha ban đầu của báo cáo (chính là thẻ #out)
  originalRptParent = rpt.parentNode;
  
  // 2. NHẤC NGUYÊN BẢN báo cáo (không dùng outerHTML nữa) chuyển sang Fullscreen
  area.appendChild(rpt);
  
  // 3. Hiển thị màn hình Fullscreen
  document.getElementById('fs-report').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeFullscreen() {
  const rpt = document.getElementById('rpt');
  
  // 1. Trả nguyên bản báo cáo về lại vị trí cũ bên ngoài Fullscreen
  if (rpt && originalRptParent) {
    originalRptParent.appendChild(rpt);
  }
  
  // 2. Ẩn màn hình Fullscreen
  document.getElementById('fs-report').classList.remove('active');
  document.body.style.overflow = '';
}
async function doCopyKosuText() {
    const el = document.getElementById('kosu-text-report');
    if (!el) return;
    const clone = el.cloneNode(true);
    clone.querySelectorAll('button').forEach(b => b.remove());
    const textToCopy = clone.innerText;
    
    const btn = document.getElementById('btn-copy-kosu');
    
    const copySuccess = () => {
        if(btn) { 
            btn.textContent = '✓ Đã Copy'; 
            btn.style.background = 'var(--acc2)'; 
            setTimeout(() => {
                btn.textContent = '⎘ Copy Report'; 
                btn.style.background = 'transparent';
            }, 2000); 
        }
    };

    try {
        // Sử dụng Clipboard API hiện đại
        await navigator.clipboard.writeText(textToCopy);
        copySuccess();
    } catch (err) {
        // Fallback về cách cũ nếu chạy ở môi trường không có HTTPS (http, file://)
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            copySuccess();
        } catch (fallbackErr) {
            alert('Trình duyệt chặn sao chép tự động. Vui lòng bôi đen văn bản để copy thủ công.');
        }
        document.body.removeChild(textArea);
    }
}

function renderKosuTuan(d, period, from, to, spendTotal, budgetHn, budgetHcm, manualKhmHn, manualKhmHcm) {
  const k = d.kosu || {};
  const tpl = document.getElementById('tpl-kosu-tuan');
  if (!tpl) return;

  const clone = tpl.content.cloneNode(true);
  
  // 1. Điền thông tin tiêu đề
  const rperiod = period ? `Tuần ${period}` : '';
  const dr = (from && to) ? ` (Từ ${from} đến ${to})` : '';
  clone.querySelector('.rweek').textContent = rperiod;
  clone.querySelector('.rtitle').textContent = `Báo Cáo VIP — Giày Kosu${dr}`;

  // 2. Tính toán các thông số chuyên sâu (giữ nguyên logic gốc của bạn)
  const sapoDt = window.kosuSapoStats?.totalDt || 0;
  const topSp = window.kosuSapoStats?.topProducts || k.top_sp || "—";
  const kpi = parseNum(k.dt_don_hang_kpi) || 1; 
  const sapoPct = sapoDt > 0 ? ((sapoDt / kpi) * 100).toFixed(0) + '%' : '—';
  const dttSauThue = sapoDt > 0 ? sapoDt / 1.08 : 0;
  const khmHn = (manualKhmHn !== null && !isNaN(manualKhmHn)) ? manualKhmHn : (parseNum(k.khm?.hn) || 0);
  const khmHcm = (manualKhmHcm !== null && !isNaN(manualKhmHcm)) ? manualKhmHcm : (parseNum(k.khm?.hcm) || 0);
  const dtOnlineHn = window.kosuSapoStats?.dtHn || 0;
  const dtOnlineHcm = window.kosuSapoStats?.dtHcm || 0;
  const dtOnlineConlai = window.kosuSapoStats?.dtConLai || 0;
  const dtHtHn = dtOnlineHn + khmHn;
  const dtHtHcm = dtOnlineHcm + khmHcm;
  const budgetConlai = spendTotal - budgetHn - budgetHcm;

  // 3. Xây dựng nội dung Text Report (Dùng template literal để giữ format xuống dòng)
  const mainText = `<strong>${rperiod}:${dr}</strong>
- Số tiền chi tiêu: ${fmtNum(spendTotal)} (${k.chi_tieu_pct || ''})
+ So với cùng kì tháng trước: ${k.chi_tieu_mom || ''}
+ So với cùng kì năm trước: ${k.chi_tieu_yoy || ''}

- Doanh thu:
Theo đơn hàng: ${fmtNum(parseNum(k.dt_don_hang))} (${k.dt_don_hang_pct || ''})/${fmtNum(parseNum(k.dt_don_hang_kpi))}
Sapo: ${fmtNum(sapoDt)} - ${sapoPct}
DTT sau thuế: ${fmtNum(dttSauThue)}

- GTTB Đơn hàng: ${k.gttb || '—'}
- Chi phí QC theo đơn hàng: ${k.cpqc_don_hang || '—'}
- Chi phí QC theo sapo: ${sapoDt > 0 ? pctFormat(spendTotal, sapoDt) : '—'}
+ So với cùng kì tháng trước: ${k.cpqc_mom || '—'}
+ So với cùng kì năm trước: ${k.cpqc_yoy || '—'}

- Số lượng data:
Data page: ${k.data_page || '—'} (${k.data_page_pct || ''})
Data LDP đạt ${k.ldp?.dat_pct || ''}: ${k.ldp?.dat || ''}/${k.ldp?.tong || ''}

- Tỷ lệ chốt đơn:
+ Page chính: ${k.tl_chot_chinh || '—'}
+ Page phụ: ${k.tl_chot_phu || '—'}
+ LDP: ${k.tl_chot_ldp || '—'}

Các mã hiện tại đang chạy doanh số lớn: ${topSp}

<strong>TỶ LỆ DATA GIỮA CÁC PAGE</strong>
- Data page: ${k.data_page || '—'} - Đạt ${k.data_page_pct || ''}; Tỉ lệ chốt page: ${k.tl_chot_phu || '—'}

Page chính:
* Data page chính: ${k.page_chinh?.data || '—'} - Chiếm ${k.page_chinh?.chiem_pct || '—'} - Đạt ${k.page_chinh?.dat_pct || '—'} - Tỷ lệ chốt: ${k.page_chinh?.tl_chot || '—'} (${k.page_chinh?.don || '—'} đơn)
Chi tiêu: ${fmtNum(parseNum(k.page_chinh?.chi_tieu))}, doanh số: ${fmtNum(parseNum(k.page_chinh?.doanh_so))}, CPQC: ${k.page_chinh?.cpqc || '—'}

Page phụ: (chạy data và LDP)
* Data page CH: ${k.page_phu?.data || '—'} - Chiếm ${k.page_phu?.chiem_pct || '—'} - Đạt ${k.page_phu?.dat_pct || '—'} - Tỷ lệ chốt: ${k.page_phu?.tl_chot || '—'} (${k.page_phu?.don || '—'} đơn)
Chi tiêu: ${fmtNum(parseNum(k.page_phu?.chi_tieu))}, doanh_số: ${fmtNum(parseNum(k.page_phu?.doanh_so))}, CPQC: ${k.page_phu?.cpqc || '—'}

- Data LDP đạt ${k.ldp?.dat_pct || '—'}: ${k.ldp?.dat || '—'}/${k.ldp?.tong || '—'}
Tỷ lệ chốt đơn: ${k.ldp?.chot_don_thuc || '—'}/${k.ldp?.chot_don_tong || '—'} -> ${k.ldp?.tl_chot_don || '—'}
Tỷ lệ đơn thành công: ${k.ldp?.don_tc_thuc || '—'}/${k.ldp?.don_tc_tong || '—'} => ${k.ldp?.tl_don_tc || '—'}
Chi tiêu: ${fmtNum(parseNum(k.ldp?.chi_tieu))}, doanh số: ${fmtNum(parseNum(k.ldp?.doanh_so))}, CPQC: ${k.ldp?.cpqc || '—'}

<strong>PHÂN BỔ NGÂN SÁCH VÀ DOANH THU THEO KHU VỰC</strong>
+ Hà Nội:
Ngân sách: ${fmtNum(budgetHn)}
Doanh số hệ thống HN: ${fmtNum(dtHtHn)} - CPQC: ${pctFormat(budgetHn, dtHtHn)}
Doanh số Online: ${fmtNum(dtOnlineHn)} - CPQC: ${pctFormat(budgetHn, dtOnlineHn)}

+ Hồ Chí Minh:
Ngân sách: ${fmtNum(budgetHcm)}
Doanh số hệ thống HCM: ${fmtNum(dtHtHcm)} - CPQC: ${pctFormat(budgetHcm, dtHtHcm)}
Doanh số Online: ${fmtNum(dtOnlineHcm)} - CPQC: ${pctFormat(budgetHcm, dtOnlineHcm)}

+ Còn lại
Ngân sách: ${fmtNum(budgetConlai)}, doanh số: ${fmtNum(dtOnlineConlai)} - CPQC: ${pctFormat(budgetConlai, dtOnlineConlai)}`;

  // 4. Đưa nội dung văn bản vào giao diện
  clone.querySelector('.kosu-main-text').innerHTML = mainText;

  // 5. Xử lý phần Đánh giá AI
  const evalContent = clone.querySelector('#kosu-eval-content');
  let evalText = `Đánh giá:\n`;
  if (Array.isArray(k.danh_gia)) {
    evalText += k.danh_gia.map(item => '- ' + item).join('\n');
  } else {
    evalText += k.danh_gia ? '- ' + k.danh_gia : '—';
  }
  evalText += `\n\nKết luận:\n=> ${k.ket_luan || '—'}`;
  evalContent.textContent = evalText;

  // 6. Hiển thị ra màn hình
  const out = document.getElementById('out');
  out.innerHTML = '';
  out.appendChild(clone);
}

function renderKosuThang(d, period, from, to) {
  const k = d || {};
  const tpl = document.getElementById('tpl-kosu-thang');
  const rowTpl = document.getElementById('tpl-kosu-mom-row');
  if (!tpl || !rowTpl) return;

  const clone = tpl.content.cloneNode(true);
  
  // 1. Điền thông tin tiêu đề
  const rperiod = period ? `Tháng ${period}` : (k.thang_hien_tai || 'Tháng hiện tại');
  const prevMonth = k.thang_truoc || 'Tháng trước';
  const dr = (from && to) ? ` (Từ ${from} đến ${to})` : '';
  
  clone.querySelector('.rweek').textContent = rperiod;
  clone.querySelector('.rtitle').textContent = `Báo Cáo Tháng VIP — Giày Kosu${dr}`;
  
  // Cập nhật tiêu đề cột bảng MoM
  clone.querySelector('.th-prev').textContent = prevMonth;
  clone.querySelector('.th-cur').textContent = rperiod;

  // 2. Đổ dữ liệu vào bảng MoM
  const tbody = clone.querySelector('.mom-tbody');
  
  // Hàm tạo dòng nhanh
  const addMomRow = (name, dataObj, highlightCur = false, hasKpi = true, bgDark = false) => {
    const rowClone = rowTpl.content.cloneNode(true);
    const tr = rowClone.querySelector('tr');
    
    if (bgDark) tr.style.background = 'rgba(255,255,255,0.02)';
    
    rowClone.querySelector('.mom-name').textContent = name;
    rowClone.querySelector('.mom-prev').textContent = dataObj?.prev || '—';
    
    const curCell = rowClone.querySelector('.mom-cur');
    curCell.textContent = dataObj?.cur || '—';
    if (highlightCur) {
      curCell.style.color = 'var(--acc2)';
      curCell.style.fontWeight = '700';
    }

    const diffCell = rowClone.querySelector('.mom-diff');
    diffCell.textContent = dataObj?.mom || '—';
    if (highlightCur) diffCell.style.fontWeight = '700'; // Nhấn mạnh cùng lúc với Current

    rowClone.querySelector('.mom-kpi').textContent = hasKpi ? (dataObj?.kpi || '—') : '—';
    
    tbody.appendChild(rowClone);
  };

  addMomRow('Doanh Thu Thuần', k.doanh_thu, true, true, true);
  addMomRow('Chi Tiêu QC', k.chi_tieu, false, true, false);
  addMomRow('Tỷ lệ Me/Re (CPQC)', k.mere, false, false, true);
  addMomRow('Số đơn hàng', k.don_hang, true, true, false);
  addMomRow('AOV (GTTB Đơn)', k.aov, false, true, true);
  addMomRow('Data Mess', k.data_mess, false, true, false);
  addMomRow('Data LDP', k.data_ldp, false, true, true);
  addMomRow('Chi phí / Data', k.cpa_data, false, false, false);
  addMomRow('Tỷ lệ chốt Page Chính', k.chot_page_chinh, false, false, true);
  addMomRow('Tỷ lệ chốt Page Phụ', k.chot_page_phu, false, false, false);
  addMomRow('Tỷ lệ chốt LDP', k.chot_ldp, false, true, true);

  // 3. Xây dựng nội dung Text Report (Văn bản thuần)
  const mainText = `<strong>BÁO CÁO ${rperiod.toUpperCase()} - DỰ ÁN GIÀY KOSU${dr}</strong>

<strong>1. KẾT QUẢ KINH DOANH TỔNG QUAN</strong>
- Doanh thu thuần: ${k.doanh_thu?.cur||'—'} (So với ${prevMonth}: ${k.doanh_thu?.mom||'—'})
- Chi tiêu QC: ${k.chi_tieu?.cur||'—'} (So với ${prevMonth}: ${k.chi_tieu?.mom||'—'})
- Tỷ lệ Me/Re (CPQC): ${k.mere?.cur||'—'} (So với ${prevMonth}: ${k.mere?.mom||'—'})
- AOV (Giá trị TB đơn): ${k.aov?.cur||'—'} (So với ${prevMonth}: ${k.aov?.mom||'—'})

<strong>2. HIỆU QUẢ DATA & CHUYỂN ĐỔI</strong>
- Tổng số đơn hàng: ${k.don_hang?.cur||'—'} (So với ${prevMonth}: ${k.don_hang?.mom||'—'})
- Số lượng Data Mess: ${k.data_mess?.cur||'—'} (So với ${prevMonth}: ${k.data_mess?.mom||'—'})
- Số lượng Data LDP: ${k.data_ldp?.cur||'—'} (So với ${prevMonth}: ${k.data_ldp?.mom||'—'})
- Chi phí / Data: ${k.cpa_data?.cur||'—'} (So với ${prevMonth}: ${k.cpa_data?.mom||'—'})

<strong>3. TỶ LỆ CHỐT ĐƠN (CONVERSION RATE)</strong>
- Page chính: ${k.chot_page_chinh?.cur||'—'} (Tháng trước: ${k.chot_page_chinh?.prev||'—'} -> ${k.chot_page_chinh?.mom||'—'})
- Page phụ: ${k.chot_page_phu?.cur||'—'} (Tháng trước: ${k.chot_page_phu?.prev||'—'} -> ${k.chot_page_phu?.mom||'—'})
- LDP: ${k.chot_ldp?.cur||'—'} (Tháng trước: ${k.chot_ldp?.prev||'—'} -> ${k.chot_ldp?.mom||'—'})`;

  clone.querySelector('.kosu-main-text').innerHTML = mainText;

  // 4. Xử lý phần Đánh giá AI
  const evalContent = clone.querySelector('#kosu-eval-content');
  let evalText = `Đánh giá:\n`;
  if (Array.isArray(k.danh_gia)) {
    evalText += k.danh_gia.map(item => '- ' + item).join('\n');
  } else {
    evalText += k.danh_gia ? '- ' + k.danh_gia : '—';
  }
  evalText += `\n\nKết luận:\n=> ${k.ket_luan || '—'}`;
  evalContent.textContent = evalText;

  // 5. Hiển thị ra màn hình
  const out = document.getElementById('out');
  out.innerHTML = '';
  out.appendChild(clone);
}

function renderThang(data, period, from, to) {
  const layoutTpl = document.getElementById('tpl-report-layout');
  const secTpl = document.getElementById('tpl-thang-section');
  const storeTpl = document.getElementById('tpl-store-marketing');
  if (!layoutTpl || !secTpl || !storeTpl) return;

  const report = layoutTpl.content.cloneNode(true);
  const contentArea = report.querySelector('.report-content');

  // 1. Header
  const rperiod = period ? `Tháng ${period}` : '';
  report.querySelector('.rweek').textContent = rperiod;
  report.querySelector('.rweek').style.color = 'var(--acc2)';
  report.querySelector('.rtitle').textContent = `Báo Cáo Tháng${(from && to) ? ` — ${from} đến ${to}` : ''}`;

  // 2. Hàm xây dựng Section (Gunze/MP)
  const buildSection = (key, title, colorVar) => {
    const d = data[key];
    if (!d || !d.metrics || d.metrics.length === 0) return null;

    const clone = secTpl.content.cloneNode(true);
    const container = clone.querySelector('.pb');
    
    clone.querySelector('.pdot').style.background = colorVar;
    const nameEl = clone.querySelector('.pname');
    nameEl.textContent = title;
    nameEl.style.color = colorVar;

    // Chỉ số metrics
    const metricsHtml = d.metrics.map(item => {
      let extra = item.kpi_trend && item.kpi_trend !== '—' ? `<div class="mcalc">${item.kpi_trend}</div>` : '';
      return `<div class="mc"><div class="mlbl">${item.name}</div><div class="mval">${item.value}</div>${extra}</div>`;
    }).join('');
    clone.querySelector('.section-metrics').innerHTML = metricsHtml;

    // Đánh giá AI
    let evalHtml = '';
    if (d.danh_gia && d.danh_gia.length) {
      evalHtml += `<ul class="eval-list">${d.danh_gia.map(item => `<li>${item}</li>`).join('')}</ul>`;
    }
    if (d.ket_luan) {
      evalHtml += `<div><span class="ket-luan-text">Kết luận: </span><span class="ket-luan-text" style="font-weight:normal">${d.ket_luan.replace(/^Kết luận:\s*/i, '')}</span></div>`;
    }
    clone.querySelector('.eval-content').innerHTML = evalHtml;
    
    // Gán sự kiện cho nút viết lại
    clone.querySelector('.btn-regen-eval').onclick = function() { regenerateEval(this, title); };

    return container;
  };

  const gSec = buildSection('gunze', 'Dự án Gunze', 'var(--gunze)');
  if (gSec) contentArea.appendChild(gSec);

  const mSec = buildSection('mp', 'Dự án Mỹ phẩm', 'var(--mp)');
  if (mSec) contentArea.appendChild(mSec);

  // 3. Khối Cửa hàng (Marketing Performance)
  if (data.stores) {
    const st = data.stores;
    const sClone = storeTpl.content.cloneNode(true);
    const sContainer = sClone.querySelector('.pb');

    // Summary Metrics
    let tq = st.tong_quan || {};
    sClone.querySelector('.summary-metrics').innerHTML = 
      mcHtml('Chi phí chạy cửa hàng', tq.chi_phi, 'b', tq.chi_phi_tt ? tq.chi_phi_tt + ' so với TT' : '') +
      mcHtml('Hiển thị', tq.hien_thi, '', tq.hien_thi_tt ? tq.hien_thi_tt + ' so với TT' : '') +
      mcHtml('Tiếp cận (unique)', tq.tiep_can, '', tq.tiep_can_tt ? tq.tiep_can_tt + ' so với TT' : '');

    // Bảng chi tiết dòng
    const rowTpl = document.getElementById('tpl-store-stat-row');
    const tbody = sClone.querySelector('.store-stat-tbody');
    
    // Tìm max để vẽ background gradient (Heatmap)
    const safeParse = (v) => parseFloat(String(v).replace(/[^0-9.-]+/g,"")) || 0;
    let maxKhm = 0, maxDoPhu = 0;
    (st.danh_sach || []).forEach(r => {
      let khmVal = safeParse(r.khm); let doPhuVal = safeParse(r.do_phu);
      if (khmVal > maxKhm) maxKhm = khmVal;
      if (doPhuVal > maxDoPhu) maxDoPhu = doPhuVal;
    });

    (st.danh_sach || []).forEach(r => {
      const row = rowTpl.content.cloneNode(true);
      row.querySelector('.r-name').textContent = r.ten;
      row.querySelector('.r-cp').textContent = r.chi_phi;
      row.querySelector('.r-kh').textContent = r.so_kh;
      row.querySelector('.r-dt').textContent = r.doanh_thu;
      row.querySelector('.r-kpi').textContent = r.kpi_pct;
      
      // Vẽ Heatmap cho KHM và Độ Phủ
      let khmVal = safeParse(r.khm); let doPhuVal = safeParse(r.do_phu);
      let khmPct = maxKhm > 0 ? (khmVal / maxKhm * 100) : 0;
      let doPhuPct = maxDoPhu > 0 ? (doPhuVal / maxDoPhu * 100) : 0;
      
      const khmCell = row.querySelector('.r-khm');
      khmCell.textContent = r.khm;
      if (r.khm !== '—') khmCell.style.background = `linear-gradient(90deg, rgba(56,224,176,0.2) ${khmPct}%, transparent ${khmPct}%)`;

      const phuCell = row.querySelector('.r-phu');
      phuCell.textContent = r.do_phu;
      if (r.do_phu !== '—') phuCell.style.background = `linear-gradient(90deg, rgba(79,124,255,0.2) ${doPhuPct}%, transparent ${doPhuPct}%)`;

      tbody.appendChild(row);
    });

    // Phân tích Store
    let pt = st.phan_tich || {};
    sClone.querySelector('.eval-chung').textContent = pt.chung || '';
    sClone.querySelector('.eval-list-hn').innerHTML = (pt.hn || []).map(i => `<li>${i}</li>`).join('');
    sClone.querySelector('.eval-list-hcm').innerHTML = (pt.hcm || []).map(i => `<li>${i}</li>`).join('');
    sClone.querySelector('.final-conclusion').textContent = (pt.ket_luan || '').replace(/^Kết luận:\s*/i, '');

    contentArea.appendChild(sContainer);
  }

  const out = document.getElementById('out');
  out.innerHTML = '';
  out.appendChild(report);
}

// --- HÀM GỌI AI CHÍNH ĐỂ LẬP BÁO CÁO (Nhiệt độ = 0) ---
// --- HÀM GỌI AI CHÍNH ĐỂ LẬP BÁO CÁO (Nhiệt độ = 0) ---
// --- HÀM GỌI AI CHÍNH ĐỂ LẬP BÁO CÁO (Nhiệt độ = 0) ---
async function gen() {
  const ptype = document.querySelector('input[name="ptype"]:checked').value;
  const type = document.querySelector('input[name="rtype"]:checked').value;
  const role = sessionStorage.getItem('user_role');

  // === CHỐT CHẶN F12 ===
  if (role !== 'admin' && type !== 'Dashboard') {
      alert("Hành động bị từ chối: Bạn chỉ được cấp quyền sử dụng tính năng Dashboard!");
      return;
  }
  // =====================

  const url = getApiUrl();
  document.getElementById('hist-sel').value = ""; 
  resetChat(); 
  viewHist(); 
  document.getElementById('gbtn').disabled = true; 
  document.getElementById('magic-btn').style.display = 'none';
  document.getElementById('forecast-btn').style.display = 'none';
  showLoad();

  const customNote = document.getElementById('ai-custom-note') ? document.getElementById('ai-custom-note').value.trim() : '';
  const extraPrompt = (customNote ? `\n\n=== LƯU Ý ĐẶC BIỆT TỪ NGƯỜI DÙNG ===\n${customNote}` : '') + getAiPersonaPrompt();
  
  try {
// ... (PHẦN BÊN DƯỚI TỪ IF (PTYPE === 'MAIN') GIỮ NGUYÊN) ...
    if (ptype === 'Main') {
      if (type === 'Tuần') {
        const week = document.getElementById('week').value.trim(); const from = document.getElementById('dfrom').value.trim(); const to = document.getElementById('dto').value.trim();
        const valSpendG = parseNum(document.getElementById('spend-g').value.trim()); const valSpendM = parseNum(document.getElementById('spend-m').value.trim());
        const sg = document.getElementById('sg').value.trim(); const sm = document.getElementById('sm').value.trim();
        
        if (!sg && !sm && imgs.hcm.length === 0 && imgs.hn.length === 0 && excels.hcm.length === 0 && excels.hn.length === 0) { 
          alert('Vui lòng cung cấp dữ liệu Sale hoặc ảnh/file Excel cửa hàng!'); document.getElementById('gbtn').disabled = false; document.getElementById('out').innerHTML = `<div class="s-empty"><div class="ico">🗂️</div><p>Vui lòng cung cấp đủ dữ liệu trước khi tạo báo cáo.</p></div>`; return; 
        }

        const sys = `Bạn là trợ lý dữ liệu bán hàng. Trích xuất số liệu từ text Sale và dữ liệu ảnh/file Excel cửa hàng. Trả về JSON thuần. KHÔNG tự tính DT hệ thống, CP QC. Giữ nguyên định dạng số có dấu chấm phân cách nghìn. Thiếu thông tin ghi "—". LƯU Ý QUAN TRỌNG VỀ CỬA HÀNG: 1. HCM: Lấy cột "Doanh thu KHM" gán vào "khm_dt". 2. HN: Cột "DTT KHM" gán vào "khm_dt". Cột "Ngành hàng" gán vào "cat". Cột "Tổng DTT" gán vào "dt".
JSON output:
{
  "gunze": { "chitieu": "", "data": "", "dtt": "", "dtt_kpi": "", "tlchot": "", "gttb": "", "chietkhau": "", "chietkhau_pct": "", "hangtralai": "", "hangtralai_pct": "", "nguon": [{"kenh":"","sotien":"","pct":""}], "sp": [], "danhgia": "", "yoy": "" },
  "mp": { "chitieu": "", "dtt": "", "dtt_kpi": "", "gttb": "", "chietkhau": "", "chietkhau_pct": "", "hangtralai": "", "hangtralai_pct": "", "web_sl": "", "web_dat": "", "web_chot": "", "page_sl": "", "page_dat": "", "page_chot": "", "nguon": [{"kenh":"","sotien":"","pct":""}], "sp": [], "danhgia": "", "yoy": "" },
  "stores_hcm": [ { "name": "", "rows": [ {"cat":"Thời trang","dt":"","khm_dt":""}, {"cat":"Đồ lót", "dt":"","khm_dt":""}, {"cat":"Giày", "dt":"","khm_dt":""}, {"cat":"MP", "dt":"","khm_dt":""}, {"cat":"CSSK", "dt":"","khm_dt":""} ] } ],
  "stores_hn": [ { "name": "", "rows": [ {"cat":"Giày", "dt":"","khm_dt":""}, {"cat":"Đồ lót", "dt":"","khm_dt":""}, {"cat":"TT", "dt":"","khm_dt":""}, {"cat":"CS", "dt":"","khm_dt":""}, {"cat":"MP", "dt":"","khm_dt":""}, {"cat":"TP", "dt":"","khm_dt":""}, {"cat":"GD", "dt":"","khm_dt":""} ] } ]
}`;
        const parts = []; let txt = sys + extraPrompt + '\n\n';
        if (sg) txt += `=== SALE GUNZE ===\n${sg}\n\n`; if (sm) txt += `=== SALE MỸ PHẨM ===\n${sm}\n\n`;
        parts.push({ text: txt });
        
        if (imgs.hcm.length > 0) { parts.push({ text: "\n\n=== ẢNH CỬA HÀNG HCM ===" }); imgs.hcm.forEach(img => parts.push({ inlineData: { mimeType: img.type, data: img.data } })); }
        if (imgs.hn.length > 0) { parts.push({ text: "\n\n=== ẢNH CỬA HÀNG HN ===" }); imgs.hn.forEach(img => parts.push({ inlineData: { mimeType: img.type, data: img.data } })); }
        if (excels.hcm.length > 0) { parts.push({ text: "\n\n=== TEXT EXCEL CỬA HÀNG HCM ===" + excels.hcm.map(e => e.text).join('\n') }); }
        if (excels.hn.length > 0) { parts.push({ text: "\n\n=== TEXT EXCEL CỬA HÀNG HN ===" + excels.hn.map(e => e.text).join('\n') }); }

        setStep(1);
        const res = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: parts }], generationConfig: { responseMimeType: "application/json", temperature: 0 } }) });
        setStep(2);
        const d = await res.json();
        let rawResponse = d.candidates?.[0]?.content?.parts?.[0]?.text || ""; let firstIdx = rawResponse.indexOf('{'); let lastIdx = rawResponse.lastIndexOf('}');
        if (firstIdx !== -1 && lastIdx !== -1) rawResponse = rawResponse.substring(firstIdx, lastIdx + 1);
        const parsed = JSON.parse(rawResponse);
        const khmGunzeHCM = sumKhmByCategory(parsed.stores_hcm, 'Đồ lót'); const khmMpHCM = sumKhmByCategory(parsed.stores_hcm, 'MP'); const khmGunzeHN = sumKhmByCategory(parsed.stores_hn, 'Đồ lót'); const khmMpHN = sumKhmByCategory(parsed.stores_hn, 'MP');
        const khmGunzeTotal = safeAdd(khmGunzeHCM, khmGunzeHN); const khmMpTotal = safeAdd(khmMpHCM, khmMpHN);
        const gc = calcMetrics(parsed.gunze || {}, khmGunzeTotal, valSpendG); const mc = calcMetrics(parsed.mp || {}, khmMpTotal, valSpendM);
        setStep(3); renderTuan(parsed, gc, mc, khmGunzeTotal, khmGunzeHCM, khmGunzeHN, khmMpTotal, khmMpHCM, khmMpHN, week, from, to);
        saveHist('Tuần', week, document.getElementById('out').innerHTML);

      } else if (type === 'Tháng') {
        const period = document.getElementById('month').value.trim(); const from = document.getElementById('m-from').value.trim(); const to = document.getElementById('m-to').value.trim();
        const hasKpi = imgs.kpi.length > 0 || excels.kpi.length > 0;
        const hasData = imgs.thang_gunze.length > 0 || excels.thang_gunze.length > 0 || imgs.thang_mp.length > 0 || excels.thang_mp.length > 0 || imgs.thang_cuahang.length > 0 || excels.thang_cuahang.length > 0 || excelTextData;
        if (!hasKpi || !hasData) { alert('Vui lòng tải lên KPI và ít nhất 1 dữ liệu Dự án/Cửa hàng!'); document.getElementById('gbtn').disabled = false; document.getElementById('out').innerHTML = `<div class="s-empty"><div class="ico">🗂️</div><p>Vui lòng cung cấp đủ dữ liệu trước khi tạo báo cáo.</p></div>`; return; }

        const sysThang = `Bạn là Chuyên gia Phân tích Marketing. LÀM TỪNG BƯỚC và ĐỐI CHIẾU CHÍNH XÁC:
=== DỰ ÁN GUNZE & MỸ PHẨM ===
1. Đọc Ảnh/Text KPI để lấy Mục tiêu (KPI).
2. Đọc Ảnh/Text Số liệu dự án để trích xuất đầy đủ.
3. RIÊNG MỸ PHẨM: Phải trích xuất tách biệt "Data Web", "Tỷ lệ chốt Web" và "Data Page", "Tỷ lệ chốt Page".
4. FORMAT CHỈ SỐ: Dòng 'value' BẮT BUỘC ghi "Thực đạt / Mục tiêu KPI". Trường 'kpi_trend' ghi số liệu so sánh tháng trước.
5. Đánh giá (bullet points): Nhận xét % KPI Doanh thu, chi phí, chốt. Mỹ phẩm bắt buộc so sánh Web và Page.
=== KHỐI CỬA HÀNG ===
7. TỪ DỮ LIỆU EXCEL: Gán "TỔNG HỆ THỐNG" vào 'tong_quan'. CỬA HÀNG: Gán "Chi phí" vào 'chi_phi', "Hiển thị" vào 'do_phu'.
8. KPI: Lấy "Mục tiêu" làm KPI ("CH Mỗ Lao" = "Hà Đông").
9. THỰC ĐẠT: Số lượng KH vào 'so_kh', Doanh thu vào 'doanh_thu', %KHM vào 'khm'.
10. 'kpi_pct' = (Doanh thu / Mục tiêu KPI) * 100, format "X%".
Trả về JSON thuần:
{
  "gunze": { "metrics": [ {"name": "Doanh thu thuần", "value": "Thực đạt / KPI", "kpi_trend": "..."} ], "danh_gia": [ "..." ], "ket_luan": "..." },
  "mp": { "metrics": [ {"name": "Doanh thu thuần", "value": "Thực đạt / KPI", "kpi_trend": "..."} ], "danh_gia": [ "..." ], "ket_luan": "..." },
  "stores": { "tong_quan": {"chi_phi": "...", "chi_phi_tt": "...", "hien_thi": "...", "hien_thi_tt": "...", "tiep_can": "...", "tiep_can_tt": "..."}, "danh_sach": [ {"ten": "Đỗ Quang", "chi_phi": "...", "so_kh": "...", "doanh_thu": "...", "kpi_pct": "...", "khm": "...", "do_phu": "..."} ], "phan_tich": {"chung": "...", "hn": ["..."], "hcm": ["..."], "ket_luan": "..."} }
}`;
        const parts = [{ text: sysThang + extraPrompt }];
        if (excelTextData) parts.push({ text: `\n\n=== TEXT EXCEL ADS CỬA HÀNG ===\n${excelTextData}` });
        if (imgs.kpi.length > 0) { parts.push({ text: "\n\n=== ẢNH KPI ===" }); imgs.kpi.forEach(img => parts.push({ inlineData: { mimeType: img.type, data: img.data } })); }
        if (imgs.thang_gunze.length > 0) { parts.push({ text: `\n\n=== ẢNH SỐ LIỆU GUNZE ===` }); imgs.thang_gunze.forEach(img => parts.push({ inlineData: { mimeType: img.type, data: img.data } })); }
        if (imgs.thang_mp.length > 0) { parts.push({ text: `\n\n=== ẢNH SỐ LIỆU MỸ PHẨM ===` }); imgs.thang_mp.forEach(img => parts.push({ inlineData: { mimeType: img.type, data: img.data } })); }
        if (imgs.thang_cuahang.length > 0) { parts.push({ text: `\n\n=== ẢNH THỰC ĐẠT CỬA HÀNG ===` }); imgs.thang_cuahang.forEach(img => parts.push({ inlineData: { mimeType: img.type, data: img.data } })); }
        if (excels.kpi.length > 0) parts.push({ text: "\n\n=== TEXT EXCEL KPI ===\n" + excels.kpi.map(e => e.text).join('\n') });
        if (excels.thang_gunze.length > 0) parts.push({ text: "\n\n=== TEXT EXCEL GUNZE ===\n" + excels.thang_gunze.map(e => e.text).join('\n') });
        if (excels.thang_mp.length > 0) parts.push({ text: "\n\n=== TEXT EXCEL MỸ PHẨM ===\n" + excels.thang_mp.map(e => e.text).join('\n') });
        if (excels.thang_cuahang.length > 0) parts.push({ text: "\n\n=== TEXT EXCEL THỰC ĐẠT CỬA HÀNG ===\n" + excels.thang_cuahang.map(e => e.text).join('\n') });

        setStep(1);
        const res = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: parts }], generationConfig: { responseMimeType: "application/json", temperature: 0 } }) });
        setStep(2);
        const d = await res.json();
        let rawResponse = d.candidates?.[0]?.content?.parts?.[0]?.text || ""; let firstIdx = rawResponse.indexOf('{'); let lastIdx = rawResponse.lastIndexOf('}');
        if (firstIdx !== -1 && lastIdx !== -1) rawResponse = rawResponse.substring(firstIdx, lastIdx + 1);
        const parsed = JSON.parse(rawResponse);
        setStep(3); renderThang(parsed, period, from, to);
        saveHist('Tháng', period, document.getElementById('out').innerHTML);
      } else if (type === 'Dashboard') {
        await genMainDashboard();
      }
    } else if (ptype === 'Kosu') {
      if (type === 'Tuần') {
        const week = document.getElementById('week-k').value.trim(); const from = document.getElementById('dfrom-k').value.trim(); const to = document.getElementById('dto-k').value.trim();
        const valSpendK = parseNum(document.getElementById('spend-k').value.trim()); 
        const budgetHn = parseNum(document.getElementById('budget-hn-k').value.trim()) || 0;
        const budgetHcm = parseNum(document.getElementById('budget-hcm-k').value.trim()) || 0;
        const manualKhmHn = parseNum(document.getElementById('khm-hn-k').value.trim());
        const manualKhmHcm = parseNum(document.getElementById('khm-hcm-k').value.trim());
        const sk = document.getElementById('sk').value.trim();
        
        if (!sk && imgs.kosu_stores.length === 0 && excels.kosu_stores.length === 0) { 
          alert('Vui lòng cung cấp dữ liệu Sale hoặc ảnh/file Excel cửa hàng cho Kosu!'); document.getElementById('gbtn').disabled = false; document.getElementById('out').innerHTML = `<div class="s-empty"><div class="ico">🗂️</div><p>Vui lòng cung cấp đủ dữ liệu trước khi tạo báo cáo.</p></div>`; return; 
        }

        const sysKosu = `Bạn là Chuyên gia Phân tích Dữ liệu Dự án "Giày Kosu". Trích xuất số liệu từ text Sale và dữ liệu Cửa hàng (nếu có) để tạo báo cáo.
Trả về JSON thuần. Giữ định dạng số có dấu chấm, thiếu thông tin điền "—".
3. Lấy Doanh số Online của HN, HCM và Nơi Khác điền vào "khu_vuc" (hn_online_dt, hcm_online_dt, conlai_online_dt).
4. Trích xuất chi tiết Data LDP (chốt đơn, đơn thành công).
5. "danh_gia" là mảng các câu nhận xét chi tiết. "ket_luan" là 1 câu chốt tổng quan.
JSON output:
{
  "kosu": {
    "chi_tieu_pct": "", "chi_tieu_mom": "", "chi_tieu_yoy": "",
    "dt_don_hang": "", "dt_don_hang_pct": "", "dt_don_hang_kpi": "",
    "gttb": "", "cpqc_don_hang": "", "cpqc_mom": "", "cpqc_yoy": "",
    "data_page": "", "data_page_pct": "",
    "tl_chot_chinh": "", "tl_chot_phu": "", "tl_chot_ldp": "",
    "page_chinh": { "data": "", "chiem_pct": "", "dat_pct": "", "tl_chot": "", "don": "", "chi_tieu": "", "doanh_so": "", "cpqc": "" },
    "page_phu": { "data": "", "chiem_pct": "", "dat_pct": "", "tl_chot": "", "don": "", "chi_tieu": "", "doanh_so": "", "cpqc": "" },
    "ldp": { "dat_pct": "", "dat": "", "tong": "", "chot_don_thuc": "", "chot_don_tong": "", "tl_chot_don": "", "don_tc_thuc": "", "don_tc_tong": "", "tl_don_tc": "", "chi_tieu": "", "doanh_so": "", "cpqc": "" },
    "khm": { "hn": "", "hcm": "" },
    "danh_gia": ["Nhận xét 1", "Nhận xét 2"],
    "ket_luan": "1 câu kết luận tổng quan"
  }
}`;
        const parts = []; let txt = sysKosu + extraPrompt + '\n\n';
        if (kosuAdsTextData) txt += `${kosuAdsTextData}\n\n`;
        if (kosuSapoTextData) txt += `${kosuSapoTextData}\n\n`;
        if (sk) txt += `=== SALE KOSU ===\n${sk}\n\n`;
        parts.push({ text: txt });
        
        if (imgs.kosu_stores.length > 0) { parts.push({ text: "\n\n=== ẢNH CỬA HÀNG KOSU ===\n(Hãy lọc cột Khách hàng mới - KHM của ngành hàng Giày tại HN và HCM)" }); imgs.kosu_stores.forEach(img => parts.push({ inlineData: { mimeType: img.type, data: img.data } })); }
        if (excels.kosu_stores.length > 0) { parts.push({ text: "\n\n=== TEXT EXCEL CỬA HÀNG KOSU ===\n(Hãy lọc cột Khách hàng mới - KHM của ngành hàng Giày tại HN và HCM)\n" + excels.kosu_stores.map(e => e.text).join('\n') }); }

        setStep(1);
        const res = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: parts }], generationConfig: { responseMimeType: "application/json", temperature: 0 } }) });
        setStep(2);
        const d = await res.json();
        let rawResponse = d.candidates?.[0]?.content?.parts?.[0]?.text || ""; let firstIdx = rawResponse.indexOf('{'); let lastIdx = rawResponse.lastIndexOf('}');
        if (firstIdx !== -1 && lastIdx !== -1) rawResponse = rawResponse.substring(firstIdx, lastIdx + 1);
        const parsed = JSON.parse(rawResponse);
        
        const spendTotal = valSpendK > 0 ? valSpendK : kosuSpend.total;
        
        setStep(3); renderKosuTuan(parsed, week, from, to, spendTotal, budgetHn, budgetHcm, manualKhmHn, manualKhmHcm);
        saveHist('Kosu Tuần', week, document.getElementById('out').innerHTML);

      } else if (type === 'Tháng') {
        
        const month = document.getElementById('month-k').value.trim(); 
        const from = document.getElementById('m-from-k').value.trim(); 
        const to = document.getElementById('m-to-k').value.trim();
        
        if (imgs.thang_kosu.length === 0 && excels.thang_kosu.length === 0) { 
          alert('Vui lòng tải lên file Số liệu Thực đạt tháng (CSV/Excel) của Kosu!'); document.getElementById('gbtn').disabled = false; document.getElementById('out').innerHTML = `<div class="s-empty"><div class="ico">🗂️</div><p>Vui lòng cung cấp đủ dữ liệu trước khi tạo báo cáo.</p></div>`; return; 
        }

        const sysKosuThang = `Bạn là Chuyên gia Phân tích Dữ liệu Dự án "Giày Kosu".
Nhiệm vụ: Trích xuất số liệu từ file Thực đạt Tháng (CSV) và file KPI Tháng (CSV).
- File Thực đạt có các cột Tháng hiện tại, Tháng trước để so sánh (MoM).
- File KPI có các dòng Doanh thu thuần, Ngân sách, Số lượng data... chia theo LDP, Data mess... Cột "Tổng" là KPI toàn dự án.
Quy tắc tính toán MoM (Tăng/Giảm so với tháng trước):
- Với số tuyệt đối: ((Hiện tại - Tháng trước) / Tháng trước) * 100%. Format: "+X%" hoặc "-X%".
- Với số tỷ lệ %: Hiệu số (Hiện tại - Tháng trước). VD: 11% - 8% = "+3%". Format: "+X%" hoặc "-X%".
- "danh_gia": Dạng mảng (array) chứa 3-4 nhận xét chuyên sâu. "ket_luan": 1 câu kết luận ngắn gọn.
Trả về JSON thuần tuân thủ nghiêm ngặt cấu trúc sau:
{
  "thang_hien_tai": "Tên tháng hiện tại",
  "thang_truoc": "Tên tháng trước",
  "doanh_thu": { "cur": "", "prev": "", "mom": "", "kpi": "Lấy KPI Tổng Doanh thu thuần" },
  "chi_tieu": { "cur": "", "prev": "", "mom": "", "kpi": "Lấy KPI Tổng Ngân sách" },
  "mere": { "cur": "", "prev": "", "mom": "" },
  "data_mess": { "cur": "", "prev": "", "mom": "", "kpi": "Lấy KPI Số lượng data cột Data mess" },
  "data_ldp": { "cur": "", "prev": "", "mom": "", "kpi": "Lấy KPI Số lượng data cột LDP" },
  "cpa_data": { "cur": "", "prev": "", "mom": "" },
  "don_hang": { "cur": "", "prev": "", "mom": "", "kpi": "Lấy KPI Số lượng đơn cột Tổng" },
  "aov": { "cur": "", "prev": "", "mom": "", "kpi": "Lấy KPI AOV cột Tổng (nếu có) hoặc Data mess" },
  "chot_page_chinh": { "cur": "", "prev": "", "mom": "" },
  "chot_page_phu": { "cur": "", "prev": "", "mom": "" },
  "chot_ldp": { "cur": "", "prev": "", "mom": "", "kpi": "Lấy KPI Tỷ lệ chốt cột LDP" },
  "danh_gia": ["Nhận xét 1", "Nhận xét 2"],
  "ket_luan": "1 câu kết luận tổng thể"
}`;
        const parts = []; let txt = sysKosuThang + extraPrompt + '\n\n';
        parts.push({ text: txt });
        
        if (imgs.kpi_kosu.length > 0) { imgs.kpi_kosu.forEach(img => parts.push({ inlineData: { mimeType: img.type, data: img.data } })); }
        if (excels.kpi_kosu.length > 0) { parts.push({ text: "\n\n=== TEXT EXCEL KPI KOSU ===\n" + excels.kpi_kosu.map(e => e.text).join('\n') }); }
        if (imgs.thang_kosu.length > 0) { imgs.thang_kosu.forEach(img => parts.push({ inlineData: { mimeType: img.type, data: img.data } })); }
        if (excels.thang_kosu.length > 0) { parts.push({ text: "\n\n=== TEXT EXCEL KOSU THÁNG ===\n" + excels.thang_kosu.map(e => e.text).join('\n') }); }

        setStep(1);
        const res = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: parts }], generationConfig: { responseMimeType: "application/json", temperature: 0 } }) });
        setStep(2);
        const d = await res.json();
        let rawResponse = d.candidates?.[0]?.content?.parts?.[0]?.text || ""; let firstIdx = rawResponse.indexOf('{'); let lastIdx = rawResponse.lastIndexOf('}');
        if (firstIdx !== -1 && lastIdx !== -1) rawResponse = rawResponse.substring(firstIdx, lastIdx + 1);
        const parsed = JSON.parse(rawResponse);
        
        setStep(3); renderKosuThang(parsed, month, from, to);
        saveHist('Kosu Tháng', month, document.getElementById('out').innerHTML);

      } else if (type === 'Dashboard') {
        if (!dbFiles.sapo_cur) { alert('Vui lòng tải lên ít nhất File Sapo Tháng hiện tại!'); document.getElementById('gbtn').disabled = false; document.getElementById('out').innerHTML = `<div class="s-empty"><div class="ico">🗂️</div><p>Vui lòng tải lên dữ liệu.</p></div>`; return; }

        setStep(1);
        const sapoCurData = await parseCSVAsync(dbFiles.sapo_cur);
        const sapoPrevData = await parseCSVAsync(dbFiles.sapo_prev);
        const adsCurData = await parseCSVAsync(dbFiles.ads_cur);
        const adsPrevData = await parseCSVAsync(dbFiles.ads_prev);

        const NHAN_SU_CFG = {
          'AnhVV':     { sapoSrc: ['Page LVS','Page NVL','Web AnhVV','LDP LVS','LDP NVL'],   adsKeys: ['anhvv','lvs:','nvl:'],                       color: '#4f7cff' },
          'Trangle':   { sapoSrc: ['Page ĐQ','Page NGĐ','Web TrangFB','LDP ĐQ','LDP NGĐ'],  adsKeys: ['trangle','đq:','ngđ:'],                       color: '#38e0b0' },
          'quantm':    { sapoSrc: ['Page MĐ','Page TĐN','Web Quan TMFB','LDP MĐ','LDP TĐN'],adsKeys: ['quantm','mỹ đình:','tđn:','mđ:','my dinh'],   color: '#ff9800' },
          'ChungPV':   { sapoSrc: ['Page Park Hill','Page Times city','Page NTT','Web ChungFB','LDP Time','LDP NTT'], adsKeys: ['chungpv','time:','ntt:'],              color: '#b388ff' },
          'Vanh':      { sapoSrc: ['Page TH','Page HBT','Web VanhFB','LDP TH','LDP HBT'],    adsKeys: ['vanh','th -','th:','hbt:'],                   color: '#ff5f7e' },
          'SIJ':       { sapoSrc: ['Page Kosu','Web Kosu','LDP Kosu'],                       adsKeys: ['sij:'],                                       color: '#ffbc57' },
          'JPS':       { sapoSrc: ['Facebook'],                                              adsKeys: ['jps:'],                                       color: '#4f7cff' }
        };
        const NS_ORDER = ['AnhVV','Trangle','quantm','ChungPV','Vanh','SIJ','JPS'];
        const srcToNS = {};
        for (const [p, cfg] of Object.entries(NHAN_SU_CFG)) cfg.sapoSrc.forEach(s => srcToNS[s] = p);

        const processSapo = (dataArr, filterPerson) => {
          let res = { cats: {}, topSp: {}, totalRev: 0, nhanSu: {}, dailyMap: {}, srcMap: {}, pageStats: {} };
          if(!dataArr.length || !dataArr[0]) return res;
          let hd = dataArr[0].map(h => (h||'').normalize('NFC').toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g,'').trim());
          let nameIdx = hd.findIndex(h => h.includes('tên sản phẩm'));
          let revIdx  = hd.findIndex(h => h.includes('doanh thu thuần') || h === 'doanh thu');
          let qtyIdx  = hd.findIndex(h => h.includes('hàng thực bán') || h.includes('số lượng'));
          let banRaIdx = hd.findIndex(h => h.includes('hàng bán ra'));
          let traIdx  = hd.findIndex(h => h.includes('hàng trả lại'));
          let catIdx  = hd.findIndex(h => h.includes('loại sản phẩm') || h.includes('nhóm sản phẩm') || h.includes('nhóm'));
          let srcIdx  = hd.findIndex(h => h.includes('nguồn'));
          let dateIdx = hd.findIndex(h => h === 'ngày' || h.includes('ngày'));

          if(nameIdx === -1 || revIdx === -1) return res;

          for(let i = 1; i < dataArr.length; i++) {
            let name   = dataArr[i][nameIdx] || '';
            let rev    = parseAnyNum(dataArr[i][revIdx]);
            let qty    = qtyIdx   !== -1 ? parseAnyNum(dataArr[i][qtyIdx])   : 1;
            let banRa  = banRaIdx !== -1 ? parseAnyNum(dataArr[i][banRaIdx]) : Math.abs(qty);
            let tra    = traIdx   !== -1 ? parseAnyNum(dataArr[i][traIdx])   : 0;
            let src    = srcIdx   !== -1 ? (dataArr[i][srcIdx]||'').trim()   : '';
            let d2     = dateIdx  !== -1 ? (dataArr[i][dateIdx]||'').trim()  : '';

            if (src.toLowerCase().includes("park hill")) src = src.replace(/park hill/gi, "Times city");

            if(!name || (rev === 0 && qty === 0 && banRa === 0)) continue;
            let person = srcToNS[src] || 'Khác';

            if (filterPerson === 'All') {
                if(!res.nhanSu[person]) res.nhanSu[person] = { rev:0, ban_ra:0, tra:0, spend:0, data:0, mua:0 };
                res.nhanSu[person].rev    += rev;
                res.nhanSu[person].ban_ra += banRa;
                res.nhanSu[person].tra    += tra;
            }

            if (filterPerson !== 'All' && person !== filterPerson) continue;

            if(rev !== 0) res.totalRev += rev;
            if(!res.topSp[name]) res.topSp[name] = { qty:0, rev:0 };
            res.topSp[name].qty += qty;
            res.topSp[name].rev += rev;

            if (d2) res.dailyMap[d2] = (res.dailyMap[d2]||0) + rev;

            if(!res.srcMap[src]) res.srcMap[src] = { rev:0, ban_ra:0, tra:0, don:0 };
            res.srcMap[src].rev    += rev;
            res.srcMap[src].ban_ra += banRa;
            res.srcMap[src].tra    += tra;
            res.srcMap[src].don    += qty;

            // PAGE STATS: Tách riêng số liệu theo từng Fanpage
            let sLower = src.toLowerCase();
            let isPage = false; let pName = src;
            if (sLower === 'facebook') { isPage = true; pName = 'Page Chính (JPS)'; }
            else if (sLower.includes('page') && !sLower.includes('web fanpage')) { isPage = true; }
            else if (sLower.includes('ldp')) { isPage = true; }

            if (isPage) {
                if(!res.pageStats[pName]) res.pageStats[pName] = { rev:0, ban_ra:0, tra:0, spend:0, don:0 };
                res.pageStats[pName].rev += rev;
                res.pageStats[pName].ban_ra += banRa;
                res.pageStats[pName].tra += tra;
                res.pageStats[pName].don += qty;
            }

            let rawCat = (catIdx !== -1 && dataArr[i][catIdx]) ? dataArr[i][catIdx].normalize('NFC').toLowerCase() : name.normalize('NFC').toLowerCase();
            let catName = 'Khác';
            if      (rawCat.includes('giày đế xuồng')||rawCat.includes('giầy đế xuồng'))   catName = 'Giày đế xuồng';
            else if (rawCat.includes('sandal đế xuồng')||rawCat.includes('dép đế xuồng'))   catName = 'Sandal, dép đế xuồng';
            else if (rawCat.includes('giày đế bệt')||rawCat.includes('giầy đế bệt'))         catName = 'Giày đế bệt';
            else if (rawCat.includes('giày cao gót')||rawCat.includes('giầy cao gót'))       catName = 'Giày cao gót';
            else if (rawCat.includes('sandal cao gót'))                                       catName = 'Sandal cao gót';
            else if (rawCat.includes('dép cao gót'))                                          catName = 'Dép cao gót';
            else if (rawCat.includes('boot')||rawCat.includes('bốt'))                        catName = 'Boot';

            if(!res.cats[catName]) res.cats[catName] = { rev:0, qty:0, spend:0, ban_ra:0, tra:0 };
            res.cats[catName].rev    += rev;
            res.cats[catName].qty    += qty;
            res.cats[catName].ban_ra += banRa;
            res.cats[catName].tra    += tra;
          }
          return res;
        };

        const processAds = (adsArr, sapoStats, filterPerson) => {
          if(!adsArr.length) return;
          let hdRow = adsArr.find(r => r.join('').toLowerCase().includes('amount spent') || r.join('').toLowerCase().includes('chi tiêu') || r.join('').toLowerCase().includes('chi phí'));
          if(!hdRow) return;
          let hd = hdRow.map(h => (h||'').toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g,'').trim());

          let campIdx  = hd.findIndex(h => h.includes('tên chiến dịch') || h.includes('campaign name'));
          let spendIdx = hd.findIndex(h => h.includes('amount spent') || h.includes('chi tiêu') || h.includes('chi phí'));
          let dataIdx  = hd.findIndex(h => h === 'data' || h.includes('bình luận về bài viết'));
          let muaIdx   = hd.findIndex(h => h === 'lượt mua');
          let adNameIdx = hd.findIndex(h => h === 'tên quảng cáo' || h === 'ad name');
          if(adNameIdx === -1) adNameIdx = hd.findIndex(h => h.includes('tên quảng cáo'));
          if(campIdx === -1 || spendIdx === -1) return;

          let startIdx = adsArr.indexOf(hdRow) + 1;
          let macroSpends = { "GĐX":0, "SĐX":0, "Cao gót":0, "GĐB":0, "Boot":0 };
          sapoStats.channelSpends = {};

          for(let i = startIdx; i < adsArr.length; i++) {
            let campName = (adsArr[i][campIdx] || '').toLowerCase().trim();
            let adName   = adNameIdx !== -1 ? (adsArr[i][adNameIdx]||'').toLowerCase() : campName;
            let spend    = parseAnyNum(adsArr[i][spendIdx]);
            let data     = dataIdx  !== -1 ? parseAnyNum(adsArr[i][dataIdx])  : 0;
            let mua      = muaIdx   !== -1 ? parseAnyNum(adsArr[i][muaIdx])   : 0;

            if(!campName || spend === 0 || campName === 'total') continue;

            let isLivestream = campName.includes('livestream');
            let isLDP = (campName.includes('chuyển đổi') || campName.includes('chuyen doi')) && !campName.startsWith('jps');
            let isJPS = campName.startsWith('jps');

            // Gắn chi tiêu vào từng Page cụ thể
            if (!isLivestream && !campName.includes('cpo')) {
                let targetPage = null; let cLower = campName;
                if (cLower.startsWith('jps')) {
                    targetPage = 'Page Chính (JPS)';
                } else {
                    let loc = null;
                    if (cLower.includes('lvs')) loc = 'LVS';
                    else if (cLower.includes('nvl')) loc = 'NVL';
                    else if (cLower.includes('đq') || cLower.includes('dq')) loc = 'ĐQ';
                    else if (cLower.includes('ngđ') || cLower.includes('ngd')) loc = 'NGĐ';
                    else if (cLower.includes('mđ') || cLower.includes('md') || cLower.includes('mỹ đình') || cLower.includes('my dinh')) loc = 'MĐ';
                    else if (cLower.includes('tđn') || cLower.includes('tdn')) loc = 'TĐN';
                    else if (cLower.includes('th:') || cLower.includes('th ') || cLower.includes('th -')) loc = 'TH';
                    else if (cLower.includes('hbt')) loc = 'HBT';
                    else if (cLower.includes('ntt')) loc = 'NTT';
                    else if (cLower.includes('time') || cLower.includes('park hill')) loc = isLDP ? 'Time' : 'Times city';
                    else if (cLower.includes('sij')) loc = 'Kosu';

                    if (loc) {
                        targetPage = isLDP ? `LDP ${loc}` : `Page ${loc}`;
                    }
                }

                if (targetPage) {
                    if (!sapoStats.pageStats[targetPage]) sapoStats.pageStats[targetPage] = { rev:0, ban_ra:0, tra:0, spend:0, don:0 };
                    sapoStats.pageStats[targetPage].spend += spend;
                }
            }

            let campPerson = 'Khác';
            if(!isLivestream) {
                for(const [p, cfg] of Object.entries(NHAN_SU_CFG)) {
                    if(cfg.adsKeys.some(k => campName.includes(k))) { campPerson = p; break; }
                }
            } else campPerson = 'Livestream';

            if (filterPerson === 'All' && !isLivestream && sapoStats.nhanSu[campPerson]) {
                sapoStats.nhanSu[campPerson].spend += spend;
                sapoStats.nhanSu[campPerson].data  += data;
                sapoStats.nhanSu[campPerson].mua   += mua;
            }

            if (filterPerson !== 'All' && campPerson !== filterPerson) continue;

            let chGrp = 'Page Phụ';
            if (isLivestream) chGrp = 'Livestream';
            else if (isLDP) chGrp = 'LDP';
            else if (campName.includes('cpo')) chGrp = 'Web';
            else if (isJPS) chGrp = 'Page Chính (JPS)';
            sapoStats.channelSpends[chGrp] = (sapoStats.channelSpends[chGrp]||0) + spend;

            if(!isLivestream && !campName.includes('cpo')) {
                if     (adName.includes('gđx')||adName.includes('gdx'))                     macroSpends['GĐX']    += spend;
                else if(adName.includes('sđx')||adName.includes('sdx'))                     macroSpends['SĐX']    += spend;
                else if(adName.includes('cao gót')||adName.includes('cao got'))             macroSpends['Cao gót']+= spend;
                else if(adName.includes('gđb')||adName.includes('gdb'))                     macroSpends['GĐB']    += spend;
                else if(adName.includes('boot')||adName.includes('bốt'))                    macroSpends['Boot']   += spend;
            }
          }

          const distribute = (key, cats) => {
            let targets = Object.keys(sapoStats.cats).filter(c => cats.includes(c));
            let tot = targets.reduce((s,c) => s + sapoStats.cats[c].rev, 0);
            if(!targets.length) return;
            targets.forEach(c => {
                let ratio = tot > 0 ? sapoStats.cats[c].rev / tot : 1/targets.length;
                sapoStats.cats[c].spend += macroSpends[key] * ratio;
            });
          };
          distribute('GĐX',    ['Giày đế xuồng']);
          distribute('SĐX',    ['Sandal, dép đế xuồng']);
          distribute('Cao gót',['Giày cao gót','Sandal cao gót','Dép cao gót']);
          distribute('GĐB',    ['Giày đế bệt']);
          distribute('Boot',   ['Boot']);
        };

        window.kosuDbCache = {};
        const persons = ['All', ...NS_ORDER];
        let globalRawText = ''; let globalNhanSuRows = '';
        const momStr = (cur, prev) => {
          if(!prev || prev === 0) return { str:'—', cls:'color:var(--tx3)' };
          let pct = ((cur-prev)/prev*100).toFixed(1); return { str: (parseFloat(pct)>=0?'+':'')+pct+'%', cls: parseFloat(pct)>=0?'color:var(--acc2)':'color:var(--danger)' };
        };
        const hoanCls = v => parseFloat(v)>15 ? 'color:var(--danger);font-weight:700' : parseFloat(v)<10 ? 'color:var(--acc2);font-weight:700' : 'color:var(--warn)';
        const roasCls = v => v==='—'?'color:var(--tx3)':parseFloat(v)>=4?'color:var(--acc2);font-weight:700':parseFloat(v)>=2.5?'color:var(--warn)':'color:var(--danger);font-weight:700';

        for (let p of persons) {
            let sapCur = processSapo(sapoCurData, p);
            let sapPrv = processSapo(sapoPrevData, p);
            processAds(adsCurData, sapCur, p);
            processAds(adsPrevData, sapPrv, p);

            let dLbls = Object.keys(sapCur.dailyMap).sort((a,b)=>{ let [da,ma] = a.split('/'); let [db,mb] = b.split('/'); return (parseInt(ma)*100+parseInt(da)) - (parseInt(mb)*100+parseInt(db)); });
            let dVals = dLbls.map(d=>sapCur.dailyMap[d]);
            let dMax  = Math.max(...dVals, 1);
            let dailyHtml = dLbls.length === 0 ? '<div style="color:var(--tx3);font-size:12px;text-align:center;padding:20px">Không có dữ liệu ngày</div>' : `<div style="display:flex;align-items:flex-end;gap:2px;height:110px;overflow-x:auto;padding-bottom:6px;" id="daily-chart">${dLbls.map((label,i)=>{ let val = dVals[i]; let h = Math.max(Math.round((val/dMax)*100), 2); let col = val === dMax ? 'var(--kosu)' : val > dMax*0.6 ? 'var(--acc2)' : val > dMax*0.3 ? 'var(--acc)' : 'var(--bdr)'; let day = label.split('/')[0]; return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:16px;cursor:default;" title="${label}: ${Math.round(val/1e6)}tr₫"><div style="width:100%;height:${h}px;background:${col};border-radius:2px 2px 0 0;transition:opacity .15s" onmouseover="this.style.opacity='.7'" onmouseout="this.style.opacity='1'"></div><div style="font-size:8px;color:var(--tx3);margin-top:3px;">${day}</div></div>`; }).join('')}</div><div style="display:flex;justify-content:space-between;margin-top:8px;font-size:10px;color:var(--tx3);"><span>Trung bình: <strong style="color:var(--tx)">${fmtNum(Math.round(dVals.reduce((s,v)=>s+v,0)/Math.max(dVals.length,1)))} ₫</strong></span><span>Cao nhất: <strong style="color:var(--kosu)">${fmtNum(dMax)} ₫</strong></span><span>Tổng: <strong style="color:var(--acc2)">${fmtNum(dVals.reduce((s,v)=>s+v,0))} ₫</strong></span></div>`;

            let tCur = Object.entries(sapCur.topSp).map(([k,v])=>({name:k,qty:v.qty,rev:v.rev}));
            let tPrv = Object.entries(sapPrv.topSp).map(([k,v])=>({name:k,qty:v.qty,rev:v.rev}));
            tCur.sort((a,b)=>b.rev-a.rev); tPrv.sort((a,b)=>b.rev-a.rev);
            let topCurEncoded = encodeURIComponent(JSON.stringify(tCur));
            let topPrevEncoded = encodeURIComponent(JSON.stringify(tPrv));

            let allCats = Array.from(new Set([...Object.keys(sapCur.cats),...Object.keys(sapPrv.cats)]));
            allCats.sort((a,b)=>(sapCur.cats[b]?.rev||0)-(sapCur.cats[a]?.rev||0));
            let hoanRows = ''; let hoanAlert = []; let catsRows = '';
            allCats.forEach(cat => {
                let c = sapCur.cats[cat] || {ban_ra:0, tra:0, rev:0}; let totalBan = (c.ban_ra||0) + (c.tra||0);
                let prevC = sapPrv.cats[cat] || {ban_ra:0, tra:0}; let prevTot = (prevC.ban_ra||0) + (prevC.tra||0);
                
                let curRev = c.rev || 0; let prevRev = prevC.rev || 0;
                let curSpend = cat === 'Khác' ? 0 : (c.spend||0); let prevSpend = cat === 'Khác' ? 0 : (prevC.spend||0);
                
                // Bỏ qua nếu nhóm Sản phẩm này hoàn toàn không có dữ liệu (dành cho bộ lọc nhân sự)
                if (curRev === 0 && prevRev === 0 && curSpend === 0 && prevSpend === 0 && (c.tra||0) === 0 && (prevC.tra||0) === 0) return;

                let hoanPct = totalBan > 0 ? (c.tra / totalBan * 100).toFixed(1) : '0.0';
                let prevHoan= prevTot > 0 ? (prevC.tra/prevTot*100).toFixed(1) : '—';

                if(totalBan > 0) {
                    let hCls = parseFloat(hoanPct)>20?'color:var(--danger);font-weight:700':parseFloat(hoanPct)>12?'color:var(--warn);font-weight:600':'color:var(--acc2);font-weight:600';
                    let barCol = parseFloat(hoanPct)>20?'var(--danger)':parseFloat(hoanPct)>12?'var(--warn)':'var(--acc2)';
                    if(parseFloat(hoanPct) > 20) hoanAlert.push(`${cat}: ${hoanPct}%`);
                    hoanRows += `<tr><td style="text-align:left;font-weight:700;color:var(--tx)">${cat}</td><td style="color:var(--tx2)">${c.tra||0}</td><td style="color:var(--tx2)">${totalBan}</td><td><div style="display:flex;align-items:center;gap:6px;justify-content:flex-end;"><div style="width:60px;background:var(--bdr);height:5px;border-radius:3px;overflow:hidden;"><div style="width:${Math.min(parseFloat(hoanPct)*3, 100)}%;height:100%;background:${barCol};"></div></div><span style="${hCls};min-width:36px">${hoanPct}%</span></div></td><td style="color:var(--tx2);font-size:10px">${prevHoan==='—'?'—':prevHoan+'%'}</td></tr>`;
                }
                
                let mRev = momStr(curRev, prevRev); let mSpend = (cat !== 'Khác' && prevSpend>0) ? momStr(curSpend, prevSpend) : {str:'—',cls:'color:var(--tx3)'};
                let cpqc = (cat !== 'Khác'&&curRev>0) ? ((curSpend/curRev)*100).toFixed(1)+'%' : '—';
                let cpqcCls = (cat !== 'Khác'&&curRev>0&&(curSpend/curRev)>0.35)?'color:var(--danger)':'color:var(--acc2)';
                let roas = (cat !== 'Khác'&&curSpend>0) ? (curRev/curSpend).toFixed(1) : '—';
                let pctTotal = sapCur.totalRev>0 ? ((curRev/sapCur.totalRev)*100).toFixed(1) : 0;
                catsRows += `<tr><td style="text-align:left;font-weight:700;color:var(--tx)">${cat}</td><td><div style="display:flex;justify-content:flex-end;align-items:center;gap:5px;"><div style="width:50px;background:var(--bdr);height:4px;border-radius:2px;overflow:hidden;"><div style="width:${pctTotal}%;height:100%;background:var(--kosu);"></div></div><span style="font-size:10px;font-weight:600;color:var(--kosu);min-width:28px;">${pctTotal}%</span></div></td><td style="color:var(--tx);font-weight:700;">${fmtNum(curRev)}</td><td style="color:var(--tx2);">${fmtNum(prevRev)}</td><td style="font-weight:700;${mRev.cls}">${mRev.str}</td><td style="color:var(--gunze);font-weight:700;">${fmtNum(curSpend)}</td><td style="color:var(--tx2);">${fmtNum(prevSpend)}</td><td style="font-weight:700;${mSpend.cls}">${mSpend.str}</td><td style="${cpqcCls};font-weight:700">${cpqc}</td><td style="color:var(--tx2);">${(cat!=='Khác'&&prevRev>0)?((prevSpend/prevRev)*100).toFixed(1)+'%':'—'}</td><td style="${roasCls(roas)}">${roas}</td></tr>`;
            });

            // HTML BẢNG TỪNG PAGE
            let allPages = Array.from(new Set([...Object.keys(sapCur.pageStats), ...Object.keys(sapPrv.pageStats)]));
            allPages = allPages.filter(pg => !pg.toLowerCase().includes('giày hcm') && !pg.toLowerCase().includes('giay hcm'));
            allPages.sort((a,b) => (sapCur.pageStats[b]?.rev||0) - (sapCur.pageStats[a]?.rev||0));
            let pageRows = '';
            allPages.forEach(pg => {
                let c = sapCur.pageStats[pg] || {rev:0, ban_ra:0, tra:0, spend:0, don:0};
                let pr = sapPrv.pageStats[pg] || {rev:0, ban_ra:0, tra:0, spend:0, don:0};
                
                // Bỏ qua nếu Page/LDP này hoàn toàn không có dữ liệu
                if ((c.rev||0) === 0 && (c.spend||0) === 0 && (pr.rev||0) === 0 && (pr.spend||0) === 0 && (c.tra||0) === 0 && (pr.tra||0) === 0) return;

                let hCur = (c.ban_ra+c.tra)>0 ? (c.tra/(c.ban_ra+c.tra)*100).toFixed(1) : '0.0';
                let hPrv = (pr.ban_ra+pr.tra)>0 ? (pr.tra/(pr.ban_ra+pr.tra)*100).toFixed(1) : '—';
                let roas = c.spend > 0 ? (c.rev/c.spend).toFixed(1) : '—';
                let cpo = (c.spend > 0 && c.don > 0) ? fmtNum(Math.round(c.spend/c.don)) : '—';
                pageRows += `<tr><td style="text-align:left;font-weight:700;color:var(--tx)">${pg}</td><td style="color:var(--tx);font-weight:700;">${fmtNum(c.rev)}</td><td style="color:var(--tx2);font-size:10px;">${fmtNum(pr.rev)}</td><td style="font-weight:700;${momStr(c.rev,pr.rev).cls}">${momStr(c.rev,pr.rev).str}</td><td style="color:var(--tx);">${c.don}</td><td style="${hoanCls(hCur)}">${hCur}%</td><td style="color:var(--tx2);font-size:10px;">${hPrv==='—'?'—':hPrv+'%'}</td><td style="color:var(--gunze);font-weight:600;">${c.spend>0?fmtNum(c.spend):'—'}</td><td style="font-weight:700;${momStr(c.spend,pr.spend).cls}">${c.spend>0?momStr(c.spend,pr.spend).str:'—'}</td><td style="${roasCls(roas)}">${roas}</td><td style="color:var(--warn);">${cpo}</td></tr>`;
            });

            const CHANNEL_GROUP = { 'Page Chính (JPS)': src => src === 'Facebook', 'Livestream': src => src.toLowerCase().includes('livestream') || src.toLowerCase() === 'web live', 'Web': src => src.toLowerCase().includes('web') && src.toLowerCase() !== 'web live' && !src.toLowerCase().includes('ldp'), 'LDP': src => src.toLowerCase().includes('ldp'), 'Zalo': src => src.toLowerCase().includes('zalo'), 'CSL': src => src.toLowerCase() === 'csl', 'Page Phụ': src => src.toLowerCase().includes('page') && !src.toLowerCase().includes('web fanpage') };
            let chStats = {};
            for(const [s, v] of Object.entries(sapCur.srcMap)) {
                let grp = 'Khác';
                if(CHANNEL_GROUP['Page Chính (JPS)'](s)) grp = 'Page Chính (JPS)'; else if(CHANNEL_GROUP['Livestream'](s)) grp = 'Livestream'; else if(CHANNEL_GROUP['Zalo'](s)) grp = 'Zalo'; else if(CHANNEL_GROUP['CSL'](s)) grp = 'CSL'; else if(CHANNEL_GROUP['LDP'](s)) grp = 'LDP'; else if(CHANNEL_GROUP['Web'](s)) grp = 'Web'; else if(CHANNEL_GROUP['Page Phụ'](s)) grp = 'Page Phụ';
                if(!chStats[grp]) chStats[grp] = { rev:0, ban_ra:0, tra:0, spend:0, don:0 };
                chStats[grp].rev += v.rev; chStats[grp].ban_ra += v.ban_ra||0; chStats[grp].tra += v.tra; chStats[grp].don += v.don||0;
            }
            if(sapCur.channelSpends) { for(const [k, v] of Object.entries(sapCur.channelSpends)) { if(!chStats[k]) chStats[k] = { rev:0, ban_ra:0, tra:0, spend:0, don:0 }; chStats[k].spend += v; } }
            let channelRows = ''; let totalChRev = Object.values(chStats).reduce((s,v)=>s+(v.rev||0),0);
            ['Page Phụ','Page Chính (JPS)','Web','LDP','Livestream','Zalo','CSL','Khác'].forEach(grp => {
                if(!chStats[grp]) return; let c = chStats[grp];
                
                // Bỏ qua Kênh nếu hoàn toàn trống
                if ((c.rev||0) === 0 && (c.spend||0) === 0 && (c.ban_ra||0) === 0 && (c.tra||0) === 0) return;

                let pct = totalChRev > 0 ? (c.rev/totalChRev*100).toFixed(1) : 0;
                let roas = c.spend > 0 ? (c.rev/c.spend).toFixed(1) : '—';
                let cpo = (c.spend>0&&c.don>0) ? fmtNum(Math.round(c.spend/c.don)) : '—';
                let hoanPct = (c.ban_ra+c.tra) > 0 ? (c.tra/(c.ban_ra+c.tra)*100).toFixed(1) : '0.0';
                let warningBadge = c.tra > 0 && c.ban_ra > 0 && (c.tra/(c.ban_ra+c.tra)) > 0.4 ? ' <span style="font-size:9px;background:rgba(255,95,126,0.15);color:var(--danger);border-radius:3px;padding:1px 5px">⚠ hoàn cao</span>' : '';
                channelRows += `<tr><td style="text-align:left;font-weight:700;color:var(--tx)">${grp}${warningBadge}</td><td><div style="display:flex;align-items:center;gap:5px;justify-content:flex-end;"><div style="width:50px;background:var(--bdr);height:4px;border-radius:2px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:var(--acc2)"></div></div><span style="font-size:10px;color:var(--acc2);font-weight:700;min-width:28px">${pct}%</span></div></td><td style="color:var(--tx);font-weight:700">${fmtNum(c.rev)}</td><td style="color:var(--tx2)">${c.don||0}</td><td style="${parseFloat(hoanPct)>20?'color:var(--danger);font-weight:700':parseFloat(hoanPct)>12?'color:var(--warn)':'color:var(--acc2)'}">${hoanPct}%</td><td style="color:var(--gunze)">${c.spend>0?fmtNum(c.spend):'—'}</td><td style="${roasCls(roas)}">${roas}</td><td style="color:var(--warn)">${cpo}</td></tr>`;
            });

            let personRawText = '';
            if (p !== 'All') {
                personRawText = `DỮ LIỆU CỦA NHÂN SỰ: ${p}\n`;
                personRawText += `1. TOP 10 BÁN CHẠY:\n${tCur.slice(0,10).map((prod,i)=>`${i+1}. ${prod.name}: ${prod.qty} SP - ${fmtNum(prod.rev)} ₫\n`).join('')}\n`;
                let hoanTxt = '2. TỶ LỆ HOÀN THEO NHÓM SP:\n';
                allCats.forEach(cat => { let c = sapCur.cats[cat]||{ban_ra:0,tra:0}; let tot = (c.ban_ra||0)+(c.tra||0); if(tot) hoanTxt += `- ${cat}: ${(c.tra/tot*100).toFixed(1)}% hoàn (${c.tra||0}/${tot} đơn)\n`; });
                personRawText += hoanTxt;
                let chTxt = '\n3. HIỆU QUẢ KÊNH:\n';
                ['Page Phụ','Page Chính (JPS)','Web','LDP','Livestream','Zalo','CSL','Khác'].forEach(grp => { 
                    if(!chStats[grp]) return; let c = chStats[grp]; 
                    if ((c.rev||0) === 0 && (c.spend||0) === 0 && (c.ban_ra||0) === 0 && (c.tra||0) === 0) return;
                    chTxt += `- ${grp}: DT ${Math.round(c.rev/1e6)}tr | ROAS ${c.spend>0?(c.rev/c.spend).toFixed(1):'—'} | Hoàn ${(c.ban_ra+c.tra)>0?(c.tra/(c.ban_ra+c.tra)*100).toFixed(1)+'%':'—'}\n`; 
                });
                personRawText += chTxt;
                let pageTxt = '\n4. HIỆU QUẢ TỪNG PAGE & LDP CỤ THỂ:\n';
                allPages.slice(0,10).forEach(pg => { let c = sapCur.pageStats[pg]||{rev:0,ban_ra:0,tra:0,spend:0,don:0}; if(c.rev>0||c.spend>0) pageTxt += `- ${pg}: DT ${Math.round(c.rev/1e6)}tr | Chi tiêu ${Math.round(c.spend/1e6)}tr | ROAS ${c.spend>0?(c.rev/c.spend).toFixed(1):'—'} | Hoàn ${(c.ban_ra+c.tra)>0?(c.tra/(c.ban_ra+c.tra)*100).toFixed(1)+'%':'0%'}\n`; });
                personRawText += pageTxt;
            }

            if (p === 'All') {
                let totalNsRev = Object.values(sapCur.nhanSu).reduce((s,v)=>s+v.rev,0);
                NS_ORDER.forEach(ns => {
                    const c  = sapCur.nhanSu[ns]  || { rev:0, ban_ra:0, tra:0, spend:0, data:0, mua:0 };
                    const pr = sapPrv.nhanSu[ns] || { rev:0, ban_ra:0, tra:0, spend:0, data:0, mua:0 };
                    const col = NHAN_SU_CFG[ns]?.color || '#8892b0';
                    if(c.rev === 0 && c.ban_ra === 0 && c.spend === 0) return;
                    let pTotal = totalNsRev > 0 ? ((c.rev/totalNsRev)*100).toFixed(1) : 0;
                    let hCur = (c.ban_ra+c.tra)>0 ? (c.tra/(c.ban_ra+c.tra)*100).toFixed(1) : '0.0';
                    let hPrv = (pr.ban_ra+pr.tra)>0 ? (pr.tra/(pr.ban_ra+pr.tra)*100).toFixed(1) : '—';
                    let roas = c.spend > 0 ? (c.rev/c.spend).toFixed(1) : '—';
                    globalNhanSuRows += `<tr><td style="text-align:left;min-width:90px;"><div style="display:flex;align-items:center;gap:7px;"><div style="width:8px;height:8px;border-radius:50%;background:${col};flex-shrink:0;"></div><strong style="color:var(--tx);font-size:12px;">${ns}</strong></div></td><td><div style="display:flex;align-items:center;gap:5px;justify-content:flex-end;"><div style="width:50px;background:var(--bdr);height:4px;border-radius:2px;overflow:hidden;"><div style="width:${pTotal}%;height:100%;background:${col};"></div></div><span style="font-size:10px;color:${col};font-weight:700;min-width:28px;">${pTotal}%</span></div></td><td style="color:var(--tx);font-weight:700;">${fmtNum(c.rev)}</td><td style="color:var(--tx2);font-size:10px;">${fmtNum(pr.rev)}</td><td style="font-weight:700;${momStr(c.rev,pr.rev).cls}">${momStr(c.rev,pr.rev).str}</td><td style="color:var(--tx);font-weight:600;">${c.ban_ra}</td><td style="color:var(--tx2);font-size:10px;">${pr.ban_ra||'—'}</td><td style="font-weight:700;${momStr(c.ban_ra,pr.ban_ra).cls}">${momStr(c.ban_ra,pr.ban_ra).str}</td><td style="${hoanCls(hCur)}">${hCur}%</td><td style="color:var(--tx2);font-size:10px;">${hPrv==='—'?'—':hPrv+'%'}</td><td style="color:var(--gunze);font-weight:600;">${c.spend>0?fmtNum(c.spend):'—'}</td><td style="color:var(--tx2);font-size:10px;">${pr.spend>0?fmtNum(pr.spend):'—'}</td><td style="font-weight:700;${momStr(c.spend,pr.spend).cls}">${c.spend>0?momStr(c.spend,pr.spend).str:'—'}</td><td style="${roasCls(roas)}">${roas}</td><td style="color:var(--warn);">${(c.spend>0&&c.ban_ra>0)?Math.round(c.spend/c.ban_ra).toLocaleString('vi-VN'):'—'}</td></tr>`;
                });

                globalRawText = `BÁO CÁO CƠ CẤU SẢN PHẨM & NHÂN SỰ\n1. TOP 10 BÁN CHẠY:\n<span id="raw-top-cur">${tCur.slice(0,10).map((prod,i)=>`${i+1}. ${prod.name}: ${prod.qty} SP - ${fmtNum(prod.rev)} ₫ [${sapCur.totalRev>0?((prod.rev/sapCur.totalRev)*100).toFixed(1):0}%]\n`).join('')}</span>\n\n`;
                let hoanRawText = '\n3. TỶ LỆ HOÀN THEO NHÓM SP:\n';
                allCats.forEach(cat => { let c = sapCur.cats[cat]||{ban_ra:0,tra:0}; let tot = (c.ban_ra||0)+(c.tra||0); if(tot) hoanRawText += `- ${cat}: ${(c.tra/tot*100).toFixed(1)}% hoàn (${c.tra||0}/${tot} đơn)\n`; });
                let chRawText = '\n4. HIỆU QUẢ THEO KÊNH:\n';
                ['Page Phụ','Page Chính (JPS)','Web','LDP','Livestream','Zalo','CSL','Khác'].forEach(grp => { 
                    if(!chStats[grp]) return; let c = chStats[grp]; 
                    if ((c.rev||0) === 0 && (c.spend||0) === 0 && (c.ban_ra||0) === 0 && (c.tra||0) === 0) return;
                    chRawText += `- ${grp}: DT ${Math.round(c.rev/1e6)}tr | ROAS ${c.spend>0?(c.rev/c.spend).toFixed(1):'—'} | Hoàn ${(c.ban_ra+c.tra)>0?(c.tra/(c.ban_ra+c.tra)*100).toFixed(1)+'%':'—'}\n`; 
                });
                let pageRawText = '\n5. HIỆU QUẢ TỪNG PAGE & LDP CỤ THỂ:\n';
                allPages.slice(0,10).forEach(pg => { let c = sapCur.pageStats[pg]||{rev:0,ban_ra:0,tra:0,spend:0,don:0}; if(c.rev>0||c.spend>0) pageRawText += `- ${pg}: DT ${Math.round(c.rev/1e6)}tr | Chi tiêu ${Math.round(c.spend/1e6)}tr | ROAS ${c.spend>0?(c.rev/c.spend).toFixed(1):'—'} | Hoàn ${(c.ban_ra+c.tra)>0?(c.tra/(c.ban_ra+c.tra)*100).toFixed(1)+'%':'0%'}\n`; });
                
                globalRawText += hoanRawText + chRawText + pageRawText;
            }

            window.kosuDbCache[p] = { dailyHtml, topCurEncoded, topPrevEncoded, totalRevCur: sapCur.totalRev, totalRevPrev: sapPrv.totalRev, hoanRows, hoanAlert, channelRows, catsRows, pageRows, personRawText, parsedAi: null };
        }

        window.kosuDbCache['All'].personRawText = globalRawText; 

        const sysPrompt = `Bạn là Chuyên gia Phân tích Bán lẻ. Dữ liệu Dashboard:\n${globalRawText}\nHãy phân tích chuyên sâu và ĐÁNH GIÁ RIÊNG TỪNG BẢNG SỐ LIỆU:\n1. "eval_sp": 1-2 nhận xét về cơ cấu Sản phẩm.\n2. "eval_hoan": 1-2 nhận xét về tỷ lệ hoàn trả.\n3. "eval_kenh": 1-2 nhận xét về hiệu quả Kênh.\n4. "eval_page": 1-2 nhận xét về hiệu suất các Fanpage và LDP (ai tốt, ai đốt tiền).\n5. "eval_nhansu": 1-2 nhận xét về Nhân sự.\n6. "ket_luan": Đề xuất hành động chiến lược (2-3 ý).\nTrả về JSON thuần: {"eval_sp":["..."],"eval_hoan":["..."],"eval_kenh":["..."],"eval_page":["..."],"eval_nhansu":["..."],"ket_luan":["..."]}`;
        setStep(2);
        const resAi = await fetchWithRetry(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contents:[{parts:[{text: sysPrompt+extraPrompt}]}], generationConfig:{responseMimeType:"application/json",temperature:0.3} }) });
        const d = await resAi.json(); let rawAi = d.candidates?.[0]?.content?.parts?.[0]?.text || ''; let fi = rawAi.indexOf('{'); let li = rawAi.lastIndexOf('}'); if(fi !== -1 && li !== -1) rawAi = rawAi.substring(fi, li+1);
        const parsedAi = JSON.parse(rawAi); 
        window.kosuDbCache['All'].parsedAi = parsedAi; 

        const renderAiList = (arr) => Array.isArray(arr) ? arr.map(i=>`<li>${i}</li>`).join('') : `<li>${arr||'—'}</li>`;
        globalRawText += `\n6. AI ĐÁNH GIÁ:\n- Sản phẩm: ${parsedAi.eval_sp}\n- Tỷ lệ hoàn: ${parsedAi.eval_hoan}\n- Kênh: ${parsedAi.eval_kenh}\n- Page: ${parsedAi.eval_page}\n- Nhân sự: ${parsedAi.eval_nhansu}\n\n=> KẾT LUẬN CHIẾN LƯỢC: ${parsedAi.ket_luan}`;

        const cAll = window.kosuDbCache['All'];

        // SỬ DỤNG TEMPLATE THAY VÌ STRING HTML
        const tpl = document.getElementById('tpl-kosu-dashboard-layout');
        const clone = tpl.content.cloneNode(true);
        
        // Đổ Option Nhân Sự
        const selectEl = clone.querySelector('#kosu-filter-select');
        NS_ORDER.forEach(ns => {
            const opt = document.createElement('option');
            opt.value = ns;
            opt.textContent = `👤 Chỉ xem: ${ns}`;
            selectEl.appendChild(opt);
        });

        // Bơm dữ liệu thô (Raw Data Text)
        clone.querySelector('#kosu-text-report').innerHTML = globalRawText;

        // Bơm Biểu đồ
        clone.querySelector('#daily-chart-container').innerHTML = cAll.dailyHtml;

        // Bơm thuộc tính cho Top List
        const curList = clone.querySelector('#top-list-cur');
        curList.setAttribute('data-list', cAll.topCurEncoded);
        curList.setAttribute('data-total', cAll.totalRevCur);

        const prevList = clone.querySelector('#top-list-prev');
        prevList.setAttribute('data-list', cAll.topPrevEncoded);
        prevList.setAttribute('data-total', cAll.totalRevPrev);

        // Bơm dữ liệu cho các bảng (Sử dụng innerHTML cho các chuỗi row đã được tạo ra trong vòng lặp)
        clone.querySelector('#hoan-tbody').innerHTML = cAll.hoanRows;
        clone.querySelector('#channel-tbody').innerHTML = cAll.channelRows;
        clone.querySelector('#page-tbody').innerHTML = cAll.pageRows;
        clone.querySelector('#nhansu-tbody').innerHTML = globalNhanSuRows;
        clone.querySelector('#cats-tbody').innerHTML = cAll.catsRows;

        // Cập nhật trạng thái Cảnh báo Hoàn trả
        if(cAll.hoanAlert.length > 0) { 
            const alertBox = clone.querySelector('#hoan-alert-box');
            alertBox.innerHTML = `⚠ Báo động: ${cAll.hoanAlert.join(' · ')}`; 
            alertBox.style.display = 'block'; 
        } else { 
            clone.querySelector('#hoan-ok-box').style.display = 'block'; 
        }

        // Bơm dữ liệu Đánh giá AI
        clone.querySelector('#ai-eval-sp').innerHTML = renderAiList(parsedAi.eval_sp);
        clone.querySelector('#ai-eval-hoan').innerHTML = renderAiList(parsedAi.eval_hoan);
        clone.querySelector('#ai-eval-kenh').innerHTML = renderAiList(parsedAi.eval_kenh);
        clone.querySelector('#ai-eval-page').innerHTML = renderAiList(parsedAi.eval_page);
        clone.querySelector('#ai-eval-nhansu').innerHTML = renderAiList(parsedAi.eval_nhansu);
        clone.querySelector('#ai-eval-ketluan').innerHTML = renderAiList(parsedAi.ket_luan);

        setStep(3);
        const out = document.getElementById('out');
        out.innerHTML = '';
        out.appendChild(clone);
        
        saveHist('Dashboard SP', 'Kosu', document.getElementById('out').innerHTML);
        
        // Kích hoạt sắp xếp mặc định cho danh sách Top 10
        setTimeout(() => {
            const btnCur = document.querySelector('#top-list-cur').parentElement.querySelector('button');
            const btnPrev = document.querySelector('#top-list-prev').parentElement.querySelector('button');
            if(btnCur) changeTopSort(btnCur, 'cur', 'rev');
            if(btnPrev) changeTopSort(btnPrev, 'prev', 'rev');
        }, 50);
      }

    }
    
    document.getElementById('magic-btn').style.display = 'inline-block';
    document.getElementById('forecast-btn').style.display = 'inline-block';
    const chatBox = document.getElementById('ai-chat-box'); if(chatBox) chatBox.style.display = 'flex';

  } catch (e) { document.getElementById('out').innerHTML = `<div class="s-empty"><div class="ico">⚠️</div><p style="color:var(--danger)">Lỗi: ${e.message}</p></div>`; }
  document.getElementById('gbtn').disabled = false;
}

async function getAiInsights() {
  const rptEl = document.getElementById('rpt'); if (!rptEl) return; const url = getApiUrl();
  const magicBtn = document.getElementById('magic-btn'); const originalText = magicBtn.innerHTML; magicBtn.innerHTML = '⏳ Phân tích...'; magicBtn.disabled = true;
  const prompt = `Bạn là Giám đốc Marketing (CMO). Dựa vào báo cáo kinh doanh thực tế dưới đây: 1. Tóm tắt nhanh gọn tình hình. 2. Đưa ra 3-5 đề xuất chiến lược TỐI ƯU NHẤT để cải thiện. Trình bày ngắn gọn, gạch đầu dòng rõ ràng, không dùng các ký hiệu format phức tạp. === DỮ LIỆU ===\n${rptEl.innerText}`;
  try {
    const res = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4 } }) });
    const d = await res.json(); const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Không lấy được phản hồi');
    let insightBox = document.getElementById('ai-insight-box');
    if (!insightBox) { insightBox = document.createElement('div'); insightBox.id = 'ai-insight-box'; insightBox.className = 'pb ai-insight-box'; insightBox.style.borderColor = 'var(--warn)'; rptEl.appendChild(insightBox); }
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--tx)">$1</strong>').replace(/\*/g, '•');
    insightBox.innerHTML = `<div class="phdr" style="background: rgba(255,188,87,0.1); border-bottom: 1px solid rgba(255,188,87,0.3);"><div class="pdot" style="background:var(--warn)"></div><div class="pname" style="color:var(--warn)">✨ AI Cố Vấn: Góc Nhìn & Đề Xuất Chiến Lược</div></div><div class="nblk ai-insight-content" style="white-space: pre-wrap; font-size: 13px; line-height: 1.7; padding: 18px 20px;">${formattedText}</div>`;
    insightBox.scrollIntoView({ behavior: 'smooth', block: 'end' });
    const val = document.getElementById('hist-sel').value; if (val) { const hist = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); hist[val] = document.getElementById('out').innerHTML; localStorage.setItem(STORAGE_KEY, JSON.stringify(hist)); }
  } catch (e) { alert('Lỗi phân tích: ' + e.message); } finally { magicBtn.innerHTML = originalText; magicBtn.disabled = false; }
}

async function forecastFuture() {
  const rptEl = document.getElementById('rpt'); if (!rptEl) return; const url = getApiUrl();
  const btn = document.getElementById('forecast-btn'); const originalText = btn.innerHTML; btn.innerHTML = '⏳ Đang dự báo...'; btn.disabled = true;
  const prompt = `Bạn là Chuyên gia Phân tích Dữ liệu và Dự báo (Forecasting Analyst). Dựa vào dữ liệu kinh doanh của kỳ này dưới đây:
1. Ước tính doanh thu và chi phí cho kỳ tiếp theo (tuần tới/tháng tới) nếu giữ nguyên ngân sách.
2. Nêu ra 2 rủi ro có thể cản trở việc đạt mục tiêu và 1 cơ hội để tăng trưởng đột phá.
Trình bày ngắn gọn, súc tích, dùng gạch đầu dòng và bôi đậm các con số dự báo. KHÔNG dùng định dạng markdown phức tạp.
=== DỮ LIỆU KỲ NÀY ===\n${rptEl.innerText}`;
  try {
    const res = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4 } }) });
    const d = await res.json(); const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Không lấy được phản hồi');
    let box = document.getElementById('ai-forecast-box');
    if (!box) { box = document.createElement('div'); box.id = 'ai-forecast-box'; box.className = 'pb ai-insight-box'; box.style.borderColor = 'var(--fc)'; rptEl.appendChild(box); }
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--tx)">$1</strong>').replace(/\*/g, '•');
    box.innerHTML = `<div class="phdr" style="background: rgba(179,136,255,0.1); border-bottom: 1px solid rgba(179,136,255,0.3);"><div class="pdot" style="background:var(--fc)"></div><div class="pname" style="color:var(--fc)">🔮 AI Dự Báo: Chu kỳ tiếp theo</div></div><div class="nblk ai-insight-content" style="white-space: pre-wrap; font-size: 13px; line-height: 1.7; padding: 18px 20px;">${formattedText}</div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'end' });
    const val = document.getElementById('hist-sel').value; if (val) { const hist = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); hist[val] = document.getElementById('out').innerHTML; localStorage.setItem(STORAGE_KEY, JSON.stringify(hist)); }
  } catch (e) { alert('Lỗi dự báo: ' + e.message); } finally { btn.innerHTML = originalText; btn.disabled = false; }
}

async function analyzeStoreData(btn) {
  const pb = btn.closest('.pb'); const table = pb.querySelector('.stbl'); if (!table) return; const url = getApiUrl();
  const originalText = btn.innerHTML; btn.innerHTML = '⏳ Phân tích...'; btn.disabled = true;
  let dataStr = ""; table.querySelectorAll('tr').forEach(tr => { const rowData = Array.from(tr.querySelectorAll('th, td')).map(td => td.innerText).join(' | '); dataStr += rowData + '\n'; });
  const prompt = `Bạn là Chuyên gia Phân tích Bán lẻ. Dựa vào bảng số liệu sau, hãy: 1. Xác định "Ngôi sao" và giải thích ngắn gọn. 2. Xác định "Báo động đỏ" và bắt bệnh. 3. Gợi ý hành động. Trình bày ngắn gọn, không dùng markdown phức tạp.\n=== DỮ LIỆU ===\n${dataStr}`;
  try {
    const res = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4 } }) });
    const d = await res.json(); const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Không lấy được phản hồi');
    let resultDiv = pb.querySelector('.store-ai-result');
    if (!resultDiv) { resultDiv = document.createElement('div'); resultDiv.className = 'store-ai-result analysis-box'; resultDiv.style.margin = '15px'; resultDiv.style.backgroundColor = 'rgba(56, 224, 176, 0.05)'; resultDiv.style.border = '1px solid rgba(56, 224, 176, 0.3)'; resultDiv.style.borderRadius = '8px'; pb.appendChild(resultDiv); }
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--tx)">$1</strong>').replace(/\*/g, '•');
    resultDiv.innerHTML = `<div class="analysis-title" style="color:var(--acc2); font-size:14px; margin-bottom:8px;">✨ AI Khám Phá: Điểm mù Cửa hàng</div><div class="store-ai-result-content" style="font-size: 12px; line-height: 1.6; white-space: pre-wrap; color:var(--tx);">${formattedText}</div>`;
    const val = document.getElementById('hist-sel').value; if (val) { const hist = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); hist[val] = document.getElementById('out').innerHTML; localStorage.setItem(STORAGE_KEY, JSON.stringify(hist)); }
  } catch (e) { alert('Lỗi chẩn đoán: ' + e.message); } finally { btn.innerHTML = originalText; btn.disabled = false; }
}

async function regenerateEval(btn, projectName) {
  const pb = btn.closest('.pb'); const evalContent = pb.querySelector('.eval-content'); if (!evalContent) return;
  const url = getApiUrl(); const originalText = btn.innerHTML; btn.innerHTML = '⏳ Đang viết lại...'; btn.disabled = true;
  let dataStr = ""; pb.querySelectorAll('.mc').forEach(mc => { let lbl = mc.querySelector('.mlbl')?.textContent.replace('tính', '').trim() || ''; let val = mc.querySelector('.mval')?.textContent.trim() || ''; let extra = mc.querySelector('.mcalc')?.textContent.trim() || ''; if (lbl) dataStr += `- ${lbl}: ${val} ${extra ? '('+extra+')' : ''}\n`; });
  const isMp = projectName.toLowerCase().includes('mỹ phẩm');
  const prompt = `Bạn là Chuyên gia Marketing. Dựa vào các chỉ số kinh doanh thực tế dưới đây, hãy phân tích lại và viết phần đánh giá mới.\n=== SỐ LIỆU ===\n${dataStr}\n=== YÊU CẦU ===\n1. Đưa ra 3-4 gạch đầu dòng nhận xét chuyên sâu. ${isMp ? 'BẮT BUỘC so sánh hiệu quả kênh Web và Page.' : ''}\n2. Đưa ra 1 câu kết luận.\nTrả về JSON thuần: {"danh_gia": ["..."], "ket_luan": "..."}`;
  try {
    const res = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0 } }) });
    const d = await res.json(); if (!d.candidates || !d.candidates[0]) throw new Error("AI từ chối phản hồi.");
    let rawResponse = d.candidates[0].content?.parts?.[0]?.text || ""; let firstIdx = rawResponse.indexOf('{'); let lastIdx = rawResponse.lastIndexOf('}');
    if (firstIdx !== -1 && lastIdx !== -1) rawResponse = rawResponse.substring(firstIdx, lastIdx + 1);
    const parsed = JSON.parse(rawResponse);
    let newEvalHtml = '';
    if (parsed.danh_gia && parsed.danh_gia.length) { newEvalHtml += `<ul class="eval-list">`; parsed.danh_gia.forEach(item => newEvalHtml += `<li>${item}</li>`); newEvalHtml += `</ul>`; }
    if (parsed.ket_luan) { newEvalHtml += `<div><span class="ket-luan-text">Kết luận: </span><span class="ket-luan-text" style="font-weight:normal">${parsed.ket_luan.replace(/^Kết luận:\s*/i, '')}</span></div>`; }
    evalContent.innerHTML = newEvalHtml;
    const val = document.getElementById('hist-sel').value; if (val) { const hist = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); hist[val] = document.getElementById('out').innerHTML; localStorage.setItem(STORAGE_KEY, JSON.stringify(hist)); }
  } catch (e) { alert('Lỗi: ' + e.message); } finally { btn.innerHTML = originalText; btn.disabled = false; }
}

async function regenerateKosuEval(btn) {
  const evalContent = document.getElementById('kosu-eval-content'); if (!evalContent) return;
  const url = getApiUrl(); const originalText = btn.innerHTML; btn.innerHTML = '⏳ Đang viết lại...'; btn.disabled = true;

  const rptClone = document.getElementById('kosu-text-report').cloneNode(true);
  const evalNode = rptClone.querySelector('#kosu-eval-container');
  if(evalNode) evalNode.remove();
  rptClone.querySelectorAll('button').forEach(b => b.remove());
  const dataStr = rptClone.innerText;

  const prompt = `Bạn là Chuyên gia Marketing Dự án Giày Kosu. Dựa vào các chỉ số kinh doanh thực tế dưới đây, hãy phân tích lại và viết phần đánh giá mới.\n=== SỐ LIỆU ===\n${dataStr}\n=== YÊU CẦU ===\n1. Đưa ra 3-4 gạch đầu dòng nhận xét chuyên sâu về doanh thu, chi phí, và các phễu chuyển đổi (Page chính, Page phụ, LDP).\n2. Đưa ra 1 câu kết luận định hướng ngắn gọn.\nTrả về JSON thuần tuân thủ định dạng: {"danh_gia": ["Nhận xét 1", "Nhận xét 2"], "ket_luan": "..."}`;
  try {
    const res = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0 } }) });
    const d = await res.json(); if (!d.candidates || !d.candidates[0]) throw new Error("AI từ chối phản hồi.");
    let rawResponse = d.candidates[0].content?.parts?.[0]?.text || ""; let firstIdx = rawResponse.indexOf('{'); let lastIdx = rawResponse.lastIndexOf('}');
    if (firstIdx !== -1 && lastIdx !== -1) rawResponse = rawResponse.substring(firstIdx, lastIdx + 1);
    const parsed = JSON.parse(rawResponse);
    
    let newEvalHtml = `Đánh giá:\n`;
    if (parsed.danh_gia) {
         if(Array.isArray(parsed.danh_gia)) newEvalHtml += parsed.danh_gia.map(item => '- ' + item).join('\n');
         else newEvalHtml += '- ' + parsed.danh_gia;
    }
    newEvalHtml += `\n\nKết luận:\n=> ${parsed.ket_luan || '—'}`;

    evalContent.innerText = newEvalHtml; 
    const val = document.getElementById('hist-sel').value; if (val) { const hist = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); hist[val] = document.getElementById('out').innerHTML; localStorage.setItem(STORAGE_KEY, JSON.stringify(hist)); }
  } catch (e) { alert('Lỗi: ' + e.message); } finally { btn.innerHTML = originalText; btn.disabled = false; }
}

async function doCopy() {
  const el = document.getElementById('rpt'); if (!el) return; const lines = [];
  el.querySelectorAll('.rweek,.rtitle').forEach(e => lines.push(e.textContent.trim())); lines.push('');
  el.querySelectorAll('.pb').forEach(b => {
    lines.push('=== ' + (b.querySelector('.pname')?.textContent || '').toUpperCase() + ' ===');
    b.querySelectorAll('.mc').forEach(c => { const l = c.querySelector('.mlbl')?.textContent?.replace('tính', '').trim() || ''; const v = c.querySelector('.mval')?.textContent || ''; const ex = c.querySelector('.mcalc')?.textContent || ''; if (l && v.trim()) lines.push(`- ${l}: ${v.trim()} ${ex ? '('+ex+')' : ''}`); });
    b.querySelectorAll('.nblk').forEach(n => lines.push(n.textContent.trim().replace(/\s+/g, ' ')));
    if(b.classList.contains('ai-insight-box')) { const aiContent = b.querySelector('.ai-insight-content'); if (aiContent) lines.push(aiContent.textContent.trim()); }
    b.querySelectorAll('.khm-item').forEach(k => { lines.push('- ' + k.textContent.trim().replace(/\s+/g, ' ')); });
    const evalTitle = b.querySelector('.analysis-title');
    if (evalTitle && !b.classList.contains('store-ai-result')) { lines.push('\nĐánh giá:'); b.querySelectorAll('.eval-list li').forEach(li => lines.push(`- ${li.textContent.trim()}`)); const conc = b.querySelector('.ket-luan-text'); if (conc) lines.push(`\nKết luận: ${conc.parentNode.textContent.replace(/^Kết luận:\s*/i, '').trim()}`); }
    b.querySelectorAll('.stbl tr').forEach(r => { const cs = Array.from(r.querySelectorAll('th,td')).map(c => c.textContent.trim()); if (cs.some(c => c)) lines.push(cs.join(' | ')); });
    const storeAi = b.querySelector('.store-ai-result-content'); if (storeAi) { lines.push('\n✨ CHẨN ĐOÁN CỬA HÀNG (AI):'); lines.push(storeAi.textContent.trim()); }
    lines.push('');
  });
  
  const textToCopy = lines.join('\n'); 
  const b = document.getElementById('cbtn'); 
  
  const copySuccess = () => {
      b.textContent = '✓ Đã sao chép'; 
      b.classList.add('ok'); 
      setTimeout(() => { b.innerHTML = '⎘ Sao chép Báo cáo'; b.classList.remove('ok'); }, 2200);
  };

  try {
      // Sử dụng Clipboard API hiện đại
      await navigator.clipboard.writeText(textToCopy);
      copySuccess();
  } catch (err) {
      // Fallback về cách cũ nếu Clipboard API bị chặn
      const textArea = document.createElement("textarea"); 
      textArea.value = textToCopy; 
      textArea.style.position = "fixed"; 
      textArea.style.left = "-999999px"; 
      textArea.style.top = "-999999px"; 
      document.body.appendChild(textArea); 
      textArea.focus(); 
      textArea.select();
      try { 
          document.execCommand('copy'); 
          copySuccess();
      } catch (fallbackErr) { 
          alert('Trình duyệt chặn sao chép tự động. Bôi đen văn bản để copy thủ công.'); 
      } 
      document.body.removeChild(textArea);
  }
}

async function exportImage() {
  const rptEl = document.getElementById('rpt'); if (!rptEl) return;
  const btn = document.getElementById('img-btn'); 
  const ogText = btn.innerHTML; 
  btn.innerHTML = '⏳ Đang ghép ảnh...'; 
  btn.disabled = true;
  
  try { 
    // Ép trình duyệt nhả full chiều cao để không bị cắt xén cụt lủn
    const ogHeight = rptEl.style.height;
    const ogOverflow = rptEl.style.overflow;
    rptEl.style.height = 'auto';
    rptEl.style.overflow = 'visible';

    const canvas = await html2canvas(rptEl, { 
      backgroundColor: '#0f1117', 
      scale: 2, // Độ phân giải x2 cho nét
      useCORS: true,
      windowWidth: rptEl.scrollWidth,
      windowHeight: rptEl.scrollHeight,
      scrollY: -window.scrollY // Trị triệt để bệnh khoảng đen do kéo chuột
    }); 
    
    // Trả lại form cũ
    rptEl.style.height = ogHeight;
    rptEl.style.overflow = ogOverflow;

    const link = document.createElement('a'); 
    link.download = `Bao_Cao_${new Date().toISOString().slice(0,10)}.png`; 
    link.href = canvas.toDataURL('image/png'); 
    link.click(); 
    
    btn.innerHTML = '✓ Đã tải Ảnh'; btn.classList.add('ok'); 
    setTimeout(() => { btn.innerHTML = ogText; btn.classList.remove('ok'); }, 2000); 
  } 
  catch(e) { alert('Lỗi tải ảnh: ' + e); btn.innerHTML = ogText; } 
  finally { btn.disabled = false; }
}

function exportPDF() {
  const rptEl = document.getElementById('rpt'); if (!rptEl) return;
  const btn = document.getElementById('pdf-btn'); 
  const ogText = btn.innerHTML; 
  btn.innerHTML = '⏳ Đang dàn trang...'; 
  btn.disabled = true;
  
  // 1. Lưu lại trạng thái của khối chứa báo cáo gốc
  const ogHeight = rptEl.style.height;
  const ogOverflow = rptEl.style.overflow;
  rptEl.style.height = 'auto';
  rptEl.style.overflow = 'visible';

  // 2. ÉP BUỘC CÁC KHỐI BÊN TRONG KHÔNG ĐƯỢC CẮT NGANG VÀ BỎ OVERFLOW: HIDDEN
  // Chọn tất cả các khối lớn và các dòng trong bảng (tr)
  const blocksToProtect = rptEl.querySelectorAll('.pb, .iblock, .analysis-box, .stbl tr, .nblk');
  const originalStyles = [];
  
  blocksToProtect.forEach(el => {
    // Ghi nhớ lại style cũ để lát nữa trả về
    originalStyles.push({
      overflow: el.style.overflow,
      pageBreakInside: el.style.pageBreakInside,
      breakInside: el.style.breakInside
    });
    
    // Ghi đè style tạm thời để xuất PDF
    el.style.overflow = 'visible'; 
    el.style.pageBreakInside = 'avoid';
    el.style.breakInside = 'avoid';
  });

  const opt = { 
    margin: [15, 10, 15, 10], // Lề: Trên, Phải, Dưới, Trái (mm)
    filename: `Bao_Cao_${new Date().toISOString().slice(0,10)}.pdf`, 
    image: { type: 'jpeg', quality: 1 }, 
    html2canvas: { 
        scale: 2, 
        backgroundColor: '#0f1117', 
        useCORS: true, 
        scrollY: 0,
        windowWidth: rptEl.scrollWidth
    }, 
    jsPDF: { 
        unit: 'mm', 
        format: 'a3', // Giữ A3 cho rộng rãi
        orientation: 'portrait' 
    },
    // Chế độ né cắt ngang siêu mạnh của html2pdf
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } 
  };
  
  html2pdf().set(opt).from(rptEl).save()
    .then(() => { 
      // 3. XUẤT XONG THÌ TRẢ LẠI GIAO DIỆN NHƯ CŨ
      rptEl.style.height = ogHeight;
      rptEl.style.overflow = ogOverflow;
      
      blocksToProtect.forEach((el, index) => {
        el.style.overflow = originalStyles[index].overflow;
        el.style.pageBreakInside = originalStyles[index].pageBreakInside;
        el.style.breakInside = originalStyles[index].breakInside;
      });

      btn.innerHTML = '✓ Đã tải PDF'; btn.classList.add('ok'); 
      setTimeout(() => { btn.innerHTML = ogText; btn.classList.remove('ok'); }, 2000); 
      btn.disabled = false; 
    })
    .catch(err => { 
      // Gặp lỗi cũng phải trả lại giao diện như cũ
      rptEl.style.height = ogHeight;
      rptEl.style.overflow = ogOverflow;
      blocksToProtect.forEach((el, index) => {
        el.style.overflow = originalStyles[index].overflow;
      });

      alert('Lỗi tải PDF: ' + err); 
      btn.innerHTML = ogText; 
      btn.disabled = false; 
    });
}

let chatContext = [];

function resetChat() {
  chatContext = [];
  const chatHist = document.getElementById('chat-hist');
  if(chatHist) {
    chatHist.innerHTML = `<div class="msg ai" style="background: var(--sur2); border: 1px solid var(--bdr); color: var(--tx2); padding: 8px 12px; border-radius: 8px; align-self: flex-start; max-width: 85%;">Chào sếp! Tôi là Trợ lý Dữ liệu cấp cao. Tôi đã đọc xong báo cáo này, sếp cần phân tích hay bóc tách số liệu nào cứ bảo tôi nhé!</div>`;
  }
}

async function sendChat() {
  const inputEl = document.getElementById('chat-input');
  const btnEl = inputEl.nextElementSibling;
  const text = inputEl.value.trim();
  if (!text) return;

  const rptEl = document.getElementById('rpt');
  if (!rptEl) { alert("Vui lòng tạo báo cáo trước khi chat!"); return; }

  inputEl.disabled = true;
  btnEl.disabled = true;

  const chatHist = document.getElementById('chat-hist');
  chatHist.innerHTML += `<div style="background: rgba(79, 124, 255, 0.1); border: 1px solid rgba(79, 124, 255, 0.3); color: var(--tx); padding: 8px 12px; border-radius: 8px; align-self: flex-end; max-width: 85%; line-height: 1.5;">${text}</div>`;
  inputEl.value = '';
  chatHist.scrollTop = chatHist.scrollHeight;

  const aiWaitId = 'ai-wait-' + Date.now();
  chatHist.innerHTML += `<div id="${aiWaitId}" style="background: var(--sur2); border: 1px solid var(--bdr); color: var(--tx2); padding: 8px 12px; border-radius: 8px; align-self: flex-start; max-width: 85%;">⏳ Đang suy nghĩ và phân tích...</div>`;
  chatHist.scrollTop = chatHist.scrollHeight;

  const rawSaleG = document.getElementById('sg') ? document.getElementById('sg').value.trim() : '';
  const rawSaleM = document.getElementById('sm') ? document.getElementById('sm').value.trim() : '';
  const rawSaleK = document.getElementById('sk') ? document.getElementById('sk').value.trim() : '';
  const rawExcel = typeof excelTextData !== 'undefined' ? excelTextData : '';

  if (chatContext.length === 0) {
    chatContext.push({
      role: "user",
      parts: [{ text: `Bạn là Chuyên gia Phân tích Dữ liệu Cấp cao. Hãy trả lời câu hỏi dựa trên Báo Cáo Kinh Doanh dưới đây.

=== BẢNG BÁO CÁO ĐÃ TỔNG HỢP ===
${rptEl.innerText}

=== DỮ LIỆU GỐC (ĐỂ ĐỐI CHIẾU NẾU CẦN) ===
Sale Gunze: ${rawSaleG}
Sale Mỹ Phẩm: ${rawSaleM}
Sale Kosu: ${rawSaleK}
Excel Ads: ${rawExcel}

LƯU Ý DÀNH CHO BẠN: 
- Nếu sếp bảo "Số liệu sai", hãy lập tức rà soát lại phần "DỮ LIỆU GỐC" xem có chênh lệch so với BẢNG BÁO CÁO không.
- Nếu tìm thấy lỗi, hãy xin lỗi, báo số ĐÚNG từ dữ liệu gốc và tự động tính toán lại.
- Trình bày chuyên nghiệp, dùng in đậm (**text**) hoặc gạch đầu dòng (*) để trình bày mạch lạc.

=== CÂU HỎI CỦA SẾP ===
${text}` }]
    });
  } else {
    chatContext.push({ role: "user", parts: [{ text: text }] });
  }

  try {
    const res = await fetchWithRetry(getApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: chatContext, generationConfig: { temperature: 0.4 } })
    });
    
    const d = await res.json();
    if (!res.ok) throw new Error(d.error?.message || `Lỗi HTTP ${res.status} không xác định`);
    
    const reply = d.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error("AI trả về kết quả rỗng (Có thể do lỗi kiểm duyệt nội dung).");
    
    chatContext.push({ role: "model", parts: [{ text: reply }] });

    let formattedReply = reply.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--tx)">$1</strong>')
                              .replace(/\*/g, '•')
                              .replace(/\n/g, '<br>');

    document.getElementById(aiWaitId).outerHTML = `<div style="background: var(--sur2); border: 1px solid var(--bdr); color: var(--tx2); padding: 8px 12px; border-radius: 8px; align-self: flex-start; max-width: 85%; line-height: 1.6;">${formattedReply}</div>`;
    chatHist.scrollTop = chatHist.scrollHeight;
    
  } catch (e) {
    chatContext.pop(); 
    document.getElementById(aiWaitId).outerHTML = `<div style="background: rgba(255, 95, 126, 0.1); border: 1px solid var(--danger); color: var(--danger); padding: 8px 12px; border-radius: 8px; align-self: flex-start;">⚠️ Lỗi API: ${e.message}</div>`;
  } finally {
    inputEl.disabled = false;
    btnEl.disabled = false;
    inputEl.focus();
  }
}

function changeTopSort(btn, type, sortKey) {
    const container = btn.closest('.top-box');
    
    container.querySelectorAll('button').forEach(b => {
        b.style.borderColor = 'var(--tx3)';
        b.style.background = 'transparent';
        b.style.color = type === 'cur' ? 'var(--tx2)' : 'var(--tx3)';
    });
    
    btn.style.borderColor = type === 'cur' ? 'var(--acc2)' : 'var(--tx2)';
    btn.style.background = type === 'cur' ? 'rgba(56,224,176,0.1)' : 'rgba(136,146,176,0.1)';
    btn.style.color = type === 'cur' ? 'var(--acc2)' : 'var(--tx2)';
    
    const listContainer = container.querySelector('.top-list');
    const list = JSON.parse(decodeURIComponent(listContainer.getAttribute('data-list')));
    const totalRev = parseFloat(listContainer.getAttribute('data-total'));
    
    list.sort((a, b) => b[sortKey] - a[sortKey]);
    const top10 = list.slice(0, 10);
    
    listContainer.innerHTML = top10.map((p, index) => {
        let pct = totalRev > 0 ? ((p.rev / totalRev) * 100).toFixed(1) : 0;
        let rankBadge = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `<span style="display:inline-block;width:18px;text-align:center;color:var(--tx3);font-weight:bold;font-size:11px;">${index+1}</span>`;
        let colorAcc = type === 'cur' ? 'var(--acc2)' : 'var(--tx2)';
        let colorBar = type === 'cur' ? 'var(--acc2)' : 'var(--tx3)';
        let colorTitle = type === 'cur' ? 'var(--tx)' : 'var(--tx2)';
        let opacityRank = type === 'cur' ? '1' : '0.7';

        return `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:rgba(255,255,255,0.015); border:1px solid rgba(255,255,255,0.05); border-radius:6px;">
            <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                <div style="font-size:14px; flex-shrink:0; opacity:${opacityRank};">${rankBadge}</div>
                <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:${type === 'cur' ? '600' : '500'}; color:${colorTitle}; font-size:11px;" title="${p.name}">${p.name}</div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; flex-shrink:0; margin-left:10px;">
                <div style="color:${colorAcc}; font-weight:700; font-size:12px;">${Math.round(p.rev).toLocaleString('vi-VN')} ₫</div>
                <div style="display:flex; align-items:center; gap:6px; margin-top:3px;">
                    <span style="color:${type === 'cur' ? 'var(--tx2)' : 'var(--tx3)'}; font-size:10px;">${p.qty} SP</span>
                    <div style="width:40px; background:var(--bdr); height:3px; border-radius:2px; overflow:hidden;"><div style="width:${pct}%; height:100%; background:${colorBar};"></div></div>
                    <span style="color:var(--tx3); font-size:9px; font-weight:600;">${pct}%</span>
                </div>
            </div>
        </div>`;
    }).join('');
    
    const rawUl = document.getElementById(`raw-top-${type}`);
    if(rawUl) {
        rawUl.innerText = top10.map((p, i) => {
            let pct = totalRev > 0 ? ((p.rev / totalRev) * 100).toFixed(1) : 0;
            return `${i+1}. ${p.name}: ${p.qty} SP - ${Math.round(p.rev).toLocaleString('vi-VN')} ₫ [${pct}% DT]`;
        }).join('\n') + '\n';
    }
}

async function applyKosuFilter(person) {
    if (!window.kosuDbCache || !window.kosuDbCache[person]) return;
    
    window.currentViewPerson = person;
    const data = window.kosuDbCache[person];

    document.getElementById('daily-chart-container').innerHTML = data.dailyHtml;

    const curList = document.getElementById('top-list-cur');
    if(curList) {
        curList.setAttribute('data-list', data.topCurEncoded);
        curList.setAttribute('data-total', data.totalRevCur);
        changeTopSort(curList.parentElement.querySelector('button'), 'cur', 'rev');
    }
    const prevList = document.getElementById('top-list-prev');
    if(prevList) {
        prevList.setAttribute('data-list', data.topPrevEncoded);
        prevList.setAttribute('data-total', data.totalRevPrev);
        changeTopSort(prevList.parentElement.querySelector('button'), 'prev', 'rev');
    }

    document.getElementById('hoan-tbody').innerHTML = data.hoanRows;
    document.getElementById('channel-tbody').innerHTML = data.channelRows;
    document.getElementById('page-tbody').innerHTML = data.pageRows;
    document.getElementById('cats-tbody').innerHTML = data.catsRows;

    const alertBox = document.getElementById('hoan-alert-box');
    const okBox = document.getElementById('hoan-ok-box');
    if(alertBox && okBox) {
        if(data.hoanAlert.length > 0) { alertBox.innerHTML = `⚠ Báo động: ${data.hoanAlert.join(' · ')}`; alertBox.style.display = 'block'; okBox.style.display = 'none'; } 
        else { alertBox.style.display = 'none'; okBox.style.display = 'block'; }
    }

    const renderAiList = (arr) => Array.isArray(arr) ? arr.map(i=>`<li>${i}</li>`).join('') : `<li>${arr||'—'}</li>`;
    
    if (data.parsedAi) {
        document.getElementById('ai-eval-hoan').innerHTML = renderAiList(data.parsedAi.eval_hoan);
        document.getElementById('ai-eval-kenh').innerHTML = renderAiList(data.parsedAi.eval_kenh);
        document.getElementById('ai-eval-page').innerHTML = renderAiList(data.parsedAi.eval_page);
        document.getElementById('ai-eval-sp').innerHTML = renderAiList(data.parsedAi.eval_sp);
        document.getElementById('ai-eval-ketluan').innerHTML = renderAiList(data.parsedAi.ket_luan);
        document.getElementById('ai-eval-nhansu').innerHTML = renderAiList(data.parsedAi.eval_nhansu);
    } else {
        const loadingHtml = '<li><span style="color:var(--warn); font-weight:600;">⏳ AI đang tự động phân tích dữ liệu chuyên sâu cho nhân sự này...</span></li>';
        document.getElementById('ai-eval-hoan').innerHTML = loadingHtml;
        document.getElementById('ai-eval-kenh').innerHTML = loadingHtml;
        document.getElementById('ai-eval-page').innerHTML = loadingHtml;
        document.getElementById('ai-eval-sp').innerHTML = loadingHtml;
        document.getElementById('ai-eval-ketluan').innerHTML = loadingHtml;
        document.getElementById('ai-eval-nhansu').innerHTML = '<li><span style="color:var(--tx3)">*Không áp dụng đánh giá trong chế độ xem cá nhân.</span></li>';

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${localStorage.getItem('gemini_api_key') || document.getElementById('api-key-input').value.trim()}`;
            const customNote = document.getElementById('ai-custom-note') ? document.getElementById('ai-custom-note').value.trim() : '';
            const extraPrompt = (customNote ? `\n\n=== LƯU Ý ĐẶC BIỆT TỪ NGƯỜI DÙNG ===\n${customNote}` : '') + getAiPersonaPrompt();
            
            const sysPrompt = `Bạn là Chuyên gia Phân tích Marketing. Hãy phân tích bảng số liệu dành RIÊNG cho nhân sự [${person}]:\n${data.personRawText}\n\nYÊU CẦU ĐÁNH GIÁ SÁT SAO CHO CÁ NHÂN NÀY:\n1. "eval_sp": 1-2 nhận xét điểm sáng/tối trong cơ cấu Sản phẩm của họ.\n2. "eval_hoan": 1-2 nhận xét thực trạng hoàn trả.\n3. "eval_kenh": 1-2 nhận xét hiệu quả Kênh chạy Ads.\n4. "eval_page": 1-2 nhận xét hiệu suất các Fanpage và LDP mà họ quản lý (ai tốt, ai đốt tiền).\n5. "ket_luan": Đề xuất hành động chiến lược để nhân sự này cải thiện KPI (2-3 gạch đầu dòng).\nTrả về JSON thuần: {"eval_sp":["..."],"eval_hoan":["..."],"eval_kenh":["..."],"eval_page":["..."],"ket_luan":["..."]}`;
            
            // SỬ DỤNG fetchWithRetry ĐỂ TỰ ĐỘNG CHỜ NẾU API BỊ QUÁ TẢI
            const resAi = await fetchWithRetry(url, { 
                method:'POST', 
                headers:{'Content-Type':'application/json'}, 
                body: JSON.stringify({ 
                    contents:[{parts:[{text: sysPrompt+extraPrompt}]}], 
                    generationConfig:{responseMimeType:"application/json",temperature:0.3} 
                }) 
            }, 3);
            
            const d = await resAi.json();
            let rawAi = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
            let fi = rawAi.indexOf('{'); let li = rawAi.lastIndexOf('}'); if(fi !== -1 && li !== -1) rawAi = rawAi.substring(fi, li+1);
            const parsedAi = JSON.parse(rawAi);
            
            parsedAi.eval_nhansu = ["*Tính năng chỉ hoạt động ở chế độ Xem Tất Cả (So sánh chéo hiệu suất)."];
            data.parsedAi = parsedAi;
            
            if (window.currentViewPerson === person) {
                document.getElementById('ai-eval-hoan').innerHTML = renderAiList(parsedAi.eval_hoan);
                document.getElementById('ai-eval-kenh').innerHTML = renderAiList(parsedAi.eval_kenh);
                document.getElementById('ai-eval-page').innerHTML = renderAiList(parsedAi.eval_page);
                document.getElementById('ai-eval-sp').innerHTML = renderAiList(parsedAi.eval_sp);
                document.getElementById('ai-eval-ketluan').innerHTML = renderAiList(parsedAi.ket_luan);
                document.getElementById('ai-eval-nhansu').innerHTML = renderAiList(parsedAi.eval_nhansu);
            }
        } catch(e) {
            if (window.currentViewPerson === person) {
                const errHtml = `<li><span style="color:var(--danger)">❌ Trợ lý AI đang bận hoặc quá tải: ${e.message}</span></li>`;
                document.getElementById('ai-eval-hoan').innerHTML = errHtml;
                document.getElementById('ai-eval-kenh').innerHTML = errHtml;
                document.getElementById('ai-eval-page').innerHTML = errHtml;
                document.getElementById('ai-eval-sp').innerHTML = errHtml;
                document.getElementById('ai-eval-ketluan').innerHTML = errHtml;
            }
        }
    }
}

function openAiSettings() {
  document.getElementById('ai-tone').value = localStorage.getItem('ai_tone') || "default";
  document.getElementById('ai-focus').value = localStorage.getItem('ai_focus') || "default";
  document.getElementById('ai-setting-modal').style.display = 'flex';
}

function saveAiSettings() {
  localStorage.setItem('ai_tone', document.getElementById('ai-tone').value);
  localStorage.setItem('ai_focus', document.getElementById('ai-focus').value);
  document.getElementById('ai-setting-modal').style.display = 'none';
  
  // Kiểm tra xem sếp lưu chế độ gì để báo ra màn hình cho ngầu
  if (document.getElementById('ai-tone').value === "default" && document.getElementById('ai-focus').value === "default") {
    alert('Đã khôi phục AI về chế độ Mặc định nguyên thủy!');
  } else {
    alert('Đã lưu khẩu vị AI! Các báo cáo tạo ra từ bây giờ sẽ theo phong cách của sếp.');
  }
}

// Hàm tiêm prompt rất thông minh: Chỉ chèn khi sếp chọn khác "default"
function getAiPersonaPrompt() {
  const tone = localStorage.getItem('ai_tone') || "default";
  const focus = localStorage.getItem('ai_focus') || "default";

  // Nếu cả 2 là mặc định -> Trả về chuỗi rỗng (Không ép AI phải đổi giọng)
  if (tone === "default" && focus === "default") {
    return ""; 
  }

  // Nếu có can thiệp thì mới ghép chuỗi
  let prompt = `\n\n[CHỈ THỊ ĐẶC BIỆT TỪ SẾP VỀ VĂN PHONG VÀ GÓC NHÌN]:\n`;
  if (tone !== "default") prompt += `- Giọng điệu của bạn: ${tone}\n`;
  if (focus !== "default") prompt += `- Trọng tâm bạn cần chú ý: ${focus}\n`;
  
  return prompt;
}
  
// ─── FILE HANDLES cho Dashboard Main ───
let mainDbFiles = { sapo_cur: null, sapo_prev: null, ads_cur: null, ads_prev: null };
window.currentMainViewFilter = 'All';

function handleMainDbFile(files, key) {
  if (!files || files.length === 0) return;
  mainDbFiles[key] = files[0];
  const el = document.getElementById('prev_main_' + key);
  if (el) el.innerHTML = `<div style="font-size:10px;color:var(--acc2);margin-top:5px;font-weight:600;">✓ ${files[0].name}</div>`;
}

// ─── PARSE SAPO CHO MAIN (Gộp chung 1 file) ───
function processMainSapo(dataArr, filterProject) {
  let res = {
    topSp: {}, totalRev: 0,
    projectRev: { Gunze: 0, MP: 0 },
    projectBanRa: { Gunze: 0, MP: 0 },
    projectTra: { Gunze: 0, MP: 0 },
    projectSpend: { Gunze: 0, MP: 0 },
    brandStats: {}, catTypeStats: {},
    dailyMap: { Gunze: {}, MP: {} },
    srcMap: { Gunze: {}, MP: {} },
    hoanByCat: {},
    regionRev: { HN: { Gunze: 0, MP: 0 }, HCM: { Gunze: 0, MP: 0 }, Other: { Gunze: 0, MP: 0 } }
  };
  if (!dataArr || !dataArr.length) return res;

  let hd = dataArr[0].map(h => (h||'').normalize('NFC').toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g,'').trim());
  let nameIdx   = hd.findIndex(h => h.includes('tên sản phẩm'));
  let revIdx    = hd.findIndex(h => h.includes('doanh thu thuần') || h === 'doanh thu');
  let qtyIdx    = hd.findIndex(h => h.includes('hàng thực bán') || h.includes('số lượng'));
  let banRaIdx  = hd.findIndex(h => h.includes('hàng bán ra'));
  let traIdx    = hd.findIndex(h => h.includes('hàng trả lại'));
  let srcIdx    = hd.findIndex(h => h.includes('nguồn'));
  let dateIdx   = hd.findIndex(h => h === 'ngày' || h.includes('ngày'));
  let brandIdx  = hd.findIndex(h => h.includes('nhãn hiệu') || h.includes('thuong hieu') || h.includes('thương hiệu'));
  let catTypeIdx= hd.findIndex(h => h.includes('loại sản phẩm') || h.includes('nhóm sản phẩm') || h.includes('nhóm'));
  let cityIdx   = hd.findIndex(h => h.includes('tỉnh/thành phố') || h.includes('tỉnh') || h.includes('thành phố'));

  if (nameIdx === -1 || revIdx === -1) return res;

  const classifyProject = (name, brand, catType) => {
    const cCat = (catType || '').toLowerCase();
    // 1. Ưu tiên tuyệt đối cột Loại sản phẩm trong file Sapo
    if (cCat.startsWith('mp') || cCat.includes('mỹ phẩm') || cCat.includes('my pham')) return 'MP';
    if (cCat.startsWith('tt ') || cCat.includes('gunze')) return 'Gunze';

    // 2. Dự phòng: Quét từ khóa trong Tên SP và Nhãn hiệu
    const combined = ((name || '') + ' ' + (brand || '') + ' ' + cCat).toLowerCase();
    if (combined.match(/kem|serum|toner|lotion|mask|mặt nạ|dưỡng|làm trắng|chống nắng|lip|son|phấn|mascara|eyeliner|foundation|bb|cc|essence|mỹ phẩm|skincare|haircare|dầu gội|sữa tắm|dưỡng thể|my pham|kose|kanebo|elixir|cezanne|ahalo|tẩy trang|rửa mặt|xịt khoáng|dầu xả|nhuộm|kẻ mắt|lông mày/)) return 'MP';
    if (combined.match(/gunze|quần|áo|lót|undershirt|underwear|vớ|tất|boxer|brief|bra|áo thun|áo ba lỗ/)) return 'Gunze';
    
    return 'Gunze'; // Mặc định đẩy về Gunze
  };

  for (let i = 1; i < dataArr.length; i++) {
    let row = dataArr[i];
    if (!row || !row[nameIdx]) continue;

    let name    = (row[nameIdx] || '').trim();
    let rev     = parseAnyNum(row[revIdx]);
    let qty     = qtyIdx    !== -1 ? parseAnyNum(row[qtyIdx])    : 1;
    let banRa   = banRaIdx  !== -1 ? parseAnyNum(row[banRaIdx])  : Math.abs(qty);
    let tra     = traIdx    !== -1 ? parseAnyNum(row[traIdx])    : 0;
    let src     = srcIdx    !== -1 ? (row[srcIdx]  || '').trim() : '';
    let dt      = dateIdx   !== -1 ? (row[dateIdx] || '').trim() : '';
    let brand   = brandIdx  !== -1 ? (row[brandIdx]|| '').trim() : '';
    let catType = catTypeIdx!== -1 ? (row[catTypeIdx]||'').trim(): '';
    let city    = cityIdx   !== -1 ? (row[cityIdx] || '').trim().toLowerCase() : '';

    if (!name || (rev === 0 && qty === 0 && banRa === 0)) continue;

    let project = classifyProject(name, brand, catType);
    if (filterProject !== 'All' && project !== filterProject) continue;

    res.totalRev += rev;
    res.projectRev[project]    = (res.projectRev[project] || 0) + rev;
    res.projectBanRa[project]  = (res.projectBanRa[project] || 0) + (banRa || 0);
    res.projectTra[project]    = (res.projectTra[project] || 0) + tra;

    if (!res.topSp[name]) res.topSp[name] = { qty: 0, rev: 0, project };
    res.topSp[name].qty += qty;
    res.topSp[name].rev += rev;

    if (brand) {
      if (!res.brandStats[brand]) res.brandStats[brand] = { rev: 0, qty: 0, ban_ra: 0, tra: 0, project };
      res.brandStats[brand].rev += rev;
      res.brandStats[brand].qty += qty;
      res.brandStats[brand].ban_ra += banRa || 0;
      res.brandStats[brand].tra += tra;
    }

    if (catType) {
      if (!res.catTypeStats[catType]) res.catTypeStats[catType] = { rev: 0, qty: 0, project };
      res.catTypeStats[catType].rev += rev;
      res.catTypeStats[catType].qty += qty;
    }

    if (dt) res.dailyMap[project][dt] = (res.dailyMap[project][dt] || 0) + rev;

    if (!res.srcMap[project][src]) res.srcMap[project][src] = { rev: 0, ban_ra: 0, tra: 0, don: 0 };
    res.srcMap[project][src].rev    += rev;
    res.srcMap[project][src].ban_ra += banRa || 0;
    res.srcMap[project][src].tra    += tra;
    res.srcMap[project][src].don    += 1;

    let hoanKey = (catType || 'Khác') + '|' + project;
    if (!res.hoanByCat[hoanKey]) res.hoanByCat[hoanKey] = { cat: catType || 'Khác', project, ban_ra: 0, tra: 0 };
    res.hoanByCat[hoanKey].ban_ra += banRa || 0;
    res.hoanByCat[hoanKey].tra    += tra;

    let region = 'Other';
    if (city.includes('hà nội') || city.includes('ha noi')) region = 'HN';
    else if (city.includes('hồ chí minh') || city.includes('ho chi minh') || city === 'hcm') region = 'HCM';
    res.regionRev[region][project] = (res.regionRev[region][project] || 0) + rev;
  }
  return res;
}

// ─── PROCESS ADS CHO MAIN (Gộp chung 1 file) ───
function processMainAdsCombined(adsArr, sapoStats, filterProject) {
  if (!adsArr || !adsArr.length) return;
  let hdRow = adsArr.find(r => r.join('').toLowerCase().includes('amount spent') || r.join('').toLowerCase().includes('chi tiêu') || r.join('').toLowerCase().includes('chi phí'));
  if (!hdRow) return;
  let hd = hdRow.map(h => (h||'').toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g,'').trim());
  let campIdx  = hd.findIndex(h => h.includes('tên chiến dịch') || h.includes('campaign name'));
  let spendIdx = hd.findIndex(h => h.includes('amount spent') || h.includes('chi tiêu') || h.includes('chi phí'));
  if (campIdx === -1 || spendIdx === -1) return;

  let startIdx = adsArr.indexOf(hdRow) + 1;
  if (!sapoStats.channelSpends) sapoStats.channelSpends = { Gunze: {}, MP: {} };

  for (let i = startIdx; i < adsArr.length; i++) {
    let campName = (adsArr[i][campIdx] || '').toLowerCase().trim();
    let spend    = parseAnyNum(adsArr[i][spendIdx]);
    if (!campName || spend === 0 || campName === 'total') continue;

    // AI phân loại chiến dịch
    let proj = 'Gunze'; 
    if (campName.match(/mp|mỹ phẩm|kem|serum|toner|son|mask|my pham|kose|kanebo|elixir|cezanne/)) proj = 'MP';
    else if (campName.match(/gunze|đồ lót|áo lót|quần lót/)) proj = 'Gunze';

    if (filterProject !== 'All' && proj !== filterProject) continue;
    if (!sapoStats.channelSpends[proj]) sapoStats.channelSpends[proj] = {};

    // 3. Phân bổ vào Kênh (Phễu) theo quy tắc mới của sếp
    let chGrp = 'Page Phụ'; // Mặc định thả vào Page Phụ trước
    
    if (campName.includes('livestream') || campName.includes('live')) {
        chGrp = 'Livestream';
    } else if (campName.includes('chuyển đổi') || campName.includes('chuyen doi') || campName.includes('ldp')) {
        chGrp = 'LDP';
    } else if (campName.includes('zalo')) {
        chGrp = 'Zalo';
    } else if (campName.includes('web') || campName.includes('cpo')) {
        chGrp = 'Web'; // Chứa web thì vào mảng Web
    } else if (campName.includes('jps')) {
        chGrp = 'Page Chính'; // Chứa JPS thì mới là Page Chính
    } 
    // Các chiến dịch còn lại (không jps, không web, không ldp...) sẽ tự động giữ nguyên là 'Page Phụ'

    sapoStats.channelSpends[proj][chGrp] = (sapoStats.channelSpends[proj][chGrp] || 0) + spend;
    sapoStats.projectSpend[proj] = (sapoStats.projectSpend[proj] || 0) + spend;
  }
}

// ─── RENDER DASHBOARD MAIN ───
async function genMainDashboard() {
  if (!mainDbFiles.sapo_cur) {
    alert('Vui lòng tải lên File Sapo Tháng hiện tại!');
    document.getElementById('gbtn').disabled = false;
    document.getElementById('out').innerHTML = `<div class="s-empty"><div class="ico">🗂️</div><p>Vui lòng tải lên dữ liệu.</p></div>`;
    return;
  }

  setStep(1);
  const [sapoCurData, sapoPrevData, adsCurData, adsPrevData] = await Promise.all([
    parseCSVAsync(mainDbFiles.sapo_cur),
    parseCSVAsync(mainDbFiles.sapo_prev),
    parseCSVAsync(mainDbFiles.ads_cur),
    parseCSVAsync(mainDbFiles.ads_prev)
  ]);

  const filters = ['All', 'Gunze', 'MP'];
  window.mainDbCache = {};

  for (let f of filters) {
    let sapCur  = processMainSapo(sapoCurData,  f);
    let sapPrev = processMainSapo(sapoPrevData, f);
    processMainAdsCombined(adsCurData, sapCur, f);
    processMainAdsCombined(adsPrevData, sapPrev, f);
    window.mainDbCache[f] = { sapCur, sapPrev };
  }

  setStep(2);
  const allCache = window.mainDbCache['All'];
  const rawText  = buildMainRawText(allCache.sapCur, allCache.sapPrev);

  let parsedAi = { eval_sp: ['—'], eval_hoan: ['—'], eval_kenh: ['—'], eval_compare: ['—'], ket_luan: ['—'] };
  try {
    const url = getApiUrl();
    const sysPrompt = `Bạn là Chuyên gia Phân tích Marketing. Dữ liệu Dashboard Gunze & Mỹ Phẩm:\n${rawText}\n\nHãy phân tích:\n1. "eval_sp": Nhận xét Sản phẩm/Thương hiệu.\n2. "eval_hoan": Nhận xét tỷ lệ hoàn.\n3. "eval_kenh": Hiệu quả Kênh (đặc biệt chú ý ROAS & CPO).\n4. "eval_compare": So sánh Gunze vs MP.\n5. "ket_luan": Đề xuất hành động chiến lược.\nTrả về JSON thuần: {"eval_sp":["..."],"eval_hoan":["..."],"eval_kenh":["..."],"eval_compare":["..."],"ket_luan":["..."]}`;
    const customNote = document.getElementById('ai-custom-note') ? document.getElementById('ai-custom-note').value.trim() : '';
    const extraPrompt = (customNote ? `\n\n=== LƯU Ý THÊM ===\n${customNote}` : '') + getAiPersonaPrompt();
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: sysPrompt + extraPrompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.3 } })
    });
    const d = await res.json();
    let rawAi = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let fi = rawAi.indexOf('{'), li = rawAi.lastIndexOf('}');
    if (fi !== -1 && li !== -1) parsedAi = JSON.parse(rawAi.substring(fi, li + 1));
  } catch (e) { console.error('AI error:', e); }

  window.mainDbCache['All'].parsedAi = parsedAi;
  for (let f of ['Gunze', 'MP']) window.mainDbCache[f].parsedAi = null;

  setStep(3);
  const tpl = document.getElementById('tpl-main-dashboard-layout');
  const clone = tpl.content.cloneNode(true);
  const out = document.getElementById('out');
  out.innerHTML = '';
  out.appendChild(clone);

  document.getElementById('main-db-text-report').innerHTML = rawText;

  renderMainDbView('All');
  injectMainAiEval(parsedAi);

  saveHist('Dashboard Main', 'Gunze+MP', document.getElementById('out').innerHTML);
}

function buildMainRawText(sapCur, sapPrev) {
  let txt = 'BÁO CÁO CƠ CẤU SẢN PHẨM GUNZE & MỸ PHẨM\n';
  txt += `Gunze: DT ${fmtNum(sapCur.projectRev.Gunze)} | Chi phí: ${fmtNum(sapCur.projectSpend.Gunze)} | Hoàn ${sapCur.projectTra?.Gunze||0}\n`;
  txt += `MP: DT ${fmtNum(sapCur.projectRev.MP)} | Chi phí: ${fmtNum(sapCur.projectSpend.MP)} | Hoàn ${sapCur.projectTra?.MP||0}\n\n`;

  let topSp = Object.entries(sapCur.topSp).sort((a,b)=>b[1].rev-a[1].rev).slice(0,10);
  txt += 'TOP SP: ' + topSp.map((p,i)=>`${i+1}.${p[0]}(${fmtNum(p[1].rev)}₫)`).join(', ') + '\n\n';
  return txt;
}

function renderMainDbView(filter) {
  window.currentMainViewFilter = filter;
  const cache = window.mainDbCache[filter];
  if (!cache) return;
  const { sapCur, sapPrev } = cache;

  const momStr = (cur, prev) => {
    if (!prev || prev === 0) return { str: '—', cls: 'color:var(--tx3)' };
    let pct = ((cur - prev) / prev * 100).toFixed(1);
    return { str: (parseFloat(pct) >= 0 ? '+' : '') + pct + '%', cls: parseFloat(pct) >= 0 ? 'color:var(--acc2)' : 'color:var(--danger)' };
  };

  const compareTbody = document.getElementById('main-compare-tbody');
  if (compareTbody) {
    const gRevCur = sapCur.projectRev.Gunze || 0;  const mRevCur = sapCur.projectRev.MP    || 0;
    const gRevPrev= sapPrev.projectRev.Gunze|| 0;  const mRevPrev= sapPrev.projectRev.MP   || 0;
    const gTraCur = sapCur.projectTra.Gunze || 0;  const mTraCur = sapCur.projectTra.MP    || 0;
    const gBanCur = sapCur.projectBanRa.Gunze || 0;const mBanCur = sapCur.projectBanRa.MP    || 0;
    const gSpendCur = sapCur.projectSpend.Gunze || 0; const mSpendCur = sapCur.projectSpend.MP || 0;
    const gSpendPrev = sapPrev.projectSpend.Gunze || 0; const mSpendPrev = sapPrev.projectSpend.MP || 0;

    const gRoasCur = gSpendCur > 0 ? (gRevCur / gSpendCur).toFixed(1) : '—';
    const mRoasCur = mSpendCur > 0 ? (mRevCur / mSpendCur).toFixed(1) : '—';
    const tRoasCur = (gSpendCur + mSpendCur) > 0 ? ((gRevCur + mRevCur) / (gSpendCur + mSpendCur)).toFixed(1) : '—';

    const rows = [
      ['Doanh thu', fmtNum(gRevCur), fmtNum(mRevCur), fmtNum(gRevCur + mRevCur), momStr(gRevCur, gRevPrev), momStr(mRevCur, mRevPrev)],
      ['Chi phí Ads', fmtNum(gSpendCur), fmtNum(mSpendCur), fmtNum(gSpendCur + mSpendCur), momStr(gSpendCur, gSpendPrev), momStr(mSpendCur, mSpendPrev)],
      ['ROAS', gRoasCur, mRoasCur, tRoasCur, '—', '—'],
      ['Số đơn bán ra', gBanCur, mBanCur, gBanCur + mBanCur, momStr(gBanCur, sapPrev.projectBanRa.Gunze||0), momStr(mBanCur, sapPrev.projectBanRa.MP||0)],
      ['Số hoàn', gTraCur, mTraCur, gTraCur + mTraCur, '—', '—'],
      ['% Hoàn', (gBanCur+gTraCur)>0?((gTraCur/(gBanCur+gTraCur))*100).toFixed(1)+'%':'—', (mBanCur+mTraCur)>0?((mTraCur/(mBanCur+mTraCur))*100).toFixed(1)+'%':'—', '—', '—', '—']
    ];
    compareTbody.innerHTML = rows.map(r => `<tr><td style="font-weight:700;color:var(--tx)">${r[0]}</td><td style="color:var(--gunze);font-weight:700">${r[1]}</td><td style="color:var(--mp);font-weight:700">${r[2]}</td><td style="color:var(--tx)">${r[3]}</td><td style="font-weight:700;${typeof r[4]==='object'?r[4].cls:''}">${typeof r[4]==='object'?r[4].str:r[4]}</td><td style="font-weight:700;${typeof r[5]==='object'?r[5].cls:''}">${typeof r[5]==='object'?r[5].str:r[5]}</td></tr>`).join('');
  }

  // ── Biểu đồ Doanh Thu ──
  const chartContainer = document.getElementById('main-daily-chart-container');
  if (chartContainer) {
    const allDates = Array.from(new Set([...Object.keys(sapCur.dailyMap.Gunze || {}), ...Object.keys(sapCur.dailyMap.MP || {})])).sort((a, b) => {
      let [da, ma] = a.split('/'); let [db, mb] = b.split('/'); return (parseInt(ma) * 100 + parseInt(da)) - (parseInt(mb) * 100 + parseInt(db));
    });
    const gVals = allDates.map(d => sapCur.dailyMap.Gunze?.[d] || 0); const mVals = allDates.map(d => sapCur.dailyMap.MP?.[d] || 0); const maxVal = Math.max(...gVals, ...mVals, 1);
    if (allDates.length === 0) { chartContainer.innerHTML = '<div style="color:var(--tx3);font-size:12px;text-align:center;padding:20px">Không có dữ liệu ngày</div>'; } else {
      chartContainer.innerHTML = `<div style="display:flex;align-items:flex-end;gap:3px;height:120px;overflow-x:auto;padding-bottom:6px;">${allDates.map((label, i) => {
        let gH = Math.max(Math.round((gVals[i] / maxVal) * 100), gVals[i]>0?2:0); let mH = Math.max(Math.round((mVals[i] / maxVal) * 100), mVals[i]>0?2:0); let day = label.split('/')[0];
        return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:14px;gap:1px;" title="${label}: Gunze ${fmtNum(gVals[i])} | MP ${fmtNum(mVals[i])}"><div style="width:100%;display:flex;align-items:flex-end;gap:1px;height:110px;"><div style="flex:1;height:${gH}px;background:var(--gunze);border-radius:2px 2px 0 0;opacity:0.85;"></div><div style="flex:1;height:${mH}px;background:var(--mp);border-radius:2px 2px 0 0;opacity:0.85;"></div></div><div style="font-size:7px;color:var(--tx3);margin-top:2px;">${day}</div></div>`;
      }).join('')}</div><div style="display:flex;justify-content:space-between;margin-top:8px;font-size:10px;color:var(--tx3);flex-wrap:wrap;gap:8px;"><span>Gunze TB/ngày: <strong style="color:var(--gunze)">${fmtNum(Math.round(gVals.reduce((s,v)=>s+v,0)/Math.max(gVals.filter(v=>v>0).length,1)))} ₫</strong></span><span>MP TB/ngày: <strong style="color:var(--mp)">${fmtNum(Math.round(mVals.reduce((s,v)=>s+v,0)/Math.max(mVals.filter(v=>v>0).length,1)))} ₫</strong></span></div>`;
    }
  }

  // ── Gộp dữ liệu Top cho Current và Prev ──
  const mergeTop = (curObj, prevObj) => {
    let map = {};
    for (let [k,v] of Object.entries(curObj)) map[k] = { name: k, project: v.project, curRev: v.rev, curQty: v.qty, prevRev: 0, prevQty: 0 };
    for (let [k,v] of Object.entries(prevObj)) {
      if (!map[k]) map[k] = { name: k, project: v.project, curRev: 0, curQty: 0, prevRev: 0, prevQty: 0 };
      map[k].prevRev = v.rev; map[k].prevQty = v.qty;
    }
    return Object.values(map);
  };

  const setTopData = (id, list) => {
    const container = document.getElementById(id);
    if(container) { container.setAttribute('data-list-sp', encodeURIComponent(JSON.stringify(list))); container.setAttribute('data-total-sp', sapCur.totalRev); renderMainTopList(container, 'curRev'); }
  };
  setTopData('main-top-sp', mergeTop(sapCur.topSp, sapPrev.topSp));
  setTopData('main-top-brand', mergeTop(sapCur.brandStats, sapPrev.brandStats));
  setTopData('main-top-cattype', mergeTop(sapCur.catTypeStats, sapPrev.catTypeStats));
  // ── Bảng Nhãn Hiệu (Brand) ──
  const brandTbody = document.getElementById('main-brand-tbody');
  if (brandTbody) {
    let brandMap = {};
    for(let [k,v] of Object.entries(sapCur.brandStats)) brandMap[k] = { ...v, prev_rev: 0, prev_ban_ra: 0, prev_tra: 0 };
    for(let [k,v] of Object.entries(sapPrev.brandStats)) {
       if(!brandMap[k]) brandMap[k] = { project: v.project, rev: 0, qty: 0, ban_ra: 0, tra: 0, prev_rev: 0, prev_ban_ra: 0, prev_tra: 0 };
       brandMap[k].prev_rev = v.rev; brandMap[k].prev_ban_ra = v.ban_ra || 0; brandMap[k].prev_tra = v.tra || 0;
    }
    
    const rows = Object.entries(brandMap).sort((a,b) => b[1].rev - a[1].rev);
    brandTbody.innerHTML = rows.map(([name, b]) => {
      if (b.rev === 0 && b.prev_rev === 0 && b.tra === 0 && b.prev_tra === 0) return '';
      let pct = sapCur.totalRev > 0 ? (b.rev / sapCur.totalRev * 100).toFixed(1) : 0;
      let tot = b.ban_ra + b.tra; let hPct = tot > 0 ? (b.tra / tot * 100).toFixed(1) : '0.0';
      let prevTot = b.prev_ban_ra + b.prev_tra; let prevHPct = prevTot > 0 ? (b.prev_tra / prevTot * 100).toFixed(1)+'%' : '—';
      let textCol = parseFloat(hPct)>20?'color:var(--danger);font-weight:700':parseFloat(hPct)>12?'color:var(--warn);font-weight:600':'color:var(--acc2);font-weight:600';
      let projColor = b.project === 'Gunze' ? 'var(--gunze)' : 'var(--mp)';
      let projBadge = `<span style="font-size:9px;padding:1px 6px;border-radius:3px;background:${b.project==='Gunze'?'rgba(79,124,255,0.15)':'rgba(56,224,176,0.15)'};color:${projColor}">${b.project}</span>`;
      
      return `<tr>
        <td style="font-weight:700;color:var(--tx);text-align:left;">${name}</td>
        <td>${projBadge}</td>
        <td><div style="display:flex;align-items:center;gap:5px;justify-content:flex-end;"><div style="width:40px;background:var(--bdr);height:4px;border-radius:2px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:${projColor};"></div></div><span style="font-size:10px;color:${projColor};font-weight:700;min-width:28px;">${pct}%</span></div></td>
        <td style="color:var(--tx);font-weight:700;">${fmtNum(b.rev)}</td>
        <td style="color:var(--tx2);">${fmtNum(b.prev_rev)}</td>
        <td style="font-weight:700;${momStr(b.rev,b.prev_rev).cls}">${momStr(b.rev,b.prev_rev).str}</td>
        <td>${b.qty}</td>
        <td style="${textCol}">${hPct}%</td>
        <td style="color:var(--tx2);font-size:10px;">${prevHPct}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--tx3);padding:10px;">Không có dữ liệu nhãn hiệu</td></tr>';
  }

  // ── Bảng hoàn trả (Gộp Current & Prev) ──
  const hoanTbody = document.getElementById('main-hoan-tbody');
  if (hoanTbody) {
    let hoanAlert = [];
    let hoanMap = {};
    for(let [k,v] of Object.entries(sapCur.hoanByCat)) hoanMap[k] = { ...v, prev_ban_ra: 0, prev_tra: 0 };
    for(let [k,v] of Object.entries(sapPrev.hoanByCat)) {
       if(!hoanMap[k]) hoanMap[k] = { cat: v.cat, project: v.project, ban_ra: 0, tra: 0, prev_ban_ra: 0, prev_tra: 0 };
       hoanMap[k].prev_ban_ra = v.ban_ra; hoanMap[k].prev_tra = v.tra;
    }
    
    const rows = Object.values(hoanMap).sort((a,b) => { let ra = a.ban_ra+a.tra>0?a.tra/(a.ban_ra+a.tra):0; let rb = b.ban_ra+b.tra>0?b.tra/(b.ban_ra+b.tra):0; return rb - ra; });
    hoanTbody.innerHTML = rows.map(h => {
      let tot = h.ban_ra + h.tra; let pct = tot > 0 ? (h.tra / tot * 100).toFixed(1) : '0.0';
      let prevTot = h.prev_ban_ra + h.prev_tra; let prevPct = prevTot > 0 ? (h.prev_tra / prevTot * 100).toFixed(1)+'%' : '—';
      if (tot === 0 && prevTot === 0) return '';
      let barCol = parseFloat(pct)>20?'var(--danger)':parseFloat(pct)>12?'var(--warn)':'var(--acc2)';
      let textCol = parseFloat(pct)>20?'color:var(--danger);font-weight:700':parseFloat(pct)>12?'color:var(--warn);font-weight:600':'color:var(--acc2);font-weight:600';
      let projBadge = `<span style="font-size:9px;padding:1px 6px;border-radius:3px;background:${h.project==='Gunze'?'rgba(79,124,255,0.15)':'rgba(56,224,176,0.15)'};color:${h.project==='Gunze'?'var(--gunze)':'var(--mp)'}">${h.project}</span>`;
      if (parseFloat(pct) > 20) hoanAlert.push(`[${h.project}] ${h.cat}: ${pct}%`);
      return `<tr><td style="font-weight:700;color:var(--tx)">${h.cat}</td><td>${projBadge}</td><td>${h.tra}</td><td>${tot}</td><td><div style="display:flex;align-items:center;gap:6px;justify-content:flex-end;"><div style="width:50px;background:var(--bdr);height:5px;border-radius:3px;overflow:hidden;"><div style="width:${Math.min(parseFloat(pct)*3,100)}%;height:100%;background:${barCol};"></div></div><span style="${textCol};min-width:36px">${pct}%</span></div></td><td style="color:var(--tx2);">${h.prev_tra}</td><td style="color:var(--tx2);">${prevTot}</td><td style="color:var(--tx2);font-size:10px;">${prevPct}</td></tr>`;
    }).join('');
    const alertBox = document.getElementById('main-hoan-alert-box'); const okBox = document.getElementById('main-hoan-ok-box');
    if (alertBox && okBox) { if (hoanAlert.length > 0) { alertBox.innerHTML = '⚠ Báo động: ' + hoanAlert.join(' · '); alertBox.style.display = 'block'; okBox.style.display = 'none'; } else { alertBox.style.display = 'none'; okBox.style.display = 'block'; } }
  }

  // ── Bảng Kênh (Gộp Current & Prev) ──
  const channelTbody = document.getElementById('main-channel-tbody');
  if (channelTbody) {
    const CHANNEL_GROUPS = ['Page Chính', 'Page Phụ', 'LDP', 'Web', 'Livestream', 'Zalo', 'CSL', 'Khác'];
    const projectList = filter === 'All' ? ['Gunze', 'MP'] : [filter];
    
    const buildChStats = (sapData) => {
      let stats = {};
      for (let proj of projectList) {
        let srcMap = sapData.srcMap[proj] || {};
        for (let [src, v] of Object.entries(srcMap)) {
          let sLower = src.toLowerCase(); let grp = 'Khác';
          if (sLower === 'facebook') grp = 'Page Chính'; else if (sLower.includes('livestream')||sLower.includes('live')) grp = 'Livestream'; else if (sLower.includes('zalo')) grp = 'Zalo'; else if (sLower === 'csl') grp = 'CSL'; else if (sLower.includes('ldp')) grp = 'LDP'; else if (sLower.includes('web')) grp = 'Web'; else if (sLower.includes('page')) grp = 'Page Phụ';
          
          let key = grp + '|' + proj; // Tạo chìa khóa kép: Tên Kênh + Tên Dự án
          if (!stats[key]) stats[key] = { proj, grp, rev:0, ban_ra:0, tra:0, spend:0, don:0 };
          stats[key].rev += v.rev; stats[key].ban_ra += v.ban_ra||0; stats[key].tra += v.tra; stats[key].don += v.don||0;
        }
        let spendMap = sapData.channelSpends?.[proj] || {};
        for (let [grp, sp] of Object.entries(spendMap)) {
          let key = grp + '|' + proj;
          if (!stats[key]) stats[key] = { proj, grp, rev:0, ban_ra:0, tra:0, spend:0, don:0 };
          stats[key].spend += sp;
        }
      }
      return stats;
    };

    let curChStats = buildChStats(sapCur);
    let prevChStats = buildChStats(sapPrev);
    let totalChRevCur = Object.values(curChStats).reduce((s,v)=>s+(v.rev||0), 0);
    
    let allRows = [];
    for (let grp of CHANNEL_GROUPS) {
      for (let proj of projectList) {
        let key = grp + '|' + proj;
        let c = curChStats[key] || {proj: proj, grp: grp, rev:0, ban_ra:0, tra:0, spend:0, don:0};
        let p = prevChStats[key] || {proj: proj, grp: grp, rev:0, ban_ra:0, tra:0, spend:0, don:0};
        
        // Nếu kênh của dự án này hoàn toàn trống số liệu thì bỏ qua
        if (c.rev === 0 && c.spend === 0 && p.rev === 0 && p.spend === 0 && c.tra === 0 && p.tra === 0) continue;
        
        let pct = totalChRevCur > 0 ? (c.rev / totalChRevCur * 100).toFixed(1) : 0;
        let roas = c.spend > 0 ? (c.rev / c.spend).toFixed(1) : '—';
        let cpo  = (c.spend>0&&c.don>0) ? fmtNum(Math.round(c.spend/c.don)) : '—';
        let hPct = (c.ban_ra+c.tra)>0 ? (c.tra/(c.ban_ra+c.tra)*100).toFixed(1)+'%' : '0%';
        let projColor = c.proj === 'Gunze' ? 'var(--gunze)' : 'var(--mp)';
        let roasCls = roas==='—'?'color:var(--tx3)':parseFloat(roas)>=4?'color:var(--acc2);font-weight:700':parseFloat(roas)>=2.5?'color:var(--warn)':'color:var(--danger);font-weight:700';
        
        allRows.push(`<tr><td style="font-weight:700;color:var(--tx)">${grp}</td><td><span style="font-size:9px;padding:1px 6px;border-radius:3px;background:${c.proj==='Gunze'?'rgba(79,124,255,0.15)':'rgba(56,224,176,0.15)'};color:${projColor}">${c.proj}</span></td><td><div style="display:flex;align-items:center;gap:5px;justify-content:flex-end;"><div style="width:40px;background:var(--bdr);height:4px;border-radius:2px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:${projColor};"></div></div><span style="font-size:10px;color:${projColor};font-weight:700;min-width:28px;">${pct}%</span></div></td><td style="color:var(--tx);font-weight:700;">${fmtNum(c.rev)}</td><td style="color:var(--tx2);">${fmtNum(p.rev)}</td><td style="font-weight:700;${momStr(c.rev,p.rev).cls}">${momStr(c.rev,p.rev).str}</td><td style="color:${parseFloat(hPct)>20?'var(--danger)':parseFloat(hPct)>12?'var(--warn)':'var(--acc2)'}">${hPct}</td><td style="color:var(--gunze);">${c.spend>0?fmtNum(c.spend):'—'}</td><td style="color:var(--tx2);">${p.spend>0?fmtNum(p.spend):'—'}</td><td style="font-weight:700;${momStr(c.spend,p.spend).cls}">${momStr(c.spend,p.spend).str}</td><td style="${roasCls}">${roas}</td><td style="color:var(--warn);">${cpo}</td></tr>`);
      }
    }
    channelTbody.innerHTML = allRows.join('') || '<tr><td colspan="12" style="text-align:center;color:var(--tx3);padding:10px;">Không có dữ liệu kênh</td></tr>';
 
  const regionTbody = document.getElementById('main-region-tbody');
  if (regionTbody) {
    const projectList = filter === 'All' ? ['Gunze', 'MP'] : [filter];
    const regions = ['HN', 'HCM', 'Other'];
    let rows = [];
    for (let region of regions) {
      for (let proj of projectList) {
        let curRev  = sapCur.regionRev?.[region]?.[proj]  || 0;
        let prevRev = sapPrev.regionRev?.[region]?.[proj] || 0;
        if (curRev === 0 && prevRev === 0) continue;
        let mom = (prevRev>0) ? ((curRev-prevRev)/prevRev*100).toFixed(1) : null;
        let momStr2 = mom !== null ? `<span style="color:${parseFloat(mom)>=0?'var(--acc2)':'var(--danger)'};font-weight:700">${parseFloat(mom)>=0?'+':''}${mom}%</span>` : '—';
        let pct = sapCur.totalRev > 0 ? ((curRev / sapCur.totalRev)*100).toFixed(1) : 0;
        let projColor = proj==='Gunze'?'var(--gunze)':'var(--mp)';
        let regionLabel = region === 'Other' ? 'Khác' : region;
        rows.push(`<tr><td style="font-weight:700;color:var(--tx)">${regionLabel} — <span style="color:${projColor}">${proj}</span></td><td style="color:${projColor};font-weight:700;">${fmtNum(curRev)}</td><td style="color:var(--tx2);">${fmtNum(prevRev)}</td><td>${momStr2}</td><td><div style="display:flex;align-items:center;gap:5px;justify-content:flex-end;"><div style="width:40px;background:var(--bdr);height:4px;border-radius:2px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:${projColor};"></div></div><span style="font-size:10px;color:${projColor};font-weight:600;">${pct}%</span></div></td></tr>`);
      }
    }
    regionTbody.innerHTML = rows.join('') || '<tr><td colspan="5" style="color:var(--tx3);text-align:center;padding:10px">Không có dữ liệu khu vực (cần cột Tỉnh/Thành phố trong Sapo)</td></tr>';
  }
  }
}
 
function renderMainTopList(container, sortKey) {
  const listEnc = container.getAttribute('data-list-sp');
  const total   = parseFloat(container.getAttribute('data-total-sp')) || 1;
  if (!listEnc) return;
  const list = JSON.parse(decodeURIComponent(listEnc));
  list.sort((a,b) => b[sortKey] - a[sortKey]);

  const momStr = (cur, prev) => {
    if (!prev || prev === 0) return { str: '—', cls: 'color:var(--tx3)' };
    let pct = ((cur - prev) / prev * 100).toFixed(1);
    return { str: (parseFloat(pct) >= 0 ? '+' : '') + pct + '%', cls: parseFloat(pct) >= 0 ? 'color:var(--acc2)' : 'color:var(--danger)' };
  };

  container.innerHTML = list.slice(0,10).map((p, i) => {
    let pct = ((p.curRev / total) * 100).toFixed(1);
    let col = p.project === 'Gunze' ? 'var(--gunze)' : p.project === 'MP' ? 'var(--mp)' : 'var(--acc2)';
    let rank = i===0?'🥇':i===1?'🥈':i===2?'🥉':`<span style="display:inline-block;width:18px;text-align:center;color:var(--tx3);font-size:10px;">${i+1}</span>`;
    let mom = momStr(p.curRev, p.prevRev);
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:rgba(255,255,255,0.015);border:1px solid rgba(255,255,255,0.05);border-radius:5px;">
      <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
        <span style="font-size:13px;">${rank}</span>
        <div style="display:flex;flex-direction:column;gap:2px;overflow:hidden;">
            <span style="font-size:11px;color:${col};font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${p.name}">${p.name}</span>
            <span style="font-size:9px;color:var(--tx3);">TT: ${fmtNum(p.prevRev)} ₫</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;flex-shrink:0;margin-left:8px;">
        <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-weight:700;font-size:10px;${mom.cls}">${mom.str}</span>
            <span style="color:${col};font-weight:700;font-size:11px;">${fmtNum(p.curRev)} ₫</span>
        </div>
        <div style="display:flex;align-items:center;gap:4px;margin-top:2px;">
          <span style="color:var(--tx3);font-size:9px;">${p.curQty} SP</span>
          <div style="width:30px;background:var(--bdr);height:3px;border-radius:2px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:${col};"></div></div>
          <span style="color:var(--tx3);font-size:9px;">${pct}%</span>
        </div>
      </div>
    </div>`;
  }).join('');
}
 
function changeMainTopSort(btn, type, sortKey) {
  const container = btn.closest('.top-box');
  container.querySelectorAll('button').forEach(b => { b.style.borderColor='var(--tx3)'; b.style.background='transparent'; b.style.color='var(--tx2)'; });
  btn.style.borderColor = 'var(--acc2)'; btn.style.background = 'rgba(56,224,176,0.1)'; btn.style.color = 'var(--acc2)';
  const listEl = container.querySelector('.main-top-list');
  if (listEl) renderMainTopList(listEl, sortKey);
}
 
function injectMainAiEval(parsedAi) {
  const renderList = (arr) => Array.isArray(arr) ? arr.map(i=>`<li>${i}</li>`).join('') : `<li>${arr||'—'}</li>`;
  const ids = ['main-ai-eval-sp','main-ai-eval-hoan','main-ai-eval-kenh','main-ai-eval-compare','main-ai-eval-ketluan'];
  const keys= ['eval_sp','eval_hoan','eval_kenh','eval_compare','ket_luan'];
  ids.forEach((id, i) => { const el = document.getElementById(id); if (el) el.innerHTML = renderList(parsedAi[keys[i]]); });
}
 
async function applyMainDbFilter(filter) {
  window.currentMainViewFilter = filter;
  if (!window.mainDbCache || !window.mainDbCache[filter]) return;
  renderMainDbView(filter);
 
  const cache = window.mainDbCache[filter];
  if (cache.parsedAi) { injectMainAiEval(cache.parsedAi); return; }
 
  const ids = ['main-ai-eval-sp','main-ai-eval-hoan','main-ai-eval-kenh','main-ai-eval-compare','main-ai-eval-ketluan'];
  ids.forEach(id => { const el = document.getElementById(id); if(el) el.innerHTML = '<li><span style="color:var(--warn)">⏳ AI đang phân tích...</span></li>'; });
 
  try {
    const rawText = buildMainRawText(cache.sapCur, cache.sapPrev);
    const url = getApiUrl();
    const sysPrompt = `Bạn là Chuyên gia Phân tích Marketing. Dữ liệu Dashboard chỉ cho dự án [${filter}]:\n${rawText}\n\nPhân tích chuyên sâu cho dự án này:\n1. "eval_sp": Cơ cấu Sản phẩm/Thương hiệu.\n2. "eval_hoan": Tỷ lệ hoàn trả.\n3. "eval_kenh": Hiệu quả Kênh.\n4. "eval_compare": So sánh với tháng trước / điểm đáng chú ý.\n5. "ket_luan": Đề xuất hành động (2-3 ý).\nTrả về JSON thuần: {"eval_sp":["..."],"eval_hoan":["..."],"eval_kenh":["..."],"eval_compare":["..."],"ket_luan":["..."]}`;
    const res = await fetchWithRetry(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contents:[{parts:[{text:sysPrompt}]}], generationConfig:{responseMimeType:'application/json',temperature:0.3} }) });
    const d = await res.json();
    let raw = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let fi=raw.indexOf('{'), li=raw.lastIndexOf('}');
    if(fi!==-1&&li!==-1) raw=raw.substring(fi,li+1);
    const parsedAi = JSON.parse(raw);
    cache.parsedAi = parsedAi;
    if (window.currentMainViewFilter === filter) injectMainAiEval(parsedAi);
  } catch(e) {
    const errHtml = `<li><span style="color:var(--danger)">❌ Lỗi AI: ${e.message}</span></li>`;
    ids.forEach(id => { const el = document.getElementById(id); if(el) el.innerHTML = errHtml; });
  }
}
 
function doCopyMainDbText() {
  const el = document.getElementById('main-db-text-report');
  if (!el) return;
  const text = el.innerText;
  const btn = document.getElementById('main-db-copy-btn') || document.querySelector('button[onclick="doCopyMainDbText()"]');
  navigator.clipboard.writeText(text).then(() => {
    if(btn){btn.textContent='✓ Đã Copy';setTimeout(()=>btn.textContent='⎘ Copy Report',2000);}
  }).catch(() => {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    if(btn){btn.textContent='✓ Đã Copy';setTimeout(()=>btn.textContent='⎘ Copy Report',2000);}
  });
}