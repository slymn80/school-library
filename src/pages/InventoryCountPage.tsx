import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  QrCodeScanner as ScanIcon,
  FileDownload as ExportIcon,
  Refresh as ResetIcon,
  CheckCircle as VerifiedIcon,
  Cancel as NotVerifiedIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { Book, Settings } from '../types';
import { exportInventoryCountReportPdf, exportInventoryCountReportExcel } from '../utils/export';

const InventoryCountPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [books, setBooks] = useState<Book[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifiedBooks, setVerifiedBooks] = useState<Set<number>>(new Set());
  const [scanInput, setScanInput] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const fetchBooks = async () => {
    try {
      const response = await window.electronAPI.books.getAll({});
      if (response.success) {
        setBooks(response.data);
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
      await Promise.all([fetchBooks(), fetchSettings()]);
      setLoading(false);
    };
    init();

    // Load saved verification state from sessionStorage
    const savedState = sessionStorage.getItem('inventoryVerifiedBooks');
    if (savedState) {
      try {
        const ids = JSON.parse(savedState);
        setVerifiedBooks(new Set(ids));
      } catch (e) {
        console.error('Error loading saved state:', e);
      }
    }
  }, []);

  // Save verification state when it changes
  useEffect(() => {
    if (verifiedBooks.size > 0) {
      sessionStorage.setItem('inventoryVerifiedBooks', JSON.stringify([...verifiedBooks]));
    }
  }, [verifiedBooks]);

  const handleScan = () => {
    if (!scanInput.trim()) return;

    const book = books.find(
      (b) => b.inventoryNumber.toLowerCase() === scanInput.trim().toLowerCase() ||
             b.isbn?.toLowerCase() === scanInput.trim().toLowerCase()
    );

    if (book) {
      if (verifiedBooks.has(book.id)) {
        toast.info(t('inventory.alreadyVerified'));
      } else {
        setVerifiedBooks((prev) => new Set([...prev, book.id]));
        toast.success(`${t('inventory.verified')}: ${book.title}`);
      }
    } else {
      toast.warning(t('inventory.bookNotFound'));
    }

    setScanInput('');
    scanInputRef.current?.focus();
  };

  const handleToggleVerified = (bookId: number) => {
    setVerifiedBooks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) {
        newSet.delete(bookId);
      } else {
        newSet.add(bookId);
      }
      return newSet;
    });
  };

  const handleReset = () => {
    setVerifiedBooks(new Set());
    sessionStorage.removeItem('inventoryVerifiedBooks');
    setResetDialogOpen(false);
    toast.success(t('inventory.resetSuccess'));
  };

  const handleExportPdf = async () => {
    try {
      await exportInventoryCountReportPdf(books, verifiedBooks, t, i18n.language, settings);
      toast.success(t('common.success'));
    } catch (error) {
      toast.error(t('errors.general'));
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportInventoryCountReportExcel(books, verifiedBooks, t, i18n.language);
      toast.success(t('common.success'));
    } catch (error) {
      toast.error(t('errors.general'));
    }
  };

  const verifiedCount = verifiedBooks.size;
  const totalCount = books.length;
  const progress = totalCount > 0 ? (verifiedCount / totalCount) * 100 : 0;

  const columns: GridColDef[] = [
    {
      field: 'verified',
      headerName: t('inventory.verified'),
      width: 80,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Checkbox
          checked={verifiedBooks.has(params.row.id)}
          onChange={() => handleToggleVerified(params.row.id)}
          color="success"
        />
      ),
    },
    { field: 'inventoryNumber', headerName: t('books.inventoryNumber'), width: 150 },
    { field: 'title', headerName: t('books.bookTitle'), flex: 1, minWidth: 250 },
    { field: 'author', headerName: t('books.author'), width: 180 },
    { field: 'shelfLocation', headerName: t('books.shelfLocation'), width: 120 },
    {
      field: 'status',
      headerName: t('loans.status'),
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        verifiedBooks.has(params.row.id) ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main' }}>
            <VerifiedIcon fontSize="small" />
            {t('inventory.verified')}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'error.main' }}>
            <NotVerifiedIcon fontSize="small" />
            {t('inventory.notVerified')}
          </Box>
        )
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('inventory.title')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={handleExportPdf}
          >
            {t('reports.exportPdf')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExportExcel}
          >
            {t('reports.exportExcel')}
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ResetIcon />}
            onClick={() => setResetDialogOpen(true)}
          >
            {t('inventory.reset')}
          </Button>
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <TextField
              inputRef={scanInputRef}
              label={t('inventory.scanToVerify')}
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleScan();
                }
              }}
              size="small"
              sx={{ minWidth: 300 }}
              placeholder={t('books.inventoryNumber') + ' / ISBN'}
              autoFocus
            />
            <Button
              variant="contained"
              startIcon={<ScanIcon />}
              onClick={handleScan}
            >
              {t('inventory.verify')}
            </Button>
          </Box>

          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('inventory.progress')}: {verifiedCount} / {totalCount} ({progress.toFixed(1)}%)
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 10, borderRadius: 5 }}
              color={progress === 100 ? 'success' : 'primary'}
            />
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ height: 500 }}>
          <DataGrid
            rows={books}
            columns={columns}
            loading={loading}
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
        </CardContent>
      </Card>

      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>{t('inventory.reset')}</DialogTitle>
        <DialogContent>
          <Typography>{t('inventory.resetConfirm')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleReset} color="warning" variant="contained">
            {t('inventory.reset')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryCountPage;
