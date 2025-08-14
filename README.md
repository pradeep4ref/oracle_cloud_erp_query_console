# oracle_cloud_erp_query_console
Web-based query console for Oracle Cloud ERP, allowing users to compose, execute, and visualize queries effortlessly.

## UI mock (static)

A quick, zero-build UI prototype is available under `ui/index.html`. It uses CDN scripts for Monaco Editor and AG Grid. You can open it directly in a browser or serve the folder with a tiny web server.

### Open locally

- Option 1: Open the file directly
  - Double-click `ui/index.html` or open it in your browser via `File > Open`.
- Option 2: Serve via a simple web server (recommended for future XHRs)
  - Python 3: `python3 -m http.server 8000` and browse to `http://localhost:8000/personal_repos/oracle_cloud_erp_query_console/ui/`

### UI features implemented

- Editor with SQL highlighting (Monaco)
- Icon-only Run (▶) and Cancel (■) buttons with a spinner on run
- Resizable splitter between editor and results grid (drag to adjust height)
- Data grid (AG Grid) with:
  - Sort, filter, resize columns
  - Horizontal and vertical scrolling for large data
  - Solid header styling, compact toolbar
  - Utility toolbar: auto-size (↔), fit-to-viewport (⇔), density toggle (≋), reset layout (⟲), clear (🗑), export CSV (⭳)
- Layout is responsive and fills the viewport without page scrollbars
- Mocked query execution to preview UX (no backend yet)

### Tools and technologies used (UI)

- HTML + CSS + Vanilla JavaScript (no build step required)
- Monaco Editor (`monaco-editor`) from CDN for SQL editing
  - Why: VS Code-like editor, syntax highlighting, lightweight to include via CDN
- AG Grid Community from CDN for the data grid
  - Why: Powerful grid with sorting, filtering, column resizing, CSV export
- Minimal CSS framework: Pico CSS for basic typography and sensible defaults
- Small custom CSS for theming (dark gradient header, subtle background, compact toolbar)

Key styling decisions:
- Flex layout with a sticky header and a vertical splitter ensures the UI uses the full height
- Grid header is made bold and solid using AG Grid CSS variables
- Utility toolbar is compact (28px height) with small icon buttons to save space
- Density toggle switches between comfy and compact row heights via CSS variables

Keyboard/mouse basics:
- Run ▶ and Cancel ■ buttons are on the top-right
- Drag the splitter bar between editor and grid to resize
- Column headers support sort (click), filter (hamburger menu), and resize (drag edge)

### Next steps

- Replace mock with backend API calls once the service is ready
- Add parameters panel and result pagination if needed

### Planned backend (preview)

When ready, we can add a Python FastAPI backend with endpoints like:

```
POST /api/query/run
POST /api/query/cancel
GET  /api/query/result/{jobId}
```

For Oracle ERP Cloud, the backend will either:
- Call BI Publisher SOAP (ExternalReportWSSService) with whitelisted reports and parameters, or
- For true ad-hoc SQL, query data exported to ADW (via BICC) instead of ERP directly.

### Repository layout

```
personal_repos/oracle_cloud_erp_query_console/
  ui/
    index.html   # Static UI prototype (no build)
  README.md
  LICENSE
```

### Learning resources

- Monaco Editor: `https://microsoft.github.io/monaco-editor/`
- AG Grid Community: `https://www.ag-grid.com/`
- Pico CSS: `https://picocss.com/`
- FastAPI (future backend): `https://fastapi.tiangolo.com/`

### UI demo GIF

Record a short demo and save it at `docs/ui-demo.gif`, then it will appear here:

![UI Demo](docs/ui-demo.gif)

See `docs/RECORDING_GUIDE.md` for quick ways to create a GIF on macOS.

### TODOs (tracked for follow‑up)

- [ ] Add cache‑busting query strings to CSS/JS links
  - Update `ui/index.html` to reference versioned assets:
    - `<link rel="stylesheet" href="./styles.css?v=YYYYMMDD-N">`
    - `<script src="./app.js?v=YYYYMMDD-N"></script>`
  - Increment `v=` when pushing UI changes so browsers fetch the latest.
  - Optional later: use hashed filenames via a bundler instead of `?v=`.

- [ ] Organize `app.js` into ES modules
  - Change script tag: `<script type="module" src="./app.js"></script>`
  - Split into modules:
    - `ui/editor.js`: Monaco setup and helpers
    - `ui/grid.js`: AG Grid setup, update, export
    - `ui/toolbar.js`: wire buttons to callbacks
    - `ui/services/mockService.js` → later `apiClient.js` for backend calls
    - (optional) `ui/state/jobs.js` for job management
  - Keep Monaco loader script before `app.js`; AMD loader remains global
  - Verify Run/Cancel/Save and grid utilities still work

