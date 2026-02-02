import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Divider,
  Alert,
} from '@mui/material';
import {
  Save as SaveIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/authStore';
import { Settings } from '../types';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  const fetchSettings = async () => {
    try {
      const response = await window.electronAPI.settings.get();
      if (response.success) {
        setSettings(response.data);
      }
    } catch (error) {
      toast.error(t('errors.general'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const response = await window.electronAPI.settings.update(settings, user!.id);
      if (response.success) {
        toast.success(t('settings.saveSuccess'));
      } else {
        toast.error(t('errors.general'));
      }
    } catch (error) {
      toast.error(t('errors.general'));
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const response = await window.electronAPI.backup.create();
      if (response.success) {
        toast.success(t('settings.backupSuccess'));
      } else if (response.error !== 'BACKUP_CANCELED') {
        toast.error(t('errors.general'));
      }
    } catch (error) {
      toast.error(t('errors.general'));
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm(t('settings.restoreWarning'))) {
      return;
    }
    setBackupLoading(true);
    try {
      const response = await window.electronAPI.backup.restore();
      if (response.success) {
        toast.success(t('settings.restoreSuccess'));
        window.location.reload();
      } else if (response.error !== 'RESTORE_CANCELED') {
        toast.error(t('errors.general'));
      }
    } catch (error) {
      toast.error(t('errors.general'));
    } finally {
      setBackupLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('settings.title')}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('settings.schoolName')}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={`${t('settings.schoolName')} (RU)`}
                    value={settings?.schoolName || ''}
                    onChange={(e) =>
                      setSettings((prev) => prev ? { ...prev, schoolName: e.target.value } : null)
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={`${t('settings.schoolName')} (KK)`}
                    value={settings?.schoolNameKk || ''}
                    onChange={(e) =>
                      setSettings((prev) => prev ? { ...prev, schoolNameKk: e.target.value } : null)
                    }
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                {t('loans.fee')}
              </Typography>
              <TextField
                type="number"
                label={t('settings.feePerDay')}
                value={settings?.feePerDay || 0}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev ? { ...prev, feePerDay: parseFloat(e.target.value) || 0 } : null
                  )
                }
                sx={{ width: 200 }}
                InputProps={{
                  endAdornment: <Typography sx={{ ml: 1 }}>KZT</Typography>,
                }}
              />

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {t('common.save')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('settings.backup')}
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                {t('settings.databaseMode')}: {t('settings.localMode')}
              </Alert>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={backupLoading ? <CircularProgress size={20} /> : <BackupIcon />}
                  onClick={handleBackup}
                  disabled={backupLoading}
                  fullWidth
                >
                  {t('settings.createBackup')}
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={backupLoading ? <CircularProgress size={20} /> : <RestoreIcon />}
                  onClick={handleRestore}
                  disabled={backupLoading}
                  fullWidth
                >
                  {t('settings.restoreBackup')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SettingsPage;
