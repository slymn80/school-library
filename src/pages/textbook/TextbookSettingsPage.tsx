import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Snackbar,
  Divider,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

const TextbookSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await window.electronAPI.settings.get();
        if (response.success && response.data) {
          setAcademicYear(response.data.academicYear || '2025-2026');
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await window.electronAPI.settings.update({ academicYear }, user!.id);
      if (response.success) {
        setSnackbar({ open: true, message: t('settings.saveSuccess'), severity: 'success' });
      } else {
        setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const generateAcademicYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -2; i <= 2; i++) {
      const year = currentYear + i;
      years.push(`${year}-${year + 1}`);
    }
    return years;
  };

  if (loading) {
    return <Typography>{t('common.loading')}</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {t('textbookModule.settings')}
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <Typography variant="h6" gutterBottom>
          {t('textbookModule.academicYearSettings')}
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <TextField
          select
          label={t('textbookModule.academicYear')}
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          fullWidth
          SelectProps={{
            native: true,
          }}
          sx={{ mb: 3 }}
        >
          {generateAcademicYears().map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </TextField>

        <Alert severity="info" sx={{ mb: 3 }}>
          {t('textbookModule.academicYearInfo')}
        </Alert>

        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? t('common.loading') : t('common.save')}
        </Button>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TextbookSettingsPage;
