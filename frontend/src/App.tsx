import React, { useState } from 'react';
import { Box, Container, Snackbar, Alert } from '@mui/material';
import {
  StatusHeader,
  EventList,
  ReserveDialog,
  ReserveButton,
  ErrorState,
} from './components';
import { useCalendarData } from './hooks/useCalendarData';

function App() {
  const { data, config, loading, error, isOffline, refresh } = useCalendarData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Show error state if there's an error and no cached data
  if ((error || isOffline) && !data) {
    return <ErrorState error={error} isOffline={isOffline} onRetry={refresh} />;
  }

  const handleReserveClick = () => {
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleReservationSuccess = () => {
    setSuccessMessage('Rezervace byla úspěšně vytvořena');
    refresh();
  };

  const handleSnackbarClose = () => {
    setSuccessMessage(null);
  };

  return (
    <Box
      sx={{
        height: '100vh',
        height: '100dvh', // Dynamic viewport height for mobile
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.default',
        overflow: 'hidden',
      }}
    >
      {/* Status Header - fixed height */}
      <Box sx={{ flexShrink: 0 }}>
        <StatusHeader
          roomName={config?.roomName || 'Zasedací místnost'}
          status={data?.status || null}
          loading={loading && !data}
        />
      </Box>

      {/* Main Content - Event List with scroll */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          minHeight: 0,
        }}
      >
        <Container maxWidth="md" disableGutters>
          <EventList
            events={data?.events || []}
            loading={loading && !data}
          />
        </Container>
      </Box>

      {/* Footer - Reserve Button - always visible */}
      <Box sx={{ flexShrink: 0 }}>
        <ReserveButton
          status={data?.status || null}
          onClick={handleReserveClick}
          disabled={loading && !data}
        />
      </Box>

      {/* Reserve Dialog */}
      <ReserveDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        nextEvent={data?.status.nextEvent || null}
        onSuccess={handleReservationSuccess}
      />

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Offline/Error indicator when we have cached data */}
      {(error || isOffline) && data && (
        <Alert
          severity="warning"
          sx={{
            position: 'fixed',
            bottom: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
          }}
        >
          {isOffline
            ? 'Offline - zobrazuji poslední data'
            : 'Chyba při aktualizaci dat'}
        </Alert>
      )}
    </Box>
  );
}

export default App;
