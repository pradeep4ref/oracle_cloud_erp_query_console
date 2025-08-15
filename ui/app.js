// Simple UI state
let isRunning = false;
let currentJobTimeoutId = null;
let gridApi = null;
let monacoEditor = null;
let isDraggingSplitter = false;
let dragStartY = 0;
let dragStartEditorHeight = 0;

const runBtn = document.getElementById('runBtn');
const cancelBtn = document.getElementById('cancelBtn');
const saveBtn = document.getElementById('saveBtn');
const runSpinner = document.getElementById('runSpinner');
const statusText = document.getElementById('statusText');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const rowCountValueEl = document.getElementById('rowCountValue');
const lastRunInfoEl = document.getElementById('lastRunInfo');
const autoSizeBtn = document.getElementById('autoSizeBtn');
const fitColumnsBtn = document.getElementById('fitColumnsBtn');
const densityBtn = document.getElementById('densityBtn');
const resetLayoutBtn = document.getElementById('resetLayoutBtn');
const clearBtn = document.getElementById('clearBtn');
const envSelect = document.getElementById('envSelect');
const envManageBtn = document.getElementById('envManageBtn');
const envModal = document.getElementById('envModal');
const envCloseBtn = document.getElementById('envCloseBtn');
const envManageSection = document.getElementById('envManage');
const envNameInput = document.getElementById('envName');
const envUrlInput = document.getElementById('envUrl');
const envUserInput = document.getElementById('envUser');
const envPwdInput = document.getElementById('envPwd');
const envSaveBtn = document.getElementById('envSaveBtn');
const envClearFormBtn = document.getElementById('envClearFormBtn');
const envList = document.getElementById('envList');
const splitter = document.getElementById('splitter');
const editorEl = document.getElementById('editorContainer');
const toolbarEl = document.querySelector('header.toolbar');
const mainEl = document.querySelector('main');
const utilityStatusEl = document.getElementById('utilityStatus');

function setStatus(text) { statusText.textContent = text; }

// Utility status messaging
function showUtilityStatus(message, type = 'info', duration = 3000) {
  utilityStatusEl.textContent = message;
  utilityStatusEl.className = `utility-status show ${type}`;
  
  // Auto-hide after duration
  setTimeout(() => {
    utilityStatusEl.classList.remove('show');
  }, duration);
}

function setRunning(running) {
  isRunning = running;
  runBtn.disabled = running;
  cancelBtn.disabled = !running;
  setStatus(running ? 'Running…' : 'Idle');
  runBtn.classList.toggle('is-running', running);
  runSpinner.style.display = running ? 'inline-block' : 'none';
}

function initGrid() {
  const gridElement = document.getElementById('grid');
  const gridOptions = {
    columnDefs: [],
    rowData: [],
    animateRows: true,
    enableCellTextSelection: true,
    suppressColumnVirtualisation: false,
    suppressHorizontalScroll: false,
    domLayout: 'normal',
    defaultColDef: { sortable: true, filter: true, resizable: true, minWidth: 100, width: 160 },
  };
  gridApi = agGrid.createGrid(gridElement, gridOptions);
}

function autoColumnsFromRows(rows) {
  if (!rows || rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return keys.map((k) => ({ field: k }));
}

function updateGrid(rows) {
  const cols = autoColumnsFromRows(rows);
  gridApi.setGridOption('columnDefs', cols);
  gridApi.setGridOption('rowData', rows);
  exportCsvBtn.disabled = rows.length === 0;
  rowCountValueEl.textContent = `${rows.length}`;
}

function mockExecuteQuery(queryText) {
  return new Promise((resolve) => {
    const durationMs = 500;
    currentJobTimeoutId = setTimeout(() => {
      resolve({ rows: [], elapsedMs: durationMs });
    }, durationMs);
  });
}

function onRun() {
  if (isRunning) return;
  setRunning(true);
  const text = monacoEditor.getValue();
  mockExecuteQuery(text)
    .then(({ rows, elapsedMs }) => {
      updateGrid(rows);
      setStatus(`Done in ${elapsedMs} ms`);
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      lastRunInfoEl.textContent = `Last run: Rows ${rows.length} • ${elapsedMs} ms • ${hh}:${mm}:${ss}`;
    })
    .catch((err) => { console.error(err); setStatus('Error'); })
    .finally(() => { setRunning(false); currentJobTimeoutId = null; });
}

function onCancel() {
  if (!isRunning) return;
  if (currentJobTimeoutId !== null) { clearTimeout(currentJobTimeoutId); currentJobTimeoutId = null; }
  setRunning(false);
  setStatus('Cancelled');
}

function initMonaco() {
  require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' } });
  require(['vs/editor/editor.main'], function () {
    monacoEditor = monaco.editor.create(document.getElementById('editorContainer'), {
      value: [
        '-- Type your query here. Run will call the backend in a later step.',
        'SELECT * FROM some_table;',
      ].join('\n'),
      language: 'sql',
      theme: 'vs-dark',
      fontSize: 16,
      fontFamily: 'Courier New, Courier, monospace',
      minimap: { enabled: false },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      tabSize: 2,
    });
  });
}

// Splitter drag logic (vertical resize)
function onSplitterDown(e) {
  isDraggingSplitter = true;
  dragStartY = e.clientY;
  dragStartEditorHeight = editorEl.getBoundingClientRect().height;
  splitter.setPointerCapture?.(e.pointerId);
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'row-resize';
}
function onSplitterMove(e) {
  if (!isDraggingSplitter) return;
  const dy = e.clientY - dragStartY;
  let newHeight = dragStartEditorHeight + dy;
  const toolbarH = toolbarEl?.getBoundingClientRect().height || 60;
  const mainStyles = window.getComputedStyle(mainEl);
  const mainPaddingTop = parseFloat(mainStyles.paddingTop) || 0;
  const mainPaddingBottom = parseFloat(mainStyles.paddingBottom) || 0;
  const available = window.innerHeight - toolbarH - mainPaddingTop - mainPaddingBottom;
  const minEditor = 120;
  const minGrid = 180;
  const maxEditor = Math.max(minEditor, available - minGrid);
  if (newHeight < minEditor) newHeight = minEditor;
  if (newHeight > maxEditor) newHeight = maxEditor;
  document.documentElement.style.setProperty('--editor-height', newHeight + 'px');
  monacoEditor?.layout();
}
function onSplitterUp() {
  if (!isDraggingSplitter) return;
  isDraggingSplitter = false;
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
}

function onExportCsv() {
  if (!gridApi) {
    showUtilityStatus('No Data To Export', 'warning');
    return;
  }
  gridApi.exportDataAsCsv({ suppressQuotes: true, fileName: 'results.csv' });
  showUtilityStatus('CSV Exported Successfully', 'success');
}

async function onSave() {
  try {
    const content = monacoEditor?.getValue() ?? '';
    const defaultName = 'query.sql';
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: defaultName,
        types: [{ description: 'SQL or Text', accept: { 'text/plain': ['.sql', '.txt'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      setStatus('Saved');
      saveBtn.classList.add('flash');
      setTimeout(() => saveBtn.classList.remove('flash'), 750);
    } else {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = defaultName;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setStatus('Downloaded');
      saveBtn.classList.add('flash');
      setTimeout(() => saveBtn.classList.remove('flash'), 750);
    }
  } catch (err) {
    // Handle user cancellation gracefully
    if (err.name === 'AbortError' || err.message?.includes('aborted') || err.message?.includes('cancelled')) {
      setStatus('Save Cancelled');
      return;
    }
    console.error('Save failed', err);
    setStatus('Save error');
  }
}

function onAutoSize() {
  if (!gridApi) {
    showUtilityStatus('No Data To Auto-Size', 'warning');
    return;
  }
  const allCols = [];
  gridApi.getColumnDefs().forEach((c) => allCols.push(c.field));
  gridApi.autoSizeColumns(allCols, false);
  showUtilityStatus('Columns Auto-Sized', 'success');
}
function onFitColumns() { 
  if (!gridApi) {
    showUtilityStatus('No Data To Fit Columns', 'warning');
    return;
  }
  gridApi.sizeColumnsToFit();
  showUtilityStatus('Columns Fitted To Viewport', 'success');
}

// Default to less-dense rows; toggle makes them denser
let dense = false;
function applyDensity() {
  document.documentElement.style.setProperty('--ag-list-item-height', dense ? '28px' : '36px');
  document.documentElement.style.setProperty('--ag-row-height', dense ? '30px' : '38px');
  document.documentElement.style.setProperty('--ag-header-height', dense ? '32px' : '40px');
  gridApi?.refreshHeader();
}
function onToggleDensity() { 
  dense = !dense; 
  applyDensity();
  showUtilityStatus(`Density: ${dense ? 'Compact' : 'Comfortable'}`, 'success');
}

function onResetLayout() { 
  onFitColumns();
  showUtilityStatus('Layout Reset', 'success');
}
function onClearResults() { 
  updateGrid([]);
  showUtilityStatus('Results Cleared', 'success');
}

// Wire up buttons
runBtn.addEventListener('click', onRun);
cancelBtn.addEventListener('click', onCancel);
saveBtn.addEventListener('click', onSave);
exportCsvBtn.addEventListener('click', onExportCsv);
autoSizeBtn.addEventListener('click', onAutoSize);
fitColumnsBtn.addEventListener('click', onFitColumns);
densityBtn.addEventListener('click', onToggleDensity);
resetLayoutBtn.addEventListener('click', onResetLayout);
clearBtn.addEventListener('click', onClearResults);

// Wire up splitter
splitter.addEventListener('pointerdown', onSplitterDown);
window.addEventListener('pointermove', onSplitterMove);
window.addEventListener('pointerup', onSplitterUp);

// Initialize UI parts
initGrid();
initMonaco();
applyDensity();

// ---------- Environments (no master password) ----------
const STORAGE_KEY = 'erp_envs_v1_plain';

function openEnvModal() {
  envModal.classList.remove('hidden');
  envModal.setAttribute('aria-hidden', 'false');
  renderEnvList();
}

function closeEnvModal() {
  envModal.classList.add('hidden');
  envModal.setAttribute('aria-hidden', 'true');
}

async function deriveKeyFromPassphrase(passphrase, saltBytes) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: 200000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function randomBytes(n) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

function loadEncrypted() {
  return localStorage.getItem(STORAGE_KEY) || null;
}

async function saveEnvironments(envs) {
  // In this simplified mode, store as JSON string (still not plaintext in files; local to browser)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(envs));
}

async function getEnvironments() {
  const b64 = loadEncrypted();
  if (!b64) return [];
  try { return JSON.parse(b64); } catch { return []; }
}

function clearEnvForm() {
  envNameInput.value = '';
  envUrlInput.value = '';
  envUserInput.value = '';
  envPwdInput.value = '';
}

async function renderEnvList() {
  envList.innerHTML = '';
  const envs = await getEnvironments();
  // populate dropdown
  envSelect.innerHTML = '<option value="">Environment</option>';
  envs.forEach((env, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = env.name;
    envSelect.appendChild(opt);
  });
  envs.forEach((env, idx) => {
    const li = document.createElement('li');
    const meta = document.createElement('div');
    meta.className = 'env-meta';
    meta.innerHTML = `<strong>${env.name}</strong><span class="muted">${env.url} • ${env.username}</span>`;
    const actions = document.createElement('div');
    actions.className = 'env-actions';
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-fancy-mini accent-red';
    delBtn.title = 'Delete';
    delBtn.innerHTML = '<span class="icon-ch">🗑</span>';
    delBtn.addEventListener('click', async () => {
      const next = envs.filter((_, i) => i !== idx);
      await saveEnvironments(next);
      renderEnvList();
    });
    actions.appendChild(delBtn);
    li.appendChild(meta);
    li.appendChild(actions);
    envList.appendChild(li);
  });
}

// Handlers
envManageBtn.addEventListener('click', openEnvModal);
envCloseBtn.addEventListener('click', closeEnvModal);
envClearFormBtn.addEventListener('click', clearEnvForm);

envSaveBtn.addEventListener('click', async () => {
  const name = (envNameInput.value || '').trim();
  const url = (envUrlInput.value || '').trim();
  const username = (envUserInput.value || '').trim();
  const password = envPwdInput.value || '';
  if (!name || !url || !username || !password) { setStatus('Fill all fields'); return; }
  const envs = await getEnvironments();
  envs.push({ name, url, username, password });
  await saveEnvironments(envs);
  clearEnvForm();
  await renderEnvList();
  setStatus('Environment saved');
});

// Initialize the application
async function initApp() {
  initGrid();
  initMonaco();
  await renderEnvList(); // Load existing environments on startup
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}



