// Constants
const CONSTANTS = {
  UTILITY_STATUS_DURATION: 3000,
  MOCK_QUERY_DELAY: 1500,
  SAVE_FLASH_DURATION: 750,
  MONACO_FONT_SIZE: 16,
  MONACO_TAB_SIZE: 2,
  MIN_EDITOR_HEIGHT: 120,
  MIN_GRID_HEIGHT: 200
};

// Simple UI state
let isRunning = false;
let currentJobTimeoutId = null;
let gridApi = null;
let monacoEditor = null;
let isDraggingSplitter = false;
let dragStartY = 0;
let dragStartEditorHeight = 0;

// DOM Elements - will be initialized when DOM is ready
let elements = {};

// Initialize DOM elements when ready
function initializeElements() {
  console.log('🔍 Looking for DOM elements...');
  
  elements = {
    // Main action buttons
    actions: {
      run: document.getElementById('runBtn'),
      cancel: document.getElementById('cancelBtn'),
      save: document.getElementById('saveBtn'),
      runSpinner: document.getElementById('runSpinner')
    },
    
    // Status and info displays
    status: {
      main: document.getElementById('statusText'),
      utility: document.getElementById('utilityStatus'),
      rowCount: document.getElementById('rowCountValue'),
      lastRun: document.getElementById('lastRunInfo')
    },
    
    // Grid utility buttons
    grid: {
      export: document.getElementById('exportCsvBtn'),
      autoSize: document.getElementById('autoSizeBtn'),
      fitColumns: document.getElementById('fitColumnsBtn'),
      density: document.getElementById('densityBtn'),
      resetLayout: document.getElementById('resetLayoutBtn'),
      clear: document.getElementById('clearBtn')
    },
    
    // Environment management
    environment: {
      select: document.getElementById('envSelect'),
      manageBtn: document.getElementById('envManageBtn'),
      modal: document.getElementById('envModal'),
      closeBtn: document.getElementById('envCloseBtn'),
      section: document.getElementById('envManage'),
      nameInput: document.getElementById('envName'),
      urlInput: document.getElementById('envUrl'),
      userInput: document.getElementById('envUser'),
      pwdInput: document.getElementById('envPwd'),
      saveBtn: document.getElementById('envSaveBtn'),
      clearFormBtn: document.getElementById('envClearFormBtn'),
      list: document.getElementById('envList')
    },
    
    // Layout elements
    layout: {
      splitter: document.getElementById('splitter'),
      editor: document.getElementById('editorContainer'),
      toolbar: document.querySelector('header.toolbar'),
      main: document.querySelector('main')
    }
  };
}

// ============================================================================
// UI STATE MANAGEMENT MODULE
// ============================================================================

const UIState = {
  setStatus(text) { 
    elements.status.main.textContent = text; 
  },

  showUtilityStatus(message, type = 'info', duration = CONSTANTS.UTILITY_STATUS_DURATION) {
    elements.status.utility.textContent = message;
    elements.status.utility.className = `utility-status show ${type}`;
    
    // Auto-hide after duration
    setTimeout(() => {
      elements.status.utility.classList.remove('show');
    }, duration);
  },

  setRunning(running) {
    isRunning = running;
    elements.actions.run.disabled = running;
    elements.actions.cancel.disabled = !running;
    this.setStatus(running ? 'Running…' : 'Idle');
    elements.actions.run.classList.toggle('is-running', running);
    elements.actions.runSpinner.style.display = running ? 'inline-block' : 'none';
  }
};

// ============================================================================
// GRID MANAGEMENT MODULE
// ============================================================================

const GridManager = {
  initGrid() {
    const gridElement = document.getElementById('grid');
    gridApi = agGrid.createGrid(gridElement, {
      columnDefs: [],
      rowData: [],
      theme: 'quartz',
      defaultColDef: { sortable: true, filter: true, resizable: true },
      enableRangeSelection: true,
      enableCellTextSelection: true,
      suppressMenuHide: false,
      animateRows: true
    });
  },

  autoColumnsFromRows(rows) {
    if (!rows.length) return [];
    return Object.keys(rows[0]).map(key => ({ field: key, headerName: key }));
  },

  updateGrid(rows) {
    const cols = this.autoColumnsFromRows(rows);
    gridApi.setGridOption('columnDefs', cols);
    gridApi.setGridOption('rowData', rows);
    elements.grid.export.disabled = rows.length === 0;
    elements.status.rowCount.textContent = `${rows.length}`;
  },

  onAutoSize() {
    try {
      if (!gridApi) {
        UIState.showUtilityStatus('No Data To Auto-Size', 'warning');
        return;
      }
      const allCols = [];
      gridApi.getColumnDefs().forEach((c) => allCols.push(c.field));
      gridApi.autoSizeColumns(allCols, false);
      UIState.showUtilityStatus('Columns Auto-Sized', 'success');
    } catch (err) {
      console.error('Auto-size failed:', err);
      UIState.showUtilityStatus('Auto-Size Error', 'error');
    }
  },

  onFitColumns() {
    try {
      if (!gridApi) {
        UIState.showUtilityStatus('No Data To Fit Columns', 'warning');
        return;
      }
      gridApi.sizeColumnsToFit();
      UIState.showUtilityStatus('Columns Fitted To Viewport', 'success');
    } catch (err) {
      console.error('Fit columns failed:', err);
      UIState.showUtilityStatus('Fit Columns Error', 'error');
    }
  },

  onResetLayout() {
    try {
      this.updateGrid([]);
      UIState.showUtilityStatus('Layout Reset', 'success');
    } catch (err) {
      console.error('Reset layout failed:', err);
      UIState.showUtilityStatus('Reset Error', 'error');
    }
  },

  onClearResults() {
    try {
      this.updateGrid([]);
      UIState.showUtilityStatus('Results Cleared', 'success');
    } catch (err) {
      console.error('Clear results failed:', err);
      UIState.showUtilityStatus('Clear Error', 'error');
    }
  }
};

// ============================================================================
// QUERY EXECUTION MODULE
// ============================================================================

const QueryExecution = {
  mockExecuteQuery(queryText) {
    return new Promise((resolve) => {
      const durationMs = CONSTANTS.MOCK_QUERY_DELAY;
      currentJobTimeoutId = setTimeout(() => {
        resolve({ rows: [], elapsedMs: durationMs });
      }, durationMs);
    });
  },

  onRun() {
    if (isRunning) return;
    UIState.setRunning(true);
    const text = monacoEditor.getValue();
    QueryExecution.mockExecuteQuery(text)
      .then(({ rows, elapsedMs }) => {
        GridManager.updateGrid(rows);
        UIState.setStatus(`Done in ${elapsedMs} ms`);
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        elements.status.lastRun.textContent = `Last run: Rows ${rows.length} • ${elapsedMs} ms • ${hh}:${mm}:${ss}`;
      })
      .catch((err) => { console.error(err); UIState.setStatus('Error'); })
      .finally(() => { UIState.setRunning(false); currentJobTimeoutId = null; });
  },

  onCancel() {
    if (!isRunning) return;
    if (currentJobTimeoutId !== null) { clearTimeout(currentJobTimeoutId); currentJobTimeoutId = null; }
    UIState.setRunning(false);
    UIState.setStatus('Cancelled');
  }
};

// ============================================================================
// EDITOR MANAGEMENT MODULE
// ============================================================================

const EditorManager = {
  initMonaco() {
    require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' } });
    require(['vs/editor/editor.main'], function () {
      monacoEditor = monaco.editor.create(document.getElementById('editorContainer'), {
        value: [
          '-- Type your query here. Run will call the backend in a later step.',
          'SELECT * FROM some_table;',
        ].join('\n'),
        language: 'sql',
        theme: 'vs-dark',
        fontSize: CONSTANTS.MONACO_FONT_SIZE,
        fontFamily: 'Courier New, Courier, monospace',
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        tabSize: CONSTANTS.MONACO_TAB_SIZE,
      });
    });
  }
};

// ============================================================================
// LAYOUT MANAGEMENT MODULE
// ============================================================================

const LayoutManager = {
  onSplitterDown(e) {
    isDraggingSplitter = true;
    dragStartY = e.clientY;
    dragStartEditorHeight = elements.layout.editor.getBoundingClientRect().height;
    elements.layout.splitter.setPointerCapture?.(e.pointerId);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
  },

  onSplitterMove(e) {
    if (!isDraggingSplitter) return;
    const dy = e.clientY - dragStartY;
    let newHeight = dragStartEditorHeight + dy;
    const toolbarH = elements.layout.toolbar?.getBoundingClientRect().height || 60;
    const mainStyles = window.getComputedStyle(elements.layout.main);
    const mainPaddingTop = parseFloat(mainStyles.paddingTop) || 0;
    const mainPaddingBottom = parseFloat(mainStyles.paddingBottom) || 0;
    const available = window.innerHeight - toolbarH - mainPaddingTop - mainPaddingBottom;
    const minEditor = CONSTANTS.MIN_EDITOR_HEIGHT;
    const minGrid = CONSTANTS.MIN_GRID_HEIGHT;
    const maxEditor = Math.max(minEditor, available - minGrid);
    if (newHeight < minEditor) newHeight = minEditor;
    if (newHeight > maxEditor) newHeight = maxEditor;
    document.documentElement.style.setProperty('--editor-height', newHeight + 'px');
    monacoEditor?.layout();
  },

  onSplitterUp() {
    if (!isDraggingSplitter) return;
    isDraggingSplitter = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }
};

// ============================================================================
// FILE OPERATIONS MODULE
// ============================================================================

const FileOperations = {
  onExportCsv() {
    if (!gridApi) {
      UIState.showUtilityStatus('No Data To Export', 'warning');
      return;
    }
    gridApi.exportDataAsCsv({ suppressQuotes: true, fileName: 'results.csv' });
    UIState.showUtilityStatus('CSV Exported Successfully', 'success');
  },

  async onSave() {
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
        UIState.setStatus('Saved');
        elements.actions.save.classList.add('flash');
        setTimeout(() => elements.actions.save.classList.remove('flash'), CONSTANTS.SAVE_FLASH_DURATION);
      } else {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = defaultName;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        UIState.setStatus('Downloaded');
        elements.actions.save.classList.add('flash');
        setTimeout(() => elements.actions.save.classList.remove('flash'), CONSTANTS.SAVE_FLASH_DURATION);
      }
    } catch (err) {
      // Handle user cancellation gracefully
      if (err.name === 'AbortError' || err.message?.includes('aborted') || err.message?.includes('cancelled')) {
        UIState.setStatus('Save Cancelled');
        return;
      }
      console.error('Save failed', err);
      UIState.setStatus('Save Error');
    }
  }
};

// ============================================================================
// UTILITY FUNCTIONS MODULE
// ============================================================================

const UtilityFunctions = {
  // Default to less-dense rows; toggle makes them denser
  dense: false,
  
  applyDensity() {
    const gridContainer = document.getElementById('gridContainer');
    if (this.dense) {
      // Add a custom class for dense styling
      gridContainer.classList.add('dense-mode');
    } else {
      // Remove dense styling
      gridContainer.classList.remove('dense-mode');
    }
  },
  
  onToggleDensity() { 
    this.dense = !this.dense; 
    this.applyDensity();
    UIState.showUtilityStatus(this.dense ? 'Dense View' : 'Normal View', 'info');
  }
};

// ============================================================================
// ENVIRONMENT MANAGEMENT MODULE
// ============================================================================

const EnvironmentManager = {
  STORAGE_KEY: 'erp_envs_v1_plain',

  openEnvModal() {
    elements.environment.modal.classList.remove('hidden');
    elements.environment.modal.setAttribute('aria-hidden', 'false');
    this.renderEnvList();
  },

  closeEnvModal() {
    elements.environment.modal.classList.add('hidden');
    elements.environment.modal.setAttribute('aria-hidden', 'true');
  },

  async deriveKeyFromPassphrase(passphrase, saltBytes) {
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
  },

  randomBytes(n) {
    const a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return a;
  },

  loadEncrypted() {
    return localStorage.getItem(this.STORAGE_KEY) || null;
  },

  async saveEnvironments(envs) {
    // In this simplified mode, store as JSON string (still not plaintext in files; local to browser)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(envs));
  },

  async getEnvironments() {
    const b64 = this.loadEncrypted();
    if (!b64) return [];
    try { return JSON.parse(b64); } catch { return []; }
  },

  clearEnvForm() {
    elements.environment.nameInput.value = '';
    elements.environment.urlInput.value = '';
    elements.environment.userInput.value = '';
    elements.environment.pwdInput.value = '';
  },

  async renderEnvList() {
    elements.environment.list.innerHTML = '';
    const envs = await this.getEnvironments();
    // populate dropdown
    elements.environment.select.innerHTML = '<option value="">Environment</option>';
    envs.forEach((env, idx) => {
      const opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = env.name;
      elements.environment.select.appendChild(opt);
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
        await this.saveEnvironments(next);
        this.renderEnvList();
      });
      actions.appendChild(delBtn);
      li.appendChild(meta);
      li.appendChild(actions);
      elements.environment.list.appendChild(li);
    });
  },

  async onSaveEnvironment() {
    const name = (elements.environment.nameInput.value || '').trim();
    const url = (elements.environment.urlInput.value || '').trim();
    const username = (elements.environment.userInput.value || '').trim();
    const password = elements.environment.pwdInput.value || '';
    if (!name || !url || !username || !password) { 
      UIState.setStatus('Fill all fields'); 
      return; 
    }
    const envs = await this.getEnvironments();
    envs.push({ name, url, username, password });
    await this.saveEnvironments(envs);
    this.clearEnvForm();
    await this.renderEnvList();
    UIState.setStatus('Environment saved');
  }
};

// ============================================================================
// EVENT BINDINGS SETUP
// ============================================================================

function setupEventListeners() {
  // Main action buttons
  elements.actions.run.addEventListener('click', () => QueryExecution.onRun());
  elements.actions.cancel.addEventListener('click', () => QueryExecution.onCancel());
  elements.actions.save.addEventListener('click', FileOperations.onSave);

  // Grid utility buttons
  elements.grid.export.addEventListener('click', () => FileOperations.onExportCsv());
  elements.grid.autoSize.addEventListener('click', () => GridManager.onAutoSize());
  elements.grid.fitColumns.addEventListener('click', () => GridManager.onFitColumns());
  elements.grid.density.addEventListener('click', () => UtilityFunctions.onToggleDensity());
  elements.grid.resetLayout.addEventListener('click', () => GridManager.onResetLayout());
  elements.grid.clear.addEventListener('click', () => GridManager.onClearResults());

  // Layout splitter
  elements.layout.splitter.addEventListener('pointerdown', (e) => LayoutManager.onSplitterDown(e));
  window.addEventListener('pointermove', (e) => LayoutManager.onSplitterMove(e));
  window.addEventListener('pointerup', () => LayoutManager.onSplitterUp());

  // Environment event bindings
  elements.environment.manageBtn.addEventListener('click', () => EnvironmentManager.openEnvModal());
  elements.environment.closeBtn.addEventListener('click', () => EnvironmentManager.closeEnvModal());
  elements.environment.clearFormBtn.addEventListener('click', () => EnvironmentManager.clearEnvForm());
  elements.environment.saveBtn.addEventListener('click', () => EnvironmentManager.onSaveEnvironment());
}

// ============================================================================
// APPLICATION INITIALIZATION
// ============================================================================

// Initialize the application
async function initApp() {
  console.log('🚀 Starting app initialization...');
  
  try {
    // Initialize DOM elements first
    console.log('📋 Initializing DOM elements...');
    initializeElements();
    console.log('✅ DOM elements initialized');
    
    // Set up event listeners
    console.log('🔗 Setting up event listeners...');
    setupEventListeners();
    console.log('✅ Event listeners set up');
    
    // Initialize components
    console.log('🔧 Initializing components...');
    GridManager.initGrid();
    console.log('✅ Grid initialized');
    
    EditorManager.initMonaco();
    console.log('✅ Monaco editor initialized');
    
    UtilityFunctions.applyDensity();
    console.log('✅ Density applied');
    
    await EnvironmentManager.renderEnvList(); // Load existing environments on startup
    console.log('✅ Environment list rendered');
    
    console.log('🎉 App initialization complete!');
  } catch (error) {
    console.error('❌ App initialization failed:', error);
  }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}



