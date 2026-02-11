import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { toast } from 'react-toastify';

interface BookStats {
  id: number;
  title: string;
  author: string;
  loanCount: number;
}

interface StudentStats {
  id: number;
  fullName: string;
  studentId: string;
  grade: string;
  loanCount: number;
  overdueCount: number;
  totalOverdueDays: number;
}

interface GradeStats {
  grade: string;
  studentCount: number;
  loanCount: number;
  overdueCount: number;
  avgLoansPerStudent: number;
}

interface CategoryStats {
  name: string;
  count: number;
  percentage: number;
}

interface ReadingTrend {
  period: string;
  loans: number;
  returns: number;
}

interface PopularBook {
  id: number;
  title: string;
  author: string;
  loanCount: number;
}

interface PopularCategory {
  id: number;
  name: string;
  loanCount: number;
}

const COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f', '#0288d1', '#7b1fa2', '#388e3c'];

interface CertificateAwardRow {
  id: number;
  type: string;
  category: string;
  rank: number;
  awardee: string;
  grade?: string;
  booksRead: number;
  period: string;
  academicYear?: string;
  createdAt: string;
}

const StatisticsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [mostBorrowedBooks, setMostBorrowedBooks] = useState<BookStats[]>([]);
  const [topReaders, setTopReaders] = useState<StudentStats[]>([]);
  const [lateReturners, setLateReturners] = useState<StudentStats[]>([]);
  const [gradeStats, setGradeStats] = useState<GradeStats[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [readingTrends, setReadingTrends] = useState<ReadingTrend[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [popularBooks, setPopularBooks] = useState<PopularBook[]>([]);
  const [popularCategories, setPopularCategories] = useState<PopularCategory[]>([]);
  const [certHistory, setCertHistory] = useState<CertificateAwardRow[]>([]);
  const [certTypeFilter, setCertTypeFilter] = useState<string>('');
  const [certCategoryFilter, setCertCategoryFilter] = useState<string>('');

  const fetchCertHistory = async () => {
    try {
      const filters: any = {};
      if (certTypeFilter) filters.type = certTypeFilter;
      if (certCategoryFilter) filters.category = certCategoryFilter;
      const response = await window.electronAPI.certificates.getHistory(filters);
      if (response.success) {
        setCertHistory(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching certificate history:', error);
    }
  };

  useEffect(() => {
    fetchStatistics();
    fetchTrends();
    fetchPopularItems();
    fetchCertHistory();
  }, []);

  useEffect(() => {
    fetchCertHistory();
  }, [certTypeFilter, certCategoryFilter]);

  useEffect(() => {
    fetchTrends();
  }, [trendPeriod]);

  const fetchTrends = async () => {
    try {
      const response = await window.electronAPI.reports.getReadingTrends(trendPeriod);
      if (response.success && response.data) {
        // Map from { period, count } to { period, loans, returns }
        const mappedTrends = response.data.map((item: any) => ({
          period: item.period,
          loans: item.count || 0,
          returns: 0, // TODO: Add returns tracking if needed
        }));
        setReadingTrends(mappedTrends);
      }
    } catch (error) {
      console.error('Error fetching trends:', error);
    }
  };

  const fetchPopularItems = async () => {
    try {
      const [booksRes, categoriesRes] = await Promise.all([
        window.electronAPI.reports.getPopularBooks(10),
        window.electronAPI.reports.getPopularCategories(10),
      ]);
      if (booksRes.success && booksRes.data) {
        // Map from { book: {...}, loanCount } to { id, title, author, loanCount }
        const mappedBooks = booksRes.data
          .filter((item: any) => item.book)
          .map((item: any) => ({
            id: item.book.id,
            title: item.book.title,
            author: item.book.author,
            loanCount: item.loanCount,
          }));
        setPopularBooks(mappedBooks);
      }
      if (categoriesRes.success && categoriesRes.data) {
        // Map from { category: {...}, count } to { id, name, loanCount }
        const mappedCategories = categoriesRes.data
          .filter((item: any) => item.category)
          .map((item: any) => ({
            id: item.category.id,
            name: i18n.language === 'kk' ? item.category.nameKk : item.category.name,
            loanCount: item.count,
          }));
        setPopularCategories(mappedCategories);
      }
    } catch (error) {
      console.error('Error fetching popular items:', error);
    }
  };

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      // Fetch all loans
      const loansResponse = await window.electronAPI.loans.getAll({});
      const loans = loansResponse.success ? loansResponse.data : [];

      // Fetch all books
      const booksResponse = await window.electronAPI.books.getAll({});
      const books = booksResponse.success ? booksResponse.data : [];

      // Fetch all students
      const studentsResponse = await window.electronAPI.students.getAll({});
      const students = studentsResponse.success ? studentsResponse.data : [];

      // Fetch all categories
      const categoriesResponse = await window.electronAPI.categories.getAll();
      const categories = categoriesResponse.success ? categoriesResponse.data : [];

      // Calculate most borrowed books
      const bookLoanCounts: { [key: number]: { book: any; count: number } } = {};
      loans.forEach((loan: any) => {
        if (loan.book) {
          if (!bookLoanCounts[loan.bookId]) {
            bookLoanCounts[loan.bookId] = { book: loan.book, count: 0 };
          }
          bookLoanCounts[loan.bookId].count++;
        }
      });
      const sortedBooks = Object.values(bookLoanCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((item) => ({
          id: item.book.id,
          title: item.book.title,
          author: item.book.author,
          loanCount: item.count,
        }));
      setMostBorrowedBooks(sortedBooks);

      // Calculate top readers
      const studentLoanCounts: { [key: number]: { student: any; loanCount: number; overdueCount: number; totalOverdueDays: number } } = {};
      loans.forEach((loan: any) => {
        if (loan.student) {
          if (!studentLoanCounts[loan.studentId]) {
            studentLoanCounts[loan.studentId] = { student: loan.student, loanCount: 0, overdueCount: 0, totalOverdueDays: 0 };
          }
          studentLoanCounts[loan.studentId].loanCount++;

          // Check for overdue
          const dueDate = new Date(loan.dueDate);
          const returnDate = loan.returnedAt ? new Date(loan.returnedAt) : new Date();
          if (returnDate > dueDate) {
            studentLoanCounts[loan.studentId].overdueCount++;
            const overdueDays = Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            studentLoanCounts[loan.studentId].totalOverdueDays += overdueDays;
          }
        }
      });

      const sortedReaders = Object.values(studentLoanCounts)
        .sort((a, b) => b.loanCount - a.loanCount)
        .slice(0, 10)
        .map((item) => ({
          id: item.student.id,
          fullName: item.student.fullName,
          studentId: item.student.studentId,
          grade: item.student.grade,
          loanCount: item.loanCount,
          overdueCount: item.overdueCount,
          totalOverdueDays: item.totalOverdueDays,
        }));
      setTopReaders(sortedReaders);

      // Calculate late returners
      const sortedLateReturners = Object.values(studentLoanCounts)
        .filter((item) => item.overdueCount > 0)
        .sort((a, b) => b.totalOverdueDays - a.totalOverdueDays)
        .slice(0, 10)
        .map((item) => ({
          id: item.student.id,
          fullName: item.student.fullName,
          studentId: item.student.studentId,
          grade: item.student.grade,
          loanCount: item.loanCount,
          overdueCount: item.overdueCount,
          totalOverdueDays: item.totalOverdueDays,
        }));
      setLateReturners(sortedLateReturners);

      // Calculate grade statistics
      const gradeData: { [key: string]: { studentCount: number; loanCount: number; overdueCount: number } } = {};
      students.forEach((student: any) => {
        if (!gradeData[student.grade]) {
          gradeData[student.grade] = { studentCount: 0, loanCount: 0, overdueCount: 0 };
        }
        gradeData[student.grade].studentCount++;
      });

      loans.forEach((loan: any) => {
        if (loan.student && gradeData[loan.student.grade]) {
          gradeData[loan.student.grade].loanCount++;
          const dueDate = new Date(loan.dueDate);
          const returnDate = loan.returnedAt ? new Date(loan.returnedAt) : new Date();
          if (!loan.returnedAt && returnDate > dueDate) {
            gradeData[loan.student.grade].overdueCount++;
          }
        }
      });

      const sortedGradeStats = Object.entries(gradeData)
        .map(([grade, data]) => ({
          grade,
          studentCount: data.studentCount,
          loanCount: data.loanCount,
          overdueCount: data.overdueCount,
          avgLoansPerStudent: data.studentCount > 0 ? Math.round((data.loanCount / data.studentCount) * 10) / 10 : 0,
        }))
        .sort((a, b) => a.grade.localeCompare(b.grade));
      setGradeStats(sortedGradeStats);

      // Calculate category distribution
      const categoryCounts: { [key: number]: { name: string; nameKk: string; count: number } } = {};
      categories.forEach((cat: any) => {
        categoryCounts[cat.id] = { name: cat.name, nameKk: cat.nameKk, count: 0 };
      });

      books.forEach((book: any) => {
        if (categoryCounts[book.categoryId]) {
          categoryCounts[book.categoryId].count += book.totalCopies;
        }
      });

      const totalBooks = Object.values(categoryCounts).reduce((sum, cat) => sum + cat.count, 0);
      const categoryData = Object.values(categoryCounts)
        .filter((cat) => cat.count > 0)
        .map((cat) => ({
          name: i18n.language === 'kk' ? cat.nameKk : cat.name,
          count: cat.count,
          percentage: totalBooks > 0 ? Math.round((cat.count / totalBooks) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.count - a.count);
      setCategoryStats(categoryData);

    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error(t('errors.general'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('statistics.title')}
      </Typography>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label={t('statistics.overview')} sx={{ textTransform: 'none' }} />
        <Tab label={t('statistics.trends')} sx={{ textTransform: 'none' }} />
        <Tab label={t('statistics.byStudent')} sx={{ textTransform: 'none' }} />
        <Tab label={t('statistics.byGrade')} sx={{ textTransform: 'none' }} />
        <Tab label={t('statistics.certificates')} sx={{ textTransform: 'none' }} />
      </Tabs>

      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Category Distribution */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('statistics.categoryDistribution')}
                </Typography>
                {categoryStats.length > 0 ? (
                  <Box sx={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryStats}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={(entry) => `${entry.name}: ${((entry.percent || 0) * 100).toFixed(1)}%`}
                        >
                          {categoryStats.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Typography color="text.secondary">{t('common.noData')}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Most Borrowed Books */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('statistics.mostBorrowedBooks')}
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>{t('books.bookTitle')}</TableCell>
                        <TableCell>{t('books.author')}</TableCell>
                        <TableCell align="right">{t('statistics.loanCount')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mostBorrowedBooks.length > 0 ? (
                        mostBorrowedBooks.map((book, index) => (
                          <TableRow key={book.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{book.title}</TableCell>
                            <TableCell>{book.author}</TableCell>
                            <TableCell align="right">{book.loanCount}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center">{t('common.noData')}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          {/* Reading Trends Chart */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    {t('statistics.readingTrends')}
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>{t('statistics.period')}</InputLabel>
                    <Select
                      value={trendPeriod}
                      label={t('statistics.period')}
                      onChange={(e) => setTrendPeriod(e.target.value as 'monthly' | 'yearly')}
                    >
                      <MenuItem value="monthly">{t('statistics.monthly')}</MenuItem>
                      <MenuItem value="yearly">{t('statistics.yearly')}</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                {readingTrends.length > 0 ? (
                  <Box sx={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={readingTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="loans" name={t('statistics.loans')} stroke="#1976d2" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Typography color="text.secondary">{t('common.noData')}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Popular Books */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('statistics.popularBooks')}
                </Typography>
                {popularBooks.length > 0 ? (
                  <Box sx={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={popularBooks.slice(0, 5)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="title" width={150} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="loanCount" fill="#1976d2" name={t('statistics.loanCount')} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Typography color="text.secondary">{t('common.noData')}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Popular Categories */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('statistics.popularCategories')}
                </Typography>
                {popularCategories.length > 0 ? (
                  <Box sx={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={popularCategories.slice(0, 5)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="loanCount" fill="#2e7d32" name={t('statistics.loanCount')} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Typography color="text.secondary">{t('common.noData')}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 2 && (
        <Grid container spacing={3}>
          {/* Top Readers */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('statistics.topReaders')}
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>{t('students.fullName')}</TableCell>
                        <TableCell>{t('students.grade')}</TableCell>
                        <TableCell align="right">{t('statistics.loanCount')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topReaders.length > 0 ? (
                        topReaders.map((student, index) => (
                          <TableRow key={student.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{student.fullName}</TableCell>
                            <TableCell>{student.grade}</TableCell>
                            <TableCell align="right">{student.loanCount}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center">{t('common.noData')}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Late Returners */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('statistics.lateReturners')}
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>{t('students.fullName')}</TableCell>
                        <TableCell>{t('students.grade')}</TableCell>
                        <TableCell align="right">{t('statistics.overdueCount')}</TableCell>
                        <TableCell align="right">{t('statistics.totalOverdueDays')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lateReturners.length > 0 ? (
                        lateReturners.map((student, index) => (
                          <TableRow key={student.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{student.fullName}</TableCell>
                            <TableCell>{student.grade}</TableCell>
                            <TableCell align="right">{student.overdueCount}</TableCell>
                            <TableCell align="right">{student.totalOverdueDays}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center">{t('common.noData')}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('statistics.byGrade')}
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('students.grade')}</TableCell>
                    <TableCell align="right">{t('statistics.studentCount')}</TableCell>
                    <TableCell align="right">{t('statistics.loanCount')}</TableCell>
                    <TableCell align="right">{t('statistics.avgLoansPerStudent')}</TableCell>
                    <TableCell align="right">{t('statistics.activeOverdue')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gradeStats.length > 0 ? (
                    gradeStats.map((grade) => (
                      <TableRow key={grade.grade}>
                        <TableCell>{grade.grade}</TableCell>
                        <TableCell align="right">{grade.studentCount}</TableCell>
                        <TableCell align="right">{grade.loanCount}</TableCell>
                        <TableCell align="right">{grade.avgLoansPerStudent}</TableCell>
                        <TableCell align="right">{grade.overdueCount}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">{t('common.noData')}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {tabValue === 4 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('statistics.certificates')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>{t('certificates.type')}</InputLabel>
                <Select
                  value={certTypeFilter}
                  label={t('certificates.type')}
                  onChange={(e) => setCertTypeFilter(e.target.value)}
                >
                  <MenuItem value="">{t('common.all')}</MenuItem>
                  <MenuItem value="monthly">{t('statistics.monthly')}</MenuItem>
                  <MenuItem value="yearly">{t('statistics.yearly')}</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>{t('certificates.category')}</InputLabel>
                <Select
                  value={certCategoryFilter}
                  label={t('certificates.category')}
                  onChange={(e) => setCertCategoryFilter(e.target.value)}
                >
                  <MenuItem value="">{t('common.all')}</MenuItem>
                  <MenuItem value="student">{t('certificates.student')}</MenuItem>
                  <MenuItem value="class">{t('certificates.class')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('certificates.period')}</TableCell>
                    <TableCell>{t('certificates.type')}</TableCell>
                    <TableCell>{t('certificates.category')}</TableCell>
                    <TableCell>{t('certificates.rank')}</TableCell>
                    <TableCell>{t('certificates.awardee')}</TableCell>
                    <TableCell align="right">{t('certificates.booksRead')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {certHistory.length > 0 ? (
                    certHistory.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.period}</TableCell>
                        <TableCell>{row.type === 'monthly' ? t('statistics.monthly') : t('statistics.yearly')}</TableCell>
                        <TableCell>{row.category === 'student' ? t('certificates.student') : t('certificates.class')}</TableCell>
                        <TableCell>{row.rank}</TableCell>
                        <TableCell>{row.awardee}</TableCell>
                        <TableCell align="right">{row.booksRead}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">{t('common.noData')}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default StatisticsPage;
