// =========================
// REFERENCIAS
// =========================
const canvas = document.getElementById("canvas");
const panel = document.getElementById("panel");

const bg = document.getElementById("bg");
const overlay = document.getElementById("overlay");
const textBox = document.getElementById("textBox");
const mugshot = document.getElementById("mugshot");
const speaker = document.getElementById("speaker");
const logo = document.getElementById("logo");
const footer = document.getElementById("footer");

const stepButtons = Array.from(document.querySelectorAll(".step"));

// =========================
// CONSTANTES
// =========================
const SPEAKER_GAP_TOP_DEFAULT = 20;
const SPEAKER_GAP_TOP_VERTICAL = 5;
const SPEAKER_MUG_GAP = 15;
const MUGSHOT_BASE_SIZE = 74;

// ✅ 15 px de margen para logo y footer
const LOGO_PADDING = 15;
const FOOTER_PADDING_X = 15;
const FOOTER_PADDING_Y = 10;

const LOGO_COLOUR = "https://stillmed.olympics.com/media/Documents/Images/assets/Olympic_rings_Colour.png";
const LOGO_WHITE  = "https://stillmed.olympics.com/media/Documents/Images/assets/Olympic_rings_White.png";
const LOGO_BLACK  = "https://stillmed.olympics.com/media/Documents/Images/assets/Olympic_rings_Black.png";

// =========================
// FORMATOS
// preview = tamaño visible en editor
// export = tamaño real futuro
// =========================
const FORMAT_CONFIG = {
  "16:9": {
    previewW: 480,
    previewH: 270,
    exportW: 1920,
    exportH: 1080
  },
  "1:1": {
    previewW: 340,
    previewH: 340,
    exportW: 1080,
    exportH: 1080
  },
  "4:3": {
    previewW: 453,
    previewH: 340,
    exportW: 1440,
    exportH: 1080
  },
  "3:4": {
    previewW: 255,
    previewH: 340,
    exportW: 1440,
    exportH: 1920
  },
  "9:16": {
    previewW: 191,
    previewH: 340,
    exportW: 1080,
    exportH: 1920
  }
};

// =========================
// ESTADO
// =========================
const state = {
  step: 1,
  format: "16:9",

  image: {
    src: "",
    scale: 1,
    x: 0,
    y: 0,
    minScale: 1, // escala mínima para llenar canvas
    naturalWidth: 0,
    naturalHeight: 0
  },

  text: {
    value: "",
    size: 20,
    lineHeight: 1.2,
    pos: "left",
    dragX: 0,
    dragY: 0
  },

  overlay: {
    size: 50,
    opacity: 0.8,
    color: "black"
  },

  speaker: {
    name: "",
    role: "",
    nameColor: "#ffffff",
    roleColor: "#ffffff",
    photoSrc: "",
    scale: 1
  },

  logo: {
    src: "",
    position: "left",
    size: 110
  },

  footer: {
    variant: "none",
    color: "#ffffff"
  }
};

// =========================
// NAVEGACIÓN
// =========================
function bindStepButtons() {
  stepButtons.forEach(btn => {
    btn.onclick = () => {
      const n = Number(btn.dataset.step);
      goStep(n);
    };
  });
}

function goStep(n) {
  state.step = n;
  stepButtons.forEach((b, i) => {
    b.classList.toggle("active", i === (n - 1));
  });
  renderPanel();
}

// =========================
// UTILIDADES
// =========================
function getCanvasRect() {
  return {
    w: canvas.clientWidth,
    h: canvas.clientHeight
  };
}

function getFormatInfo() {
  return FORMAT_CONFIG[state.format];
}

function isVerticalFormat() {
  return state.format === "3:4" || state.format === "9:16";
}

function getSpeakerGapTop() {
  return isVerticalFormat() ? SPEAKER_GAP_TOP_VERTICAL : SPEAKER_GAP_TOP_DEFAULT;
}

function getTextBaseRect() {
  const { w, h } = getCanvasRect();

  let widenFactor = 1;
  if (state.format === "1:1") widenFactor = 1.2;
  if (state.format === "3:4") widenFactor = 1.1;
  if (state.format === "9:16") widenFactor = 1.05;

  if (state.text.pos === "left") {
    return {
      left: 30,
      width: ((w / 2) - 60) * widenFactor,
      top: h * 0.5
    };
  }

  if (state.text.pos === "right") {
    return {
      left: (w / 2) + 30,
      width: ((w / 2) - 60) * widenFactor,
      top: h * 0.5
    };
  }

  return {
    left: 30,
    width: w - 60,
    top: h * 0.55
  };
}

function getAdaptiveFooterFontSize() {
  const w = canvas.clientWidth;
  return Math.max(12, Math.round(w * 0.022));
}

// =========================
// CÁLCULO DE ESCALA MÍNIMA
// =========================
function calculateMinScaleForFill() {
  if (!state.image.naturalWidth || !state.image.naturalHeight) return 1;
  
  const { w, h } = getCanvasRect();
  const imageAspect = state.image.naturalWidth / state.image.naturalHeight;
  const canvasAspect = w / h;
  
  // Calcular la escala mínima para que la imagen llene completamente el canvas
  if (imageAspect > canvasAspect) {
    // Imagen más ancha: escalar por altura
    return h / state.image.naturalHeight;
  } else {
    // Imagen más alta: escalar por ancho
    return w / state.image.naturalWidth;
  }
}

function resetImagePlacementForCurrentFormat() {
  if (state.image.src) {
    state.image.minScale = calculateMinScaleForFill();
    state.image.scale = state.image.minScale;
    state.image.x = 0;
    state.image.y = 0;
    applyImage();
  }
}

// =========================
// FORMATO
// =========================
function applyFormat() {
  const fmt = getFormatInfo();

  canvas.style.width = `${fmt.previewW}px`;
  canvas.style.height = `${fmt.previewH}px`;

  if (state.image.src) {
    resetImagePlacementForCurrentFormat();
  }

  renderText();
  renderOverlay();
  renderSpeaker();
  renderLogo();
  renderFooter();
}

function setFormat(fmt) {
  state.format = fmt;
  applyFormat();
  renderPanel();
}

// =========================
// IMAGEN
// =========================
let draggingImage = false;
let imageStartX = 0;
let imageStartY = 0;

bg.onmousedown = (e) => {
  if (!state.image.src) return;
  draggingImage = true;
  imageStartX = e.clientX - state.image.x;
  imageStartY = e.clientY - state.image.y;
  bg.style.cursor = "grabbing";
};

document.addEventListener("mousemove", (e) => {
  if (!draggingImage) return;
  state.image.x = e.clientX - imageStartX;
  state.image.y = e.clientY - imageStartY;
  applyImage();
});

document.addEventListener("mouseup", () => {
  draggingImage = false;
  if (bg.src) bg.style.cursor = "grab";
});

function applyImage() {
  if (!state.image.src) return;
  
  const { w, h } = getCanvasRect();
  
  // Calcular dimensiones escaladas
  const scaledWidth = state.image.naturalWidth * state.image.scale;
  const scaledHeight = state.image.naturalHeight * state.image.scale;
  
  // Limitar el desplazamiento para que no se salga demasiado del canvas
  // Permitir movimiento en ambos ejes
  const maxX = scaledWidth - w;
  const minX = -scaledWidth + w;
  const maxY = scaledHeight - h;
  const minY = -scaledHeight + h;
  
  state.image.x = Math.max(minX, Math.min(state.image.x, maxX));
  state.image.y = Math.max(minY, Math.min(state.image.y, maxY));
  
  bg.style.transform = `translate(${state.image.x}px, ${state.image.y}px) scale(${state.image.scale})`;
  bg.style.transformOrigin = "top left";
}

// =========================
// TEXTO PRINCIPAL
// =========================
let draggingText = false;
let textStartX = 0;
let textStartY = 0;

textBox.onmousedown = (e) => {
  draggingText = true;
  textStartX = e.clientX - state.text.dragX;
  textStartY = e.clientY - state.text.dragY;
  textBox.style.cursor = "grabbing";
  e.stopPropagation();
};

document.addEventListener("mousemove", (e) => {
  if (!draggingText) return;
  state.text.dragX = e.clientX - textStartX;
  state.text.dragY = e.clientY - textStartY;
  renderText();
  renderSpeaker();
});

document.addEventListener("mouseup", () => {
  draggingText = false;
  textBox.style.cursor = "grab";
});

function renderText() {
  const base = getTextBaseRect();

  textBox.textContent = state.text.value;
  textBox.style.fontFamily = "'OlympicSerifBold', serif";
  textBox.style.fontSize = `${state.text.size}px`;
  textBox.style.lineHeight = String(state.text.lineHeight);
  textBox.style.color = state.overlay.color === "black" ? "white" : "black";
  textBox.style.width = `${base.width}px`;

  textBox.style.right = "";
  textBox.style.bottom = "";

  if (state.text.pos === "left" || state.text.pos === "right") {
    textBox.style.left = `${base.left + state.text.dragX}px`;
    textBox.style.top = `calc(50% + ${state.text.dragY}px)`;
    textBox.style.transform = "translateY(-50%)";
  } else {
    textBox.style.left = `${base.left + state.text.dragX}px`;
    textBox.style.top = `${base.top + state.text.dragY}px`;
    textBox.style.transform = "none";
  }
}

function setTextPos(pos) {
  state.text.pos = pos;
  state.text.dragX = 0;
  state.text.dragY = 0;
  renderText();
  renderOverlay();
  renderSpeaker();
  renderPanel();
}

// =========================
// OVERLAY
// =========================
function renderOverlay() {
  const c = state.overlay.color === "black" ? "0,0,0" : "255,255,255";

  overlay.style.cssText = "";
  overlay.style.position = "absolute";
  overlay.style.zIndex = "2";
  overlay.style.pointerEvents = "none";
  overlay.style.opacity = String(state.overlay.opacity);

  if (state.text.pos === "left") {
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.height = "100%";
    overlay.style.width = `${state.overlay.size}%`;
    overlay.style.background =
      `linear-gradient(to right,
        rgba(${c},0.8) 0%,
        rgba(${c},0.8) 50%,
        rgba(${c},0) 100%)`;
  }

  if (state.text.pos === "right") {
    overlay.style.right = "0";
    overlay.style.top = "0";
    overlay.style.height = "100%";
    overlay.style.width = `${state.overlay.size}%`;
    overlay.style.background =
      `linear-gradient(to left,
        rgba(${c},0.8) 0%,
        rgba(${c},0.8) 50%,
        rgba(${c},0) 100%)`;
  }

  if (state.text.pos === "bottom") {
    overlay.style.left = "0";
    overlay.style.bottom = "0";
    overlay.style.width = "100%";
    overlay.style.height = `${state.overlay.size}%`;
    overlay.style.background =
      `linear-gradient(to top,
        rgba(${c},0.8) 0%,
        rgba(${c},0.8) 50%,
        rgba(${c},0) 100%)`;
  }
}

function setOverlayColor(color) {
  state.overlay.color = color;
  state.speaker.roleColor = state.overlay.color === "black" ? "#ffffff" : "#000000";
  renderText();
  renderOverlay();
  renderSpeaker();
  renderFooter();
  renderPanel();
}

// =========================
// SPEAKER
// =========================
function renderSpeaker() {
  const nameHtml = (state.speaker.name || "").replace(/\n/g, "<br>");
  const roleHtml = (state.speaker.role || "").replace(/\n/g, "<br>");
  const scale = state.speaker.scale || 1;

  const nameSize = 18 * scale;
  const roleSize = 14 * scale;

  speaker.style.fontFamily = "'OlympicHeadline', Arial, sans-serif";

  speaker.innerHTML = `
    <div class="name" style="
      font-family:'OlympicHeadline', Arial, sans-serif;
      color:${state.speaker.nameColor};
      font-size:${nameSize}px;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    ">${nameHtml}</div>
    <div class="role" style="
      font-family:'OlympicHeadline', Arial, sans-serif;
      color:${state.speaker.roleColor};
      font-size:${roleSize}px;
    ">${roleHtml}</div>
  `;

  const textRect = textBox.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  const quoteCenterX = (textRect.left - canvasRect.left) + (textRect.width / 2);
  const quoteWidth = textRect.width;
  const speakerGapTop = getSpeakerGapTop();

  requestAnimationFrame(() => {
    speaker.style.width = "auto";
    const speakerNaturalHeight = speaker.offsetHeight || 40;

    if (state.speaker.photoSrc) {
      const mugGap = SPEAKER_MUG_GAP;
      const mugSize = MUGSHOT_BASE_SIZE * scale * 0.7;

      const fullGroupWidth = quoteWidth;
      const textBlockWidth = Math.max(0, fullGroupWidth - mugSize - mugGap);

      const groupLeft = quoteCenterX - (fullGroupWidth / 2);
      const mugTop = (textRect.bottom - canvasRect.top + speakerGapTop);

      speaker.classList.add("with-photo");

      mugshot.src = state.speaker.photoSrc;
      mugshot.style.display = "block";
      mugshot.style.width = `${mugSize}px`;
      mugshot.style.height = `${mugSize}px`;
      mugshot.style.border = `${Math.max(2, 3 * scale)}px solid ${state.speaker.nameColor}`;
      mugshot.style.left = `${groupLeft}px`;
      mugshot.style.top = `${mugTop}px`;

      speaker.style.width = `${textBlockWidth}px`;
      speaker.style.left = `${groupLeft + mugSize + mugGap}px`;

      requestAnimationFrame(() => {
        const measuredSpeakerHeight = speaker.offsetHeight || speakerNaturalHeight;
        speaker.style.top = `${mugTop + (mugSize / 2) - (measuredSpeakerHeight / 2)}px`;
      });

    } else {
      speaker.classList.remove("with-photo");

      const baseWidth = textBox.offsetWidth;
      const speakerTop = (textRect.bottom - canvasRect.top + speakerGapTop);
      const speakerLeft = quoteCenterX - (baseWidth / 2);

      speaker.style.width = `${baseWidth}px`;
      speaker.style.left = `${speakerLeft}px`;
      speaker.style.top = `${speakerTop}px`;

      mugshot.style.display = "none";
      mugshot.removeAttribute("src");
    }
  });
}

function setSpeakerNameColor(color) {
  state.speaker.nameColor = color;
  renderSpeaker();
  renderPanel();
}

function setSpeakerRoleColor(color) {
  state.speaker.roleColor = color;
  renderSpeaker();
  renderPanel();
}

function removeSpeakerImage() {
  state.speaker.photoSrc = "";
  renderSpeaker();
  renderPanel();
}

// =========================
// LOGO
// =========================
function renderLogo() {
  if (!state.logo.src) {
    logo.style.display = "none";
    logo.removeAttribute("src");
    return;
  }

  logo.src = state.logo.src;
  logo.style.display = "block";
  logo.style.width = `${state.logo.size}px`;
  logo.style.top = `${LOGO_PADDING}px`;
  logo.style.left = "";
  logo.style.right = "";

  if (state.logo.position === "left") {
    logo.style.left = `${LOGO_PADDING}px`;
  } else {
    logo.style.right = `${LOGO_PADDING}px`;
  }
}

function setLogo(src) {
  state.logo.src = src;
  renderLogo();
  renderPanel();
}

function setLogoPosition(position) {
  state.logo.position = position;
  renderLogo();
  renderPanel();
}

function setLogoSize(size) {
  state.logo.size = Number(size);
  renderLogo();
}

// =========================
// FOOTER
// =========================
function renderFooter() {
  if (state.footer.variant === "none") {
    footer.style.display = "none";
    footer.innerHTML = "";
    return;
  }

  const fontSize = getAdaptiveFooterFontSize();

  footer.style.display = "block";
  footer.style.position = "absolute";
  footer.style.left = "0";
  footer.style.right = "0";
  footer.style.bottom = `${FOOTER_PADDING_Y}px`;
  footer.style.zIndex = "7";
  footer.style.pointerEvents = "none";
  footer.style.fontFamily = "'OlympicHeadline', Arial, sans-serif";
  footer.style.fontSize = `${fontSize}px`;
  footer.style.lineHeight = "1";
  footer.style.color = state.footer.color;
  footer.innerHTML = "";

  if (state.footer.variant === "left") {
    footer.innerHTML = `
      <div style="
        position:absolute;
        left:${FOOTER_PADDING_X}px;
        bottom:0;
        display:flex;
        gap:12px;
        align-items:center;
        color:${state.footer.color};
        font-family:'OlympicHeadline', Arial, sans-serif;
      ">
        <span>IOC.ORG</span>
        <span>@IOCMEDIA</span>
      </div>
    `;
  }

  if (state.footer.variant === "right") {
    footer.innerHTML = `
      <div style="
        position:absolute;
        right:${FOOTER_PADDING_X}px;
        bottom:0;
        display:flex;
        gap:12px;
        align-items:center;
        color:${state.footer.color};
        font-family:'OlympicHeadline', Arial, sans-serif;
      ">
        <span>IOC.ORG</span>
        <span>@IOCMEDIA</span>
      </div>
    `;
  }

  if (state.footer.variant === "separated") {
    footer.innerHTML = `
      <div style="
        position:absolute;
        left:${FOOTER_PADDING_X}px;
        bottom:0;
        color:${state.footer.color};
        font-family:'OlympicHeadline', Arial, sans-serif;
      ">IOC.ORG</div>

      <div style="
        position:absolute;
        right:${FOOTER_PADDING_X}px;
        bottom:0;
        color:${state.footer.color};
        font-family:'OlympicHeadline', Arial, sans-serif;
      ">@IOCMEDIA</div>
    `;
  }
}

function setFooterVariant(variant) {
  state.footer.variant = variant;
  renderFooter();
  renderPanel();
}

function setFooterColor(color) {
  state.footer.color = color;
  renderFooter();
  renderPanel();
}

// =========================
// PANEL DINÁMICO
// =========================
function renderPanel() {

  if (state.step === 1) {
    panel.innerHTML = `
      <h3>Format</h3>

      <div class="toolbar">
        <button class="${state.format === '16:9' ? 'active' : ''}" data-format="16:9">16:9</button>
        <button class="${state.format === '1:1' ? 'active' : ''}" data-format="1:1">1:1</button>
        <button class="${state.format === '4:3' ? 'active' : ''}" data-format="4:3">4:3</button>
        <button class="${state.format === '3:4' ? 'active' : ''}" data-format="3:4">3:4</button>
        <button class="${state.format === '9:16' ? 'active' : ''}" data-format="9:16">9:16</button>
      </div>

      <div class="actions">
        <button class="primary" id="next1">Next</button>
      </div>
    `;

    panel.querySelectorAll("[data-format]").forEach(btn => {
      btn.onclick = () => setFormat(btn.dataset.format);
    });

    document.getElementById("next1").onclick = () => goStep(2);
  }

  if (state.step === 2) {
    panel.innerHTML = `
      <h3>Image</h3>

      <label>Upload image</label>
      <input type="file" id="upload" accept="image/*">

      <label>Zoom</label>
      <input type="range" id="zoom" min="1" max="4" step="0.05" value="${state.image.scale}">
      <span style="font-size:12px;opacity:0.7;">Scale: ${state.image.scale.toFixed(2)}x | Min: ${state.image.minScale.toFixed(2)}x</span>

      <div class="actions">
        <button id="back2">Back</button>
        <button class="primary" id="next2">Next</button>
      </div>
    `;

    document.getElementById("upload").onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = ev => {
        state.image.src = ev.target.result;
        
        // Cargar la imagen para obtener sus dimensiones naturales
        const img = new Image();
        img.onload = () => {
          state.image.naturalWidth = img.naturalWidth;
          state.image.naturalHeight = img.naturalHeight;
          state.image.minScale = calculateMinScaleForFill();
          state.image.scale = state.image.minScale;
          state.image.x = 0;
          state.image.y = 0;
          
          bg.src = state.image.src;
          applyImage();
          renderPanel();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    };

    document.getElementById("zoom").oninput = (e) => {
      const newScale = Number(e.target.value);
      state.image.scale = Math.max(state.image.minScale, newScale);
      applyImage();
    };

    document.getElementById("back2").onclick = () => goStep(1);
    document.getElementById("next2").onclick = () => goStep(3);
  }

  if (state.step === 3) {
    panel.innerHTML = `
      <h3>Text</h3>

      <label>Quote</label>
      <textarea id="txt">${state.text.value}</textarea>

      <label>Text size</label>
      <input type="range" id="size" min="10" max="40" value="${state.text.size}">

      <label>Line height</label>
      <input type="range" id="line" min="1" max="2" step="0.1" value="${state.text.lineHeight}">

      <label>Overlay size</label>
      <input type="range" id="os" min="20" max="80" value="${state.overlay.size}">

      <label>Overlay opacity</label>
      <input type="range" id="op" min="0" max="1" step="0.05" value="${state.overlay.opacity}">

      <label>Position</label>
      <div class="toolbar">
        <button class="${state.text.pos === 'left' ? 'active' : ''}" data-pos="left">Left</button>
        <button class="${state.text.pos === 'right' ? 'active' : ''}" data-pos="right">Right</button>
        <button class="${state.text.pos === 'bottom' ? 'active' : ''}" data-pos="bottom">Bottom</button>
      </div>

      <label>Overlay colour</label>
      <div class="toolbar">
        <button class="${state.overlay.color === 'black' ? 'active' : ''}" data-color="black">Black</button>
        <button class="${state.overlay.color === 'white' ? 'active' : ''}" data-color="white">White</button>
      </div>

      <div class="actions">
        <button id="back3">Back</button>
        <button class="primary" id="next3">Next</button>
      </div>
    `;

    document.getElementById("txt").oninput = e => {
      state.text.value = e.target.value;
      renderText();
      renderSpeaker();
    };

    document.getElementById("size").oninput = e => {
      state.text.size = Number(e.target.value);
      renderText();
      renderSpeaker();
    };

    document.getElementById("line").oninput = e => {
      state.text.lineHeight = Number(e.target.value);
      renderText();
      renderSpeaker();
    };

    document.getElementById("os").oninput = e => {
      state.overlay.size = Number(e.target.value);
      renderOverlay();
    };

    document.getElementById("op").oninput = e => {
      state.overlay.opacity = Number(e.target.value);
      renderOverlay();
    };

    panel.querySelectorAll("[data-pos]").forEach(btn => {
      btn.onclick = () => setTextPos(btn.dataset.pos);
    });

    panel.querySelectorAll("[data-color]").forEach(btn => {
      btn.onclick = () => setOverlayColor(btn.dataset.color);
    });

    document.getElementById("back3").onclick = () => goStep(2);
    document.getElementById("next3").onclick = () => goStep(4);
  }

  if (state.step === 4) {
    panel.innerHTML = `
      <h3>Speaker</h3>

      <label>Name</label>
      <textarea id="nameInput" rows="2">${state.speaker.name}</textarea>

      <label>NAME COLOR (OLYMPIC)</label>
      <div class="color-grid">
        <button class="color-chip ${state.speaker.nameColor === '#ffffff' ? 'active' : ''}" data-name-color="#ffffff" style="background:#ffffff;color:#000;">White</button>
        <button class="color-chip ${state.speaker.nameColor === '#0085C7' ? 'active' : ''}" data-name-color="#0085C7" style="background:#0085C7;color:#fff;">Blue</button>
        <button class="color-chip ${state.speaker.nameColor === '#F4C300' ? 'active' : ''}" data-name-color="#F4C300" style="background:#F4C300;color:#000;">Yellow</button>
        <button class="color-chip ${state.speaker.nameColor === '#000000' ? 'active' : ''}" data-name-color="#000000" style="background:#000000;color:#fff;">Black</button>
        <button class="color-chip ${state.speaker.nameColor === '#009F3D' ? 'active' : ''}" data-name-color="#009F3D" style="background:#009F3D;color:#fff;">Green</button>
        <button class="color-chip ${state.speaker.nameColor === '#DF0024' ? 'active' : ''}" data-name-color="#DF0024" style="background:#DF0024;color:#fff;">Red</button>
      </div>

      <label>Title</label>
      <textarea id="roleInput" rows="2">${state.speaker.role}</textarea>

      <label>TITLE COLOR</label>
      <div class="color-grid">
        <button class="color-chip ${state.speaker.roleColor === '#ffffff' ? 'active' : ''}" data-role-color="#ffffff" style="background:#ffffff;color:#000;">White</button>
        <button class="color-chip ${state.speaker.roleColor === '#000000' ? 'active' : ''}" data-role-color="#000000" style="background:#000000;color:#fff;">Black</button>
      </div>

      <label>Speaker Scale</label>
      <input type="range" id="speakerScale" min="0.7" max="1.5" step="0.05" value="${state.speaker.scale}">

      <label>Mugshot</label>
      <input type="file" id="mugshotUpload" accept="image/*">

      <div class="actions">
        <button id="removeMug">Remove image</button>
        <button class="primary" id="next4">Next</button>
      </div>
    `;

    document.getElementById("nameInput").oninput = e => {
      state.speaker.name = e.target.value;
      renderSpeaker();
    };

    document.getElementById("roleInput").oninput = e => {
      state.speaker.role = e.target.value;
      renderSpeaker();
    };

    document.getElementById("speakerScale").oninput = e => {
      state.speaker.scale = Number(e.target.value);
      renderSpeaker();
    };

    document.getElementById("mugshotUpload").onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        state.speaker.photoSrc = ev.target.result;
        renderSpeaker();
      };
      reader.readAsDataURL(file);
    };

    document.getElementById("removeMug").onclick = () => removeSpeakerImage();

    panel.querySelectorAll("[data-name-color]").forEach(btn => {
      btn.onclick = () => setSpeakerNameColor(btn.dataset.nameColor);
    });

    panel.querySelectorAll("[data-role-color]").forEach(btn => {
      btn.onclick = () => setSpeakerRoleColor(btn.dataset.roleColor);
    });

    document.getElementById("next4").onclick = () => goStep(5);
  }

  if (state.step === 5) {
    panel.innerHTML = `
      <h3>Logo</h3>

      <label>Logo option</label>
      <div class="toolbar">
        <button class="${state.logo.src === LOGO_COLOUR ? 'active' : ''}" data-logo="colour">Colour</button>
        <button class="${state.logo.src === LOGO_WHITE ? 'active' : ''}" data-logo="white">White</button>
        <button class="${state.logo.src === LOGO_BLACK ? 'active' : ''}" data-logo="black">Black</button>
      </div>

      <label>Position</label>
      <div class="toolbar">
        <button class="${state.logo.position === 'left' ? 'active' : ''}" data-logo-pos="left">Top Left</button>
        <button class="${state.logo.position === 'right' ? 'active' : ''}" data-logo-pos="right">Top Right</button>
      </div>

      <label>Logo size</label>
      <input type="range" id="logoSize" min="40" max="140" value="${state.logo.size}">

      <div class="actions">
        <button id="clearLogo">Remove logo</button>
        <button class="primary" id="next5">Next</button>
      </div>
    `;

    panel.querySelectorAll("[data-logo]").forEach(btn => {
      btn.onclick = () => {
        if (btn.dataset.logo === "colour") setLogo(LOGO_COLOUR);
        if (btn.dataset.logo === "white") setLogo(LOGO_WHITE);
        if (btn.dataset.logo === "black") setLogo(LOGO_BLACK);
      };
    });

    panel.querySelectorAll("[data-logo-pos]").forEach(btn => {
      btn.onclick = () => setLogoPosition(btn.dataset.logoPos);
    });

    document.getElementById("logoSize").oninput = e => {
      setLogoSize(e.target.value);
    };

    document.getElementById("clearLogo").onclick = () => {
      state.logo.src = "";
      renderLogo();
      renderPanel();
    };

    document.getElementById("next5").onclick = () => goStep(6);
  }

  if (state.step === 6) {
    panel.innerHTML = `
      <h3>Footer</h3>

      <label>Variant</label>
      <div class="toolbar">
        <button class="${state.footer.variant === 'none' ? 'active' : ''}" data-footer="none">None</button>
        <button class="${state.footer.variant === 'left' ? 'active' : ''}" data-footer="left">Left</button>
        <button class="${state.footer.variant === 'right' ? 'active' : ''}" data-footer="right">Right</button>
        <button class="${state.footer.variant === 'separated' ? 'active' : ''}" data-footer="separated">Separated</button>
      </div>

      <label>Footer colour</label>
      <div class="toolbar">
        <button class="${state.footer.color === '#ffffff' ? 'active' : ''}" data-footer-color="#ffffff">White</button>
        <button class="${state.footer.color === '#000000' ? 'active' : ''}" data-footer-color="#000000">Black</button>
      </div>

      <div class="actions">
        <button id="back6">Back</button>
      </div>
    `;

    panel.querySelectorAll("[data-footer]").forEach(btn => {
      btn.onclick = () => setFooterVariant(btn.dataset.footer);
    });

    panel.querySelectorAll("[data-footer-color]").forEach(btn => {
      btn.onclick = () => setFooterColor(btn.dataset.footerColor);
    });

    document.getElementById("back6").onclick = () => goStep(5);
  }
}

// =========================
// INIT
// =========================
bindStepButtons();
applyFormat();
renderText();
renderOverlay();
renderSpeaker();
renderLogo();
renderFooter();
renderPanel();
