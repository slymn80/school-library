import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Print as PrintIcon,
  ArrowBack as BackIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import { Book, LabelTemplate } from '../types';
import { generateBarcode } from '../utils/barcode';
import { exportLabelsToPdf } from '../utils/export';

const labelTemplates: LabelTemplate[] = [
  { id: 'small', name: 'small', width: 30, height: 15, labelsPerRow: 5, labelsPerPage: 65 },
  { id: 'medium', name: 'medium', width: 50, height: 25, labelsPerRow: 4, labelsPerPage: 40 },
  { id: 'large', name: 'large', width: 70, height: 35, labelsPerRow: 3, labelsPerPage: 21 },
];

const BarcodeLabelsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const printRef = useRef<HTMLDivElement>(null);

  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [labelTemplate, setLabelTemplate] = useState<LabelTemplate>(labelTemplates[1]);
  const [showTitle, setShowTitle] = useState(true);
  const [barcodes, setBarcodes] = useState<{ [key: number]: string }>({});

  const fetchBooks = async () => {
    try {
      const response = await window.electronAPI.books.getAll();
      if (response.success) {
        setBooks(response.data);

        const idsParam = searchParams.get('ids');
        if (idsParam) {
          const ids = idsParam.split(',').map((id) => parseInt(id));
          setSelectedBooks(ids);
        }
      }
    } catch (error) {
      toast.error(t('errors.general'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    const generateBarcodes = async () => {
      const newBarcodes: { [key: number]: string } = {};
      for (const book of books.filter((b) => selectedBooks.includes(b.id))) {
        try {
          const barcode = await generateBarcode(book.inventoryNumber);
          newBarcodes[book.id] = barcode;
        } catch (error) {
          console.error('Error generating barcode for', book.inventoryNumber);
        }
      }
      setBarcodes(newBarcodes);
    };

    if (selectedBooks.length > 0) {
      generateBarcodes();
    }
  }, [selectedBooks, books]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Barcode Labels',
  });

  const handleExportPdf = () => {
    const selectedBooksData = books.filter((b) => selectedBooks.includes(b.id));
    exportLabelsToPdf(selectedBooksData, barcodes, labelTemplate, showTitle, t);
    toast.success(t('common.success'));
  };

  const columns: GridColDef[] = [
    { field: 'inventoryNumber', headerName: t('books.inventoryNumber'), width: 130 },
    { field: 'title', headerName: t('books.bookTitle'), flex: 1, minWidth: 200 },
    { field: 'author', headerName: t('books.author'), width: 180 },
    {
      field: 'preview',
      headerName: t('barcode.preview'),
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const barcode = barcodes[params.row.id];
        if (barcode) {
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img src={barcode} alt="barcode" style={{ maxHeight: 30 }} />
            </Box>
          );
        }
        return null;
      },
    },
  ];

  const selectedBooksForPrint = books.filter((b) => selectedBooks.includes(b.id));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={() => navigate('/books')}
          >
            {t('common.back')}
          </Button>
          <Typography variant="h4">{t('barcode.title')}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={handleExportPdf}
            disabled={selectedBooks.length === 0}
          >
            {t('barcode.exportPdf')}
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            disabled={selectedBooks.length === 0}
          >
            {t('common.print')}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('barcode.selectBooks')}
              </Typography>
              <Box sx={{ height: 400 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <DataGrid
                    rows={books}
                    columns={columns}
                    pageSizeOptions={[10, 25, 50]}
                    initialState={{
                      pagination: { paginationModel: { pageSize: 10 } },
                    }}
                    checkboxSelection
                    rowSelectionModel={selectedBooks}
                    onRowSelectionModelChange={(newSelection) => {
                      setSelectedBooks(newSelection as number[]);
                    }}
                    localeText={{
                      noRowsLabel: t('common.noData'),
                    }}
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('barcode.labelSize')}
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>{t('barcode.labelSize')}</InputLabel>
                <Select
                  value={labelTemplate.id}
                  onChange={(e) => {
                    const template = labelTemplates.find((t) => t.id === e.target.value);
                    if (template) setLabelTemplate(template);
                  }}
                  label={t('barcode.labelSize')}
                >
                  {labelTemplates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {t(`barcode.${template.name}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showTitle}
                    onChange={(e) => setShowTitle(e.target.checked)}
                  />
                }
                label={t('barcode.showTitle')}
              />
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('barcode.preview')}
              </Typography>
              {selectedBooks.length === 0 ? (
                <Typography color="textSecondary">{t('barcode.noBooks')}</Typography>
              ) : (
                <Box
                  ref={printRef}
                  className="print-area"
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    p: 1,
                    border: '1px solid #ccc',
                    borderRadius: 1,
                    maxHeight: 300,
                    overflow: 'auto',
                  }}
                >
                  {selectedBooksForPrint.map((book) => (
                    <Box
                      key={book.id}
                      className="barcode-label"
                      sx={{
                        width: `${labelTemplate.width}mm`,
                        minHeight: `${labelTemplate.height}mm`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px dashed #999',
                        padding: '2mm',
                        fontSize: '8px',
                        textAlign: 'center',
                      }}
                    >
                      {barcodes[book.id] && (
                        <img
                          src={barcodes[book.id]}
                          alt={book.inventoryNumber}
                          style={{
                            maxWidth: '100%',
                            height: showTitle ? `${labelTemplate.height * 0.6}mm` : `${labelTemplate.height * 0.8}mm`,
                          }}
                        />
                      )}
                      {showTitle && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '7px',
                            lineHeight: 1.1,
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            mt: 0.5,
                          }}
                        >
                          {book.title}
                        </Typography>
                      )}
                      <Typography variant="caption" sx={{ fontSize: '6px' }}>
                        {book.inventoryNumber}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BarcodeLabelsPage;
