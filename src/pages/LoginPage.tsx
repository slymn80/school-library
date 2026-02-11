import React, { useState, useEffect } from 'react';
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
  const [schoolName, setSchoolName] = useState('');
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await window.electronAPI.settings.get();
        if (response.success && response.data) {
          let name = response.data.schoolName;
          if (i18n.language === 'kk') {
            name = response.data.schoolNameKk;
          } else if (i18n.language === 'tr') {
            name = response.data.schoolNameTr;
          } else if (i18n.language === 'en') {
            name = response.data.schoolNameTr || response.data.schoolName;
          }
          setSchoolName(name || '');
          setSchoolLogo(response.data.schoolLogo || null);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };
    fetchSettings();
  }, [i18n.language]);

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
              <ToggleButton value="kk">KK</ToggleButton>
              <ToggleButton value="ru">RU</ToggleButton>
              <ToggleButton value="tr">TR</ToggleButton>
              <ToggleButton value="en">EN</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Box
              component="img"
              src={schoolLogo || '/icon.png'}
              alt="Logo"
              sx={{ width: 80, height: 80, mb: 1, objectFit: 'contain', borderRadius: 1 }}
            />
            {schoolName && (
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.3, mb: 0.5 }}>
                {schoolName}
              </Typography>
            )}
            <Typography variant="body2" color="textSecondary">
              {t('common.appName')}
            </Typography>
          </Box>
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
