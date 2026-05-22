const video = document.getElementById('camera')
const photos = document.getElementById('photos')
const overlayCanvas = document.getElementById('overlay')
const loadingText = document.getElementById('loading-text')

// Variável para guardar qual acessório está selecionado
let acessorioAtivo = 'nenhum';
let modelLoaded = false;

// 1. Liga a câmera IMEDIATAMENTE
startCamera();

// Função para carregar modelos com CORS e fallback
async function loadModels() {
    try {
        loadingText.innerText = "Carregando IA neural... aguarde 🤖"
        
        // Método alternativo para carregar modelos de um CDN mais confiável
        const modelPath = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
            faceapi.nets.faceLandmark68Net.loadFromUri(modelPath)
        ]);
        
        modelLoaded = true;
        loadingText.innerText = "✅ IA Carregada! Escolha um filtro acima e sorria :)"
        loadingText.style.color = "#90EE90";
        
        // Iniciar detecção depois que os modelos carregarem
        startFaceDetection();
        
    } catch (error) {
        console.error("Erro ao carregar modelos:", error);
        loadingText.innerText = "⚠️ Erro ao carregar IA. Recarregue a página."
        loadingText.style.color = "#ff6b6b";
    }
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 },
                height: { ideal: 480 }
            } 
        })
        video.srcObject = stream
        
        // Esperar o vídeo começar a rodar
        video.onloadedmetadata = () => {
            video.play();
            // Configurar o overlay canvas com as dimensões corretas
            const displaySize = { width: video.videoWidth, height: video.videoHeight }
            overlayCanvas.width = video.videoWidth
            overlayCanvas.height = video.videoHeight
            faceapi.matchDimensions(overlayCanvas, displaySize)
            
            // Carregar os modelos após a câmera estar pronta
            loadModels();
        }
    } catch (error) {
        console.error('Erro ao acessar a câmera:', error)
        loadingText.innerText = "❌ Erro ao acessar câmera: " + error.message
        loadingText.style.color = "#ff6b6b";
    }
}

// Função chamada pelos botões para trocar de acessório
window.mudarAcessorio = function(tipo) {
    acessorioAtivo = tipo;
    console.log("Acessório trocado para:", tipo);
}

// Variável para controle do loop de detecção
let detectionInterval = null;

function startFaceDetection() {
    if (detectionInterval) {
        clearInterval(detectionInterval);
    }
    
    detectionInterval = setInterval(async () => {
        if (!modelLoaded || video.paused || video.ended || !video.videoWidth) {
            return;
        }
        
        try {
            // Configurar dimensões
            const displaySize = { width: video.videoWidth, height: video.videoHeight }
            
            if (overlayCanvas.width !== video.videoWidth || overlayCanvas.height !== video.videoHeight) {
                overlayCanvas.width = video.videoWidth
                overlayCanvas.height = video.videoHeight
                faceapi.matchDimensions(overlayCanvas, displaySize)
            }
            
            // Detectar faces
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks()
            const resizedDetections = faceapi.resizeResults(detections, displaySize)
            
            const context = overlayCanvas.getContext('2d')
            context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
            
            // Inverter o contexto para espelhar
            context.save();
            context.scale(-1, 1);
            context.translate(-overlayCanvas.width, 0);
            
            if (resizedDetections && resizedDetections.length > 0) {
                resizedDetections.forEach(detection => {
                    desenharFiltroNoRosto(context, detection.landmarks, overlayCanvas.width, overlayCanvas.height);
                });
            }
            
            context.restore();
            
        } catch (error) {
            console.error("Erro na detecção facial:", error);
        }
    }, 50) // Aumentei para 50ms para melhor performance
}

// Função que calcula onde desenhar cada emoji baseado nos 68 pontos faciais
function desenharFiltroNoRosto(ctx, landmarks, canvasWidth, canvasHeight) {
    try {
        const jaw = landmarks.getJawOutline()
        const nose = landmarks.getNose()
        const mouth = landmarks.getMouth()
        const leftEye = landmarks.getLeftEye()
        const rightEye = landmarks.getRightEye()

        if (!jaw.length || !nose.length) return;

        // Calcula a largura proporcional do rosto
        const larguraRosto = Math.abs(jaw[16]?.x - jaw[0]?.x) || 100

        if (acessorioAtivo === 'chapeu') {
            const topoTestaX = nose[0]?.x || 0
            const topoTestaY = (nose[0]?.y || 0) - (larguraRosto * 0.5)
            
            ctx.font = `${Math.max(30, larguraRosto * 0.65)}px Arial`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('🎩', topoTestaX, topoTestaY)
        } 
        
        else if (acessorioAtivo === 'bigode') {
            const baseNariz = nose[6]
            const labioSuperior = mouth[2]
            if (baseNariz && labioSuperior) {
                const bigodeX = baseNariz.x
                const bigodeY = (baseNariz.y + labioSuperior.y) / 2
                
                ctx.font = `${Math.max(20, larguraRosto * 0.35)}px Arial`
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText('👨', bigodeX, bigodeY)
            }
        } 
        
        else if (acessorioAtivo === 'coracoes') {
            if (leftEye[0] && rightEye[3]) {
                ctx.font = `${Math.max(15, larguraRosto * 0.18)}px Arial`
                ctx.textAlign = 'center'
                ctx.fillText('❤️', leftEye[0].x, leftEye[0].y - 45)
                ctx.fillText('❤️', rightEye[3].x, rightEye[3].y - 45)
            }
        } 
        
        else if (acessorioAtivo === 'cachorrinho') {
            if (leftEye[0] && rightEye[3] && nose[3]) {
                // Orelhas flutuando nas laterais superiores dos olhos
                ctx.font = `${Math.max(20, larguraRosto * 0.22)}px Arial`
                ctx.textAlign = 'center'
                ctx.fillText('👂', (leftEye[0].x - 15), (leftEye[0].y - 50))
                ctx.fillText('👂', (rightEye[3].x + 15), (rightEye[3].y - 50))
                
                // Focinho exatamente na ponta do nariz
                ctx.font = `${Math.max(15, larguraRosto * 0.15)}px Arial`
                ctx.fillText('🐶', nose[3].x, nose[3].y)
            }
        }
    } catch (error) {
        console.error("Erro ao desenhar filtro:", error);
    }
}

// Função de captura de foto
window.capturarPhoto = function(efeito) {
    if (!video.videoWidth || !video.videoHeight) {
        console.warn("Vídeo não está pronto");
        return;
    }

    const photo = document.createElement('canvas')
    photo.className = 'polaroid'
    photo.width = video.videoWidth
    photo.height = video.videoHeight

    const context = photo.getContext('2d')

    // Reset das transformações
    context.setTransform(1, 0, 0, 1, 0, 0);
    
    // Aplicar efeitos e transformações
    let inverted = false;
    
    switch (efeito) {
        case 'cinza': 
            context.filter = 'grayscale(100%)'; 
            break;
        case 'antiga': 
            context.filter = 'sepia(100%)'; 
            break;
        case 'desfoque': 
            context.filter = 'blur(3px)'; 
            break;
        case 'brilho': 
            context.filter = 'brightness(150%)'; 
            break;
        case 'saturacao': 
            context.filter = 'saturate(200%)'; 
            break;
        case 'opacity': 
            context.filter = 'opacity(50%)'; 
            break;
        case 'inverter':
            inverted = true;
            break;
        default:
            context.filter = 'none';
    }

    // Espelhamento para ficar natural
    context.translate(photo.width, 0)
    context.scale(-1, 1)
    
    if (inverted) {
        context.scale(-1, 1);
        context.translate(-photo.width, 0);
    }

    // Desenha a imagem da câmera
    context.drawImage(video, 0, 0, photo.width, photo.height)
    
    // Volta ao normal para desenhar o overlay
    context.setTransform(1, 0, 0, 1, 0, 0);
    
    if (inverted) {
        context.scale(-1, 1);
        context.translate(-photo.width, 0);
    }
    
    // Cola as marcações e acessórios da IA por cima da foto final
    context.drawImage(overlayCanvas, 0, 0, photo.width, photo.height)
    
    // Reset final
    context.setTransform(1, 0, 0, 1, 0, 0);
    
    // Criar container da polaroid
    const polaroidContainer = document.createElement('div');
    polaroidContainer.style.position = 'relative';
    polaroidContainer.style.display = 'inline-block';
    polaroidContainer.style.margin = '10px';
    
    // Adicionar a foto
    photos.insertBefore(photo, photos.firstChild);
    
    // Adicionar botão de download
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '💾 Salvar';
    downloadBtn.style.position = 'absolute';
    downloadBtn.style.bottom = '10px';
    downloadBtn.style.right = '10px';
    downloadBtn.style.fontSize = '12px';
    downloadBtn.style.padding = '5px 10px';
    downloadBtn.style.backgroundColor = '#4CAF50';
    downloadBtn.style.color = 'white';
    downloadBtn.style.border = 'none';
    downloadBtn.style.borderRadius = '5px';
    downloadBtn.style.cursor = 'pointer';
    
    downloadBtn.onclick = (e) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.download = `foto-${Date.now()}.png`;
        link.href = photo.toDataURL();
        link.click();
    };
    
    polaroidContainer.appendChild(photo);
    polaroidContainer.appendChild(downloadBtn);
}

// Limpar intervalo quando a página for fechada
window.addEventListener('beforeunload', () => {
    if (detectionInterval) {
        clearInterval(detectionInterval);
    }
});