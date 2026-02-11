import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  IconButton,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  Download as DownloadIcon,
  EmojiEvents as TrophyIcon,
  WorkspacePremium as CertificateIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import JsBarcode from 'jsbarcode';
import { useAuthStore } from '../store/authStore';
import { Student } from '../types';
import { exportStudentsToExcel, importStudentsFromExcel, downloadStudentsTemplate, exportAchievementCertificatePdf, exportStudentCardPdf } from '../utils/export';
import { Settings } from '../types';

const StudentsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [grades, setGrades] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const fetchStudents = async () => {
    try {
      const filters: { search?: string; grade?: string } = {};
      if (search) filters.search = search;
      if (gradeFilter) filters.grade = gradeFilter;

      const response = await window.electronAPI.students.getAll(filters);
      if (response.success) {
        setStudents(response.data);
        // Extract unique grades
        const uniqueGrades = [...new Set(response.data.map((s: Student) => s.grade))].sort() as string[];
        setGrades(uniqueGrades);
      }
    } catch (error) {
      toast.error(t('errors.general'));
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await window.electronAPI.settings.get();
      if (response.success) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStudents(), fetchSettings()]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [search, gradeFilter]);

  const handleDelete = async () => {
    if (!studentToDelete) return;

    try {
      const response = await window.electronAPI.students.delete(studentToDelete.id, user!.id);
      if (response.success) {
        toast.success(t('students.deleteSuccess'));
        fetchStudents();
      } else {
        if (response.error === 'STUDENT_HAS_ACTIVE_LOANS') {
          toast.error(t('students.hasActiveLoans'));
        } else {
          toast.error(t('errors.general'));
        }
      }
    } catch (error) {
      toast.error(t('errors.general'));
    }
    setDeleteDialogOpen(false);
    setStudentToDelete(null);
  };

  const handleExport = () => {
    exportStudentsToExcel(students, t);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportErrors([]);

    try {
      const { data, errors } = await importStudentsFromExcel(file);

      let successCount = 0;
      let failedCount = 0;
      const newErrors: string[] = [...errors];

      for (const studentData of data) {
        try {
          const response = await window.electronAPI.students.create(studentData, user!.id);
          if (response.success) {
            successCount++;
          } else {
            failedCount++;
            if (response.error === 'STUDENT_ID_EXISTS') {
              newErrors.push(`${studentData.studentId}: Öğrenci numarası zaten mevcut`);
            }
          }
        } catch {
          failedCount++;
        }
      }

      setImportErrors(newErrors);

      if (successCount > 0) {
        toast.success(t('students.importSuccess', { count: successCount }));
        fetchStudents();
      }
      if (failedCount > 0) {
        toast.warning(t('students.importFailed', { count: failedCount }));
      }
    } catch (error) {
      toast.error(t('errors.general'));
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    downloadStudentsTemplate(t);
  };

  const handlePrintCertificate = async (student: Student) => {
    try {
      await exportAchievementCertificatePdf(student, settings, t, i18n.language);
      toast.success(t('students.certificatePrinted'));
    } catch (error) {
      toast.error(t('errors.general'));
    }
  };

  const generateBarcode = (text: string): string => {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: 'CODE128',
      width: 2,
      height: 50,
      displayValue: false,
    });
    return canvas.toDataURL('image/png');
  };

  const handlePrintStudentCard = async (student: Student) => {
    try {
      const barcode = generateBarcode(student.studentId);
      await exportStudentCardPdf(student, barcode, settings, t, i18n.language);
      toast.success(t('students.cardPrinted'));
    } catch (error) {
      toast.error(t('errors.general'));
    }
  };

  const columns: GridColDef[] = [
    { field: 'studentId', headerName: t('students.studentId'), width: 130 },
    { field: 'fullName', headerName: t('students.fullName'), flex: 1, minWidth: 200 },
    { field: 'grade', headerName: t('students.grade'), width: 100 },
    { field: 'school', headerName: t('students.school'), width: 250 },
    { field: 'phone', headerName: t('students.phone'), width: 150 },
    {
      field: 'rewardPoints',
      headerName: t('students.rewardPoints'),
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TrophyIcon sx={{ fontSize: 18, color: params.row.rewardPoints > 0 ? '#FFD700' : '#ccc' }} />
          <span>{params.row.rewardPoints || 0}</span>
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 200,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Tooltip title={t('common.edit')}>
            <IconButton
              size="small"
              onClick={() => navigate(`/students/${params.row.id}/edit`)}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('students.printCard')}>
            <IconButton
              size="small"
              color="secondary"
              onClick={() => handlePrintStudentCard(params.row)}
            >
              <BadgeIcon />
            </IconButton>
          </Tooltip>
          {(params.row.rewardPoints || 0) > 0 && (
            <Tooltip title={t('students.printCertificate')}>
              <IconButton
                size="small"
                color="primary"
                onClick={() => handlePrintCertificate(params.row)}
              >
                <CertificateIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={t('common.delete')}>
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                setStudentToDelete(params.row);
                setDeleteDialogOpen(true);
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('students.title')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
          >
            {t('students.exportExcel')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={() => setImportDialogOpen(true)}
          >
            {t('students.importExcel')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/library/students/new')}
          >
            {t('students.addStudent')}
          </Button>
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ minWidth: 250 }}
              placeholder={t('students.fullName') + ', ' + t('students.studentId')}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>{t('students.grade')}</InputLabel>
              <Select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                label={t('students.grade')}
              >
                <MenuItem value="">{t('students.allGrades')}</MenuItem>
                {grades.map((grade) => (
                  <MenuItem key={grade} value={grade}>
                    {grade}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ height: 600 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={students}
              columns={columns}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
              disableRowSelectionOnClick
              localeText={{
                noRowsLabel: t('common.noData'),
                MuiTablePagination: {
                  labelRowsPerPage: '',
                },
              }}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('students.deleteStudent')}</DialogTitle>
        <DialogContent>
          <Typography>{t('students.deleteConfirm')}</Typography>
          {studentToDelete && (
            <Typography sx={{ mt: 1 }} fontWeight="bold">
              {studentToDelete.fullName} ({studentToDelete.studentId})
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importDialogOpen} onClose={() => !importing && setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('students.importExcel')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadTemplate}
            >
              {t('students.downloadTemplate')}
            </Button>

            <Button
              variant="contained"
              component="label"
              startIcon={importing ? <CircularProgress size={20} color="inherit" /> : <ImportIcon />}
              disabled={importing}
            >
              {importing ? t('students.importing') : t('students.selectFile')}
              <input
                type="file"
                hidden
                accept=".xlsx,.xls"
                onChange={handleImport}
              />
            </Button>

            {importErrors.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="error">
                  {t('students.importErrors')}:
                </Typography>
                <Box sx={{ maxHeight: 150, overflow: 'auto', mt: 1 }}>
                  {importErrors.map((error, index) => (
                    <Typography key={index} variant="body2" color="text.secondary">
                      {error}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)} disabled={importing}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentsPage;
