import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Person as TeachersIcon,
  Class as BranchesIcon,
  AutoStories as TextbooksIcon,
  Inventory as SetsIcon,
  LocalShipping as DistributionsIcon,
  PersonAdd as IndividualDistIcon,
  Settings as SettingsIcon,
  AccountCircle,
  Logout as LogoutIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';

const drawerWidth = 260;

const TextbookLayout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [schoolName, setSchoolName] = useState('');
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [licenseStatus, setLicenseStatus] = useState<any>(null);

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

  useEffect(() => {
    const fetchLicense = async () => {
      try {
        const response = await window.electronAPI.license.getStatus();
        if (response.success) {
          setLicenseStatus(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch license:', error);
      }
    };
    fetchLicense();
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

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

  const handleBackToModuleSelection = () => {
    navigate('/');
  };

  const menuItems = [
    { text: t('textbookModule.dashboard'), icon: <DashboardIcon />, path: '/textbooks' },
    { text: t('textbookModule.teachers'), icon: <TeachersIcon />, path: '/textbooks/teachers' },
    { text: t('textbookModule.branches'), icon: <BranchesIcon />, path: '/textbooks/branches' },
    { text: t('textbookModule.textbooks'), icon: <TextbooksIcon />, path: '/textbooks/books' },
    { text: t('textbookModule.sets'), icon: <SetsIcon />, path: '/textbooks/sets' },
    { text: t('textbookModule.distributions'), icon: <DistributionsIcon />, path: '/textbooks/distributions' },
    { text: t('textbookModule.individualDistributions'), icon: <IndividualDistIcon />, path: '/textbooks/individual' },
    { text: t('textbookModule.settings'), icon: <SettingsIcon />, path: '/textbooks/settings' },
  ];

  const drawer = (
    <div>
      <Box sx={{ py: 2, px: 2, textAlign: 'center' }}>
        <Box
          component="img"
          src={schoolLogo || '/icon.png'}
          alt="Logo"
          sx={{ width: 64, height: 64, mb: 1, objectFit: 'contain', borderRadius: 1 }}
        />
        {schoolName && (
          <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1.2, mb: 0.5 }}>
            {schoolName}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {t('textbookModule.title')}
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ p: 1 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={handleBackToModuleSelection}
          size="small"
        >
          {t('textbookModule.backToLibrary')}
        </Button>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path ||
                (item.path !== '/textbooks' && location.pathname.startsWith(item.path))}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      {licenseStatus && (
        <>
          <Divider />
          <Box sx={{ p: 1.5, textAlign: 'center' }}>
            <Chip
              size="small"
              label={
                licenseStatus.isTrial
                  ? `${t('license.trial')} — ${t('license.daysRemaining', { days: licenseStatus.daysRemaining })}`
                  : `PRO — ${t('license.daysRemaining', { days: licenseStatus.daysRemaining })}`
              }
              color={licenseStatus.isExpired ? 'error' : licenseStatus.isTrial ? 'warning' : 'success'}
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          </Box>
        </>
      )}
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: '#7b1fa2', // Purple color to distinguish from library
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />

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

          <IconButton
            color="inherit"
            onClick={handleMenuOpen}
          >
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
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default TextbookLayout;
