/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, X, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';

interface QrCodeScannerProps {
  onScanSuccess: (loteId: string) => void;
  onClose: () => void;
}

export const QrCodeScanner: React.FC<QrCodeScannerProps> = ({ onScanSuccess, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCamera, setActiveCamera] = useState<'environment' | 'user'>('environment');
  const [camerasCount, setCamerasCount] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  // Controladores de flujo
  const animationFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Iniciar la cámara
  const startCamera = async (facingMode: 'environment' | 'user') => {
    setIsLoading(true);
    setError(null);

    // Cancelar cualquier stream anterior
    stopCamera();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Requerido para iOS Safari
        await videoRef.current.play();
      }

      setHasPermission(true);
      setIsLoading(false);

      // Enumerar cámaras disponibles para ver si hay múltiples
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCamerasCount(videoDevices.length);
      } catch (e) {
        console.warn('No se pudieron enumerar los dispositivos de video:', e);
      }

      // Empezar bucle de escaneo
      tick();
    } catch (err: any) {
      console.error('Error al inicializar la cámara:', err);
      setHasPermission(false);
      setIsLoading(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('El acceso a la cámara fue denegado. Por favor, habilite el permiso de cámara en su navegador.');
      } else {
        setError('No se pudo acceder a la cámara del dispositivo. Verifique que no esté en uso por otra app.');
      }
    }
  };

  const stopCamera = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Cambiar cámara frontal / trasera
  const handleToggleCamera = () => {
    const nextMode = activeCamera === 'environment' ? 'user' : 'environment';
    setActiveCamera(nextMode);
    startCamera(nextMode);
  };

  // Loop de procesamiento de frames
  const tick = () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) {
      animationFrameIdRef.current = requestAnimationFrame(tick);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      // Ajustar dimensiones del canvas interno de escaneo para que coincida con el video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Dibujar frame actual en canvas oculto
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Obtener datos de píxeles
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Intentar decodificar con jsQR
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        // Enlace escaneado con éxito
        console.log('Código QR detectado:', code.data);
        
        // Extraer id de lote si es una URL con parámetro o si es el texto directo del ID
        let detectedLoteId = '';
        try {
          // Si es una URL completa, parsearla
          if (code.data.includes('lote=')) {
            const url = new URL(code.data);
            detectedLoteId = url.searchParams.get('lote') || '';
          } else if (code.data.includes('?lote=')) {
            // Caso alternativo de URL relativa o fragmento
            const queryPart = code.data.substring(code.data.indexOf('?'));
            const params = new URLSearchParams(queryPart);
            detectedLoteId = params.get('lote') || '';
          } else {
            // Intentar detectar si el código QR es directamente el ID del lote (p.ej., "L-01" o similar)
            detectedLoteId = code.data.trim();
          }
        } catch (e) {
          // Si no es una URL válida, tomamos el texto crudo
          detectedLoteId = code.data.trim();
        }

        if (detectedLoteId) {
          // Reproducir un pitido de éxito sutil o retroalimentación háptica (si es compatible)
          try {
            if ('vibrate' in navigator) {
              navigator.vibrate(100);
            }
            // Emitir sonido sintetizado sutil de confirmación
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Nota La
            gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.15);
          } catch (e) {
            // Ignorar errores de audio (pueden ser bloqueados por políticas de navegación)
          }

          stopCamera();
          onScanSuccess(detectedLoteId);
          return;
        }
      }
    }

    // Continuar el bucle
    animationFrameIdRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    startCamera(activeCamera);
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-[#1A1A1A]/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 select-none">
      {/* Cabecera */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 text-white">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-[#C9922E]" />
          <span className="font-serif font-bold text-lg">Escanear Código de Lote</span>
        </div>
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="p-1.5 bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-lg transition"
          title="Cerrar escáner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Ventana de la cámara */}
      <div className="w-full max-w-md aspect-square bg-black rounded-2xl border-2 border-white/10 relative overflow-hidden shadow-2xl flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center gap-3 z-30">
            <RefreshCw className="w-8 h-8 text-[#C9922E] animate-spin" />
            <p className="text-xs text-gray-400 font-sans">Iniciando cámara del dispositivo...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-black/90 p-6 flex flex-col items-center justify-center text-center gap-3 z-30">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <p className="text-sm font-semibold text-white">Error de Cámara</p>
            <p className="text-xs text-gray-400 max-w-xs">{error}</p>
            <button
              onClick={() => startCamera(activeCamera)}
              className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Video stream real */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover scale-x-100"
          muted
          playsInline
        />

        {/* Canvas oculto para capturar frames de video */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Guías visuales de escaneo */}
        {!isLoading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
            {/* Máscara oscura periférica */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Cuadro de escaneo (Clear cut) */}
            <div className="w-4/5 h-4/5 border-2 border-[#C9922E] rounded-3xl relative flex items-center justify-center shadow-[0_0_50px_rgba(201,146,46,0.3)] bg-transparent z-10 overflow-hidden">
              {/* Esquinas con estilo industrial/robusto */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#C9922E] rounded-tl-md" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#C9922E] rounded-tr-md" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#C9922E] rounded-bl-md" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#C9922E] rounded-br-md" />

              {/* Láser de escaneo animado */}
              <div className="w-full h-[3px] bg-gradient-to-r from-transparent via-[#C9922E] to-transparent absolute top-0 left-0 animate-[scan_2s_ease-in-out_infinite] shadow-[0_0_15px_#C9922E]" />
            </div>

            {/* Texto de ayuda en pantalla */}
            <span className="absolute bottom-6 text-[10px] text-white bg-black/60 px-3.5 py-1.5 rounded-full font-mono font-bold tracking-widest uppercase z-20 border border-white/5 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#C9922E] animate-pulse" />
              Alinee el Código QR
            </span>
          </div>
        )}
      </div>

      {/* Controles del Escáner */}
      <div className="w-full max-w-md mt-4 flex justify-between items-center text-xs text-gray-400 font-sans px-2">
        <p className="max-w-[200px] text-[11px] leading-relaxed">
          Soporta códigos QR de la empresa, de trazabilidad de silos o el ID directo de lote.
        </p>

        {camerasCount > 1 && !isLoading && !error && (
          <button
            onClick={handleToggleCamera}
            className="flex items-center gap-1.5 py-2 px-3.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-semibold"
          >
            <RefreshCw className="w-4 h-4 text-[#C9922E]" />
            Cambiar Cámara
          </button>
        )}
      </div>

      {/* Animación personalizada de escaneo insertada inline */}
      <style>{`
        @keyframes scan {
          0%, 100% {
            top: 5%;
          }
          50% {
            top: 95%;
          }
        }
      `}</style>
    </div>
  );
};
