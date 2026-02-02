import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { CalendarEvent, TimeSlot } from '../types';
import {
  calculateAvailableSlots,
} from '../utils/slots';
import { createReservation } from '../services/api';
import { format, addMinutes, isBefore, differenceInMinutes } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ReserveDialogProps {
  open: boolean;
  onClose: () => void;
  nextEvent: CalendarEvent | null;
  onSuccess: () => void;
}

export function ReserveDialog({
  open,
  onClose,
  nextEvent,
  onSuccess,
}: ReserveDialogProps) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate available slots
  const availableSlots = useMemo(() => {
    if (!open) return [];
    return calculateAvailableSlots(new Date(), nextEvent);
  }, [open, nextEvent]);

  // Format end time for display (start is "now", end is now + selected minutes)
  const getEndTimeDisplay = (): string | null => {
    if (selectedSlot === null) return null;
    const end = addMinutes(new Date(), selectedSlot);
    return format(end, 'HH:mm', { locale: cs });
  };

  const handleSlotChange = (
    _event: React.MouseEvent<HTMLElement>,
    value: number | null
  ) => {
    setSelectedSlot(value);
    setError(null);
  };

  const handleReserve = async () => {
    if (selectedSlot === null) return;

    setLoading(true);
    setError(null);

    try {
      // Calculate times RIGHT NOW when user clicks reserve
      const now = new Date();
      const start = now;
      let end = addMinutes(now, selectedSlot);

      // If there's a next event, make sure we don't overlap with it
      if (nextEvent) {
        const nextEventStart = new Date(nextEvent.start);

        // If end would be after or equal to next event start, shorten the reservation
        if (!isBefore(end, nextEventStart)) {
          // Calculate how many minutes we actually have
          const availableMinutes = differenceInMinutes(nextEventStart, now);

          if (availableMinutes < 1) {
            setError('Není dostatek času pro rezervaci. Další událost začíná.');
            setLoading(false);
            return;
          }

          // Set end to 1 minute before next event (safety margin)
          end = addMinutes(now, Math.max(1, availableMinutes - 1));
        }
      }

      const result = await createReservation({
        start: start.toISOString(),
        end: end.toISOString(),
      });

      if (result.success) {
        onSuccess();
        handleClose();
      } else {
        setError(result.error || 'Nepodařilo se vytvořit rezervaci');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nepodařilo se vytvořit rezervaci'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedSlot(null);
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
        <ScheduleIcon sx={{ fontSize: 40, mb: 1, display: 'block', mx: 'auto' }} />
        <Typography variant="h2">Rychlá rezervace</Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 4, pb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {availableSlots.length === 0 ? (
          <Alert severity="info">
            Není dostupný žádný slot. Do další události zbývá méně než 5 minut.
          </Alert>
        ) : (
          <>
            <Typography variant="body1" sx={{ mb: 2, textAlign: 'center' }}>
              Vyberte délku rezervace:
            </Typography>

            <ToggleButtonGroup
              value={selectedSlot}
              exclusive
              onChange={handleSlotChange}
              fullWidth
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                '& .MuiToggleButton-root': {
                  flex: '1 1 45%',
                  py: 2,
                  borderRadius: '8px !important',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  },
                },
              }}
            >
              {availableSlots.map((slot) => (
                <ToggleButton key={slot.minutes} value={slot.minutes}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4">{slot.label}</Typography>
                  </Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            {selectedSlot && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  backgroundColor: 'action.hover',
                  borderRadius: 2,
                  textAlign: 'center',
                }}
              >
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  Rezervace na {selectedSlot} minut (do ~{getEndTimeDisplay()})
                </Typography>
              </Box>
            )}
          </>
        )}
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
          onClick={handleReserve}
          variant="contained"
          size="large"
          fullWidth
          disabled={loading || selectedSlot === null}
          startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
        >
          {loading ? 'Vytvářím...' : 'Rezervovat'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
