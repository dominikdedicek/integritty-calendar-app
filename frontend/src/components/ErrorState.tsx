import {
  Box,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  WifiOff as OfflineIcon,
} from '@mui/icons-material';

interface ErrorStateProps {
  error: Error | null;
  isOffline: boolean;
  onRetry: () => void;
}

export function ErrorState({ error, isOffline, onRetry }: ErrorStateProps) {
  const icon = isOffline ? (
    <OfflineIcon sx={{ fontSize: 80, opacity: 0.5, mb: 2 }} />
  ) : (
    <ErrorIcon sx={{ fontSize: 80, opacity: 0.5, mb: 2, color: 'error.main' }} />
  );

  const title = isOffline ? 'Offline' : 'Chyba';
  const message = isOffline
    ? 'Nejste připojeni k internetu. Zkontrolujte připojení a zkuste to znovu.'
    : error?.message || 'Nepodařilo se načíst kalendář. Zkuste to znovu.';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        backgroundColor: 'background.default',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 6,
          textAlign: 'center',
          maxWidth: 500,
          backgroundColor: 'background.paper',
        }}
      >
        {icon}
        <Typography variant="h2" sx={{ mb: 2 }}>
          {title}
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, opacity: 0.7 }}>
          {message}
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
          sx={{ px: 4, py: 1.5 }}
        >
          Zkusit znovu
        </Button>
      </Paper>
    </Box>
  );
}
