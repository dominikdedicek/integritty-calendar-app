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
import { Warning as WarningIcon } from '@mui/icons-material';
import { CalendarEvent } from '../types';
import { endMeetingEarly } from '../services/api';
import { savePhoto } from '../services/photoStorage';

interface EndMeetingDialogProps {
  open: boolean;
  onClose: () => void;
  currentEvent: CalendarEvent | null;
  onSuccess: () => void;
}

type DialogStep = 'confirm' | 'capturing' | 'preview' | 'processing';

export function EndMeetingDialog({
  open,
  onClose,
  currentEvent,
  onSuccess,
}: EndMeetingDialogProps) {
  const [step, setStep] = useState<DialogStep>('confirm');
  const [error, setError] = useState<string | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

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

  // Handle the confirmation - start capture process
  const handleConfirm = useCallback(async () => {
    setStep('capturing');
    setError(null);

    try {
      // Start camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Wait a moment for camera to stabilize
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Flash effect
        setShowFlash(true);
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Take photo
        const photoData = takePhoto();
        setShowFlash(false);

        if (photoData) {
          setCapturedPhoto(photoData);
          setStep('preview');

          // Save photo
          if (currentEvent) {
            await savePhoto(currentEvent.id, currentEvent.title, photoData);
            console.log('Photo saved for event:', currentEvent.title);
          }

          // Show preview for 1.5 seconds then proceed
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Stop camera and proceed to end meeting
          stopCamera();
          setStep('processing');

          // End the meeting
          const result = await endMeetingEarly(currentEvent!.id);

          if (result.success) {
            onSuccess();
            handleClose();
          } else {
            setError(result.error || 'Nepodařilo se ukončit meeting');
            setStep('confirm');
          }
        } else {
          throw new Error('Nepodařilo se pořídit fotku');
        }
      }
    } catch (err) {
      console.error('Capture error:', err);
      stopCamera();
      setError(
        err instanceof Error ? err.message : 'Nepodařilo se pořídit fotku'
      );
      setStep('confirm');
    }
  }, [currentEvent, takePhoto, stopCamera, onSuccess]);

  // Reset state when dialog closes
  const handleClose = useCallback(() => {
    stopCamera();
    setStep('confirm');
    setError(null);
    setShowFlash(false);
    setCapturedPhoto(null);
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
      onClose={step === 'confirm' ? handleClose : undefined}
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
              Tato akce změní čas konce meetingu v Google Kalendáři na aktuální
              čas.
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
              onClick={handleConfirm}
              variant="contained"
              color="error"
              size="large"
              fullWidth
            >
              Ukončit meeting
            </Button>
          </DialogActions>
        </>
      )}

      {/* Step 2: Capturing (hidden camera + flash) */}
      {step === 'capturing' && (
        <>
          <DialogContent
            sx={{
              px: 4,
              py: 6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              minHeight: 300,
            }}
          >
            {/* Hidden video element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                position: 'absolute',
                opacity: 0,
                width: 1,
                height: 1,
              }}
            />

            {/* Flash overlay */}
            {showFlash && (
              <Box
                sx={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'white',
                  zIndex: 9999,
                }}
              />
            )}

            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="body1">Moment...</Typography>

            {/* Hidden canvas for photo capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </DialogContent>
        </>
      )}

      {/* Step 3: Preview captured photo */}
      {step === 'preview' && capturedPhoto && (
        <>
          <DialogContent sx={{ px: 4, py: 3, textAlign: 'center' }}>
            <Box
              sx={{
                width: '100%',
                aspectRatio: '4/3',
                borderRadius: 2,
                overflow: 'hidden',
                mb: 2,
              }}
            >
              <img
                src={capturedPhoto}
                alt="Captured"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </Box>
            <Typography variant="body1">Ukončuji meeting...</Typography>
          </DialogContent>
        </>
      )}

      {/* Step 4: Processing */}
      {step === 'processing' && (
        <>
          <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="h2">Zpracovávám...</Typography>
          </DialogTitle>

          <DialogContent sx={{ px: 4, pb: 4 }}>
            <Typography variant="body1" sx={{ textAlign: 'center' }}>
              Ukončuji meeting...
            </Typography>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}
