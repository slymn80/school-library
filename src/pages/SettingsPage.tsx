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
  Switch,
  FormControlLabel,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Save as SaveIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Folder as FolderIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Category as CategoryIcon,
  VpnKey as KeyIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/authStore';
import { Settings, BackupFile, Category, BackupHistoryEntry } from '../types';

interface BackupActivityHistory {
  manualBackups: BackupHistoryEntry[];
  restores: BackupHistoryEntry[];
  autoBackups: BackupHistoryEntry[];
}

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupHistory, setBackupHistory] = useState<BackupFile[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [backupActivity, setBackupActivity] = useState<BackupActivityHistory>({
    manualBackups: [],
    restores: [],
    autoBackups: [],
  });

  // License state
  const [licenseStatus, setLicenseStatus] = useState<any>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseActivating, setLicenseActivating] = useState(false);

  // Category management state
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryNameKk, setCategoryNameKk] = useState('');
  const [categoryNameTr, setCategoryNameTr] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);

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

  const fetchCategories = async () => {
    try {
      const response = await window.electronAPI.categories.getAll();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchBackupActivity = async () => {
    try {
      const response = await window.electronAPI.backup.getActivityHistory();
      if (response.success && response.data) {
        setBackupActivity(response.data);
      }
    } catch (error) {
      console.error('Error fetching backup activity:', error);
    }
  };

  const handleOpenCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategoryNameKk(category.nameKk);
      setCategoryNameTr(category.nameTr || '');
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryNameKk('');
      setCategoryNameTr('');
    }
    setCategoryDialogOpen(true);
  };

  const handleCloseCategoryDialog = () => {
    setCategoryDialogOpen(false);
    setEditingCategory(null);
    setCategoryName('');
    setCategoryNameKk('');
    setCategoryNameTr('');
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim() || !categoryNameKk.trim()) {
      return;
    }

    setCategorySaving(true);
    try {
      let response;
      const categoryData = {
        name: categoryName,
        nameKk: categoryNameKk,
        nameTr: categoryNameTr || undefined
      };
      if (editingCategory) {
        response = await window.electronAPI.categories.update(
          editingCategory.id,
          categoryData,
          user!.id
        );
      } else {
        response = await window.electronAPI.categories.create(
          categoryData,
          user!.id
        );
      }

      if (response.success) {
        toast.success(t('categories.saveSuccess'));
        fetchCategories();
        handleCloseCategoryDialog();
      } else {
        toast.error(t('errors.general'));
      }
    } catch (error) {
      toast.error(t('errors.general'));
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm(t('common.confirm'))) {
      return;
    }
    try {
      const response = await window.electronAPI.categories.delete(id, user!.id);
      if (response.success) {
        toast.success(t('common.success'));
        fetchCategories();
      } else {
        toast.error(t('errors.general'));
      }
    } catch (error) {
      toast.error(t('errors.general'));
    }
  };

  const fetchBackupHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await window.electronAPI.backup.getHistory();
      if (response.success) {
        setBackupHistory(response.data);
      }
    } catch (error) {
      console.error('Error fetching backup history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteBackup = async (filePath: string) => {
    if (!window.confirm(t('settings.deleteBackupConfirm'))) {
      return;
    }
    try {
      const response = await window.electronAPI.backup.deleteBackup(filePath);
      if (response.success) {
        toast.success(t('settings.backupDeleted'));
        fetchBackupHistory();
      } else {
        toast.error(t('errors.general'));
      }
    } catch (error) {
      toast.error(t('errors.general'));
    }
  };

  const handleRestoreFromFile = async (filePath: string) => {
    if (!window.confirm(t('settings.restoreWarning'))) {
      return;
    }
    setBackupLoading(true);
    try {
      const response = await window.electronAPI.backup.restoreFromFile(filePath, user?.id);
      if (response.success) {
        toast.success(t('settings.restoreSuccess'));
        window.location.reload();
      } else {
        toast.error(t('errors.general'));
      }
    } catch (error) {
      toast.error(t('errors.general'));
    } finally {
      setBackupLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const fetchLicenseStatus = async () => {
    try {
      const response = await window.electronAPI.license.getStatus();
      if (response.success) {
        setLicenseStatus(response.data);
      }
    } catch (error) {
      console.error('Error fetching license status:', error);
    }
  };

  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) return;
    setLicenseActivating(true);
    try {
      const response = await window.electronAPI.license.activate(licenseKey.trim());
      if (response.success) {
        setLicenseStatus(response.data);
        setLicenseKey('');
        toast.success(t('license.activeLicense'));
      } else {
        if (response.error === 'INVALID_KEY') {
          toast.error(t('license.invalidKey'));
        } else if (response.error === 'EXPIRED_KEY') {
          toast.error(t('license.expiredKey'));
        } else {
          toast.error(t('license.activationError'));
        }
      }
    } catch (error) {
      toast.error(t('license.activationError'));
    } finally {
      setLicenseActivating(false);
    }
  };

  const handleDeactivateLicense = async () => {
    if (!confirm(t('license.deactivateConfirm'))) return;
    try {
      const response = await window.electronAPI.license.deactivate();
      if (response.success) {
        setLicenseStatus(response.data);
        toast.success(t('common.success'));
      }
    } catch (error) {
      toast.error(t('errors.general'));
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchCategories();
    fetchBackupActivity();
    fetchLicenseStatus();
  }, []);

  useEffect(() => {
    if (settings?.autoBackupPath) {
      fetchBackupHistory();
    }
  }, [settings?.autoBackupPath]);

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
      const response = await window.electronAPI.backup.create(user?.id);
      if (response.success) {
        toast.success(t('settings.backupSuccess'));
        fetchBackupActivity();
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
      const response = await window.electronAPI.backup.restore(user?.id);
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
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={`${t('settings.schoolName')} (TR)`}
                    value={settings?.schoolNameTr || ''}
                    onChange={(e) =>
                      setSettings((prev) => prev ? { ...prev, schoolNameTr: e.target.value } : null)
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={`${t('settings.schoolName')} (EN)`}
                    value={settings?.schoolNameEn || ''}
                    onChange={(e) =>
                      setSettings((prev) => prev ? { ...prev, schoolNameEn: e.target.value } : null)
                    }
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                {t('certificates.principalName')} / {t('certificates.librarianName')}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('certificates.principalName')}
                    value={settings?.principalName || ''}
                    onChange={(e) =>
                      setSettings((prev) => prev ? { ...prev, principalName: e.target.value } : null)
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('certificates.librarianName')}
                    value={settings?.librarianName || ''}
                    onChange={(e) =>
                      setSettings((prev) => prev ? { ...prev, librarianName: e.target.value } : null)
                    }
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                {t('settings.schoolLogo')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {settings?.schoolLogo && (
                  <Box
                    component="img"
                    src={settings.schoolLogo}
                    alt="Logo"
                    sx={{ width: 80, height: 80, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 1 }}
                  />
                )}
                <Button
                  variant="outlined"
                  component="label"
                >
                  {t('settings.uploadLogo')}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setSettings((prev) => prev ? { ...prev, schoolLogo: reader.result as string } : null);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </Button>
                {settings?.schoolLogo && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setSettings((prev) => prev ? { ...prev, schoolLogo: undefined } : null)}
                  >
                    {t('common.delete')}
                  </Button>
                )}
              </Box>

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

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                {t('textbookModule.academicYear')}
              </Typography>
              <FormControl sx={{ width: 200 }}>
                <InputLabel>{t('textbookModule.academicYear')}</InputLabel>
                <Select
                  value={settings?.academicYear || '2025-2026'}
                  label={t('textbookModule.academicYear')}
                  onChange={(e) =>
                    setSettings((prev) =>
                      prev ? { ...prev, academicYear: e.target.value as string } : null
                    )
                  }
                >
                  {(() => {
                    const currentYear = new Date().getFullYear();
                    const years = [];
                    for (let i = -2; i <= 2; i++) {
                      const year = currentYear + i;
                      years.push(`${year}-${year + 1}`);
                    }
                    return years;
                  })().map((year) => (
                    <MenuItem key={year} value={year}>{year}</MenuItem>
                  ))}
                </Select>
              </FormControl>

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

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                {t('settings.autoBackup')}
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.autoBackupEnabled || false}
                    onChange={(e) =>
                      setSettings((prev) =>
                        prev ? { ...prev, autoBackupEnabled: e.target.checked } : null
                      )
                    }
                  />
                }
                label={t('settings.enableAutoBackup')}
              />

              {settings?.autoBackupEnabled && (
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('settings.backupInterval')}</InputLabel>
                    <Select
                      value={settings?.autoBackupInterval || 7}
                      label={t('settings.backupInterval')}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev ? { ...prev, autoBackupInterval: e.target.value as number } : null
                        )
                      }
                    >
                      <MenuItem value={1}>{t('settings.daily')}</MenuItem>
                      <MenuItem value={7}>{t('settings.weekly')}</MenuItem>
                      <MenuItem value={14}>{t('settings.biweekly')}</MenuItem>
                      <MenuItem value={30}>{t('settings.monthly')}</MenuItem>
                    </Select>
                  </FormControl>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t('settings.backupFolder')}:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        size="small"
                        fullWidth
                        value={settings?.autoBackupPath || ''}
                        placeholder={t('settings.selectBackupFolder')}
                        InputProps={{ readOnly: true }}
                      />
                      <Button
                        variant="outlined"
                        onClick={async () => {
                          const response = await window.electronAPI.backup.selectFolder();
                          if (response.success) {
                            setSettings((prev) =>
                              prev ? { ...prev, autoBackupPath: response.data.path } : null
                            );
                          }
                        }}
                      >
                        <FolderIcon />
                      </Button>
                    </Box>
                  </Box>

                  {settings?.lastAutoBackup && (
                    <Typography variant="body2" color="text.secondary">
                      {t('settings.lastAutoBackup')}: {new Date(settings.lastAutoBackup).toLocaleString()}
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {settings?.autoBackupPath && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <HistoryIcon color="primary" />
                  <Typography variant="h6">
                    {t('settings.backupHistory')}
                  </Typography>
                </Box>

                {historyLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : backupHistory.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t('settings.noBackups')}
                  </Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('settings.backupDate')}</TableCell>
                          <TableCell>{t('settings.backupSize')}</TableCell>
                          <TableCell align="right">{t('common.actions')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {backupHistory.map((backup) => (
                          <TableRow key={backup.path}>
                            <TableCell>
                              {new Date(backup.date).toLocaleString()}
                            </TableCell>
                            <TableCell>{formatFileSize(backup.size)}</TableCell>
                            <TableCell align="right">
                              <Tooltip title={t('settings.restoreBackup')}>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleRestoreFromFile(backup.path)}
                                  disabled={backupLoading}
                                >
                                  <RestoreIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('settings.deleteBackup')}>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteBackup(backup.path)}
                                  disabled={backupLoading}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          )}

          {/* Backup Activity History */}
          <Card sx={{ mt: 2 }}>
            <CardContent sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <HistoryIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight="medium">
                  {t('settings.backupActivity')}
                </Typography>
              </Box>

              {/* Manual Backups */}
              <Typography variant="caption" color="text.secondary" fontWeight="medium" sx={{ display: 'block', mb: 0.5 }}>
                {t('settings.manualBackups')}
              </Typography>
              {backupActivity.manualBackups.length > 0 ? (
                <Box sx={{ mb: 1.5 }}>
                  {backupActivity.manualBackups.map((entry, idx) => (
                    <Typography key={idx} variant="caption" sx={{ display: 'block', fontSize: '0.7rem', color: 'text.secondary' }}>
                      {new Date(entry.date).toLocaleString()}
                    </Typography>
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" sx={{ display: 'block', mb: 1.5, fontSize: '0.7rem', color: 'text.disabled' }}>
                  {t('common.noData')}
                </Typography>
              )}

              {/* Restores */}
              <Typography variant="caption" color="text.secondary" fontWeight="medium" sx={{ display: 'block', mb: 0.5 }}>
                {t('settings.restores')}
              </Typography>
              {backupActivity.restores.length > 0 ? (
                <Box sx={{ mb: 1.5 }}>
                  {backupActivity.restores.map((entry, idx) => (
                    <Typography key={idx} variant="caption" sx={{ display: 'block', fontSize: '0.7rem', color: 'text.secondary' }}>
                      {new Date(entry.date).toLocaleString()}
                    </Typography>
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" sx={{ display: 'block', mb: 1.5, fontSize: '0.7rem', color: 'text.disabled' }}>
                  {t('common.noData')}
                </Typography>
              )}

              {/* Auto Backups */}
              <Typography variant="caption" color="text.secondary" fontWeight="medium" sx={{ display: 'block', mb: 0.5 }}>
                {t('settings.autoBackups')}
              </Typography>
              {backupActivity.autoBackups.length > 0 ? (
                <Box>
                  {backupActivity.autoBackups.map((entry, idx) => (
                    <Typography key={idx} variant="caption" sx={{ display: 'block', fontSize: '0.7rem', color: 'text.secondary' }}>
                      {new Date(entry.date).toLocaleString()}
                    </Typography>
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', color: 'text.disabled' }}>
                  {t('common.noData')}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Category Management Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CategoryIcon color="primary" />
                  <Typography variant="h6">
                    {t('categories.title')}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenCategoryDialog()}
                >
                  {t('categories.addCategory')}
                </Button>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('categories.name')}</TableCell>
                      <TableCell>{t('categories.nameKk')}</TableCell>
                      <TableCell>{t('categories.nameTr')}</TableCell>
                      <TableCell align="right">{t('common.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography variant="body2" color="text.secondary">
                            {t('common.noData')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell>{category.name}</TableCell>
                          <TableCell>{category.nameKk}</TableCell>
                          <TableCell>{category.nameTr || '-'}</TableCell>
                          <TableCell align="right">
                            <Tooltip title={t('common.edit')}>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenCategoryDialog(category)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('common.delete')}>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteCategory(category.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* License Info */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <KeyIcon color="primary" />
            <Typography variant="h6">{t('license.licenseInfo')}</Typography>
          </Box>

          {/* License Status Card */}
          {licenseStatus && (
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2,
                mb: 3,
                border: '1px solid',
                borderColor: licenseStatus.isExpired
                  ? 'error.main'
                  : licenseStatus.isTrial
                  ? 'warning.main'
                  : 'success.main',
                backgroundColor: licenseStatus.isExpired
                  ? 'error.50'
                  : licenseStatus.isTrial
                  ? 'warning.50'
                  : 'success.50',
                bgcolor: licenseStatus.isExpired
                  ? '#fff3f0'
                  : licenseStatus.isTrial
                  ? '#fff8e1'
                  : '#e8f5e9',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {licenseStatus.isExpired
                      ? t('license.expired')
                      : licenseStatus.isTrial
                      ? t('license.trialMode')
                      : 'PRO'}
                  </Typography>
                </Box>
                <Alert
                  severity={licenseStatus.isExpired ? 'error' : licenseStatus.isTrial ? 'warning' : 'success'}
                  sx={{ py: 0 }}
                  icon={false}
                >
                  <Typography variant="body2" fontWeight="bold">
                    {licenseStatus.isExpired
                      ? t('license.expired')
                      : t('license.daysRemaining', { days: licenseStatus.daysRemaining })}
                  </Typography>
                </Alert>
              </Box>

              {/* Full license details */}
              {!licenseStatus.isTrial && !licenseStatus.isExpired && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">{t('license.school')}</Typography>
                    <Typography variant="body2" fontWeight="medium">{licenseStatus.schoolName}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">{t('license.expiryDate')}</Typography>
                    <Typography variant="body2" fontWeight="medium">{licenseStatus.expiryDate}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">{t('license.licenseId')}</Typography>
                    <Typography variant="body2" fontWeight="medium">{licenseStatus.licenseId}</Typography>
                  </Grid>
                </Grid>
              )}

              {/* Expired license details */}
              {!licenseStatus.isTrial && licenseStatus.isExpired && licenseStatus.schoolName && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">{t('license.school')}</Typography>
                    <Typography variant="body2">{licenseStatus.schoolName}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">{t('license.expiryDate')}</Typography>
                    <Typography variant="body2" color="error">{licenseStatus.expiryDate}</Typography>
                  </Grid>
                </Grid>
              )}

              {/* Deactivate button for active full license */}
              {!licenseStatus.isTrial && !licenseStatus.isExpired && (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  sx={{ mt: 2 }}
                  onClick={handleDeactivateLicense}
                >
                  {t('license.deactivate')}
                </Button>
              )}
            </Box>
          )}

          {/* License Key Input */}
          <Divider sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {licenseStatus?.isExpired ? t('license.enterNewKey') : t('license.enterLicenseKey')}
            </Typography>
          </Divider>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              placeholder={t('license.keyPlaceholder')}
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              disabled={licenseActivating}
            />
            <Button
              variant="contained"
              onClick={handleActivateLicense}
              disabled={licenseActivating || !licenseKey.trim()}
              sx={{ minWidth: 140, height: 40 }}
            >
              {licenseActivating ? <CircularProgress size={20} /> : t('license.activate')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Category Add/Edit Dialog */}
      <Dialog open={categoryDialogOpen} onClose={handleCloseCategoryDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? t('common.edit') : t('categories.addCategory')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label={t('categories.name')}
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              autoFocus
            />
            <TextField
              fullWidth
              label={t('categories.nameKk')}
              value={categoryNameKk}
              onChange={(e) => setCategoryNameKk(e.target.value)}
            />
            <TextField
              fullWidth
              label={t('categories.nameTr')}
              value={categoryNameTr}
              onChange={(e) => setCategoryNameTr(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCategoryDialog} disabled={categorySaving}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSaveCategory}
            variant="contained"
            disabled={categorySaving || !categoryName.trim() || !categoryNameKk.trim()}
            startIcon={categorySaving ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsPage;
