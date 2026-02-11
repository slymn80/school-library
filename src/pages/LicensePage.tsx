import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
} from '@mui/material';
import {
  VpnKey as KeyIcon,
  Timer as TrialIcon,
  Warning as WarningIcon,
  PlayArrow as StartIcon,
} from '@mui/icons-material';

interface LicenseStatus {
  isValid: boolean;
  isTrial: boolean;
  isExpired: boolean;
  daysRemaining: number;
  schoolName?: string;
  expiryDate?: string;
  licenseId?: string;
}

interface LicensePageProps {
  onLicenseValid: () => void;
}

const LicensePage: React.FC<LicensePageProps> = ({ onLicenseValid }) => {
  const { t, i18n } = useTranslation();
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<LicenseStatus | null>(null);

  useEffect(() => {
    checkLicenseStatus();
  }, []);

  const checkLicenseStatus = async () => {
    setLoading(true);
    try {
      const response = await window.electronAPI.license.getStatus();
      if (response.success) {
        setStatus(response.data);
      }
    } catch (err) {
      console.error('Failed to check license:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError(t('license.enterKey'));
      return;
    }

    setActivating(true);
    setError('');

    try {
      const response = await window.electronAPI.license.activate(licenseKey.trim());
      if (response.success) {
        setStatus(response.data);
        onLicenseValid();
      } else {
        if (response.error === 'INVALID_KEY') {
          setError(t('license.invalidKey'));
        } else if (response.error === 'EXPIRED_KEY') {
          setError(t('license.expiredKey'));
        } else {
          setError(t('license.activationError'));
        }
      }
    } catch (err) {
      setError(t('license.activationError'));
    } finally {
      setActivating(false);
    }
  };

  const handleContinueTrial = () => {
    onLicenseValid();
  };

  const handleLanguageChange = (_: React.MouseEvent<HTMLElement>, newLang: string | null) => {
    if (newLang) {
      i18n.changeLanguage(newLang);
      localStorage.setItem('language', newLang);
    }
  };

  // Trial is available if: status is null (first launch), or trial is active and not expired
  const trialAvailable = !status || (status.isTrial && !status.isExpired);
  const trialDays = status?.daysRemaining ?? 30;

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
      }}
    >
      <Card sx={{ maxWidth: 520, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <ToggleButtonGroup
              value={i18n.language}
              exclusive
              onChange={handleLanguageChange}
              size="small"
            >
              <ToggleButton value="kk">KK</ToggleButton>
              <ToggleButton value="ru">RU</ToggleButton>
              <ToggleButton value="tr">TR</ToggleButton>
              <ToggleButton value="en">EN</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <KeyIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" fontWeight="bold">
              {t('license.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('common.appName')}
            </Typography>
          </Box>

          {/* Trial active banner */}
          {status?.isTrial && !status.isExpired && (
            <Alert severity="info" icon={<TrialIcon />} sx={{ mb: 2 }}>
              <Typography variant="body2">
                {t('license.trialMode')} - {t('license.daysRemaining', { days: status.daysRemaining })}
              </Typography>
            </Alert>
          )}

          {/* Trial expired */}
          {status?.isTrial && status.isExpired && (
            <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
              <Typography variant="body2">
                {t('license.trialExpired')}
              </Typography>
            </Alert>
          )}

          {/* License expired */}
          {status && !status.isTrial && status.isExpired && (
            <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 2 }}>
              <Typography variant="body2">
                {t('license.licenseExpired')}
              </Typography>
              {status.schoolName && (
                <Typography variant="caption" display="block">
                  {status.schoolName} - {status.expiryDate}
                </Typography>
              )}
            </Alert>
          )}

          {/* Continue with trial button - shown prominently at top */}
          {trialAvailable && (
            <Button
              fullWidth
              variant="contained"
              color="success"
              size="large"
              onClick={handleContinueTrial}
              startIcon={<StartIcon />}
              sx={{ mb: 3, py: 1.5 }}
            >
              {t('license.continueTrial', { days: trialDays })}
            </Button>
          )}

          <Divider sx={{ my: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {t('license.enterLicenseKey')}
            </Typography>
          </Divider>

          {/* License key input */}
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder={t('license.keyPlaceholder')}
            value={licenseKey}
            onChange={(e) => {
              setLicenseKey(e.target.value);
              setError('');
            }}
            error={!!error}
            helperText={error}
            disabled={activating}
            sx={{ mb: 2 }}
          />

          <Button
            fullWidth
            variant="contained"
            onClick={handleActivate}
            disabled={activating || !licenseKey.trim()}
            startIcon={activating ? <CircularProgress size={20} /> : <KeyIcon />}
          >
            {t('license.activate')}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LicensePage;
