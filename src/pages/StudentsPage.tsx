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
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/authStore';
import { Student } from '../types';
import { exportStudentsToExcel } from '../utils/export';

const StudentsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [grades, setGrades] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

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

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchStudents();
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

  const columns: GridColDef[] = [
    { field: 'studentId', headerName: t('students.studentId'), width: 130 },
    { field: 'fullName', headerName: t('students.fullName'), flex: 1, minWidth: 200 },
    { field: 'grade', headerName: t('students.grade'), width: 100 },
    { field: 'school', headerName: t('students.school'), width: 250 },
    { field: 'phone', headerName: t('students.phone'), width: 150 },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 120,
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
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/students/new')}
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
    </Box>
  );
};

export default StudentsPage;
