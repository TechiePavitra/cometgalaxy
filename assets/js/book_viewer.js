
// Book Viewer Logic
const viewerState = {
    pdfDoc: null,
    pageNum: 1,
    pageRendering: false,
    pageNumPending: null,
    scale: 1.0,
    canvas: null,
    ctx: null,
    annotationCanvas: null,
    annotationCtx: null,
    currentTool: 'pointer', // pointer, pen, highlighter, eraser
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    penColor: '#00f2ff',
    penSize: 2
};

document.addEventListener('DOMContentLoaded', () => {
    viewerState.canvas = document.getElementById('pdfRender');
    viewerState.ctx = viewerState.canvas ? viewerState.canvas.getContext('2d') : null;
    viewerState.annotationCanvas = document.getElementById('annotationLayer');
    viewerState.annotationCtx = viewerState.annotationCanvas ? viewerState.annotationCanvas.getContext('2d') : null;

    // Tool Buttons
    const tools = {
        pointer: document.getElementById('toolPointer'),
        pen: document.getElementById('toolPen'),
        highlighter: document.getElementById('toolHighlighter'),
        eraser: document.getElementById('toolEraser')
    };

    // Event Listeners for Tools (guarded in case elements are missing)
    Object.keys(tools).forEach(tool => {
        const btn = tools[tool];
        if (!btn) return;
        btn.addEventListener('click', () => setTool(tool));
    });

    // Navigation buttons (guarded)
    const prevBtn = document.getElementById('prevPage'); if(prevBtn) prevBtn.addEventListener('click', onPrevPage);
    const nextBtn = document.getElementById('nextPage'); if(nextBtn) nextBtn.addEventListener('click', onNextPage);
    const zoomInBtn = document.getElementById('zoomIn'); if(zoomInBtn) zoomInBtn.addEventListener('click', onZoomIn);
    const zoomOutBtn = document.getElementById('zoomOut'); if(zoomOutBtn) zoomOutBtn.addEventListener('click', onZoomOut);
    
    const penColorInput = document.getElementById('penColor'); if(penColorInput) penColorInput.addEventListener('input', (e) => viewerState.penColor = e.target.value);
    const penSizeInput = document.getElementById('penSize'); if(penSizeInput) penSizeInput.addEventListener('input', (e) => viewerState.penSize = e.target.value);

    // Canvas Drawing Events (guarded)
    if (viewerState.annotationCanvas) {
        viewerState.annotationCanvas.addEventListener('mousedown', startDrawing);
        viewerState.annotationCanvas.addEventListener('mousemove', draw);
        viewerState.annotationCanvas.addEventListener('mouseup', stopDrawing);
        viewerState.annotationCanvas.addEventListener('mouseout', stopDrawing);
    }

    function setTool(tool) {
        viewerState.currentTool = tool;
        
        // Update UI
        Object.values(tools).forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        if (tools[tool]) tools[tool].classList.add('active');

        // Update Canvas Interaction
        const wrapper = document.getElementById('canvasWrapper');
        if (wrapper) {
            if (tool === 'pointer') {
                wrapper.classList.remove('drawing-mode');
            } else {
                wrapper.classList.add('drawing-mode');
            }
        }
    }

    // Drawing Logic
    function startDrawing(e) {
        if (viewerState.currentTool === 'pointer') return;
        viewerState.isDrawing = true;
        [viewerState.lastX, viewerState.lastY] = [e.offsetX, e.offsetY];
    }

    function draw(e) {
        if (!viewerState.isDrawing || viewerState.currentTool === 'pointer') return;
        
        const ctx = viewerState.annotationCtx;
        if (!ctx) return;
        
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        if (viewerState.currentTool === 'pen') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = viewerState.penColor;
            ctx.lineWidth = viewerState.penSize;
        } else if (viewerState.currentTool === 'highlighter') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = viewerState.penColor; // Usually yellow or neon
            ctx.lineWidth = 15;
            ctx.globalAlpha = 0.3; // Transparent
        } else if (viewerState.currentTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = 20;
            ctx.globalAlpha = 1.0;
        }

        ctx.beginPath();
        ctx.moveTo(viewerState.lastX, viewerState.lastY);
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
        
        // Reset Alpha for other tools
        ctx.globalAlpha = 1.0;

        [viewerState.lastX, viewerState.lastY] = [e.offsetX, e.offsetY];
    }

    function stopDrawing() {
        viewerState.isDrawing = false;
    }
});

// PDF Rendering
function renderPage(num) {
    if (!viewerState.pdfDoc || !viewerState.canvas || !viewerState.ctx) return;
    
    viewerState.pageRendering = true;
    
    // Fetch page
    viewerState.pdfDoc.getPage(num).then(function(page) {
        const viewport = page.getViewport({scale: viewerState.scale});
        viewerState.canvas.height = viewport.height;
        viewerState.canvas.width = viewport.width;
        if (viewerState.annotationCanvas) {
            viewerState.annotationCanvas.height = viewport.height;
            viewerState.annotationCanvas.width = viewport.width;
        }

        // Render PDF page into canvas context
        const renderContext = {
            canvasContext: viewerState.ctx,
            viewport: viewport
        };
        const renderTask = page.render(renderContext);

        // Wait for render to finish
        renderTask.promise.then(function() {
            viewerState.pageRendering = false;
            if (viewerState.pageNumPending !== null) {
                renderPage(viewerState.pageNumPending);
                viewerState.pageNumPending = null;
            }
        });
    }).catch(err => {
        console.error('Error getting page:', err);
        viewerState.pageRendering = false;
    });

    // Update page counters
    const pageNumEl = document.getElementById('pageNum');
    if (pageNumEl) pageNumEl.textContent = num;
}

function queueRenderPage(num) {
    if (viewerState.pageRendering) {
        viewerState.pageNumPending = num;
    } else {
        renderPage(num);
    }
}

function onPrevPage() {
    if (!viewerState.pdfDoc || viewerState.pageNum <= 1) return;
    viewerState.pageNum--;
    queueRenderPage(viewerState.pageNum);
}

function onNextPage() {
    if (!viewerState.pdfDoc || viewerState.pageNum >= viewerState.pdfDoc.numPages) return;
    viewerState.pageNum++;
    queueRenderPage(viewerState.pageNum);
}

function onZoomIn() {
    viewerState.scale += 0.2;
    const zoomEl = document.getElementById('zoomLevel');
    if (zoomEl) zoomEl.textContent = Math.round(viewerState.scale * 100) + '%';
    queueRenderPage(viewerState.pageNum);
}

function onZoomOut() {
    if (viewerState.scale <= 0.4) return;
    viewerState.scale -= 0.2;
    const zoomEl = document.getElementById('zoomLevel');
    if (zoomEl) zoomEl.textContent = Math.round(viewerState.scale * 100) + '%';
    queueRenderPage(viewerState.pageNum);
}

function clearAnnotations() {
    const ctx = viewerState.annotationCtx;
    if (ctx && viewerState.annotationCanvas) {
        ctx.clearRect(0, 0, viewerState.annotationCanvas.width, viewerState.annotationCanvas.height);
    }
}

// Global function to open book
window.loadBookPDF = function(url) {
    // Reset state
    viewerState.pageNum = 1;
    viewerState.scale = 1.0;
    const zoomEl = document.getElementById('zoomLevel');
    if (zoomEl) zoomEl.textContent = '100%';
    clearAnnotations();

    // Load PDF
    if (!pdfjsLib) {
        console.error('PDF.js library not loaded');
        alert('PDF library is not available.');
        return;
    }
    
    pdfjsLib.getDocument(url).promise.then(function(pdfDoc_) {
        viewerState.pdfDoc = pdfDoc_;
        const pageCountEl = document.getElementById('pageCount');
        if (pageCountEl) pageCountEl.textContent = viewerState.pdfDoc.numPages;
        renderPage(viewerState.pageNum);
        
        // Show Modal
        const modal = document.getElementById('bookModal');
        if (modal) modal.classList.add('active');
    }).catch(err => {
        console.error('Error loading PDF:', err);
        alert('Error loading book. Please try again.');
    });
};
