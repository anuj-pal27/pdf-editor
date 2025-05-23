let pdfDoc = null;
let pageNum = 1;
let fabricCanvas = null;
let rotationAngle = 0; // Default rotation angle
  // Initialize zoom buttons
  let zoomScale = 1.5; // Default zoom scale
let activeText = null;
let isTextMode = false;
let isLinkMode = false;

// Add these to your global variables
let canvasHistory = [];
let currentHistoryIndex = -1;

// Add to your global variables
let isDrawingShape = false;
let currentShape = null;
let startPoint = null;

// Add to your global variables
let isAnnotateMode = false;
let currentAnnotationColor = '#000000'; // Default text color
let currentAnnotationBg = '#fff4b8';    // Default background color

// Add these to your global variables at the top
let currentPage = 1;
let totalPages = 1;

// Add this to your global variables at the top
let isDeleteMode = false;
let currentCanvasX = 0;
let currentCanvasY = 0;

// Initialize fabric canvas after DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing canvas");
  fabricCanvas = new fabric.Canvas("pdf-canvas", {
    width: 800,
    height: 1000,
    backgroundColor: "white",
  });





  const zoomInBtn = document.getElementById("zoom-in-btn");
  const zoomOutBtn = document.getElementById("zoom-out-btn");

  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", function () {
      zoomScale = Math.min(zoomScale + 0.2, 3); // Max zoom limit 3x
      renderPage(pageNum, zoomScale);
    });
  } else {
    console.error("Zoom In button not found");
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", function () {
      zoomScale = Math.max(zoomScale - 0.2, 0.5); // Min zoom limit 0.5x
      renderPage(pageNum, zoomScale);
    });
  } else {
    console.error("Zoom Out button not found");
  }

  //Rotate button
  document.getElementById('rotate-btn')?.addEventListener('click', rotateLeft);
  // Add click handler for upload button
  const uploadBtn = document.getElementById("upload-btn");
  const fileInput = document.getElementById("pdf-upload");

  if (uploadBtn) {
    uploadBtn.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("Upload button clicked");
      fileInput.click();
    });
  } else {
    console.error("Upload button not found");
  }

  if (fileInput) {
    fileInput.addEventListener("change", async function (event) {
      console.log("File input change detected");
      const file = event.target.files[0];
      if (file && file.type === "application/pdf") {
        console.log("Valid PDF file selected:", file.name);

        // Hide upload section and show PDF editor
        document.getElementById("upload-section").style.display = "none";
        document.getElementById("features-section").style.display = "block";
        document.getElementById("pdf-container").style.display = "block";
        document.getElementById("why-choose-section").style.display = "none";

        try {
          const arrayBuffer = await file.arrayBuffer();
          const typedarray = new Uint8Array(arrayBuffer);
          console.log("File converted to array buffer");
          await loadPDF(typedarray);
        } catch (error) {
          console.error("Error loading PDF:", error);
          alert("Error loading PDF file");
        }
      } else {
        alert("Please upload a valid PDF file.");
      }
    });
  } else {
    console.error("File input not found");
  }

  // Text formatting toolbar events
  document.getElementById('bold-btn').addEventListener('click', toggleBold);
  document.getElementById('italic-btn').addEventListener('click', toggleItalic);
  document.getElementById('underline-btn').addEventListener('click', toggleUnderline);
  document.getElementById('font-size').addEventListener('change', changeFontSize);
  document.getElementById('text-color').addEventListener('input', changeTextColor);

  // Listen for text selection
  fabricCanvas.on('selection:created', handleTextSelection);
  fabricCanvas.on('selection:updated', handleTextSelection);
  fabricCanvas.on('selection:cleared', hideTextToolbar);

  // Save and share functionality
  document.getElementById('save-btn').addEventListener('click', showSaveModal);
  document.getElementById('close-modal').addEventListener('click', hideSaveModal);
  document.getElementById('download-btn').addEventListener('click', downloadPDF);
  document.getElementById('share-btn').addEventListener('click', sharePDF);
  document.getElementById('print-btn').addEventListener('click', printPDF);
  document.getElementById('email-btn').addEventListener('click', emailPDF);

  const addTextBtn = document.getElementById('add-text-btn');
  if (addTextBtn) {
    addTextBtn.addEventListener('click', function() {
      isTextMode = !isTextMode; // Toggle text mode
      
      // Toggle active class on button
      this.classList.toggle('active');
      
      // Update cursor based on mode
      if (isTextMode) {
        fabricCanvas.defaultCursor = 'text';
        fabricCanvas.on('mouse:down', addText);
      } else {
        fabricCanvas.defaultCursor = 'default';
        fabricCanvas.off('mouse:down', addText);
      }
    });
  }
  // Image button handler - with console logs for debugging
  const imageBtn = document.querySelector('button[title="Image"]');
  console.log('Image button found:', imageBtn); // Debug log
  
  if (imageBtn) {
    console.log('Image button found'); // Debugging log
    imageBtn.addEventListener('click', showImageModal);
  } else {
    console.error('Image button not found'); // Debugging log
  }
  // Link button functionality
  const linkBtn = document.querySelector('button[title="Link"]');
  if (linkBtn) {
    linkBtn.addEventListener('click', function() {
      isLinkMode = !isLinkMode;
      this.classList.toggle('active');
      
      if (isLinkMode) {
        fabricCanvas.defaultCursor = 'crosshair';
        fabricCanvas.on('mouse:down', startAddLink);
      } else {
        fabricCanvas.defaultCursor = 'default';
        fabricCanvas.off('mouse:down', startAddLink);
      }
    });
  }

  // Link modal buttons
  document.getElementById('add-link-btn').addEventListener('click', addLink);
  document.getElementById('cancel-link-btn').addEventListener('click', hideLinkModal);
  document.getElementById('close-link-modal').addEventListener('click', hideLinkModal);

  // Delete button handler
  document.getElementById('delete-btn')?.addEventListener('click', deleteSelectedObject);

  // Signature button handler
  const signBtn = document.querySelector('button[title="Sign"]');
  if (signBtn) {
    signBtn.addEventListener('click', showSignatureModal);
  }

  // Signature modal handlers
  document.getElementById('draw-sig-btn').addEventListener('click', startDrawSignature);
  document.getElementById('upload-sig-btn').addEventListener('click', () => document.getElementById('sig-upload').click());
  document.getElementById('sig-upload').addEventListener('change', handleSignatureUpload);
  document.getElementById('close-sig-modal').addEventListener('click', hideSignatureModal);

  // Undo button handler
  const undoBtn = document.querySelector('button[title="Undo"]');
  if (undoBtn) {
    undoBtn.addEventListener('click', undo);
  }

  // Save state after any canvas modification
  fabricCanvas.on('object:added', saveCanvasState);
  fabricCanvas.on('object:modified', saveCanvasState);
  fabricCanvas.on('object:removed', saveCanvasState);

  // Shapes button and dropdown
  const shapesBtn = document.querySelector('button[title="Shapes"]');
  const shapesDropdown = document.querySelector('.shapes-dropdown');
  
  if (shapesBtn && shapesDropdown) {
    shapesBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      shapesDropdown.classList.toggle('show');
      
      // Position dropdown relative to button
      const btnRect = this.getBoundingClientRect();
      shapesDropdown.style.position = 'absolute';
      shapesDropdown.style.top = '100%'; // Position below the button
      shapesDropdown.style.left = '0';   // Align with left edge of button
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!shapesDropdown.contains(e.target) && !shapesBtn.contains(e.target)) {
        shapesDropdown.classList.remove('show');
      }
    });
  }

  // Shape buttons click handlers
  document.querySelectorAll('.shape-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const shape = this.dataset.shape;
      startDrawingShape(shape);
      shapesDropdown.classList.remove('show');
    });
  });

  // Canvas event handlers for shape drawing
  fabricCanvas.on('mouse:down', startShape);
  fabricCanvas.on('mouse:move', drawShape);
  fabricCanvas.on('mouse:up', finishShape);

  // Annotate button handler
  const annotateBtn = document.querySelector('button[title="Annotate"]');
  const colorPickers = document.querySelector('.annotation-colors');
  
  if (annotateBtn) {
    annotateBtn.addEventListener('click', function() {
      isAnnotateMode = !isAnnotateMode;
      this.classList.toggle('active');
      
      if (isAnnotateMode) {
        fabricCanvas.defaultCursor = 'crosshair';
        fabricCanvas.on('mouse:down', addAnnotation);
      } else {
        fabricCanvas.defaultCursor = 'default';
        fabricCanvas.off('mouse:down', addAnnotation);
      }
    });
  }

  // Color picker handlers
  document.getElementById('annotation-text-color').addEventListener('input', function(e) {
    currentAnnotationColor = e.target.value;
  });

  document.getElementById('annotation-bg-color').addEventListener('input', function(e) {
    currentAnnotationBg = e.target.value;
  });

  // Close color pickers when clicking outside
  document.addEventListener('click', function(e) {
    if (!annotateBtn.contains(e.target) && !colorPickers.contains(e.target)) {
      colorPickers.style.display = 'none';
      isAnnotateMode = false;
      annotateBtn.classList.remove('active');
      fabricCanvas.defaultCursor = 'default';
      fabricCanvas.off('mouse:down', addAnnotation);
    }
  });

  // Setup delete button
  setupDeleteButton();
});

// Function to show image modal
function showImageModal() {

    // Show the modal
    const imageModal = document.getElementById('image-modal');
    if (imageModal) {
        imageModal.style.display = 'block';
    }
    setupImageModalListeners();
}

// Function to setup image modal listeners
function setupImageModalListeners() {
    const imageModal = document.getElementById('image-modal');
    const imageUpload = document.getElementById('image-upload');
    const uploadBtn = document.getElementById('upload-img-btn')
    const closeBtn = document.getElementById('close-image-modal');
    console.log(uploadBtn);
    // Upload button click
    uploadBtn.addEventListener('click', () => {
        console.log('Upload button clicked');
        imageUpload.click();
    });
    
    // File selection
    imageUpload.addEventListener('change', handleImageUpload);
    
    // Close button
    closeBtn.addEventListener('click', () => {
        console.log('Setting up image modal listeners');
        imageModal.style.display = 'none';
    });
    
    // Click outside to close
    window.addEventListener('click', (e) => {
        if (e.target === imageModal) {
            imageModal.style.display = 'none';
        }
    });
}

// Function to handle image upload
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            fabric.Image.fromURL(e.target.result, function(img) {
                // Scale image if too large
                const maxSize = 300;
                if (img.width > maxSize || img.height > maxSize) {
                    const scale = maxSize / Math.max(img.width, img.height);
                    img.scale(scale);
                }

                // Center image
                img.set({
                    left: fabricCanvas.width / 2 - (img.width * img.scaleX) / 2,
                    top: fabricCanvas.height / 2 - (img.height * img.scaleY) / 2
                });

                fabricCanvas.add(img);
                fabricCanvas.setActiveObject(img);
                
                fabricCanvas.renderAll();
                
                // Save state for undo
                saveCanvasState();
                
                // Close modal
                document.getElementById('image-modal').style.display = 'none';
            });
        };
        
        reader.readAsDataURL(file);
    }
}

async function loadPDF(pdfData) {
    try {
        // Load the PDF document
        pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
        console.log("PDF loaded successfully");

        // Get total pages
        totalPages = pdfDoc.numPages;
        currentPage = 1;
        pageNum = 1;

        // Initialize fabric canvas if not already done
        if (!fabricCanvas) {
            const success = initializeFabricCanvas();
            if (!success) {
                throw new Error("Failed to initialize canvas");
            }
        }

        // Initialize page navigation
        initializePageNavigation(pdfDoc.numPages);

        // Render the first page
        await renderPage(currentPage, zoomScale);

        console.log("PDF initialized successfully");
    } catch (error) {
        console.error("Error in loadPDF:", error);
        throw error;
    }
}

// Add these new functions for page navigation
function initializePageNavigation(numPages) {
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    const pageNumSpan = document.getElementById('page-num');
    const pageCountSpan = document.getElementById('page-count');

    // Set total pages
    totalPages = numPages;
    pageCountSpan.textContent = numPages;

    // Update current page
    pageNumSpan.textContent = pageNum;

    // Previous page button
    prevButton.addEventListener('click', () => {
        if (pageNum <= 1) return;
        pageNum--;
        renderPage(pageNum, zoomScale);
    });

    // Next page button
    nextButton.addEventListener('click', () => {
        if (pageNum >= totalPages) return;
        pageNum++;
        renderPage(pageNum, zoomScale);
    });

    // Initial update
    updatePageNavigation();
}

function updatePageNavigation() {
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    const pageNumSpan = document.getElementById('page-num');

    // Update page number display
    pageNumSpan.textContent = pageNum;

    // Enable/disable buttons based on current page
    prevButton.disabled = pageNum <= 1;
    nextButton.disabled = pageNum >= totalPages;
}
async function renderPage(num, zoomScale = 1.5) {
    try {
      console.log("Rendering page", num, "at zoom", zoomScale);
      const page = await pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale: zoomScale, rotation: rotationAngle });
  
      await page.getOperatorList(); // Ensures all objects are processed
  
      // Set canvas size
      fabricCanvas.setWidth(viewport.width);
      fabricCanvas.setHeight(viewport.height);
  
      // Clear existing content
      fabricCanvas.clear();
  
      // Get text content
      const textContent = await page.getTextContent();
  
      textContent.items.forEach((item) => {
        const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const fontSize = Math.sqrt(transform[0] ** 2 + transform[1] ** 2);
  
        let left = transform[4];
        let top = transform[5] - fontSize;
  
        // Adjust positioning based on rotation
        switch (rotationAngle) {
          case 90:
            [left, top] = [top, viewport.width - left];
            break;
          case 180:
            [left, top] = [viewport.width - left, viewport.height - top];
            break;
          case 270:
            [left, top] = [viewport.height - top, left];
            break;
        }
  
        const text = new fabric.IText(item.str, {
          left,
          top,
          fontSize,
          fill: item.color || "#000000",
          fontFamily: item.fontFamily || "Arial",
          editable: true,
          selectable: true,
          hasControls: true,
          originX: "left",
          originY: "top",
        });
  
        fabricCanvas.add(text);
      });
  
      // 🔹 Extract and render images
      const opList = await page.getOperatorList();
      const xObjects = page.resources?.get("XObject") || {}; // Ensure `resources` exist
  
      if (!xObjects) {
        console.warn("No image objects found in the PDF.");
        return;
      }
  
      console.log(xObjects);
  
      for (let i = 0; i < opList.fnArray.length; i++) {
        if (opList.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
          const imageKey = opList.argsArray[i][0];
  
          try {
            console.log(`Processing image: ${imageKey}`);
  
            // Ensure `commonObjs` exists
            if (!page.commonObjs) {
              console.warn("page.commonObjs is undefined, skipping image processing.");
              continue;
            }
  
            // 🔹 Ensure the image object is loaded
            await page.commonObjs.ensureObj(imageKey);
            const img = page.commonObjs.get(imageKey);
  
            if (!img) {
              console.warn(`Image ${imageKey} is not available.`);
              continue;
            }
  
            console.log("Extracted Image:", img);
  
            const imageCanvas = document.createElement("canvas");
            imageCanvas.width = img.width;
            imageCanvas.height = img.height;
            const imgCtx = imageCanvas.getContext("2d");
  
            imgCtx.putImageData(
              new ImageData(new Uint8ClampedArray(img.data), img.width, img.height),
              0,
              0
            );
  
            let left = img.transform[4] || 0;
            let top = img.transform[5] || 0;
  
            // Adjust positioning based on rotation
            switch (rotationAngle) {
              case 90:
                [left, top] = [top, viewport.width - left];
                break;
              case 180:
                [left, top] = [viewport.width - left, viewport.height - top];
                break;
              case 270:
                [left, top] = [viewport.height - top, left];
                break;
            }
  
            const fabricImg = new fabric.Image(imageCanvas, {
              left,
              top,
              scaleX: img.width / imageCanvas.width,
              scaleY: img.height / imageCanvas.height,
              selectable: true,
              hasControls: true,
            });
  
            fabricCanvas.add(fabricImg);
          } catch (err) {
            console.warn(`Image ${imageKey} not loaded yet, skipping...`, err);
          }
        }
      }
  
      fabricCanvas.renderAll();
  
      // Update navigation after rendering
      updatePageNavigation();
  
      // Update current page
      currentPage = num;
      pageNum = num;
  
    } catch (error) {
      console.error("Error in renderPage:", error);
      throw error;
    }
  }
  
//rotate canvas
function rotateLeft() {
  rotationAngle = (rotationAngle +90) % 360; // Rotate -90 degrees
  console.log('Rotating Left:', rotationAngle);
  renderPage(pageNum);
}
function updateCanvasRotation() {
  console.log(`Updating Canvas Rotation: ${rotationAngle} degrees`);

  // Apply rotation to each object in fabricCanvas
  fabricCanvas.forEachObject((obj) => {
      obj.rotate(rotationAngle);
      obj.setCoords(); // Update object position
  });

  // Set canvas rotation using CSS transform
  fabricCanvas.getElement().style.transform = `rotate(${rotationAngle}deg)`;

  fabricCanvas.renderAll();
}
// Add text function
function addText(event) {
  if (!isTextMode) return;

  // Get click position
  const pointer = fabricCanvas.getPointer(event.e);
  
  // Create new text object
  const text = new fabric.IText('Click to edit', {
    left: pointer.x,
    top: pointer.y,
    fontSize: 20,
    fill: '#000000',
    fontFamily: 'Arial',
    editable: true
  });
  
  fabricCanvas.add(text);
  fabricCanvas.setActiveObject(text);
  
  // Exit text mode after adding text
  isTextMode = false;
  document.getElementById('add-text-btn').classList.remove('active');
  fabricCanvas.defaultCursor = 'default';
  fabricCanvas.off('mouse:down', addText);
  
  // Show toolbar for the new text
  showTextToolbar();
  updateToolbarState(text);
}

// Handle text selection
function handleTextSelection(e) {
    const selectedObject = fabricCanvas.getActiveObject();
    if (selectedObject && selectedObject.type === 'i-text') {
        showTextToolbar();
        updateToolbarState(selectedObject);
    }
}

function showTextToolbar() {
    const toolbar = document.getElementById('text-toolbar');
    if (toolbar) {
        toolbar.style.display = 'flex';
    }
}

function hideTextToolbar() {
    const toolbar = document.getElementById('text-toolbar');
    if (toolbar) {
        toolbar.style.display = 'none';
    }
}

function updateToolbarState(textObject) {
    const boldBtn = document.getElementById('bold-btn');
    const italicBtn = document.getElementById('italic-btn');
    const underlineBtn = document.getElementById('underline-btn');
    const fontSizeSelect = document.getElementById('font-size');
    const colorInput = document.getElementById('text-color');

    if (boldBtn) boldBtn.classList.toggle('active', textObject.fontWeight === 'bold');
    if (italicBtn) italicBtn.classList.toggle('active', textObject.fontStyle === 'italic');
    if (underlineBtn) underlineBtn.classList.toggle('active', textObject.underline);
    if (fontSizeSelect) fontSizeSelect.value = textObject.fontSize || 16;
    if (colorInput) colorInput.value = textObject.fill || '#000000';
}

// Add these text formatting functions
function toggleBold() {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && activeObject.type === 'i-text') {
        activeObject.set('fontWeight', activeObject.fontWeight === 'bold' ? 'normal' : 'bold');
        fabricCanvas.renderAll();
        updateToolbarState(activeObject);
    }
}

function toggleItalic() {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && activeObject.type === 'i-text') {
        activeObject.set('fontStyle', activeObject.fontStyle === 'italic' ? 'normal' : 'italic');
        fabricCanvas.renderAll();
        updateToolbarState(activeObject);
    }
}

function toggleUnderline() {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && activeObject.type === 'i-text') {
        activeObject.set('underline', !activeObject.underline);
        fabricCanvas.renderAll();
        updateToolbarState(activeObject);
    }
}

function changeFontSize(e) {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && activeObject.type === 'i-text') {
        activeObject.set('fontSize', parseInt(e.target.value));
        fabricCanvas.renderAll();
    }
}

function changeTextColor(e) {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && activeObject.type === 'i-text') {
        activeObject.set('fill', e.target.value);
        fabricCanvas.renderAll();
    }
}

function showSaveModal() {
    document.getElementById('save-modal').style.display = 'block';
}

function hideSaveModal() {
    document.getElementById('save-modal').style.display = 'none';
}

async function downloadPDF() {
    try {
        // Deselect any active objects before downloading
        fabricCanvas.discardActiveObject();
        fabricCanvas.renderAll();

        // Create new jsPDF instance
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Get canvas data
        const canvas = fabricCanvas.getElement();
        const imgData = canvas.toDataURL('image/png', 1.0);

        // Calculate dimensions
        const imgProps = doc.getImageProperties(imgData);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        // Add image to PDF
        doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        // Save the PDF
        doc.save('edited-document.pdf');
        
        hideSaveModal();
    } catch (error) {
        console.error('Error downloading PDF:', error);
        alert('Error downloading PDF. Please try again.');
    }
}

function sharePDF() {
    // Get canvas data
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();
    const canvas = fabricCanvas.getElement();
    const imgData = canvas.toDataURL('image/png', 1.0);

    // Create a share modal
    const shareModal = document.createElement('div');
    shareModal.className = 'share-modal';
    shareModal.innerHTML = `
        <div class="share-modal-content">
            <h3>Share PDF</h3>
            <div class="share-options">
                <button class="share-btn" data-type="email">
                    <i class="fas fa-envelope"></i>
                    Email
                </button>
                <button class="share-btn" data-type="whatsapp">
                    <i class="fab fa-whatsapp"></i>
                    WhatsApp
                </button>
                <button class="share-btn" data-type="telegram">
                    <i class="fab fa-telegram"></i>
                    Telegram
                </button>
                <button class="share-btn" data-type="copy">
                    <i class="fas fa-link"></i>
                    Copy Link
                </button>
            </div>
            <button class="close-share-modal">×</button>
        </div>
    `;

    // Add styles for the share modal
    const style = document.createElement('style');
    style.textContent = `
        .share-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1001;
        }
        .share-modal-content {
            background: white;
            padding: 20px;
            border-radius: 8px;
            position: relative;
            width: 90%;
            max-width: 400px;
        }
        .share-options {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-top: 20px;
        }
        .share-btn {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            background: white;
            cursor: pointer;
            transition: all 0.3s;
        }
        .share-btn:hover {
            background: #f5f5f5;
            border-color: #f86635;
            color: #f86635;
        }
        .close-share-modal {
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
        }
        .close-share-modal:hover {
            color: #f86635;
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(shareModal);

    // Handle share button clicks
    shareModal.addEventListener('click', async (e) => {
        const button = e.target.closest('.share-btn');
        if (button) {
            const type = button.dataset.type;
            
            switch(type) {
                case 'email':
                    window.location.href = `mailto:?subject=Shared PDF&body=Please find the attached PDF document.`;
                    break;
                    
                case 'whatsapp':
                    window.open(`https://wa.me/?text=Check out this PDF document`, '_blank');
                    break;
                    
                case 'telegram':
                    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=Check out this PDF document`, '_blank');
                    break;
                    
                case 'copy':
                    try {
                        await navigator.clipboard.writeText(window.location.href);
                        alert('Link copied to clipboard!');
                    } catch (err) {
                        console.error('Failed to copy link:', err);
                    }
                    break;
            }
        }
        
        // Close modal when clicking close button
        if (e.target.classList.contains('close-share-modal') || e.target.classList.contains('share-modal')) {
            document.body.removeChild(shareModal);
            document.head.removeChild(style);
        }
    });

    hideSaveModal();
}

function printPDF() {
    // Deselect any active objects before printing
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();

    // Get canvas data
    const canvas = fabricCanvas.getElement();
    const imgData = canvas.toDataURL('image/png', 1.0);

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Print PDF</title>
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        display: flex;
                        justify-content: center;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                    }
                    @media print {
                        body {
                            padding: 0;
                        }
                        img {
                            width: 100%;
                            height: auto;
                        }
                    }
                </style>
            </head>
            <body>
                <img src="${imgData}" />
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            setTimeout(function() {
                                window.close();
                            }, 100);
                        }, 250);
                    };
                </script>
            </body>
        </html>
    `);

    printWindow.document.close();
    hideSaveModal();
}

function emailPDF() {
    const emailSubject = 'Edited PDF Document';
    const emailBody = 'Please find the attached PDF document.';
    window.location.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    hideSaveModal();
}

// Link functions
function startAddLink(event) {
    if (!isLinkMode) return;

    // Store click position
    window.linkPosition = fabricCanvas.getPointer(event.e);
    
    // Show link modal
    showLinkModal();
    
    // Exit link mode
    isLinkMode = false;
    document.querySelector('button[title="Link"]').classList.remove('active');
    fabricCanvas.defaultCursor = 'default';
    fabricCanvas.off('mouse:down', startAddLink);
}

function showLinkModal() {
    const modal = document.getElementById('link-modal');
    modal.style.display = 'block';
    document.getElementById('link-text').focus();
}

function hideLinkModal() {
    const modal = document.getElementById('link-modal');
    modal.style.display = 'none';
    document.getElementById('link-text').value = '';
    document.getElementById('link-url').value = '';
}

function addLink() {
    const linkText = document.getElementById('link-text').value.trim();
    const linkUrl = document.getElementById('link-url').value.trim();

    if (!linkText || !linkUrl) {
        alert('Please enter both link text and URL');
        return;
    }

    // Create link text object
    const linkObject = new fabric.IText(linkText, {
        left: window.linkPosition.x,
        top: window.linkPosition.y,
        fontSize: 16,
        fill: '#0066cc',
        fontFamily: 'Arial',
        underline: true,
        selectable: true,
        customData: {
            type: 'link',
            url: linkUrl
        }
    });

    // Add click handler with a flag to distinguish between drag and click
    let isDragging = false;
    let mouseDownTime = 0;

    linkObject.on('mousedown', function() {
        isDragging = false;
        mouseDownTime = Date.now();
    });

    linkObject.on('moving', function() {
        isDragging = true;
    });

    linkObject.on('mouseup', function() {
        const mouseUpTime = Date.now();
        const timeDiff = mouseUpTime - mouseDownTime;
        
        // If it's a quick click (less than 200ms) and not dragging, open the link
        if (!isDragging && timeDiff < 200 && !fabricCanvas.isDrawingMode) {
            window.open(this.customData.url, '_blank');
        }
    });

    // Add hover effect
    linkObject.on('mouseover', function() {
        this.set('cursor', fabricCanvas.getActiveObject() === this ? 'move' : 'pointer');
        fabricCanvas.renderAll();
    });

    fabricCanvas.add(linkObject);
    fabricCanvas.renderAll();
    hideLinkModal();
}

// Add this to handle link clicks when saving/downloading
function handleLinks() {
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
        if (obj.customData && obj.customData.type === 'link') {
            // Handle link clicks in the final PDF
            // You might need to implement this based on your PDF library
        }
    });
}

// Add delete function
function deleteSelectedObject() {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
        fabricCanvas.remove(activeObject);
        fabricCanvas.renderAll();
        hideTextToolbar(); // Hide toolbar after deletion
    }
}

// Update your keyboard event listener to also handle delete key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only delete if we're not editing text
        const activeObject = fabricCanvas.getActiveObject();
        if (activeObject && !(activeObject.isEditing)) {
            deleteSelectedObject();
        }
    }
});

function showSignatureModal() {
    document.getElementById('signature-modal').style.display = 'block';
}

function hideSignatureModal() {
    document.getElementById('signature-modal').style.display = 'none';
}

function startDrawSignature() {
    hideSignatureModal();
    fabricCanvas.isDrawingMode = true;
    fabricCanvas.freeDrawingBrush.width = 2;
    fabricCanvas.freeDrawingBrush.color = '#000000';
    
    // Change cursor
    fabricCanvas.defaultCursor = 'crosshair';
    
    // Add one-time click handler to exit drawing mode
    fabricCanvas.once('mouse:up', function() {
        fabricCanvas.isDrawingMode = false;
        fabricCanvas.defaultCursor = 'default';
    });
}

function handleSignatureUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            fabric.Image.fromURL(event.target.result, function(img) {
                // Scale image if too large
                if (img.width > 200) {
                    const scale = 200 / img.width;
                    img.scale(scale);
                }
                
                // Center the image
                img.set({
                    left: fabricCanvas.width / 2 - (img.width * img.scaleX) / 2,
                    top: fabricCanvas.height / 2 - (img.height * img.scaleY) / 2
                });
                
                fabricCanvas.add(img);
                fabricCanvas.setActiveObject(img);
                fabricCanvas.renderAll();
            });
        };
        reader.readAsDataURL(file);
        hideSignatureModal();
        e.target.value = ''; // Reset file input
    }
}

// Add this function to save canvas state
function saveCanvasState() {
    // Remove any states after current index if we're in middle of history
    if (currentHistoryIndex < canvasHistory.length - 1) {
        canvasHistory = canvasHistory.slice(0, currentHistoryIndex + 1);
    }
    
    // Save current state
    const state = JSON.stringify(fabricCanvas);
    canvasHistory.push(state);
    currentHistoryIndex++;
    
    // Limit history size to prevent memory issues
    if (canvasHistory.length > 20) {
        canvasHistory.shift();
        currentHistoryIndex--;
    }
    
    // Enable/disable undo button
    updateUndoButton();
}

// Add this function to update undo button state
function updateUndoButton() {
    const undoBtn = document.querySelector('button[title="Undo"]');
    if (undoBtn) {
        undoBtn.disabled = currentHistoryIndex <= 0;
        undoBtn.style.opacity = currentHistoryIndex <= 0 ? '0.5' : '1';
    }
}

// Modified undo function to handle one state at a time
function undo() {
    if (currentHistoryIndex > 0) {
        // Get the previous state
        currentHistoryIndex--;
        const previousState = JSON.parse(canvasHistory[currentHistoryIndex]);
        
        // Clear current canvas
        fabricCanvas.clear();
        
        // Load objects from previous state
        previousState.objects.forEach(obj => {
            fabric.util.enlivenObjects([obj], function(enlivenedObjects) {
                const enlivenedObject = enlivenedObjects[0];
                fabricCanvas.add(enlivenedObject);
                fabricCanvas.renderAll();
            });
        });
        
        updateUndoButton();
    }
}

// Add keyboard shortcut for undo (Ctrl/Cmd + Z)
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
    }
});

function startDrawingShape(shape) {
    isDrawingShape = true;
    currentShape = shape;
    fabricCanvas.defaultCursor = 'crosshair';
}

function startShape(o) {
    if (!isDrawingShape) return;

    const pointer = fabricCanvas.getPointer(o.e);
    startPoint = { x: pointer.x, y: pointer.y };

    switch (currentShape) {
        case 'rectangle':
            currentShape = new fabric.Rect({
                left: startPoint.x,
                top: startPoint.y,
                width: 0,
                height: 0,
                fill: 'transparent',
                stroke: '#000',
                strokeWidth: 2
            });
            break;

        case 'circle':
            currentShape = new fabric.Circle({
                left: startPoint.x,
                top: startPoint.y,
                radius: 0,
                fill: 'transparent',
                stroke: '#000',
                strokeWidth: 2
            });
            break;

        case 'line':
            currentShape = new fabric.Line([startPoint.x, startPoint.y, startPoint.x, startPoint.y], {
                stroke: '#000',
                strokeWidth: 2
            });
            break;

        case 'triangle':
            currentShape = new fabric.Triangle({
                left: startPoint.x,
                top: startPoint.y,
                width: 0,
                height: 0,
                fill: 'transparent',
                stroke: '#000',
                strokeWidth: 2
            });
            break;

        case 'ellipse':
            currentShape = new fabric.Ellipse({
                left: startPoint.x,
                top: startPoint.y,
                rx: 0,
                ry: 0,
                fill: 'transparent',
                stroke: '#000',
                strokeWidth: 2
            });
            break;
    }

    if (currentShape) {
        fabricCanvas.add(currentShape);
        fabricCanvas.renderAll();
    }
}

function drawShape(o) {
    if (!isDrawingShape || !startPoint || !currentShape) return;

    const pointer = fabricCanvas.getPointer(o.e);
    const width = pointer.x - startPoint.x;
    const height = pointer.y - startPoint.y;

    switch (currentShape.type) {
        case 'rect':
            currentShape.set({
                width: Math.abs(width),
                height: Math.abs(height),
                left: width > 0 ? startPoint.x : pointer.x,
                top: height > 0 ? startPoint.y : pointer.y
            });
            break;

        case 'circle':
            const radius = Math.sqrt(width * width + height * height) / 2;
            currentShape.set({
                radius: radius,
                left: startPoint.x - radius,
                top: startPoint.y - radius
            });
            break;

        case 'line':
            currentShape.set({
                x2: pointer.x,
                y2: pointer.y
            });
            break;

        case 'triangle':
            currentShape.set({
                width: Math.abs(width),
                height: Math.abs(height),
                left: width > 0 ? startPoint.x : pointer.x,
                top: height > 0 ? startPoint.y : pointer.y
            });
            break;

        case 'ellipse':
            currentShape.set({
                rx: Math.abs(width) / 2,
                ry: Math.abs(height) / 2,
                left: width > 0 ? startPoint.x : pointer.x,
                top: height > 0 ? startPoint.y : pointer.y
            });
            break;
    }

    fabricCanvas.renderAll();
}

function finishShape() {
    if (!isDrawingShape) return;

    isDrawingShape = false;
    currentShape = null;
    startPoint = null;
    fabricCanvas.defaultCursor = 'default';
    fabricCanvas.renderAll();
}

// Simplified annotation function
function addAnnotation(event) {
    if (!isAnnotateMode) return;

    const pointer = fabricCanvas.getPointer(event.e);
    
    // Create annotation with better default colors
    const annotation = new fabric.IText('Add annotation...', {
        left: pointer.x,
        top: pointer.y,
        fontSize: 16,
        fontFamily: 'Arial',
        fill: '#000000',          // Black text
        backgroundColor: '#ffeb3b', // Yellow background
        padding: 10,
        selectable: true,
        editable: true,
        hasBorders: true,
        hasControls: true,
        strokeWidth: 1,
        stroke: '#ffd600'         // Darker yellow border
    });

    // Add to canvas
    fabricCanvas.add(annotation);
    fabricCanvas.setActiveObject(annotation);
    
    // Exit annotate mode
    isAnnotateMode = false;
    document.querySelector('button[title="Annotate"]').classList.remove('active');
    fabricCanvas.defaultCursor = 'default';
    fabricCanvas.off('mouse:down', addAnnotation);
    
    // Save state for undo
    saveCanvasState();
    fabricCanvas.renderAll();
}

// Add this CSS for annotation styling
const style = document.createElement('style');
style.textContent = `
    .tool-btn[title="Annotate"].active {
        color: #f86635;
        background-color: #fff3f0;
    }
`;
document.head.appendChild(style);

function setupDeleteButton() {
    console.log("Setting up delete button");
    const deleteBtn = document.getElementById('delete-tool-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', toggleDeleteMode);
    }
}

function toggleDeleteMode() {
    isDeleteMode = !isDeleteMode;
    console.log("Delete mode:", isDeleteMode ? "enabled" : "disabled");
    
    const deleteBtn = document.getElementById('delete-tool-btn');
    deleteBtn.classList.toggle('active');
    
    if (isDeleteMode) {
        enableDeleteMode();
    } else {
        disableDeleteMode();
    }
}

function enableDeleteMode() {
    console.log("Enabling delete mode");
    
    // Change cursor
    fabricCanvas.defaultCursor = 'not-allowed';
    
    // Enable selection
    fabricCanvas.selection = true;
    
    // Make all objects selectable
    fabricCanvas.getObjects().forEach(obj => {
        obj.selectable = true;
        obj.evented = true;
    });
    
    // Add delete click handler
    fabricCanvas.on('mouse:down', handleDeleteClick);
    
    // Add hover effects
    fabricCanvas.on('mouse:over', handleDeleteHover);
    fabricCanvas.on('mouse:out', handleDeleteOut);
}

function handleDeleteClick(e) {
    if (!isDeleteMode || !e.target) return;
    
    console.log("Attempting to delete:", e.target);
    deleteObject(e.target);
}

function handleDeleteHover(e) {
    if (!isDeleteMode || !e.target) return;
    
    e.target.set({
        opacity: 0.5
    });
    fabricCanvas.renderAll();
}

function handleDeleteOut(e) {
    if (!isDeleteMode || !e.target) return;
    
    e.target.set({
        opacity: 1
    });
    fabricCanvas.renderAll();
}

function disableDeleteMode() {
    console.log("Disabling delete mode");
    
    // Reset cursor
    fabricCanvas.defaultCursor = 'default';
    
    // Remove event handlers
    fabricCanvas.off('mouse:down', handleDeleteClick);
    fabricCanvas.off('mouse:over', handleDeleteHover);
    fabricCanvas.off('mouse:out', handleDeleteOut);
    
    // Reset object properties
    fabricCanvas.getObjects().forEach(obj => {
        obj.set({
            opacity: 1
        });
    });
    
    fabricCanvas.renderAll();
}

function deleteObject(object) {
    try {
        console.log("Deleting object");
        fabricCanvas.remove(object);
        fabricCanvas.discardActiveObject();
        fabricCanvas.renderAll();
        saveCanvasState();
        console.log("Object deleted successfully");
    } catch (error) {
        console.error("Error deleting object:", error);
    }
}

// Make sure to initialize the delete button in your DOMContentLoaded event
document.addEventListener("DOMContentLoaded", function() {
    // ... other initialization code ...
    
    // Initialize delete functionality
    setupDeleteButton();
});