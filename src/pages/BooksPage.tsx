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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
  Autocomplete,
  Checkbox,
  Chip,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  QrCode as BarcodeIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  QrCodeScanner as ScanIcon,
  VolunteerActivism as DonationIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/authStore';
import { Book, Category } from '../types';
import { exportBooksToExcel, importBooksFromExcel, downloadBooksTemplate } from '../utils/export';

const BooksPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [yearFrom, setYearFrom] = useState<string>('');
  const [yearTo, setYearTo] = useState<string>('');
  const [showDonatedOnly, setShowDonatedOnly] = useState(false);
  const [conditionFilter, setConditionFilter] = useState<string>('');
  const [acquisitionTypeFilter, setAcquisitionTypeFilter] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [selectedBooks, setSelectedBooks] = useState<number[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [scanBarcode, setScanBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');

  const fetchBooks = async () => {
    try {
      const filters: {
        search?: string;
        categoryId?: number;
        categoryIds?: number[];
        yearFrom?: number;
        yearTo?: number;
        isDonated?: boolean;
        condition?: string;
        acquisitionType?: string;
      } = {};
      if (search) filters.search = search;
      // Use multiple categories if selected, otherwise single category
      if (selectedCategories.length > 0) {
        filters.categoryIds = selectedCategories.map(c => c.id);
      } else if (categoryFilter) {
        filters.categoryId = categoryFilter;
      }
      // Year range filters
      if (yearFrom) filters.yearFrom = parseInt(yearFrom);
      if (yearTo) filters.yearTo = parseInt(yearTo);
      // Donated filter
      if (showDonatedOnly) filters.isDonated = true;
      // Condition filter
      if (conditionFilter) filters.condition = conditionFilter;
      // Acquisition type filter
      if (acquisitionTypeFilter) filters.acquisitionType = acquisitionTypeFilter;

      const response = await window.electronAPI.books.getAll(filters);
      if (response.success) {
        setBooks(response.data);
      }
    } catch (error) {
      toast.error(t('errors.general'));
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

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchBooks(), fetchCategories()]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [search, categoryFilter, selectedCategories, yearFrom, yearTo, showDonatedOnly, conditionFilter, acquisitionTypeFilter]);

  const handleDelete = async () => {
    if (!bookToDelete) return;

    try {
      const response = await window.electronAPI.books.delete(bookToDelete.id, user!.id);
      if (response.success) {
        toast.success(t('books.deleteSuccess'));
        fetchBooks();
      } else {
        if (response.error === 'BOOK_HAS_ACTIVE_LOANS') {
          toast.error(t('books.hasActiveLoans'));
        } else {
          toast.error(t('errors.general'));
        }
      }
    } catch (error) {
      toast.error(t('errors.general'));
    }
    setDeleteDialogOpen(false);
    setBookToDelete(null);
  };

  const handleExport = () => {
    exportBooksToExcel(books, t, i18n.language);
  };

  const handlePrintLabels = () => {
    if (selectedBooks.length > 0) {
      const ids = selectedBooks.join(',');
      navigate(`/library/books/labels?ids=${ids}`);
    } else {
      navigate('/library/books/labels');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportErrors([]);

    try {
      const { data, errors } = await importBooksFromExcel(file, categories);

      let successCount = 0;
      let failedCount = 0;
      const newErrors: string[] = [...errors];

      for (const bookData of data) {
        try {
          const response = await window.electronAPI.books.create(bookData, user!.id);
          if (response.success) {
            successCount++;
          } else {
            failedCount++;
            if (response.error === 'INVENTORY_NUMBER_EXISTS') {
              newErrors.push(`${bookData.inventoryNumber}: Envanter numarası zaten mevcut`);
            }
          }
        } catch {
          failedCount++;
        }
      }

      setImportErrors(newErrors);

      if (successCount > 0) {
        toast.success(t('books.importSuccess', { count: successCount }));
        fetchBooks();
      }
      if (failedCount > 0) {
        toast.warning(t('books.importFailed', { count: failedCount }));
      }
    } catch (error) {
      toast.error(t('errors.general'));
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    downloadBooksTemplate(t);
  };

  const handleBarcodeScan = async () => {
    if (!scanBarcode.trim()) {
      setScanError(t('books.enterBarcode'));
      return;
    }

    setScanning(true);
    setScanError('');

    try {
      // Try Open Library API first
      const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${scanBarcode}&format=json&jscmd=data`);
      const data = await response.json();

      const bookData = data[`ISBN:${scanBarcode}`];

      if (bookData) {
        // Found book data
        const bookInfo = {
          title: bookData.title || '',
          author: bookData.authors?.map((a: { name: string }) => a.name).join(', ') || '',
          isbn: scanBarcode,
          publisher: bookData.publishers?.map((p: { name: string }) => p.name).join(', ') || '',
          year: bookData.publish_date ? parseInt(bookData.publish_date.match(/\d{4}/)?.[0] || '0') : undefined,
        };

        // Store in sessionStorage and navigate to new book form
        sessionStorage.setItem('scannedBookData', JSON.stringify(bookInfo));
        setScanDialogOpen(false);
        setScanBarcode('');
        navigate('/library/books/new?fromScan=true');
      } else {
        // Try Google Books API as fallback
        const googleResponse = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${scanBarcode}`);
        const googleData = await googleResponse.json();

        if (googleData.items && googleData.items.length > 0) {
          const volumeInfo = googleData.items[0].volumeInfo;
          const bookInfo = {
            title: volumeInfo.title || '',
            author: volumeInfo.authors?.join(', ') || '',
            isbn: scanBarcode,
            publisher: volumeInfo.publisher || '',
            year: volumeInfo.publishedDate ? parseInt(volumeInfo.publishedDate.substring(0, 4)) : undefined,
          };

          sessionStorage.setItem('scannedBookData', JSON.stringify(bookInfo));
          setScanDialogOpen(false);
          setScanBarcode('');
          navigate('/library/books/new?fromScan=true');
        } else {
          // Book not found in any API, still allow adding with ISBN
          const bookInfo = {
            title: '',
            author: '',
            isbn: scanBarcode,
            publisher: '',
            year: undefined,
          };
          sessionStorage.setItem('scannedBookData', JSON.stringify(bookInfo));
          setScanDialogOpen(false);
          setScanBarcode('');
          toast.info(t('books.bookNotFoundManual'));
          navigate('/library/books/new?fromScan=true');
        }
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      // On error, still allow adding with ISBN
      const bookInfo = {
        title: '',
        author: '',
        isbn: scanBarcode,
        publisher: '',
        year: undefined,
      };
      sessionStorage.setItem('scannedBookData', JSON.stringify(bookInfo));
      setScanDialogOpen(false);
      setScanBarcode('');
      toast.info(t('books.bookNotFoundManual'));
      navigate('/library/books/new?fromScan=true');
    } finally {
      setScanning(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'inventoryNumber', headerName: t('books.inventoryNumber'), width: 130 },
    { field: 'title', headerName: t('books.bookTitle'), flex: 1, minWidth: 200 },
    { field: 'author', headerName: t('books.author'), width: 180 },
    {
      field: 'category',
      headerName: t('books.category'),
      width: 150,
      valueGetter: (params) => {
        const category = params.row.category;
        return i18n.language === 'kk' ? category?.nameKk : category?.name;
      },
    },
    { field: 'shelfLocation', headerName: t('books.shelfLocation'), width: 120 },
    {
      field: 'language',
      headerName: t('books.language'),
      width: 100,
      valueGetter: (params) => {
        const langMap: { [key: string]: string } = {
          kk: 'Қазақша',
          ru: 'Русский',
          en: 'English',
          tr: 'Türkçe',
          other: 'Басқа',
        };
        return langMap[params.row.language] || params.row.language || '-';
      },
    },
    { field: 'totalCopies', headerName: t('books.totalCopies'), width: 100 },
    { field: 'availableCopies', headerName: t('books.availableCopies'), width: 100 },
    {
      field: 'condition',
      headerName: t('books.condition'),
      width: 110,
      renderCell: (params: GridRenderCellParams) => {
        const condition = params.row.condition || 'good';
        const colorMap: { [key: string]: 'success' | 'warning' | 'error' | 'default' | 'info' } = {
          good: 'success',
          worn: 'warning',
          damaged: 'error',
          lost: 'error',
          repair: 'info',
        };
        return (
          <Chip
            label={t(`books.conditions.${condition}`)}
            size="small"
            color={colorMap[condition] || 'default'}
            variant="outlined"
          />
        );
      },
    },
    {
      field: 'acquisitionType',
      headerName: t('books.acquisitionType'),
      width: 110,
      renderCell: (params: GridRenderCellParams) => {
        const type = params.row.acquisitionType || 'purchase';
        if (type === 'donation' || type === 'grant') {
          return (
            <Tooltip title={params.row.donorName ? `${t('books.donatedBy')}: ${params.row.donorName}` : ''}>
              <Chip
                icon={<DonationIcon />}
                label={t(`books.acquisitionTypes.${type}`)}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Tooltip>
          );
        }
        return (
          <Chip
            label={t(`books.acquisitionTypes.${type}`)}
            size="small"
            variant="outlined"
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Tooltip title={t('common.edit')}>
            <IconButton
              size="small"
              onClick={() => navigate(`/books/${params.row.id}/edit`)}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('books.barcode')}>
            <IconButton
              size="small"
              onClick={() => navigate(`/books/labels?ids=${params.row.id}`)}
            >
              <BarcodeIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                setBookToDelete(params.row);
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
        <Typography variant="h4">{t('books.title')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrintLabels}
          >
            {t('books.printLabels')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
          >
            {t('books.exportExcel')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={() => setImportDialogOpen(true)}
          >
            {t('books.importExcel')}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<ScanIcon />}
            onClick={() => setScanDialogOpen(true)}
          >
            {t('books.scanBarcode')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/library/books/new')}
          >
            {t('books.addBook')}
          </Button>
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              label={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ minWidth: 250 }}
              placeholder={t('books.bookTitle') + ', ' + t('books.author') + ', ' + t('books.inventoryNumber')}
            />
            <Autocomplete
              multiple
              size="small"
              sx={{ minWidth: 300 }}
              options={categories}
              disableCloseOnSelect
              getOptionLabel={(option) => i18n.language === 'kk' ? option.nameKk : option.name}
              value={selectedCategories}
              onChange={(_, newValue) => {
                setSelectedCategories(newValue);
                setCategoryFilter('');
              }}
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Checkbox
                    icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                    checkedIcon={<CheckBoxIcon fontSize="small" />}
                    style={{ marginRight: 8 }}
                    checked={selected}
                  />
                  {i18n.language === 'kk' ? option.nameKk : option.name}
                </li>
              )}
              renderInput={(params) => (
                <TextField {...params} label={t('books.category')} placeholder={t('books.selectCategory')} />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.id}
                    label={i18n.language === 'kk' ? option.nameKk : option.name}
                    size="small"
                  />
                ))
              }
            />
            <TextField
              label={t('books.yearFrom')}
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
              size="small"
              type="number"
              sx={{ width: 120 }}
            />
            <TextField
              label={t('books.yearTo')}
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
              size="small"
              type="number"
              sx={{ width: 120 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>{t('books.condition')}</InputLabel>
              <Select
                value={conditionFilter}
                label={t('books.condition')}
                onChange={(e) => setConditionFilter(e.target.value)}
              >
                <MenuItem value="">{t('common.all')}</MenuItem>
                <MenuItem value="good">{t('books.conditions.good')}</MenuItem>
                <MenuItem value="worn">{t('books.conditions.worn')}</MenuItem>
                <MenuItem value="damaged">{t('books.conditions.damaged')}</MenuItem>
                <MenuItem value="lost">{t('books.conditions.lost')}</MenuItem>
                <MenuItem value="repair">{t('books.conditions.repair')}</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>{t('books.acquisitionType')}</InputLabel>
              <Select
                value={acquisitionTypeFilter}
                label={t('books.acquisitionType')}
                onChange={(e) => setAcquisitionTypeFilter(e.target.value)}
              >
                <MenuItem value="">{t('common.all')}</MenuItem>
                <MenuItem value="purchase">{t('books.acquisitionTypes.purchase')}</MenuItem>
                <MenuItem value="donation">{t('books.acquisitionTypes.donation')}</MenuItem>
                <MenuItem value="grant">{t('books.acquisitionTypes.grant')}</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={showDonatedOnly}
                  onChange={(e) => setShowDonatedOnly(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <DonationIcon fontSize="small" color="primary" />
                  {t('books.donatedBooks')}
                </Box>
              }
            />
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
              rows={books}
              columns={columns}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
              checkboxSelection
              disableRowSelectionOnClick
              onRowSelectionModelChange={(newSelection) => {
                setSelectedBooks(newSelection as number[]);
              }}
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
        <DialogTitle>{t('books.deleteBook')}</DialogTitle>
        <DialogContent>
          <Typography>{t('books.deleteConfirm')}</Typography>
          {bookToDelete && (
            <Typography sx={{ mt: 1 }} fontWeight="bold">
              {bookToDelete.title} ({bookToDelete.inventoryNumber})
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
        <DialogTitle>{t('books.importExcel')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadTemplate}
            >
              {t('books.downloadTemplate')}
            </Button>

            <Button
              variant="contained"
              component="label"
              startIcon={importing ? <CircularProgress size={20} color="inherit" /> : <ImportIcon />}
              disabled={importing}
            >
              {importing ? t('books.importing') : t('books.selectFile')}
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
                  {t('books.importErrors')}:
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

      <Dialog open={scanDialogOpen} onClose={() => !scanning && setScanDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('books.scanBarcode')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('books.scanBarcodeHelp')}
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label={t('books.barcodeISBN')}
              value={scanBarcode}
              onChange={(e) => {
                setScanBarcode(e.target.value);
                setScanError('');
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleBarcodeScan();
                }
              }}
              error={!!scanError}
              helperText={scanError}
              placeholder="978-3-16-148410-0"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setScanDialogOpen(false); setScanBarcode(''); setScanError(''); }} disabled={scanning}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleBarcodeScan}
            variant="contained"
            disabled={scanning}
            startIcon={scanning ? <CircularProgress size={20} color="inherit" /> : <ScanIcon />}
          >
            {scanning ? t('common.loading') : t('books.lookup')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BooksPage;
