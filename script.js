let pdfDoc = null;
let pageNum = 1;
let fabricCanvas = null;

// Initialize fabric canvas after DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing canvas");
  fabricCanvas = new fabric.Canvas("pdf-canvas", {
    width: 800,
    height: 1000,
    backgroundColor: "white",
  });

  // Initialize zoom buttons
  let zoomScale = 1.5; // Default zoom scale

  const zoomInBtn = document.getElementById("zoom-in-btn");
  const zoomOutBtn = document.getElementById("zoom-out-btn");

  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", function () {
      console.log("Zoom In Clicked");
      zoomScale = Math.min(zoomScale + 0.2, 3); // Max zoom limit 3x
      renderPage(pageNum, zoomScale);
    });
  } else {
    console.error("Zoom In button not found");
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", function () {
      console.log("Zoom Out Clicked");
      zoomScale = Math.max(zoomScale - 0.2, 0.5); // Min zoom limit 0.5x
      renderPage(pageNum, zoomScale);
    });
  } else {
    console.error("Zoom Out button not found");
  }

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
    const viewport = page.getViewport({ scale: zoomScale });

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
