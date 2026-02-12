import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileUpload as ImportIcon,
  FileDownload as DownloadIcon,
  DeleteSweep as DeleteSweepIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import * as XLSX from 'xlsx';
import { exportBranchesToExcel, exportBranchesListPdf } from '../../utils/export';

interface Teacher {
  id: number;
  fullName: string;
}

interface Branch {
  id: number;
  name: string;
  grade: number;
  teacherId: number | null;
  teacher: Teacher | null;
  studentCount: number;
  createdAt: string;
}

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const BranchesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    grade: 1,
    teacherId: '' as string | number,
    studentCount: 0,
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [deleteAllPasswordOpen, setDeleteAllPasswordOpen] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const [deleteAllPassword, setDeleteAllPassword] = useState('');

  const fetchBranches = async () => {
    try {
      const response = await window.electronAPI.branches.getAll();
      if (response.success) {
        setBranches(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await window.electronAPI.teachers.getAll();
      if (response.success) {
        setTeachers(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchTeachers();
  }, []);

  const handleOpenDialog = (branch?: Branch) => {
    if (branch) {
      setSelectedBranch(branch);
      setFormData({
        name: branch.name,
        grade: branch.grade,
        teacherId: branch.teacherId || '',
        studentCount: branch.studentCount,
      });
    } else {
      setSelectedBranch(null);
      setFormData({ name: '', grade: 1, teacherId: '', studentCount: 0 });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedBranch(null);
    setFormData({ name: '', grade: 9, teacherId: '', studentCount: 0 });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setSnackbar({ open: true, message: t('validation.required'), severity: 'error' });
      return;
    }

    try {
      const data = {
        name: formData.name,
        grade: formData.grade,
        teacherId: formData.teacherId === '' ? null : Number(formData.teacherId),
        studentCount: formData.studentCount,
      };

      let response;
      if (selectedBranch) {
        response = await window.electronAPI.branches.update(selectedBranch.id, data, user!.id);
      } else {
        response = await window.electronAPI.branches.create(data as any, user!.id);
      }

      if (response.success) {
        setSnackbar({ open: true, message: t('common.success'), severity: 'success' });
        handleCloseDialog();
        fetchBranches();
      } else {
        setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to save branch:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  const handleDeleteClick = (branch: Branch) => {
    setSelectedBranch(branch);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedBranch) return;

    try {
      const response = await window.electronAPI.branches.delete(selectedBranch.id, user!.id);
      if (response.success) {
        setSnackbar({ open: true, message: t('common.success'), severity: 'success' });
        setDeleteDialogOpen(false);
        setSelectedBranch(null);
        fetchBranches();
      } else {
        const errorMessage = response.error === 'BRANCH_HAS_DISTRIBUTIONS'
          ? t('textbookModule.branchHasDistributions')
          : t('common.error');
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to delete branch:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  const handleDeleteAllPassword = async () => {
    try {
      const response = await window.electronAPI.auth.login(user!.username, deleteAllPassword);
      if (response.success) {
        setDeleteAllPasswordOpen(false);
        setDeleteAllConfirmOpen(true);
      } else {
        setSnackbar({ open: true, message: t('textbookModule.wrongPassword'), severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  const handleDeleteAll = async () => {
    try {
      const response = await window.electronAPI.branches.deleteAll(user!.id, deleteAllPassword);
      if (response.success) {
        setSnackbar({ open: true, message: t('textbookModule.deleteAllSuccess', { count: response.data.deletedCount }), severity: 'success' });
        setDeleteAllConfirmOpen(false);
        setDeleteAllPassword('');
        fetchBranches();
      } else if (response.error === 'BRANCHES_HAVE_DISTRIBUTIONS') {
        setSnackbar({ open: true, message: t('textbookModule.hasDistributions'), severity: 'error' });
        setDeleteAllConfirmOpen(false);
        setDeleteAllPassword('');
      } else {
        setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  const handleDownloadTemplate = () => {
    const lang = i18n.language;
    let hGrade: string;
    let hLetter: string;
    let hTeacher: string;
    let hStudentCount: string;
    let sampleTeacher: string;
    let sheetName: string;

    if (lang === 'tr') {
      hGrade = 'Sınıf';
      hLetter = 'Şube Harfi';
      hTeacher = 'Sınıf Öğretmeni';
      hStudentCount = 'Öğrenci Sayısı';
      sampleTeacher = 'Ahmet Yılmaz';
      sheetName = 'Şubeler';
    } else if (lang === 'kk') {
      hGrade = 'Сынып';
      hLetter = 'Әріп';
      hTeacher = 'Сынып жетекшісі';
      hStudentCount = 'Оқушы саны';
      sampleTeacher = 'Ахметов Айбек';
      sheetName = 'Сыныптар';
    } else if (lang === 'en') {
      hGrade = 'Grade';
      hLetter = 'Letter';
      hTeacher = 'Class Teacher';
      hStudentCount = 'Student Count';
      sampleTeacher = 'John Smith';
      sheetName = 'Classes';
    } else {
      hGrade = 'Класс';
      hLetter = 'Буква';
      hTeacher = 'Кл. руководитель';
      hStudentCount = 'Кол-во учеников';
      sampleTeacher = 'Иванов И.И.';
      sheetName = 'Классы';
    }

    const templateData = [
      { [hGrade]: 9, [hLetter]: 'A', [hTeacher]: sampleTeacher, [hStudentCount]: 25 },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    ws['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 25 }, { wch: 18 }];
    XLSX.writeFile(wb, 'branches_template.xlsx');
  };

  const getCol = (row: any, ...keys: string[]): any => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
    }
    return undefined;
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];
        try {
          const gradeRaw = getCol(row, 'Sınıf', 'Класс', 'Сынып', 'Grade', 'grade');
          const letterRaw = getCol(row, 'Şube Harfi', 'Буква', 'Әріп', 'Letter', 'letter');
          const teacherName = String(getCol(row, 'Sınıf Öğretmeni', 'Кл. руководитель', 'Сынып жетекшісі', 'Class Teacher', 'teacher', 'classTeacher') || '').trim();
          const studentCountRaw = getCol(row, 'Öğrenci Sayısı', 'Кол-во учеников', 'Оқушы саны', 'Student Count', 'studentCount');

          const grade = parseInt(String(gradeRaw));
          if (!grade || grade < 1 || grade > 12) {
            errors.push(`${t('textbookModule.row')} ${i + 2}: ${t('textbookModule.gradeRequired')}`);
            failed++;
            continue;
          }

          const letter = String(letterRaw || '').trim().toUpperCase();
          if (!letter) {
            errors.push(`${t('textbookModule.row')} ${i + 2}: ${t('textbookModule.letterRequired')}`);
            failed++;
            continue;
          }

          const name = letter;
          const studentCount = parseInt(String(studentCountRaw)) || 0;

          let teacherId: number | null = null;
          if (teacherName) {
            const matched = teachers.find(
              (tc) => tc.fullName.trim().toLowerCase() === teacherName.toLowerCase()
            );
            if (matched) {
              teacherId = matched.id;
            } else {
              errors.push(`${t('textbookModule.row')} ${i + 2}: ${t('textbookModule.teacherNotFound', { name: teacherName })}`);
            }
          }

          const response = await window.electronAPI.branches.create(
            { name, grade, teacherId, studentCount } as any,
            user!.id
          );

          if (response.success) {
            success++;
          } else {
            errors.push(`${t('textbookModule.row')} ${i + 2}: ${grade}${letter} - ${t('common.error')}`);
            failed++;
          }
        } catch (err: any) {
          errors.push(`${t('textbookModule.row')} ${i + 2}: ${err?.message || t('common.error')}`);
          failed++;
        }
      }

      setImportResults({ success, failed, errors });
      if (success > 0) {
        fetchBranches();
      }
    } catch (error) {
      console.error('Import error:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    {
      field: 'fullName',
      headerName: t('textbookModule.branchName'),
      flex: 1,
      minWidth: 150,
      valueGetter: (params: any) => `${params.row.grade}${params.row.name}`,
    },
    { field: 'grade', headerName: t('textbookModule.grade'), width: 100 },
    { field: 'name', headerName: t('textbookModule.branchLetter'), width: 100 },
    {
      field: 'teacher',
      headerName: t('textbookModule.classTeacher'),
      flex: 1,
      minWidth: 200,
      valueGetter: (params: any) => params.row.teacher?.fullName || '-',
    },
    {
      field: 'studentCount',
      headerName: t('textbookModule.studentCount'),
      width: 150,
    },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleOpenDialog(params.row as Branch)}
            color="primary"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDeleteClick(params.row as Branch)}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('textbookModule.branches')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={async () => {
              const settingsRes = await window.electronAPI.settings.get();
              const s = settingsRes.success ? settingsRes.data : null;
              await exportBranchesListPdf(branches, s, t, i18n.language);
            }}
          >
            {t('textbookModule.branchesList')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => exportBranchesToExcel(branches, t)}
          >
            {t('textbookModule.exportExcel')}
          </Button>
          {branches.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweepIcon />}
              onClick={() => { setDeleteAllPassword(''); setDeleteAllPasswordOpen(true); }}
            >
              {t('textbookModule.deleteAllBranches')}
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadTemplate}
          >
            {t('textbookModule.downloadTemplate')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={() => setImportDialogOpen(true)}
          >
            {t('textbookModule.importExcel')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            {t('textbookModule.addBranch')}
          </Button>
        </Box>
      </Box>

      <Paper sx={{ height: 'calc(100vh - 250px)', width: '100%' }}>
        <DataGrid
          rows={branches}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          disableRowSelectionOnClick
        />
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedBranch ? t('textbookModule.editBranch') : t('textbookModule.addBranch')}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>{t('textbookModule.grade')}</InputLabel>
            <Select
              value={formData.grade}
              label={t('textbookModule.grade')}
              onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value) })}
            >
              {GRADES.map((grade) => (
                <MenuItem key={grade} value={grade}>
                  {grade}. {t('textbookModule.grade')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            margin="dense"
            label={t('textbookModule.branchLetter')}
            fullWidth
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
            placeholder="A, B, C..."
            inputProps={{ maxLength: 2 }}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>{t('textbookModule.classTeacher')}</InputLabel>
            <Select
              value={formData.teacherId}
              label={t('textbookModule.classTeacher')}
              onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
            >
              <MenuItem value="">{t('common.noData')}</MenuItem>
              {teachers.map((teacher) => (
                <MenuItem key={teacher.id} value={teacher.id}>
                  {teacher.fullName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            margin="dense"
            label={t('textbookModule.studentCount')}
            type="number"
            fullWidth
            value={formData.studentCount}
            onChange={(e) => setFormData({ ...formData, studentCount: Math.max(0, parseInt(e.target.value) || 0) })}
            inputProps={{ min: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} variant="contained">
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('textbookModule.deleteBranch')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('textbookModule.deleteBranchConfirm', { name: selectedBranch ? `${selectedBranch.grade}${selectedBranch.name}` : '' })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => !importing && setImportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('textbookModule.importExcel')}</DialogTitle>
        <DialogContent>
          {importing && <LinearProgress sx={{ mb: 2 }} />}

          <Alert severity="info" sx={{ mb: 2 }}>
            {t('textbookModule.importBranchesInfo')}
          </Alert>

          <Typography variant="body2" sx={{ mb: 2 }}>
            {t('textbookModule.importColumns')}:
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('textbookModule.grade')}, {t('textbookModule.branchLetter')}, {t('textbookModule.classTeacher')}, {t('textbookModule.studentCount')}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <input
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              id="branch-import-file"
              type="file"
              onChange={handleFileImport}
              disabled={importing}
            />
            <label htmlFor="branch-import-file">
              <Button
                variant="contained"
                component="span"
                startIcon={<ImportIcon />}
                disabled={importing}
              >
                {t('books.selectFile')}
              </Button>
            </label>
          </Box>

          {importResults && (
            <Box sx={{ mt: 2 }}>
              <Alert severity={importResults.failed === 0 ? 'success' : 'warning'} sx={{ mb: 2 }}>
                {t('textbookModule.importSuccess', { count: importResults.success })}
                {importResults.failed > 0 && (
                  <Typography variant="body2">
                    {t('textbookModule.importFailed', { count: importResults.failed })}
                  </Typography>
                )}
              </Alert>

              {importResults.errors.length > 0 && (
                <Box>
                  <Typography variant="subtitle2">{t('textbookModule.importErrors')}:</Typography>
                  <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {importResults.errors.map((error, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={error} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDownloadTemplate} startIcon={<DownloadIcon />}>
            {t('textbookModule.downloadTemplate')}
          </Button>
          <Button onClick={() => { setImportDialogOpen(false); setImportResults(null); }} disabled={importing}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete All - Password Dialog */}
      <Dialog open={deleteAllPasswordOpen} onClose={() => setDeleteAllPasswordOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('textbookModule.deleteAllBranches')}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>{t('textbookModule.enterPassword')}</Typography>
          <TextField
            autoFocus
            type="password"
            fullWidth
            value={deleteAllPassword}
            onChange={(e) => setDeleteAllPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && deleteAllPassword) handleDeleteAllPassword(); }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllPasswordOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleDeleteAllPassword} color="error" variant="contained" disabled={!deleteAllPassword}>
            {t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete All - Confirm Dialog */}
      <Dialog open={deleteAllConfirmOpen} onClose={() => setDeleteAllConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('textbookModule.deleteAllBranches')}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('textbookModule.deleteAllConfirm', { count: branches.length })}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteAllConfirmOpen(false); setDeleteAllPassword(''); }}>{t('common.cancel')}</Button>
          <Button onClick={handleDeleteAll} color="error" variant="contained">
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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

export default BranchesPage;
