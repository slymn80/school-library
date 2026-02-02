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
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { useAuthStore } from '../store/authStore';


const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLanguageChange = (_: React.MouseEvent<HTMLElement>, newLang: string | null) => {
    if (newLang) {
      i18n.changeLanguage(newLang);
      localStorage.setItem('language', newLang);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await window.electronAPI.auth.login(username, password);

      if (response.success) {
        setAuth(response.data.user, response.data.token);
        if (response.data.user.mustChangePassword) {
          navigate('/change-password');
        } else {
          navigate('/');
        }
      } else {
        setError(t('auth.loginError'));
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
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <ToggleButtonGroup
              value={i18n.language}
              exclusive
              onChange={handleLanguageChange}
              size="small"
            >
              <ToggleButton value="ru">RU</ToggleButton>
              <ToggleButton value="kk">KK</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Typography variant="h4" align="center" gutterBottom>
            {t('common.appName')}
          </Typography>
          <Typography variant="h6" align="center" color="textSecondary" sx={{ mb: 3 }}>
            {t('auth.login')}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label={t('auth.username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              autoFocus
              disabled={loading}
            />
            <TextField
              fullWidth
              type="password"
              label={t('auth.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              {loading ? <CircularProgress size={24} /> : t('auth.loginButton')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
