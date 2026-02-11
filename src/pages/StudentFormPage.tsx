import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Grid,
  CircularProgress,
} from '@mui/material';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/authStore';
import { StudentFormData } from '../types';

const StudentFormPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormData>({
    defaultValues: {
      fullName: '',
      studentId: '',
      grade: '',
      school: 'Талгарская частная школа-интернат-лицей №1',
      branch: '',
      phone: '',
      notes: '',
    },
  });

  useEffect(() => {
    const fetchStudent = async () => {
      if (!id) return;
      try {
        const response = await window.electronAPI.students.getById(parseInt(id));
        if (response.success && response.data) {
          reset({
            fullName: response.data.fullName,
            studentId: response.data.studentId,
            grade: response.data.grade,
            school: response.data.school,
            branch: response.data.branch || '',
            phone: response.data.phone || '',
            notes: response.data.notes || '',
          });
        }
      } catch (error) {
        toast.error(t('errors.general'));
      } finally {
        setInitialLoading(false);
      }
    };

    fetchStudent();
  }, [id, reset, t]);

  const onSubmit = async (data: StudentFormData) => {
    setLoading(true);
    try {
      let response;
      if (id) {
        response = await window.electronAPI.students.update(parseInt(id), data, user!.id);
      } else {
        response = await window.electronAPI.students.create(data, user!.id);
      }

      if (response.success) {
        toast.success(t('students.saveSuccess'));
        navigate('/library/students');
      } else {
        if (response.error === 'STUDENT_ID_EXISTS') {
          toast.error(t('students.studentIdExists'));
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

  if (initialLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {id ? t('students.editStudent') : t('students.addStudent')}
      </Typography>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="fullName"
                  control={control}
                  rules={{ required: t('validation.required') }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('students.fullName')}
                      error={!!errors.fullName}
                      helperText={errors.fullName?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="studentId"
                  control={control}
                  rules={{ required: t('validation.required') }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('students.studentId')}
                      error={!!errors.studentId}
                      helperText={errors.studentId?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="grade"
                  control={control}
                  rules={{ required: t('validation.required') }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('students.grade')}
                      placeholder="7А, 8Б, 9В..."
                      error={!!errors.grade}
                      helperText={errors.grade?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <Controller
                  name="school"
                  control={control}
                  rules={{ required: t('validation.required') }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('students.school')}
                      error={!!errors.school}
                      helperText={errors.school?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="branch"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('students.branch')}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('students.phone')}
                      placeholder="+7 777 123 4567"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      multiline
                      rows={3}
                      label={t('students.notes')}
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : t('common.save')}
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/library/students')}
                disabled={loading}
              >
                {t('common.cancel')}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default StudentFormPage;
