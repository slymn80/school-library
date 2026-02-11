import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Grid,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  MenuBook as LibraryIcon,
  AutoStories as TextbookIcon,
  Event as EventIcon,
  AccountCircle,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';

const ModuleSelectionPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  const handleSelectModule = (module: 'library' | 'textbook' | 'events') => {
    if (module === 'library') {
      navigate('/library');
    } else if (module === 'events') {
      navigate('/library/events');
    } else {
      navigate('/textbooks');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <AppBar position="static">
        <Toolbar>
          <Box
            component="img"
            src={schoolLogo || '/icon.png'}
            alt="Logo"
            sx={{ width: 40, height: 40, mr: 2, objectFit: 'contain', borderRadius: 1 }}
          />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {schoolName || t('common.appName')}
          </Typography>

          <ToggleButtonGroup
            value={i18n.language}
            exclusive
            onChange={handleLanguageChange}
            size="small"
            sx={{
              mr: 2,
              '& .MuiToggleButton-root': {
                color: 'white',
                borderColor: 'rgba(255,255,255,0.3)',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                },
              },
            }}
          >
            <ToggleButton value="kk">KK</ToggleButton>
            <ToggleButton value="ru">RU</ToggleButton>
            <ToggleButton value="tr">TR</ToggleButton>
            <ToggleButton value="en">EN</ToggleButton>
          </ToggleButtonGroup>

          <IconButton color="inherit" onClick={handleMenuOpen}>
            <AccountCircle />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem disabled>
              <Typography variant="body2">
                {user?.fullName} ({user?.role === 'ADMIN' ? t('users.roleAdmin') : t('users.roleLibrarian')})
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              {t('nav.logout')}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 8 }}>
        <Typography variant="h4" align="center" gutterBottom sx={{ mb: 4 }}>
          {t('textbookModule.selectModule')}
        </Typography>

        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} sm={6}>
            <Card
              sx={{
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <CardActionArea
                onClick={() => handleSelectModule('library')}
                sx={{ height: '100%', p: 2 }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <LibraryIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h5" component="div" gutterBottom>
                    {t('textbookModule.librarySystem')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('textbookModule.libraryDescription')}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card
              sx={{
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <CardActionArea
                onClick={() => handleSelectModule('textbook')}
                sx={{ height: '100%', p: 2 }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <TextbookIcon sx={{ fontSize: 80, color: 'secondary.main', mb: 2 }} />
                  <Typography variant="h5" component="div" gutterBottom>
                    {t('textbookModule.textbookSystem')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('textbookModule.textbookDescription')}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card
              sx={{
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <CardActionArea
                onClick={() => handleSelectModule('events')}
                sx={{ height: '100%', p: 2 }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <EventIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                  <Typography variant="h5" component="div" gutterBottom>
                    {t('events.title')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('events.moduleDescription')}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ModuleSelectionPage;
