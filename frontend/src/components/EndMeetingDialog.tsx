import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { CalendarEvent } from '../types';
import { endMeetingEarly } from '../services/api';

interface EndMeetingDialogProps {
  open: boolean;
  onClose: () => void;
  currentEvent: CalendarEvent | null;
  onSuccess: () => void;
}

export function EndMeetingDialog({
  open,
  onClose,
  currentEvent,
  onSuccess,
}: EndMeetingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEndMeeting = async () => {
    if (!currentEvent) return;

    setLoading(true);
    setError(null);

    try {
      const result = await endMeetingEarly(currentEvent.id);

      if (result.success) {
        onSuccess();
        handleClose();
      } else {
        setError(result.error || 'Nepodařilo se ukončit meeting');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nepodařilo se ukončit meeting'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
        <WarningIcon sx={{ fontSize: 48, mb: 1, display: 'block', mx: 'auto', color: 'warning.main' }} />
        <Typography variant="h2">Ukončit meeting?</Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 4, pb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
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
          Tato akce změní čas konce meetingu v Google Kalendáři na aktuální čas.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 4, pb: 3, gap: 2 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          size="large"
          fullWidth
          disabled={loading}
        >
          Zrušit
        </Button>
        <Button
          onClick={handleEndMeeting}
          variant="contained"
          color="error"
          size="large"
          fullWidth
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Ukončuji...' : 'Ukončit meeting'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
