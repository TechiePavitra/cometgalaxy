/* app/app_v3.js - v3 features:
   - Horizontal line under subject title in generated PDF
   - Fix CSV export bug (explicit headers + BOM)
   - Auto-fetch CSVs from GitHub 'database' branch for configured subjects
   - PDF viewer with selectable text
   - Computer subject MCQ-only enforcement
*/

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/TechiePavitra/studypro/database'; // branch 'database'
const SUBJECTS = ['economics','gujarati','sanskrit','english','psychology','philosophy','computer'];

const state = { questions: [] };

const els = {
  subjectSelect: document.getElementById('subjectSelect'),
  typeSelect: document.getElementById('typeSelect'),
  raritySelect: document.getElementById('raritySelect'),
  sectionSelect: document.getElementById('sectionSelect'),
  questionText: document.getElementById('questionText'),
  mcqOptions: document.getElementById('mcqOptions'),
  optA: document.getElementById('optA'),
  optB: document.getElementById('optB'),
  optC: document.getElementById('optC'),
  optD: document.getElementById('optD'),
  addQuestionBtn: document.getElementById('addQuestionBtn'),
  questionList: document.getElementById('questionList'),
  qcount: document.getElementById('qcount'),
  openPdfViewerBtn: document.getElementById('openPdfViewerBtn'),
  pdfModal: document.getElementById('pdfModal'),
  pdfViewerContainer: document.getElementById('pdfViewerContainer'),
  closePdfModal: document.getElementById('closePdfModal'),
  addSelectedTextBtn: document.getElementById('addSelectedTextBtn'),
  pdfFileInput: document.getElementById('pdfFileInput'),
  csvInput: document.getElementById('csvInput'),
  topCsvInput: document.getElementById('topCsvInput'),
  importCsvTopBtn: document.getElementById('importCsvTopBtn'),
  downloadCsvBtn: document.getElementById('downloadCsvBtn'),
  fetchFromGithubBtn: document.getElementById('fetchFromGithubBtn'),
  generateBtn: document.getElementById('generateBtn'),
  paperSubject: document.getElementById('paperSubject'),
  paperMarks: document.getElementById('paperMarks'),
  includeRarity: document.getElementById('includeRarity'),
  preview: document.getElementById('preview')
};

function refreshQuestionList(){
  els.questionList.innerHTML = '';
  state.questions.forEach((q, idx) => {
    const li = document.createElement('li');
    const text = document.createElement('div');
    text.textContent = q.question;
    text.style.flex = '1';
    li.appendChild(text);
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${q.type} · ${q.section} · ${q.rarity}`;
    li.appendChild(meta);
    li.addEventListener('click', ()=> { loadQuestionIntoForm(idx); });
    els.questionList.appendChild(li);
  });
  els.qcount.textContent = state.questions.length;
}

function resetForm(){
  els.questionText.value = '';
  els.optA.value = els.optB.value = els.optC.value = els.optD.value = '';
}

function addQuestionFromForm(){
  const qtxt = els.questionText.value.trim();
  if(!qtxt) return alert('Enter a question text');
  const type = els.typeSelect.value;
  const options = type === 'mcq' ? [els.optA.value, els.optB.value, els.optC.value, els.optD.value].join(',') : '';
  const q = { question: qtxt, type, options, rarity: els.raritySelect.value, section: els.sectionSelect.value };
  state.questions.push(q);
  refreshQuestionList();
  resetForm();
}

function loadQuestionIntoForm(idx){
  const q = state.questions[idx];
  els.questionText.value = q.question;
  els.typeSelect.value = q.type;
  if(q.type === 'mcq'){
    const parts = q.options.split(',');
    els.optA.value = parts[0] || '';
    els.optB.value = parts[1] || '';
    els.optC.value = parts[2] || '';
    els.optD.value = parts[3] || '';
    els.mcqOptions.style.display = '';
  } else {
    els.mcqOptions.style.display = 'none';
  }
  els.raritySelect.value = q.rarity;
  els.sectionSelect.value = q.section;
  state.questions.splice(idx,1);
  refreshQuestionList();
}

els.addQuestionBtn.addEventListener('click', addQuestionFromForm);
els.typeSelect.addEventListener('change', ()=> { els.mcqOptions.style.display = els.typeSelect.value === 'mcq' ? '' : 'none'; });

// Top import CSV
els.importCsvTopBtn.addEventListener('click', ()=> els.topCsvInput.click());
els.topCsvInput.addEventListener('change', (ev)=> {
  const f = ev.target.files[0]; if(!f) return;
  Papa.parse(f, { header:true, encoding:'utf-8', complete: (res)=> {
    res.data.forEach(row=>{ if(row.question) state.questions.push(normalizeRow(row)); });
    refreshQuestionList(); alert('CSV imported: ' + res.data.length);
  }});
});

// Hidden csv input fallback
els.csvInput.addEventListener('change', (ev)=> {
  const f = ev.target.files[0]; if(!f) return;
  Papa.parse(f, { header:true, encoding:'utf-8', complete: (res)=> {
    res.data.forEach(row=>{ if(row.question) state.questions.push(normalizeRow(row)); });
    refreshQuestionList(); alert('CSV imported: ' + res.data.length);
  }});
});

function normalizeRow(row){
  // ensure consistent keys and trim spaces
  return {
    question: (row.question||'').toString().trim(),
    type: (row.type||'paragraph').toString().trim(),
    options: (row.options||'').toString().trim(),
    rarity: (row.rarity||'sometimes').toString().trim(),
    section: (row.section||'A').toString().trim()
  };
}

// CSV export - FIXED: build rows with explicit headers and UTF-8 BOM for Gujarati
els.downloadCsvBtn.addEventListener('click', ()=> {
  const headers = ['question','type','options','rarity','section'];
  const rows = state.questions.map(q => headers.map(h => q[h] || '').join(','));
  const csvBody = [headers.join(',')].concat(rows).join('\n');
  // add BOM for Excel/Unicode compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvBody], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='studypro_questions.csv'; a.click(); URL.revokeObjectURL(url);
});

// Fetch from GitHub database branch
els.fetchFromGithubBtn.addEventListener('click', async ()=> {
  if(!confirm('This will fetch question CSVs from the GitHub repository branch "database". Continue?')) return;
  let total = 0;
  for(const subj of SUBJECTS){
    const csvUrl = `${GITHUB_RAW_BASE}/${subj}/questions.csv`;
    try{
      const res = await fetch(csvUrl);
      if(!res.ok) { console.log('Not found:', csvUrl); continue; }
      const txt = await res.text();
      const parsed = Papa.parse(txt, { header: true });
      parsed.data.forEach(row => { if(row.question) { state.questions.push(normalizeRow(row)); total++; }});
    }catch(e){
      console.warn('Error fetching', csvUrl, e);
    }
  }
  refreshQuestionList();
  alert(`Fetched ${total} questions from GitHub (database branch).`);
});

// PDF viewer modal open
els.openPdfViewerBtn.addEventListener('click', ()=> {
  els.pdfModal.style.display = 'flex';
  els.pdfViewerContainer.innerHTML = '<div style="padding:10px;color:var(--muted)">Choose a PDF using the file chooser below or drag & drop a PDF into this area.</div>';
});

// close modal
els.closePdfModal.addEventListener('click', ()=> { els.pdfModal.style.display = 'none'; els.pdfViewerContainer.innerHTML = ''; });

// pdf file input handling
els.pdfFileInput.addEventListener('change', async (e)=> { const f = e.target.files[0]; if(!f) return; const buf = await f.arrayBuffer(); renderPDFIntoContainer(buf, els.pdfViewerContainer); });

// drag & drop
els.pdfViewerContainer.addEventListener('dragover', (ev)=> { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; });
els.pdfViewerContainer.addEventListener('drop', async (ev)=> { ev.preventDefault(); const f = ev.dataTransfer.files[0]; if(!f) return; const buf = await f.arrayBuffer(); renderPDFIntoContainer(buf, els.pdfViewerContainer); });

// Render PDF using PDF.js
async function renderPDFIntoContainer(arrayBuffer, container){
  container.innerHTML = '';
  const loadingTask = pdfjsLib.getDocument({data:arrayBuffer});
  const pdf = await loadingTask.promise;
  for(let i=1;i<=pdf.numPages;i++){
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({scale:1.5});
    const pageDiv = document.createElement('div'); pageDiv.className='pdf-page';
    const canvas = document.createElement('canvas'); canvas.className='pdf-canvas';
    canvas.width = viewport.width; canvas.height = viewport.height; const ctx = canvas.getContext('2d');
    await page.render({canvasContext:ctx, viewport}).promise;
    const textContent = await page.getTextContent();
    const textLayerDiv = document.createElement('div'); textLayerDiv.className='pdf-textLayer';
    pageDiv.appendChild(canvas); pageDiv.appendChild(textLayerDiv); container.appendChild(pageDiv);
    // render text layer
    pdfjsLib.renderTextLayer({ textContent, container: textLayerDiv, viewport, textDivs: [] });
  }
  container.scrollTop = 0;
}

// Add selected text from PDF viewer
els.addSelectedTextBtn.addEventListener('click', ()=> {
  const sel = window.getSelection().toString().trim();
  if(!sel) return alert('No text selected in the PDF viewer. Select text with mouse first.');
  els.questionText.value = sel;
  els.typeSelect.value = 'paragraph';
  els.raritySelect.value = 'sometimes';
  els.sectionSelect.value = 'A';
  els.mcqOptions.style.display = 'none';
  els.pdfModal.style.display = 'none';
});

// Generator with Computer MCQ-only enforcement and horizontal line under subject title
els.generateBtn.addEventListener('click', async ()=> {
  if(!state.questions.length) return alert('Add some questions first');
  const filterRarity = els.includeRarity.value;
  const subjectInput = (els.paperSubject.value || '').trim();
  const subjectLower = subjectInput.toLowerCase();
  const selectedSubject = (els.subjectSelect.value || '').toLowerCase();
  const isComputerPaper = subjectLower === 'computer' || selectedSubject === 'computer';
  let questions = state.questions.slice();
  if(filterRarity !== 'all') questions = questions.filter(q => q.rarity === filterRarity);
  if(isComputerPaper){
    questions = questions.filter(q => q.type === 'mcq');
    if(!questions.length) return alert('No MCQ questions available for Computer subject.');
  }
  const grouped = {};
  questions.forEach(q => { const s = q.section || 'A'; if(!grouped[s]) grouped[s]=[]; grouped[s].push(q); });

  // jsPDF with optional Gujarati font
  const fontUrl = 'fonts/NotoSansGujarati-Regular.ttf';
  let fontBuffer = null;
  try{ fontBuffer = await fetch(fontUrl).then(r=>r.arrayBuffer()); }catch(e){ fontBuffer=null; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:'pt',format:'a4'});
  if(fontBuffer){
    const base64Font = arrayBufferToBase64(new Uint8Array(fontBuffer));
    doc.addFileToVFS('NotoGujarati.ttf', base64Font); doc.addFont('NotoGujarati.ttf','NotoGujarati','normal'); doc.setFont('NotoGujarati');
  }
  doc.setFontSize(12);
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 60;
  doc.setFontSize(18);
  doc.text((subjectInput || 'CLASS12').toUpperCase(), pageWidth/2, y, {align:'center'});
  // horizontal line under subject title
  const lineY = y + 6;
  doc.setLineWidth(0.7);
  doc.line(40, lineY, pageWidth - 40, lineY);
  y += 26;

  doc.setFontSize(10);
  const now = new Date().toLocaleString();
  doc.text(`Generated: ${now}`, 40, y);
  doc.text(`Total: ${els.paperMarks.value||'100'} Marks`, pageWidth-40, y, {align:'right'});
  y += 24;

  let qNo = 1;
  const sectionKeys = Object.keys(grouped).sort();
  for(const sec of sectionKeys){
    doc.setFontSize(13); doc.text(`Section - ${sec}`, pageWidth/2, y, {align:'center'}); y+=20; doc.setFontSize(11);
    for(const q of grouped[sec]){
      const prefix = `${qNo}. `;
      const lines = doc.splitTextToSize(prefix + q.question + ` (${q.rarity})`, pageWidth-80);
      doc.text(lines, 40, y); y += lines.length * 14;
      if(q.type === 'mcq' && q.options){
        const opts = q.options.split(',');
        for(let i=0;i<opts.length;i++){ const optLine = `(${String.fromCharCode(65+i)}) ${opts[i].trim()}`; doc.text(optLine, 60, y); y+=14; }
      } else if(q.type === 'diagram'){
        doc.text('(Draw a diagram for this question)', 60, y); y+=16;
      }
      y+=8; qNo++;
      if(y > doc.internal.pageSize.getHeight() - 60){ doc.addPage(); y=60; }
    }
  }
  doc.save(`${(subjectInput||'Class12').replace(/\s+/g,'_')}_paper.pdf`);
});

function arrayBufferToBase64(buffer){
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for(let i=0;i<len;i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function updatePreview(){
  const byR = {};
  state.questions.forEach(q=> byR[q.rarity] = (byR[q.rarity]||0)+1 );
  const lines = Object.entries(byR).map(([r,c])=>`${r}: ${c}`).join(' · ');
  els.preview.textContent = `${state.questions.length} questions · ${lines}`;
}
setInterval(updatePreview, 1000);

refreshQuestionList();
