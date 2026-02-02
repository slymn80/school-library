import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/authStore';

const ChangePasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('validation.minLength', { min: 6 }));
      return;
    }

    setLoading(true);

    try {
      const response = await window.electronAPI.auth.changePassword(
        user!.id,
        oldPassword,
        newPassword
      );

      if (response.success) {
        updateUser({ mustChangePassword: false });
        toast.success(t('auth.passwordChanged'));
        navigate('/');
      } else {
        if (response.error === 'INVALID_PASSWORD') {
          setError(t('auth.invalidOldPassword'));
        } else {
          setError(t('errors.general'));
        }
      }
    } catch (err) {
      setError(t('errors.general'));
    } finally {
      setLoading(false);
    }
  };

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
      <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" align="center" gutterBottom>
            {t('auth.changePassword')}
          </Typography>
          <Typography variant="body2" align="center" color="textSecondary" sx={{ mb: 3 }}>
            {t('auth.mustChangePassword')}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              type="password"
              label={t('auth.oldPassword')}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              margin="normal"
              required
              autoFocus
              disabled={loading}
            />
            <TextField
              fullWidth
              type="password"
              label={t('auth.newPassword')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              margin="normal"
              required
              disabled={loading}
            />
            <TextField
              fullWidth
              type="password"
              label={t('auth.confirmPassword')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
              required
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : t('auth.changePassword')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ChangePasswordPage;
