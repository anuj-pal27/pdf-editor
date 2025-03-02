let pdfDoc = null;
let pageNum = 1;
let fabricCanvas = null;
let rotationAngle = 0; // Default rotation angle
  // Initialize zoom buttons
  let zoomScale = 1.5; // Default zoom scale
let activeText = null;

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
});


async function loadPDF(data) {
  try {
    console.log("Loading PDF...");
    pdfDoc = await pdfjsLib.getDocument({ data: data }).promise;
    console.log("PDF loaded, pages:", pdfDoc.numPages);
    await renderPage(pageNum);
  } catch (error) {
    console.error("Error in loadPDF:", error);
  }
}


async function renderPage(num,zoomScale = 1.5) {
  try {
    console.log("Rendering page", num, "at zoom", zoomScale);
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: zoomScale, rotation: rotationAngle });

    // Set canvas size
    fabricCanvas.setWidth(viewport.width);
    fabricCanvas.setHeight(viewport.height);

    // Clear existing content
    fabricCanvas.clear();

    // Get text content
    const textContent = await page.getTextContent();

    // Create text objects directly
    textContent.items.forEach((item) => {
      const transform = pdfjsLib.Util.transform(
        viewport.transform,
        item.transform
      );
      const fontSize = Math.sqrt(
        transform[0] * transform[0] + transform[1] * transform[1]
      );

      let left = transform[4];
      let top = transform[5] - fontSize;
       // Adjust text positioning based on rotation
       let adjustedLeft = left;
       let adjustedTop = top;
      // Adjust text positioning based on rotation
      switch (rotationAngle) {
        case 90:
            adjustedLeft = top;
            adjustedTop = viewport.width - left;
            break;
        case 180:
            adjustedLeft = viewport.width - left;
            adjustedTop = viewport.height - top;
            break;
        case 270:
            adjustedLeft = viewport.height - top;
            adjustedTop = left;
            break;
    }
      const text = new fabric.IText(item.str, {
        left: transform[4],
        top: transform[5] - fontSize,
        fontSize: fontSize,
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

    fabricCanvas.renderAll();
  } catch (error) {
    console.error("Error in renderPage:", error);
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
function addText() {
  console.log("Adding text");
  const text = new fabric.IText("New Text", {
    left: 100,
    top: 100,
    fontSize: 20,
    fill: "#000000",
    fontFamily: "Arial",
    editable: true,
  });
  fabricCanvas.add(text);
  fabricCanvas.setActiveObject(text);
  fabricCanvas.renderAll();
  console.log("Text added");
}

// Event listener for text button
document.getElementById("add-text-btn")?.addEventListener("click", addText);

// Enable editing on double click
fabricCanvas.on("mouse:dblclick", function (event) {
  const target = fabricCanvas.findTarget(event.e);
  if (target && target.type === "i-text") {
    target.enterEditing();
    fabricCanvas.setActiveObject(target);
  }
});

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

