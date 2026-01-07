// ==========================================
// 1. TYPES & CONFIGURATION
// ==========================================

interface Point { x: number; y: number; }
interface Color { r: number; g: number; b: number; a: number; }
interface TriangleGene { points: [Point, Point, Point]; color: Color; }

const WORK_SIZE = 75;
const DNA_SIZE = 150;

let targetImageData: Uint8ClampedArray | null = null;
let currentDna: TriangleGene[] = [];
let currentFitness = Infinity;
let isRunning = false;
let generation = 0;

// ==========================================
// 2. ÉLÉMENTS DU DOM
// ==========================================

const hiddenCanvas = document.createElement('canvas');
hiddenCanvas.width = WORK_SIZE; hiddenCanvas.height = WORK_SIZE;
const hiddenCtx = hiddenCanvas.getContext('2d', { willReadFrequently: true })!;

const fileInput = document.getElementById('imageLoader') as HTMLInputElement;
const targetImg = document.getElementById('targetImage') as HTMLImageElement;
const mainCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
const mainCtx = mainCanvas.getContext('2d')!;
const genCountSpan = document.getElementById('genCount')!;
const scoreSpan = document.getElementById('scoreVal')!;
const statsArea = document.getElementById('statsArea')!;

const btnPause = document.getElementById('btnPause') as HTMLButtonElement;
const btnSave = document.getElementById('btnSave') as HTMLButtonElement;
const btnCoach = document.getElementById('btnCoach') as HTMLButtonElement;

const modal = document.getElementById('coachModal')!;
const closeCoach = document.getElementById('closeCoach') as HTMLButtonElement;
const pixelCoord = document.getElementById('pixelCoord')!;
const targetSample = document.getElementById('targetColorSample')!;
const iaSample = document.getElementById('iaColorSample')!;
const mathR = document.getElementById('mathR')!;
const mathG = document.getElementById('mathG')!;
const mathB = document.getElementById('mathB')!;
const pixelScore = document.getElementById('pixelScore')!;


// ==========================================
// 3. FONCTIONS UTILITAIRES
// ==========================================

function getRandomInt(max: number): number { return Math.floor(Math.random() * max); }
function clamp(val: number, min: number, max: number): number { return Math.min(Math.max(val, min), max); }

function createRandomTriangle(w: number, h: number): TriangleGene {
    return {
        points: [
            { x: getRandomInt(w), y: getRandomInt(h) },
            { x: getRandomInt(w), y: getRandomInt(h) },
            { x: getRandomInt(w), y: getRandomInt(h) }
        ],
        color: { r: getRandomInt(255), g: getRandomInt(255), b: getRandomInt(255), a: 0.5 }
    };
}

function drawTriangle(ctx: CanvasRenderingContext2D, t: TriangleGene) {
    ctx.fillStyle = `rgba(${t.color.r}, ${t.color.g}, ${t.color.b}, ${t.color.a})`;
    ctx.beginPath();
    ctx.moveTo(t.points[0].x, t.points[0].y);
    ctx.lineTo(t.points[1].x, t.points[1].y);
    ctx.lineTo(t.points[2].x, t.points[2].y);
    ctx.closePath();
    ctx.fill();
}

function calculateFitness(currentPixels: Uint8ClampedArray, targetPixels: Uint8ClampedArray): number {
    let score = 0;
    for (let i = 0; i < currentPixels.length; i += 4) {
        const rDiff = currentPixels[i] - targetPixels[i];
        const gDiff = currentPixels[i + 1] - targetPixels[i + 1];
        const bDiff = currentPixels[i + 2] - targetPixels[i + 2];
        score += (rDiff * rDiff) + (gDiff * gDiff) + (bDiff * bDiff);
    }
    return score;
}


// ==========================================
// 4. MOTEUR GÉNÉTIQUE
// ==========================================

function mutate(dna: TriangleGene[]): TriangleGene[] {
    const newDna = JSON.parse(JSON.stringify(dna));
    const index = getRandomInt(newDna.length);
    const gene = newDna[index];

    if (Math.random() < 0.5) {
        const p = gene.points[getRandomInt(3)];
        p.x = clamp(p.x + (Math.random() - 0.5) * 40, 0, WORK_SIZE);
        p.y = clamp(p.y + (Math.random() - 0.5) * 40, 0, WORK_SIZE);
    } else {
        gene.color.r = clamp(gene.color.r + (Math.random() - 0.5) * 40, 0, 255);
        gene.color.g = clamp(gene.color.g + (Math.random() - 0.5) * 40, 0, 255);
        gene.color.b = clamp(gene.color.b + (Math.random() - 0.5) * 40, 0, 255);
        gene.color.a = clamp(gene.color.a + (Math.random() - 0.5) * 0.2, 0.1, 1);
    }

    if (Math.random() < 0.01) newDna[index] = createRandomTriangle(WORK_SIZE, WORK_SIZE);

    return newDna;
}

function startAlgorithm() {
    if (!targetImageData) return;
    generation = 0;
    genCountSpan.innerText = "0";
    
    currentDna = [];
    for (let i = 0; i < DNA_SIZE; i++) currentDna.push(createRandomTriangle(WORK_SIZE, WORK_SIZE));

    hiddenCtx.clearRect(0, 0, WORK_SIZE, WORK_SIZE);
    currentDna.forEach(t => drawTriangle(hiddenCtx, t));
    currentFitness = calculateFitness(hiddenCtx.getImageData(0, 0, WORK_SIZE, WORK_SIZE).data, targetImageData);

    btnPause.disabled = false;
    btnSave.disabled = false;
    btnCoach.disabled = false;
    setRunningState(true);
    
    loop();
}

function loop() {
    if (!isRunning || !targetImageData) return;

    const mutatedDna = mutate(currentDna);

    hiddenCtx.clearRect(0, 0, WORK_SIZE, WORK_SIZE);
    mutatedDna.forEach(t => drawTriangle(hiddenCtx, t));
    
    const mutatedPixels = hiddenCtx.getImageData(0, 0, WORK_SIZE, WORK_SIZE).data;
    const mutatedFitness = calculateFitness(mutatedPixels, targetImageData);

    if (mutatedFitness < currentFitness) {
        currentFitness = mutatedFitness;
        currentDna = mutatedDna;
        if (generation % 5 === 0) renderToScreen(); 
    }

    generation++;
    if (generation % 30 === 0) {
        genCountSpan.innerText = generation.toString();
        scoreSpan.innerText = Math.floor(currentFitness).toLocaleString();
    }

    requestAnimationFrame(loop);
}

function renderToScreen() {
    mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    mainCtx.save();
    const scale = mainCanvas.width / WORK_SIZE;
    mainCtx.scale(scale, scale);
    currentDna.forEach(t => drawTriangle(mainCtx, t));
    mainCtx.restore();
}

function setRunningState(running: boolean) {
    isRunning = running;
    if (isRunning) {
        btnPause.innerText = "Pause";
        statsArea.classList.add('running');
    } else {
        btnPause.innerText = "Reprendre";
        statsArea.classList.remove('running');
    }
}

// ==========================================
// 5. GESTION DES ÉVÉNEMENTS
// ==========================================

fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    setRunningState(false);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
            targetImg.src = img.src;
            hiddenCtx.clearRect(0, 0, WORK_SIZE, WORK_SIZE);
            hiddenCtx.drawImage(img, 0, 0, WORK_SIZE, WORK_SIZE);
            targetImageData = hiddenCtx.getImageData(0, 0, WORK_SIZE, WORK_SIZE).data;
            startAlgorithm();
        };
        img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
});

btnPause.addEventListener('click', () => {
    if (isRunning) setRunningState(false);
    else { setRunningState(true); loop(); }
});

btnSave.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `art_genetique_${generation}.png`;
    link.href = mainCanvas.toDataURL();
    link.click();
});

// COACH MODALE
btnCoach.addEventListener('click', () => {
    if (!targetImageData) return;
    setRunningState(false);

    const x = getRandomInt(WORK_SIZE);
    const y = getRandomInt(WORK_SIZE);
    const i = (y * WORK_SIZE + x) * 4;

    const tR = targetImageData[i], tG = targetImageData[i+1], tB = targetImageData[i+2];
    
    hiddenCtx.clearRect(0, 0, WORK_SIZE, WORK_SIZE);
    currentDna.forEach(t => drawTriangle(hiddenCtx, t));
    const currentPixels = hiddenCtx.getImageData(0, 0, WORK_SIZE, WORK_SIZE).data;
    const cR = currentPixels[i], cG = currentPixels[i+1], cB = currentPixels[i+2];

    pixelCoord.innerText = `X:${x}, Y:${y}`;
    targetSample.style.backgroundColor = `rgb(${tR}, ${tG}, ${tB})`;
    iaSample.style.backgroundColor = `rgb(${cR}, ${cG}, ${cB})`;

    mathR.innerText = `${tR} - ${cR}`;
    mathG.innerText = `${tG} - ${cG}`;
    mathB.innerText = `${tB} - ${cB}`;

    const score = (tR - cR)**2 + (tG - cG)**2 + (tB - cB)**2;
    pixelScore.innerText = score.toLocaleString();

    modal.classList.add('active');
});

closeCoach.addEventListener('click', () => {
    modal.classList.remove('active');
    setRunningState(true);
    loop();
});

// ==========================================
// 6. GESTION DU TUTORIEL
// ==========================================

const steps = document.querySelectorAll('.step') as NodeListOf<HTMLDivElement>;
const btnPrev = document.getElementById('btnPrevStep') as HTMLButtonElement;
const btnNext = document.getElementById('btnNextStep') as HTMLButtonElement;

let currentStepIndex = 0;
let typingTimeout: any = null;

function showStep(index: number) {
    btnPrev.disabled = index === 0;
    btnNext.disabled = index === steps.length - 1;

    steps.forEach(step => step.classList.remove('active'));
    
    const activeStep = steps[index];
    activeStep.classList.add('active');

    const p = activeStep.querySelector('.typewriter-text') as HTMLParagraphElement;
    if (!p.hasAttribute('data-text')) {
        p.setAttribute('data-text', p.textContent || "");
    }
    const fullText = p.getAttribute('data-text') || "";
    
    p.innerText = "";
    if (typingTimeout) clearTimeout(typingTimeout);

    let charIndex = 0;
    function typeChar() {
        if (charIndex < fullText.length) {
            p.textContent += fullText.charAt(charIndex);
            charIndex++;
            typingTimeout = setTimeout(typeChar, 20);
        }
    }
    typeChar();
}

btnPrev.addEventListener('click', () => {
    if (currentStepIndex > 0) {
        currentStepIndex--;
        showStep(currentStepIndex);
    }
});

btnNext.addEventListener('click', () => {
    if (currentStepIndex < steps.length - 1) {
        currentStepIndex++;
        showStep(currentStepIndex);
    }
});

setTimeout(() => {
    showStep(0);
}, 100);

// ==========================================
// 7. CHARGEMENT AUTOMATIQUE (IMAGE PAR DÉFAUT)
// ==========================================

function loadDefaultImage() {
    const img = new Image();
    // On cherche l'image 'default.png' à la racine (dossier public dans Vite)
    img.src = '/default.png';
    
    img.onload = () => {
        console.log("Image par défaut trouvée, lancement auto !");
        targetImg.src = img.src;
        
        hiddenCtx.clearRect(0, 0, WORK_SIZE, WORK_SIZE);
        hiddenCtx.drawImage(img, 0, 0, WORK_SIZE, WORK_SIZE);
        targetImageData = hiddenCtx.getImageData(0, 0, WORK_SIZE, WORK_SIZE).data;
        
        startAlgorithm();
    };

    img.onerror = () => {
        console.log("Pas d'image 'default.png' trouvée. En attente de l'utilisateur.");
    };
}

loadDefaultImage();