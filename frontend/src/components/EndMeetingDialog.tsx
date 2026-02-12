import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import {
  Warning as WarningIcon,
  CameraAlt as CameraIcon,
} from '@mui/icons-material';
import { CalendarEvent } from '../types';
import { endMeetingEarly } from '../services/api';
import { savePhoto } from '../services/photoStorage';

interface EndMeetingDialogProps {
  open: boolean;
  onClose: () => void;
  currentEvent: CalendarEvent | null;
  onSuccess: () => void;
}

type DialogStep = 'confirm' | 'camera' | 'processing';

export function EndMeetingDialog({
  open,
  onClose,
  currentEvent,
  onSuccess,
}: EndMeetingDialogProps) {
  const [step, setStep] = useState<DialogStep>('confirm');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front camera
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Nepodařilo se spustit kameru. Zkontrolujte oprávnění.');
    }
  }, []);

  // Take photo from video stream
  const takePhoto = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return null;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas (mirror for selfie)
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get base64 image
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Handle the full end meeting flow with photo
  const handleEndMeetingWithPhoto = useCallback(async () => {
    if (!currentEvent) return;

    setLoading(true);
    setError(null);

    try {
      // Take photo
      const photoData = takePhoto();

      if (photoData) {
        // Save photo locally
        await savePhoto(currentEvent.id, currentEvent.title, photoData);
        console.log('Photo saved for event:', currentEvent.title);
      }

      // Stop camera
      stopCamera();

      // End the meeting
      const result = await endMeetingEarly(currentEvent.id);

      if (result.success) {
        onSuccess();
        handleClose();
      } else {
        setError(result.error || 'Nepodařilo se ukončit meeting');
        setStep('confirm');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nepodařilo se ukončit meeting'
      );
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  }, [currentEvent, takePhoto, stopCamera, onSuccess]);

  // Handle proceeding to camera step
  const handleProceedToCamera = () => {
    setStep('camera');
    setCountdown(3);
  };

  // Start camera when entering camera step
  useEffect(() => {
    if (step === 'camera' && open) {
      startCamera();
    }
  }, [step, open, startCamera]);

  // Countdown and auto-capture
  useEffect(() => {
    if (step !== 'camera' || cameraError) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Countdown finished, take photo and end meeting
      setStep('processing');
      handleEndMeetingWithPhoto();
    }
  }, [step, countdown, cameraError, handleEndMeetingWithPhoto]);

  // Reset state when dialog closes
  const handleClose = useCallback(() => {
    stopCamera();
    setStep('confirm');
    setError(null);
    setCameraError(null);
    setLoading(false);
    setCountdown(3);
    onClose();
  }, [stopCamera, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <Dialog
      open={open}
      onClose={step === 'processing' ? undefined : handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      {/* Step 1: Confirmation */}
      {step === 'confirm' && (
        <>
          <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
            <WarningIcon
              sx={{
                fontSize: 48,
                mb: 1,
                display: 'block',
                mx: 'auto',
                color: 'warning.main',
              }}
            />
            <Typography variant="h2">Ukončit meeting?</Typography>
          </DialogTitle>

          <DialogContent sx={{ px: 4, pb: 2 }}>
            {error && (
              <Alert
                severity="error"
                sx={{ mb: 3 }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}

            <Typography variant="body1" sx={{ textAlign: 'center', mb: 2 }}>
              Opravdu chcete předčasně ukončit tento meeting?
            </Typography>

            {currentEvent && (
              <Typography
                variant="h4"
                sx={{
                  textAlign: 'center',
                  p: 2,
                  backgroundColor: 'action.hover',
                  borderRadius: 2,
                }}
              >
                {currentEvent.title}
              </Typography>
            )}

            <Typography
              variant="body2"
              sx={{ textAlign: 'center', mt: 2, color: 'text.secondary' }}
            >
              Pro potvrzení budete vyfoceni přední kamerou.
            </Typography>
          </DialogContent>

          <DialogActions sx={{ px: 4, pb: 3, gap: 2 }}>
            <Button
              onClick={handleClose}
              variant="outlined"
              size="large"
              fullWidth
            >
              Zrušit
            </Button>
            <Button
              onClick={handleProceedToCamera}
              variant="contained"
              color="error"
              size="large"
              fullWidth
              startIcon={<CameraIcon />}
            >
              Pokračovat
            </Button>
          </DialogActions>
        </>
      )}

      {/* Step 2: Camera */}
      {step === 'camera' && (
        <>
          <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
            <Typography variant="h2">Usměj se!</Typography>
          </DialogTitle>

          <DialogContent sx={{ px: 4, pb: 2 }}>
            {cameraError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {cameraError}
              </Alert>
            ) : (
              <>
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '4/3',
                    backgroundColor: 'black',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scaleX(-1)', // Mirror for selfie
                    }}
                  />

                  {/* Countdown overlay */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography
                      variant="h1"
                      sx={{
                        fontSize: '8rem',
                        fontWeight: 700,
                        color: 'white',
                        textShadow: '0 0 20px rgba(0,0,0,0.8)',
                      }}
                    >
                      {countdown}
                    </Typography>
                  </Box>
                </Box>

                <Typography
                  variant="body1"
                  sx={{ textAlign: 'center', mt: 2, fontWeight: 500 }}
                >
                  Fotka bude pořízena automaticky za {countdown}{' '}
                  {countdown === 1 ? 'sekundu' : countdown < 5 ? 'sekundy' : 'sekund'}
                </Typography>
              </>
            )}

            {/* Hidden canvas for photo capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </DialogContent>

          <DialogActions sx={{ px: 4, pb: 3 }}>
            <Button
              onClick={handleClose}
              variant="outlined"
              size="large"
              fullWidth
            >
              Zrušit
            </Button>
          </DialogActions>
        </>
      )}

      {/* Step 3: Processing */}
      {step === 'processing' && (
        <>
          <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="h2">Zpracovávám...</Typography>
          </DialogTitle>

          <DialogContent sx={{ px: 4, pb: 4 }}>
            <Typography variant="body1" sx={{ textAlign: 'center' }}>
              {loading ? 'Ukládám fotku a ukončuji meeting...' : 'Hotovo!'}
            </Typography>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}
