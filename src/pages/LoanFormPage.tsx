import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Autocomplete,
  Grid,
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru, kk } from 'date-fns/locale';
import { addDays, format } from 'date-fns';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/authStore';
import { Book, Student, LoanFormData } from '../types';

const LoanFormPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const locale = i18n.language === 'kk' ? kk : ru;

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoanFormData>({
    defaultValues: {
      studentId: 0,
      bookId: 0,
      loanDate: format(new Date(), 'yyyy-MM-dd'),
      dueDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsResponse, booksResponse] = await Promise.all([
          window.electronAPI.students.getAll(),
          window.electronAPI.books.getAll(),
        ]);

        if (studentsResponse.success) {
          setStudents(studentsResponse.data);
        }
        if (booksResponse.success) {
          // Only show books with available copies
          setBooks(booksResponse.data.filter((b: Book) => b.availableCopies > 0));
        }
      } catch (error) {
        toast.error(t('errors.general'));
      }
    };

    fetchData();
  }, [t]);

  const onSubmit = async (data: LoanFormData) => {
    if (!selectedStudent || !selectedBook) {
      toast.error(t('validation.required'));
      return;
    }

    setLoading(true);
    try {
      const loanData = {
        ...data,
        studentId: selectedStudent.id,
        bookId: selectedBook.id,
      };

      const response = await window.electronAPI.loans.create(loanData, user!.id);

      if (response.success) {
        toast.success(t('loans.loanSuccess'));
        navigate('/loans');
      } else {
        if (response.error === 'BOOK_NOT_AVAILABLE') {
          toast.error(t('loans.bookNotAvailable'));
        } else {
          toast.error(t('errors.general'));
        }
      }
    } catch (error) {
      toast.error(t('errors.general'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={locale}>
      <Box>
        <Typography variant="h4" gutterBottom>
          {t('loans.newLoan')}
        </Typography>

        <Card>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={students}
                    getOptionLabel={(option) =>
                      `${option.fullName} (${option.studentId}) - ${option.grade}`
                    }
                    value={selectedStudent}
                    onChange={(_, newValue) => {
                      setSelectedStudent(newValue);
                      if (newValue) {
                        setValue('studentId', newValue.id);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('loans.selectStudent')}
                        error={!selectedStudent && !!errors.studentId}
                        helperText={!selectedStudent && errors.studentId?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={books}
                    getOptionLabel={(option) =>
                      `${option.title} (${option.inventoryNumber}) - ${t('books.availableCopies')}: ${option.availableCopies}`
                    }
                    value={selectedBook}
                    onChange={(_, newValue) => {
                      setSelectedBook(newValue);
                      if (newValue) {
                        setValue('bookId', newValue.id);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('loans.selectBook')}
                        error={!selectedBook && !!errors.bookId}
                        helperText={!selectedBook && errors.bookId?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="loanDate"
                    control={control}
                    rules={{ required: t('validation.required') }}
                    render={({ field }) => (
                      <DatePicker
                        label={t('loans.loanDate')}
                        value={field.value ? new Date(field.value) : null}
                        onChange={(date) => {
                          if (date) {
                            field.onChange(format(date, 'yyyy-MM-dd'));
                          }
                        }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: !!errors.loanDate,
                            helperText: errors.loanDate?.message,
                          },
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="dueDate"
                    control={control}
                    rules={{ required: t('validation.required') }}
                    render={({ field }) => (
                      <DatePicker
                        label={t('loans.dueDate')}
                        value={field.value ? new Date(field.value) : null}
                        onChange={(date) => {
                          if (date) {
                            field.onChange(format(date, 'yyyy-MM-dd'));
                          }
                        }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: !!errors.dueDate,
                            helperText: errors.dueDate?.message,
                          },
                        }}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              {selectedStudent && selectedBook && (
                <Card sx={{ mt: 3, backgroundColor: '#f5f5f5' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {t('loans.loanDetails')}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography>
                          <strong>{t('students.fullName')}:</strong> {selectedStudent.fullName}
                        </Typography>
                        <Typography>
                          <strong>{t('students.studentId')}:</strong> {selectedStudent.studentId}
                        </Typography>
                        <Typography>
                          <strong>{t('students.grade')}:</strong> {selectedStudent.grade}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography>
                          <strong>{t('books.bookTitle')}:</strong> {selectedBook.title}
                        </Typography>
                        <Typography>
                          <strong>{t('books.author')}:</strong> {selectedBook.author}
                        </Typography>
                        <Typography>
                          <strong>{t('books.inventoryNumber')}:</strong> {selectedBook.inventoryNumber}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}

              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || !selectedStudent || !selectedBook}
                >
                  {loading ? <CircularProgress size={24} /> : t('common.save')}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/loans')}
                  disabled={loading}
                >
                  {t('common.cancel')}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default LoanFormPage;
