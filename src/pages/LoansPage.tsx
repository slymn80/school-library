import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Card,
  CardContent,
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
  Chip,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  AssignmentReturn as ReturnIcon,
  FileDownload as ExportIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ru, kk } from 'date-fns/locale';
import { useAuthStore } from '../store/authStore';
import { Loan } from '../types';
import { exportLoansToExcel, exportOverdueReportToPdf } from '../utils/export';

const LoansPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [loanToReturn, setLoanToReturn] = useState<Loan | null>(null);

  const locale = i18n.language === 'kk' ? kk : ru;

  const fetchLoans = async () => {
    try {
      const filters: { status?: string } = {};
      if (statusFilter) filters.status = statusFilter;

      const response = await window.electronAPI.loans.getAll(filters);
      if (response.success) {
        setLoans(response.data);
      }
    } catch (error) {
      toast.error(t('errors.general'));
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchLoans();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [statusFilter]);

  const handleReturn = async () => {
    if (!loanToReturn) return;

    try {
      const response = await window.electronAPI.loans.return(loanToReturn.id, user!.id);
      if (response.success) {
        const fee = response.data.fee;
        if (fee > 0) {
          toast.success(`${t('loans.returnSuccess')} ${t('loans.feeAmount')}: ${fee} KZT`);
        } else {
          toast.success(t('loans.returnSuccess'));
        }
        fetchLoans();
      } else {
        toast.error(t('errors.general'));
      }
    } catch (error) {
      toast.error(t('errors.general'));
    }
    setReturnDialogOpen(false);
    setLoanToReturn(null);
  };

  const handleExportExcel = () => {
    exportLoansToExcel(loans, t, i18n.language);
  };

  const handleExportOverduePdf = async () => {
    const overdueLoans = loans.filter(
      (loan) => !loan.returnedAt && new Date(loan.dueDate) < new Date()
    );
    const settingsResponse = await window.electronAPI.settings.get();
    const settings = settingsResponse.data;
    exportOverdueReportToPdf(overdueLoans, t, i18n.language, settings);
  };

  const getStatus = (loan: Loan) => {
    if (loan.returnedAt) return 'returned';
    if (new Date(loan.dueDate) < new Date()) return 'overdue';
    return 'active';
  };

  const getStatusChip = (loan: Loan) => {
    const status = getStatus(loan);
    switch (status) {
      case 'returned':
        return <Chip label={t('loans.returned')} color="success" size="small" />;
      case 'overdue':
        return <Chip label={t('loans.overdue')} color="error" size="small" />;
      default:
        return <Chip label={t('loans.active')} color="primary" size="small" />;
    }
  };

  const getOverdueDays = (loan: Loan) => {
    if (loan.returnedAt) {
      const returnDate = parseISO(loan.returnedAt);
      const dueDate = parseISO(loan.dueDate);
      const days = differenceInDays(returnDate, dueDate);
      return days > 0 ? days : 0;
    }
    const today = new Date();
    const dueDate = parseISO(loan.dueDate);
    const days = differenceInDays(today, dueDate);
    return days > 0 ? days : 0;
  };

  const columns: GridColDef[] = [
    {
      field: 'student',
      headerName: t('students.fullName'),
      flex: 1,
      minWidth: 180,
      valueGetter: (params) => params.row.student?.fullName,
    },
    {
      field: 'book',
      headerName: t('books.bookTitle'),
      flex: 1,
      minWidth: 200,
      valueGetter: (params) => params.row.book?.title,
    },
    {
      field: 'loanDate',
      headerName: t('loans.loanDate'),
      width: 120,
      valueFormatter: (params) =>
        format(parseISO(params.value), 'dd.MM.yyyy', { locale }),
    },
    {
      field: 'dueDate',
      headerName: t('loans.dueDate'),
      width: 120,
      valueFormatter: (params) =>
        format(parseISO(params.value), 'dd.MM.yyyy', { locale }),
    },
    {
      field: 'returnedAt',
      headerName: t('loans.returnDate'),
      width: 120,
      valueFormatter: (params) =>
        params.value ? format(parseISO(params.value), 'dd.MM.yyyy', { locale }) : '-',
    },
    {
      field: 'status',
      headerName: t('loans.status'),
      width: 130,
      renderCell: (params: GridRenderCellParams) => getStatusChip(params.row),
    },
    {
      field: 'overdueDays',
      headerName: t('loans.overdueDays'),
      width: 100,
      valueGetter: (params) => getOverdueDays(params.row),
    },
    {
      field: 'fee',
      headerName: t('loans.fee'),
      width: 100,
      valueFormatter: (params) => (params.value > 0 ? `${params.value} KZT` : '-'),
    },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          {!params.row.returnedAt && (
            <Tooltip title={t('loans.returnBook')}>
              <IconButton
                size="small"
                color="primary"
                onClick={() => {
                  setLoanToReturn(params.row);
                  setReturnDialogOpen(true);
                }}
              >
                <ReturnIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('loans.title')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={handleExportOverduePdf}
          >
            {t('loans.exportOverduePdf')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExportExcel}
          >
            {t('loans.exportExcel')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/loans/new')}
          >
            {t('loans.newLoan')}
          </Button>
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>{t('loans.status')}</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label={t('loans.status')}
              >
                <MenuItem value="">{t('loans.allStatuses')}</MenuItem>
                <MenuItem value="active">{t('loans.activeLoans')}</MenuItem>
                <MenuItem value="returned">{t('loans.returnedLoans')}</MenuItem>
                <MenuItem value="overdue">{t('loans.overdueLoans')}</MenuItem>
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
              rows={loans}
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

      <Dialog open={returnDialogOpen} onClose={() => setReturnDialogOpen(false)}>
        <DialogTitle>{t('loans.returnBook')}</DialogTitle>
        <DialogContent>
          <Typography>{t('loans.returnConfirm')}</Typography>
          {loanToReturn && (
            <Box sx={{ mt: 2 }}>
              <Typography>
                <strong>{t('books.bookTitle')}:</strong> {loanToReturn.book?.title}
              </Typography>
              <Typography>
                <strong>{t('students.fullName')}:</strong> {loanToReturn.student?.fullName}
              </Typography>
              {getOverdueDays(loanToReturn) > 0 && (
                <Typography color="error">
                  <strong>{t('loans.overdueDays')}:</strong> {getOverdueDays(loanToReturn)}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleReturn} color="primary" variant="contained">
            {t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoansPage;
