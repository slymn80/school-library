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
  Chip,
  InputAdornment,
  Grid,
  Tabs,
  Tab,
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
  Search as SearchIcon,
  FileUpload as ImportIcon,
  FileDownload as DownloadIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import * as XLSX from 'xlsx';
import { exportTextbookStockReportPdf, exportTextbooksToExcel } from '../../utils/export';

interface Textbook {
  id: number;
  author: string | null;
  title: string;
  publicationType: string | null;
  direction: string | null;
  publisher: string | null;
  yearPublished: number | null;
  isbn: string | null;
  price: number | null;
  language: string | null;
  gradeFrom: number;
  gradeTo: number | null;
  totalStock: number;
  subject: string;
  availableStock: number;
  createdAt: string;
}

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const SUBJECTS = [
  'Математика',
  'Алгебра',
  'Геометрия',
  'Физика',
  'Химия',
  'Биология',
  'История',
  'География',
  'Русский язык',
  'Русская литература',
  'Казахский язык',
  'Казахская литература',
  'Английский язык',
  'Информатика',
  'Музыка',
  'ИЗО',
  'Технология',
  'Физкультура',
  'ОБЖ',
  'Другое',
];

const LANGUAGES = [
  { value: 'ru', label: 'Русский' },
  { value: 'kk', label: 'Қазақша' },
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Türkçe' },
];

const PUBLICATION_TYPES = [
  'Учебник',
  'Учебное пособие',
  'Рабочая тетрадь',
  'Методическое пособие',
  'Справочник',
  'Хрестоматия',
  'Другое',
];

const DIRECTIONS = [
  'ОГН',
  'ЕМН',
  'Общее',
];

const TextbooksPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedTextbook, setSelectedTextbook] = useState<Textbook | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<number | ''>('');
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    author: '',
    title: '',
    publicationType: '',
    direction: '',
    publisher: '',
    yearPublished: new Date().getFullYear(),
    isbn: '',
    price: 0,
    language: 'ru',
    gradeFrom: 1,
    gradeTo: null as number | null,
    totalStock: 0,
    subject: '',
  });
  const [newStock, setNewStock] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const fetchTextbooks = async () => {
    try {
      const filters: any = {};
      if (searchQuery) filters.search = searchQuery;
      if (gradeFilter) filters.grade = gradeFilter;
      if (languageFilter) filters.language = languageFilter;

      const response = await window.electronAPI.textbooks.getAll(filters);
      if (response.success) {
        setTextbooks(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch textbooks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTextbooks();
  }, [searchQuery, gradeFilter, languageFilter]);

  const handleOpenDialog = (textbook?: Textbook) => {
    if (textbook) {
      setSelectedTextbook(textbook);
      setFormData({
        author: textbook.author || '',
        title: textbook.title,
        publicationType: textbook.publicationType || '',
        direction: textbook.direction || '',
        publisher: textbook.publisher || '',
        yearPublished: textbook.yearPublished || new Date().getFullYear(),
        isbn: textbook.isbn || '',
        price: textbook.price || 0,
        language: textbook.language || 'ru',
        gradeFrom: textbook.gradeFrom,
        gradeTo: textbook.gradeTo,
        totalStock: textbook.totalStock,
        subject: textbook.subject,
      });
    } else {
      setSelectedTextbook(null);
      setFormData({
        author: '',
        title: '',
        publicationType: '',
        direction: '',
        publisher: '',
        yearPublished: new Date().getFullYear(),
        isbn: '',
        price: 0,
        language: 'ru',
        gradeFrom: 1,
        gradeTo: null,
        totalStock: 0,
        subject: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedTextbook(null);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.subject.trim()) {
      setSnackbar({ open: true, message: t('validation.required'), severity: 'error' });
      return;
    }

    try {
      const data = {
        author: formData.author || undefined,
        title: formData.title,
        publicationType: formData.publicationType || undefined,
        direction: formData.direction || undefined,
        publisher: formData.publisher || undefined,
        yearPublished: formData.yearPublished || undefined,
        isbn: formData.isbn || undefined,
        price: formData.price || undefined,
        language: formData.language || undefined,
        gradeFrom: formData.gradeFrom,
        gradeTo: formData.gradeTo || undefined,
        totalStock: formData.totalStock,
        subject: formData.subject,
      };

      let response;
      if (selectedTextbook) {
        response = await window.electronAPI.textbooks.update(selectedTextbook.id, data, user!.id);
      } else {
        response = await window.electronAPI.textbooks.create(data, user!.id);
      }

      if (response.success) {
        setSnackbar({ open: true, message: t('common.success'), severity: 'success' });
        handleCloseDialog();
        fetchTextbooks();
      } else {
        setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to save textbook:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  const handleDeleteClick = (textbook: Textbook) => {
    setSelectedTextbook(textbook);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedTextbook) return;

    try {
      const response = await window.electronAPI.textbooks.delete(selectedTextbook.id, user!.id);
      if (response.success) {
        setSnackbar({ open: true, message: t('common.success'), severity: 'success' });
        setDeleteDialogOpen(false);
        setSelectedTextbook(null);
        fetchTextbooks();
      } else {
        let errorMessage = t('common.error');
        if (response.error === 'TEXTBOOK_IN_SETS') {
          errorMessage = t('textbookModule.textbookInSets');
        } else if (response.error === 'TEXTBOOK_HAS_DISTRIBUTIONS') {
          errorMessage = t('textbookModule.textbookHasDistributions');
        }
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to delete textbook:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  const handleOpenStockDialog = (textbook: Textbook) => {
    setSelectedTextbook(textbook);
    setNewStock(textbook.totalStock);
    setStockDialogOpen(true);
  };

  const handleUpdateStock = async () => {
    if (!selectedTextbook) return;

    try {
      const response = await window.electronAPI.textbooks.updateStock(selectedTextbook.id, newStock, user!.id);
      if (response.success) {
        setSnackbar({ open: true, message: t('common.success'), severity: 'success' });
        setStockDialogOpen(false);
        setSelectedTextbook(null);
        fetchTextbooks();
      } else {
        const errorMessage = response.error === 'INSUFFICIENT_AVAILABLE_STOCK'
          ? t('textbookModule.insufficientStock')
          : t('common.error');
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to update stock:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    }
  };

  // Column header names per language
  const getColumnHeaders = () => {
    const lang = i18n.language;
    if (lang === 'tr') {
      return {
        author: 'Yazarlar', title: 'Kitap Adı', publicationType: 'Yayın Türü',
        direction: 'Yön', publisher: 'Yayınevi', yearPublished: 'Yayın Yılı',
        isbn: 'ISBN', price: 'Fiyat', language: 'Dil',
        gradeFrom: 'Sınıf (Başlangıç)', gradeTo: 'Sınıf (Bitiş)',
        quantity: 'Miktar', subject: 'Ders', sheetName: 'Ders Kitapları',
      };
    }
    if (lang === 'kk') {
      return {
        author: 'Авторлар', title: 'Кітап атауы', publicationType: 'Басылым түрі',
        direction: 'Бағыт', publisher: 'Баспа', yearPublished: 'Басылым жылы',
        isbn: 'ISBN', price: 'Бағасы', language: 'Тілі',
        gradeFrom: 'Сынып (бастапқы)', gradeTo: 'Сынып (соңғы)',
        quantity: 'Саны', subject: 'Пән', sheetName: 'Оқулықтар',
      };
    }
    // Default: Russian
    return {
      author: 'Авторы', title: 'Название', publicationType: 'Вид издания',
      direction: 'Направление', publisher: 'Издательство', yearPublished: 'Год издания',
      isbn: 'ISBN', price: 'Цена', language: 'Язык',
      gradeFrom: 'Класс (от)', gradeTo: 'Класс (до)',
      quantity: 'Количество', subject: 'Предмет', sheetName: 'Учебники',
    };
  };

  // Download template for import
  const handleDownloadTemplate = () => {
    const h = getColumnHeaders();
    const sampleAuthor = i18n.language === 'tr' ? 'Yazar A., Yazar B.' : 'Иванов И.И., Петров П.П.';
    const sampleTitle = i18n.language === 'tr' ? 'Matematik' : 'Математика';
    const samplePublicationType = i18n.language === 'tr' ? 'Ders Kitabı' : 'Учебник';
    const sampleDirection = i18n.language === 'tr' ? 'Genel' : 'Общее';
    const sampleSubject = i18n.language === 'tr' ? 'Matematik' : 'Математика';

    const templateData = [
      {
        [h.author]: sampleAuthor,
        [h.title]: sampleTitle,
        [h.publicationType]: samplePublicationType,
        [h.direction]: sampleDirection,
        [h.publisher]: 'Атамұра',
        [h.yearPublished]: 2024,
        [h.isbn]: '978-601-331-123-4',
        [h.price]: 3500,
        [h.language]: 'ru',
        [h.gradeFrom]: 5,
        [h.gradeTo]: 5,
        [h.quantity]: 100,
        [h.subject]: sampleSubject,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, h.sheetName);

    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // author
      { wch: 30 }, // title
      { wch: 18 }, // publicationType
      { wch: 12 }, // direction
      { wch: 15 }, // publisher
      { wch: 12 }, // yearPublished
      { wch: 18 }, // isbn
      { wch: 10 }, // price
      { wch: 8 },  // language
      { wch: 18 }, // gradeFrom
      { wch: 18 }, // gradeTo
      { wch: 12 }, // quantity
      { wch: 15 }, // subject
    ];

    XLSX.writeFile(wb, 'textbooks_template.xlsx');
  };

  // Helper to find a column value by trying multiple possible header names
  const getCol = (row: any, ...keys: string[]): any => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
    }
    return undefined;
  };

  // Handle file import
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
          // Map Excel columns to our fields (supports Russian, Turkish, Kazakh, and English headers)
          const textbookData = {
            author: getCol(row, 'Авторы', 'Yazarlar', 'Авторлар', 'author', 'Yazar') || undefined,
            title: getCol(row, 'Название', 'Kitap Adı', 'Кітап атауы', 'title', 'Başlık', 'Атауы') || '',
            publicationType: getCol(row, 'Вид издания', 'Yayın Türü', 'Басылым түрі', 'publicationType') || undefined,
            direction: getCol(row, 'Направление', 'Yön', 'Бағыт', 'direction') || undefined,
            publisher: getCol(row, 'Издательство', 'Yayınevi', 'Баспа', 'publisher') || undefined,
            yearPublished: parseInt(getCol(row, 'Год издания', 'Yayın Yılı', 'Басылым жылы', 'yearPublished', 'Yıl')) || undefined,
            isbn: getCol(row, 'ISBN', 'isbn') || undefined,
            price: parseFloat(getCol(row, 'Цена', 'Fiyat', 'Бағасы', 'price')) || undefined,
            language: getCol(row, 'Язык', 'Dil', 'Тілі', 'language') || 'ru',
            gradeFrom: parseInt(getCol(row, 'Класс (от)', 'Sınıf (Başlangıç)', 'Сынып (бастапқы)', 'gradeFrom', 'Класс', 'Sınıf', 'Сынып')) || 1,
            gradeTo: parseInt(getCol(row, 'Класс (до)', 'Sınıf (Bitiş)', 'Сынып (соңғы)', 'gradeTo')) || undefined,
            totalStock: parseInt(getCol(row, 'Количество', 'Miktar', 'Саны', 'totalStock', 'Количество экземпляров', 'Adet', 'Stok')) || 0,
            subject: getCol(row, 'Предмет', 'Ders', 'Пән', 'subject') || '',
          };

          if (!textbookData.title || !textbookData.subject) {
            errors.push(`${t('textbookModule.row')} ${i + 2}: ${t('textbookModule.titleAndSubjectRequired')}`);
            failed++;
            continue;
          }

          const response = await window.electronAPI.textbooks.create(textbookData, user!.id);
          if (response.success) {
            success++;
          } else {
            const detail = response.details ? ` (${response.details})` : '';
            errors.push(`${t('textbookModule.row')} ${i + 2}: ${textbookData.title} - ${t('common.error')}${detail}`);
            failed++;
          }
        } catch (err: any) {
          errors.push(`${t('textbookModule.row')} ${i + 2}: ${err?.message || t('common.error')}`);
          failed++;
        }
      }

      setImportResults({ success, failed, errors });
      if (success > 0) {
        fetchTextbooks();
      }
    } catch (error) {
      console.error('Import error:', error);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'author', headerName: t('textbookModule.author'), width: 150 },
    { field: 'title', headerName: t('textbookModule.textbookTitle'), flex: 1, minWidth: 200 },
    { field: 'subject', headerName: t('textbookModule.subject'), width: 120 },
    {
      field: 'grade',
      headerName: t('textbookModule.grade'),
      width: 100,
      valueGetter: (params: any) => {
        const row = params.row as Textbook;
        if (row.gradeTo && row.gradeTo !== row.gradeFrom) {
          return `${row.gradeFrom}-${row.gradeTo}`;
        }
        return `${row.gradeFrom}`;
      },
    },
    {
      field: 'language',
      headerName: t('textbookModule.language'),
      width: 100,
      valueGetter: (params: any) => {
        const val = params.value ?? params;
        const lang = LANGUAGES.find(l => l.value === val);
        return lang ? lang.label : val;
      },
    },
    { field: 'publisher', headerName: t('textbookModule.publisher'), width: 120 },
    { field: 'yearPublished', headerName: t('textbookModule.yearPublished'), width: 80 },
    { field: 'isbn', headerName: 'ISBN', width: 130 },
    {
      field: 'price',
      headerName: t('textbookModule.price'),
      width: 100,
      valueFormatter: (params: any) => {
        const val = params.value ?? params;
        return val ? `${val} ₸` : '-';
      },
    },
    {
      field: 'stock',
      headerName: t('textbookModule.stock'),
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        const row = params.row as Textbook;
        const color = row.availableStock < row.totalStock * 0.2 ? 'error' : 'success';
        return (
          <Chip
            label={`${row.availableStock} / ${row.totalStock}`}
            color={color}
            size="small"
            onClick={() => handleOpenStockDialog(row)}
            sx={{ cursor: 'pointer' }}
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleOpenDialog(params.row as Textbook)}
            color="primary"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDeleteClick(params.row as Textbook)}
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
        <Typography variant="h4">{t('textbookModule.textbooks')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={async () => {
              const settingsRes = await window.electronAPI.settings.get();
              const s = settingsRes.success ? settingsRes.data : null;
              await exportTextbookStockReportPdf(textbooks, s, t, i18n.language);
            }}
          >
            {t('textbookModule.reports.printStockReport')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => exportTextbooksToExcel(textbooks, t, i18n.language)}
          >
            {t('textbookModule.exportExcel')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadTemplate}
          >
            {t('books.downloadTemplate')}
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
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            {t('textbookModule.addTextbook')}
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>{t('textbookModule.grade')}</InputLabel>
            <Select
              value={gradeFilter}
              label={t('textbookModule.grade')}
              onChange={(e) => setGradeFilter(e.target.value as number | '')}
            >
              <MenuItem value="">{t('common.all')}</MenuItem>
              {GRADES.map((grade) => (
                <MenuItem key={grade} value={grade}>
                  {grade}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>{t('textbookModule.language')}</InputLabel>
            <Select
              value={languageFilter}
              label={t('textbookModule.language')}
              onChange={(e) => setLanguageFilter(e.target.value)}
            >
              <MenuItem value="">{t('common.all')}</MenuItem>
              {LANGUAGES.map((lang) => (
                <MenuItem key={lang.value} value={lang.value}>
                  {lang.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <Paper sx={{ height: 'calc(100vh - 320px)', width: '100%' }}>
        <DataGrid
          rows={textbooks}
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
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedTextbook ? t('textbookModule.editTextbook') : t('textbookModule.addTextbook')}
        </DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
            <Tab label={t('textbookModule.basicInfo')} />
            <Tab label={t('textbookModule.additionalInfo')} />
          </Tabs>

          {tabValue === 0 && (
            <Grid container spacing={2}>
              {/* 1. Authors */}
              <Grid item xs={12}>
                <TextField
                  label={t('textbookModule.author')}
                  fullWidth
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                />
              </Grid>

              {/* 2. Title */}
              <Grid item xs={12}>
                <TextField
                  label={t('textbookModule.textbookTitle')}
                  fullWidth
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </Grid>

              {/* 13. Subject */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('textbookModule.subject')} *</InputLabel>
                  <Select
                    value={formData.subject}
                    label={t('textbookModule.subject') + ' *'}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  >
                    {SUBJECTS.map((subject) => (
                      <MenuItem key={subject} value={subject}>
                        {subject}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* 9. Language */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('textbookModule.language')}</InputLabel>
                  <Select
                    value={formData.language}
                    label={t('textbookModule.language')}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  >
                    {LANGUAGES.map((lang) => (
                      <MenuItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* 10. Grade From */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('textbookModule.gradeFrom')} *</InputLabel>
                  <Select
                    value={formData.gradeFrom}
                    label={t('textbookModule.gradeFrom') + ' *'}
                    onChange={(e) => setFormData({ ...formData, gradeFrom: Number(e.target.value) })}
                  >
                    {GRADES.map((grade) => (
                      <MenuItem key={grade} value={grade}>
                        {grade}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* 11. Grade To */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('textbookModule.gradeTo')}</InputLabel>
                  <Select
                    value={formData.gradeTo || ''}
                    label={t('textbookModule.gradeTo')}
                    onChange={(e) => setFormData({ ...formData, gradeTo: e.target.value ? Number(e.target.value) : null })}
                  >
                    <MenuItem value="">{t('textbookModule.sameAsGradeFrom')}</MenuItem>
                    {GRADES.filter(g => g >= formData.gradeFrom).map((grade) => (
                      <MenuItem key={grade} value={grade}>
                        {grade}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* 12. Stock */}
              {!selectedTextbook && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    label={t('textbookModule.totalStock')}
                    type="number"
                    fullWidth
                    value={formData.totalStock}
                    onChange={(e) => setFormData({ ...formData, totalStock: Math.max(0, parseInt(e.target.value) || 0) })}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
              )}
            </Grid>
          )}

          {tabValue === 1 && (
            <Grid container spacing={2}>
              {/* 3. Publication Type */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('textbookModule.publicationType')}</InputLabel>
                  <Select
                    value={formData.publicationType}
                    label={t('textbookModule.publicationType')}
                    onChange={(e) => setFormData({ ...formData, publicationType: e.target.value })}
                  >
                    <MenuItem value="">{t('common.notSpecified')}</MenuItem>
                    {PUBLICATION_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* 4. Direction */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('textbookModule.direction')}</InputLabel>
                  <Select
                    value={formData.direction}
                    label={t('textbookModule.direction')}
                    onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                  >
                    <MenuItem value="">{t('common.notSpecified')}</MenuItem>
                    {DIRECTIONS.map((dir) => (
                      <MenuItem key={dir} value={dir}>
                        {dir}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* 5. Publisher */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label={t('textbookModule.publisher')}
                  fullWidth
                  value={formData.publisher}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                />
              </Grid>

              {/* 6. Year Published */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label={t('textbookModule.yearPublished')}
                  type="number"
                  fullWidth
                  value={formData.yearPublished}
                  onChange={(e) => setFormData({ ...formData, yearPublished: parseInt(e.target.value) || new Date().getFullYear() })}
                  inputProps={{ min: 1900, max: new Date().getFullYear() + 1 }}
                />
              </Grid>

              {/* 7. ISBN */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="ISBN"
                  fullWidth
                  value={formData.isbn}
                  onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                />
              </Grid>

              {/* 8. Price */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label={t('textbookModule.price')}
                  type="number"
                  fullWidth
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">₸</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} variant="contained">
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stock Update Dialog */}
      <Dialog open={stockDialogOpen} onClose={() => setStockDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('textbookModule.updateStock')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {selectedTextbook?.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('textbookModule.currentStock')}: {selectedTextbook?.availableStock} / {selectedTextbook?.totalStock}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label={t('textbookModule.newTotalStock')}
            type="number"
            fullWidth
            value={newStock}
            onChange={(e) => setNewStock(Math.max(0, parseInt(e.target.value) || 0))}
            inputProps={{ min: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleUpdateStock} variant="contained">
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('textbookModule.deleteTextbook')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('textbookModule.deleteTextbookConfirm', { name: selectedTextbook?.title })}
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
        <DialogTitle>{t('books.importExcel')}</DialogTitle>
        <DialogContent>
          {importing && <LinearProgress sx={{ mb: 2 }} />}

          <Alert severity="info" sx={{ mb: 2 }}>
            {t('textbookModule.importInfo')}
          </Alert>

          <Typography variant="body2" sx={{ mb: 2 }}>
            {t('textbookModule.importColumns')}:
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {(() => {
              const h = getColumnHeaders();
              return `${h.author}, ${h.title}, ${h.publicationType}, ${h.direction}, ${h.publisher}, ${h.yearPublished}, ${h.isbn}, ${h.price}, ${h.language}, ${h.gradeFrom}, ${h.gradeTo}, ${h.quantity}, ${h.subject}`;
            })()}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <input
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              id="import-file"
              type="file"
              onChange={handleFileImport}
              disabled={importing}
            />
            <label htmlFor="import-file">
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
                {t('books.importSuccess', { count: importResults.success })}
                {importResults.failed > 0 && (
                  <Typography variant="body2">
                    {t('books.importFailed', { count: importResults.failed })}
                  </Typography>
                )}
              </Alert>

              {importResults.errors.length > 0 && (
                <Box>
                  <Typography variant="subtitle2">{t('books.importErrors')}:</Typography>
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
            {t('books.downloadTemplate')}
          </Button>
          <Button onClick={() => { setImportDialogOpen(false); setImportResults(null); }} disabled={importing}>
            {t('common.close')}
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

export default TextbooksPage;
