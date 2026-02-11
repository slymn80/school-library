import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addCyrillicFont } from './pdf-fonts';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Book, Student, Loan, Settings, LabelTemplate, BookFormData, StudentFormData } from '../types';
import { TFunction } from 'i18next';

export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export async function importBooksFromExcel(
  file: File,
  categories: { id: number; name: string; nameKk: string }[]
): Promise<{ data: Partial<BookFormData>[]; errors: string[] }> {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { data: [], errors: ['Excel dosyası boş veya geçersiz'] };
  }

  const books: Partial<BookFormData>[] = [];
  const errors: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    try {
      const inventoryNumber = row.getCell(1).value?.toString().trim();
      const title = row.getCell(2).value?.toString().trim();
      const author = row.getCell(3).value?.toString().trim();

      // Skip empty rows or note rows
      if (!inventoryNumber && !title && !author) {
        return;
      }

      const isbn = row.getCell(4).value?.toString().trim();
      const categoryName = row.getCell(5).value?.toString().trim();
      const publisher = row.getCell(6).value?.toString().trim();
      const yearValue = row.getCell(7).value;
      const shelfLocation = row.getCell(8).value?.toString().trim();
      const totalCopiesValue = row.getCell(9).value;

      if (!inventoryNumber || !title || !author) {
        errors.push(`Satır ${rowNumber}: Envanter numarası, başlık ve yazar zorunludur`);
        return;
      }

      // Find category
      let categoryId = categories[0]?.id || 1;
      if (categoryName) {
        const foundCategory = categories.find(
          (c) => c.name.toLowerCase() === categoryName.toLowerCase() ||
                 c.nameKk.toLowerCase() === categoryName.toLowerCase()
        );
        if (foundCategory) {
          categoryId = foundCategory.id;
        }
      }

      const year = yearValue ? parseInt(yearValue.toString()) : undefined;
      const totalCopies = totalCopiesValue ? parseInt(totalCopiesValue.toString()) : 1;
      const language = row.getCell(10).value?.toString().trim()?.toLowerCase() || 'ru';

      // Validate language code
      const validLanguages = ['kk', 'ru', 'en', 'tr', 'other'];
      const bookLanguage = validLanguages.includes(language) ? language : 'ru';

      books.push({
        inventoryNumber,
        title,
        author,
        isbn: isbn || undefined,
        categoryId,
        publisher: publisher || undefined,
        year: isNaN(year!) ? undefined : year,
        shelfLocation: shelfLocation || undefined,
        totalCopies: isNaN(totalCopies) ? 1 : totalCopies,
        language: bookLanguage,
      });
    } catch (e) {
      errors.push(`Satır ${rowNumber}: İşlenemedi`);
    }
  });

  return { data: books, errors };
}

export async function importStudentsFromExcel(
  file: File
): Promise<{ data: Partial<StudentFormData>[]; errors: string[] }> {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { data: [], errors: ['Excel dosyası boş veya geçersiz'] };
  }

  const students: Partial<StudentFormData>[] = [];
  const errors: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    try {
      const studentId = row.getCell(1).value?.toString().trim();
      const fullName = row.getCell(2).value?.toString().trim();
      const grade = row.getCell(3).value?.toString().trim();
      const school = row.getCell(4).value?.toString().trim();
      const branch = row.getCell(5).value?.toString().trim();
      const phone = row.getCell(6).value?.toString().trim();

      if (!studentId || !fullName || !grade || !school) {
        errors.push(`Satır ${rowNumber}: Öğrenci numarası, ad soyad, sınıf ve okul zorunludur`);
        return;
      }

      students.push({
        studentId,
        fullName,
        grade,
        school,
        branch: branch || undefined,
        phone: phone || undefined,
      });
    } catch (e) {
      errors.push(`Satır ${rowNumber}: İşlenemedi`);
    }
  });

  return { data: students, errors };
}

export function downloadBooksTemplate(t: (key: string) => string) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(t('books.title'));

  worksheet.columns = [
    { header: t('books.inventoryNumber') + ' *', key: 'inventoryNumber', width: 18 },
    { header: t('books.bookTitle') + ' *', key: 'title', width: 40 },
    { header: t('books.author') + ' *', key: 'author', width: 25 },
    { header: t('books.isbn'), key: 'isbn', width: 18 },
    { header: t('books.category'), key: 'category', width: 20 },
    { header: t('books.publisher'), key: 'publisher', width: 20 },
    { header: t('books.year'), key: 'year', width: 10 },
    { header: t('books.shelfLocation'), key: 'shelfLocation', width: 15 },
    { header: t('books.totalCopies'), key: 'totalCopies', width: 12 },
    { header: t('books.language'), key: 'language', width: 12 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1976D2' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add sample row
  worksheet.addRow({
    inventoryNumber: 'INV-001',
    title: 'Örnek Kitap',
    author: 'Yazar Adı',
    isbn: '978-3-16-148410-0',
    category: 'Kategori Adı',
    publisher: 'Yayınevi',
    year: 2024,
    shelfLocation: 'A-1',
    totalCopies: 1,
    language: 'ru',
  });

  // Add language codes note
  worksheet.addRow({});
  worksheet.addRow({
    inventoryNumber: 'Dil kodları: kk = Қазақша, ru = Русский, en = English, tr = Türkçe, other = Diğer',
  });

  workbook.xlsx.writeBuffer().then((buffer) => {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'books_template.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  });
}

export function downloadStudentsTemplate(t: (key: string) => string) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(t('students.title'));

  worksheet.columns = [
    { header: t('students.studentId') + ' *', key: 'studentId', width: 18 },
    { header: t('students.fullName') + ' *', key: 'fullName', width: 35 },
    { header: t('students.grade') + ' *', key: 'grade', width: 10 },
    { header: t('students.school') + ' *', key: 'school', width: 40 },
    { header: t('students.branch'), key: 'branch', width: 20 },
    { header: t('students.phone'), key: 'phone', width: 18 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1976D2' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add sample row
  worksheet.addRow({
    studentId: '2024001',
    fullName: 'Örnek Öğrenci',
    grade: '9A',
    school: 'Okul Adı',
    branch: 'Şube',
    phone: '+7 777 123 4567',
  });

  workbook.xlsx.writeBuffer().then((buffer) => {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'students_template.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  });
}

export async function exportBooksToExcel(
  books: Book[],
  t: (key: string) => string,
  language: string
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(t('books.title'));

  const langMap: { [key: string]: string } = {
    kk: 'Қазақша', ru: 'Русский', en: 'English', tr: 'Türkçe', other: 'Басқа',
  };

  worksheet.columns = [
    { header: t('books.inventoryNumber'), key: 'inventoryNumber', width: 15 },
    { header: t('books.bookTitle'), key: 'title', width: 40 },
    { header: t('books.author'), key: 'author', width: 25 },
    { header: t('books.isbn'), key: 'isbn', width: 18 },
    { header: t('books.category'), key: 'category', width: 20 },
    { header: t('books.publisher'), key: 'publisher', width: 20 },
    { header: t('books.year'), key: 'year', width: 10 },
    { header: t('books.shelfLocation'), key: 'shelfLocation', width: 15 },
    { header: t('books.totalCopies'), key: 'totalCopies', width: 12 },
    { header: t('books.availableCopies'), key: 'availableCopies', width: 12 },
    { header: t('books.language'), key: 'bookLanguage', width: 12 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1976D2' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  books.forEach((book) => {
    worksheet.addRow({
      inventoryNumber: book.inventoryNumber,
      title: book.title,
      author: book.author,
      isbn: book.isbn || '',
      category: language === 'kk' ? book.category?.nameKk : book.category?.name,
      publisher: book.publisher || '',
      year: book.year || '',
      shelfLocation: book.shelfLocation || '',
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies,
      bookLanguage: langMap[book.language || 'ru'] || book.language || '-',
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `books_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportStudentsToExcel(
  students: Student[],
  t: (key: string) => string
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(t('students.title'));

  worksheet.columns = [
    { header: t('students.studentId'), key: 'studentId', width: 15 },
    { header: t('students.fullName'), key: 'fullName', width: 35 },
    { header: t('students.grade'), key: 'grade', width: 10 },
    { header: t('students.school'), key: 'school', width: 40 },
    { header: t('students.branch'), key: 'branch', width: 20 },
    { header: t('students.phone'), key: 'phone', width: 18 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1976D2' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  students.forEach((student) => {
    worksheet.addRow({
      studentId: student.studentId,
      fullName: student.fullName,
      grade: student.grade,
      school: student.school,
      branch: student.branch || '',
      phone: student.phone || '',
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `students_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportLoansToExcel(
  loans: Loan[],
  t: (key: string) => string,
  _language: string
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(t('loans.title'));

  worksheet.columns = [
    { header: t('students.fullName'), key: 'student', width: 30 },
    { header: t('books.bookTitle'), key: 'book', width: 35 },
    { header: t('books.inventoryNumber'), key: 'inventoryNumber', width: 15 },
    { header: t('loans.loanDate'), key: 'loanDate', width: 12 },
    { header: t('loans.dueDate'), key: 'dueDate', width: 12 },
    { header: t('loans.returnDate'), key: 'returnDate', width: 12 },
    { header: t('loans.status'), key: 'status', width: 15 },
    { header: t('loans.overdueDays'), key: 'overdueDays', width: 12 },
    { header: t('loans.fee'), key: 'fee', width: 12 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1976D2' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  loans.forEach((loan) => {
    const isOverdue = !loan.returnedAt && new Date(loan.dueDate) < new Date();
    const overdueDays = loan.returnedAt
      ? Math.max(0, differenceInDays(parseISO(loan.returnedAt), parseISO(loan.dueDate)))
      : isOverdue
      ? differenceInDays(new Date(), parseISO(loan.dueDate))
      : 0;

    let status;
    if (loan.returnedAt) {
      status = t('loans.returned');
    } else if (isOverdue) {
      status = t('loans.overdue');
    } else {
      status = t('loans.active');
    }

    worksheet.addRow({
      student: loan.student?.fullName,
      book: loan.book?.title,
      inventoryNumber: loan.book?.inventoryNumber,
      loanDate: format(parseISO(loan.loanDate), 'dd.MM.yyyy'),
      dueDate: format(parseISO(loan.dueDate), 'dd.MM.yyyy'),
      returnDate: loan.returnedAt ? format(parseISO(loan.returnedAt), 'dd.MM.yyyy') : '-',
      status,
      overdueDays,
      fee: loan.fee > 0 ? `${loan.fee} KZT` : '-',
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `loans_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportOverdueReportToPdf(
  loans: Loan[],
  t: (key: string) => string,
  language: string,
  settings: Settings | null
) {
  const doc = new jsPDF();

  // Add Cyrillic font support
  await addCyrillicFont(doc);

  const schoolName = getSchoolNameForLang(settings, language);
  let yPos = 15;

  // Logo
  if (settings?.schoolLogo) {
    try {
      doc.addImage(settings.schoolLogo, 'PNG', 90, yPos, 20, 20);
      yPos += 25;
    } catch (e) { /* ignore */ }
  }

  // Title
  doc.setFontSize(16);
  doc.text(schoolName || t('common.appName'), 105, yPos, { align: 'center' });
  yPos += 10;
  doc.setFontSize(14);
  doc.text(t('reports.overdueReport'), 105, yPos, { align: 'center' });
  yPos += 8;
  doc.setFontSize(10);
  doc.text(`${t('reports.reportDate')}: ${format(new Date(), 'dd.MM.yyyy')}`, 105, yPos, { align: 'center' });
  yPos += 10;

  const feePerDay = settings?.feePerDay || 50;

  const tableData = loans.map((loan) => {
    const dueDate = typeof loan.dueDate === 'string' ? parseISO(loan.dueDate) : new Date(loan.dueDate);
    const overdueDays = differenceInDays(new Date(), dueDate);
    const fee = overdueDays * feePerDay;

    return [
      loan.student?.fullName || '-',
      loan.student?.grade || '-',
      loan.book?.title || '-',
      loan.book?.inventoryNumber || '-',
      format(dueDate, 'dd.MM.yyyy'),
      overdueDays.toString(),
      `${fee} KZT`,
    ];
  });

  const totalFee = tableData.reduce((sum, row) => sum + parseInt(row[6] || '0'), 0);

  autoTable(doc, {
    startY: yPos,
    head: [
      [
        t('students.fullName'),
        t('students.grade'),
        t('books.bookTitle'),
        t('books.inventoryNumber'),
        t('loans.dueDate'),
        t('loans.overdueDays'),
        t('loans.fee'),
      ],
    ],
    body: tableData,
    styles: { fontSize: 8, font: 'Roboto' },
    headStyles: { fillColor: [25, 118, 210], font: 'Roboto' },
  });

  const finalY = (doc as any).lastAutoTable.finalY || yPos;
  doc.setFontSize(12);
  doc.text(`${t('reports.totalOverdueFees')}: ${totalFee} KZT`, 14, finalY + 10);

  // Signatures
  const sigY = Math.max(finalY + 30, 250);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  doc.line(20, sigY, 80, sigY);
  doc.text(settings?.librarianName || t('certificates.librarianName'), 50, sigY + 5, { align: 'center' });

  doc.line(130, sigY, 190, sigY);
  doc.text(settings?.principalName || t('certificates.principalName'), 160, sigY + 5, { align: 'center' });

  doc.save(`overdue_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export async function exportBooksInventoryToPdf(
  books: Book[],
  t: (key: string) => string,
  language: string,
  settings: Settings | null
) {
  const doc = new jsPDF();

  // Add Cyrillic font support
  await addCyrillicFont(doc);

  const schoolName = getSchoolNameForLang(settings, language);
  let yPos = 15;

  // Logo
  if (settings?.schoolLogo) {
    try {
      doc.addImage(settings.schoolLogo, 'PNG', 90, yPos, 20, 20);
      yPos += 25;
    } catch (e) { /* ignore */ }
  }

  doc.setFontSize(16);
  doc.text(schoolName || t('common.appName'), 105, yPos, { align: 'center' });
  yPos += 10;
  doc.setFontSize(14);
  doc.text(t('reports.booksInventory'), 105, yPos, { align: 'center' });
  yPos += 8;
  doc.setFontSize(10);
  doc.text(`${t('reports.reportDate')}: ${format(new Date(), 'dd.MM.yyyy')}`, 105, yPos, { align: 'center' });
  yPos += 10;

  const tableData = books.map((book) => [
    book.inventoryNumber,
    book.title,
    book.author,
    (language === 'kk' ? book.category?.nameKk : book.category?.name) || '-',
    book.shelfLocation || '-',
    book.totalCopies.toString(),
    book.availableCopies.toString(),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [
      [
        t('books.inventoryNumber'),
        t('books.bookTitle'),
        t('books.author'),
        t('books.category'),
        t('books.shelfLocation'),
        t('books.totalCopies'),
        t('books.availableCopies'),
      ],
    ],
    body: tableData,
    styles: { fontSize: 8, font: 'Roboto' },
    headStyles: { fillColor: [25, 118, 210], font: 'Roboto' },
  });

  const finalY = (doc as any).lastAutoTable.finalY || yPos;

  // Signatures
  const sigY = Math.max(finalY + 25, 250);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  doc.line(20, sigY, 80, sigY);
  doc.text(settings?.librarianName || t('certificates.librarianName'), 50, sigY + 5, { align: 'center' });

  doc.line(130, sigY, 190, sigY);
  doc.text(settings?.principalName || t('certificates.principalName'), 160, sigY + 5, { align: 'center' });

  doc.save(`books_inventory_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export async function exportLabelsToPdf(
  books: Book[],
  barcodes: { [key: number]: string },
  template: LabelTemplate,
  showTitle: boolean,
  _t: (key: string) => string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Add Cyrillic font support
  await addCyrillicFont(doc);

  const pageHeight = 297;
  const margin = 10;
  const labelWidth = template.width;
  const labelHeight = template.height;
  const gapX = 2;
  const gapY = 2;

  let currentX = margin;
  let currentY = margin;
  let labelsInRow = 0;

  books.forEach((book) => {
    if (labelsInRow >= template.labelsPerRow) {
      currentX = margin;
      currentY += labelHeight + gapY;
      labelsInRow = 0;
    }

    if (currentY + labelHeight > pageHeight - margin) {
      doc.addPage();
      currentX = margin;
      currentY = margin;
      labelsInRow = 0;
    }

    // Draw label border
    doc.setDrawColor(200);
    doc.rect(currentX, currentY, labelWidth, labelHeight);

    // Add barcode
    const barcode = barcodes[book.id];
    if (barcode) {
      const barcodeHeight = showTitle ? labelHeight * 0.5 : labelHeight * 0.7;
      doc.addImage(barcode, 'PNG', currentX + 2, currentY + 2, labelWidth - 4, barcodeHeight);

      // Add title if enabled
      if (showTitle) {
        doc.setFontSize(6);
        const title = book.title.substring(0, 25) + (book.title.length > 25 ? '...' : '');
        doc.text(title, currentX + labelWidth / 2, currentY + labelHeight - 6, { align: 'center' });
      }

      // Add inventory number
      doc.setFontSize(5);
      doc.text(book.inventoryNumber, currentX + labelWidth / 2, currentY + labelHeight - 2, { align: 'center' });
    }

    currentX += labelWidth + gapX;
    labelsInRow++;
  });

  doc.save(`barcode_labels_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export async function exportAchievementCertificatePdf(
  student: Student,
  settings: Settings | null,
  t: TFunction,
  language: string
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Add Cyrillic font support
  await addCyrillicFont(doc);

  const pageWidth = 297;
  const pageHeight = 210;

  // Draw decorative border
  doc.setDrawColor(25, 118, 210);
  doc.setLineWidth(3);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(1);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

  // Add school logo if exists
  if (settings?.schoolLogo) {
    try {
      doc.addImage(settings.schoolLogo, 'PNG', pageWidth / 2 - 15, 25, 30, 30);
    } catch (e) {
      console.error('Failed to add logo:', e);
    }
  }

  // School name
  let schoolName = settings?.schoolName || '';
  if (language === 'kk') {
    schoolName = settings?.schoolNameKk || settings?.schoolName || '';
  } else if (language === 'tr' || language === 'en') {
    schoolName = settings?.schoolNameTr || settings?.schoolName || '';
  }

  const logoOffset = settings?.schoolLogo ? 60 : 30;

  doc.setFontSize(14);
  doc.text(schoolName, pageWidth / 2, logoOffset, { align: 'center' });

  // Certificate title
  doc.setFontSize(32);
  doc.setTextColor(25, 118, 210);
  doc.text(t('certificate.title'), pageWidth / 2, logoOffset + 20, { align: 'center' });

  // Award text
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(t('certificate.awardedTo'), pageWidth / 2, logoOffset + 40, { align: 'center' });

  // Student name
  doc.setFontSize(28);
  doc.setTextColor(25, 118, 210);
  doc.text(student.fullName, pageWidth / 2, logoOffset + 55, { align: 'center' });

  // Grade
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(`${t('students.grade')}: ${student.grade}`, pageWidth / 2, logoOffset + 70, { align: 'center' });

  // Achievement text
  doc.setFontSize(16);
  doc.text(t('certificate.awardText'), pageWidth / 2, logoOffset + 90, { align: 'center' });

  // Points
  doc.setFontSize(20);
  doc.setTextColor(255, 193, 7);
  doc.text(`${student.rewardPoints || 0} ${t('certificate.points')}`, pageWidth / 2, logoOffset + 105, { align: 'center' });

  // Date
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`${t('certificate.date')}: ${format(new Date(), 'dd.MM.yyyy')}`, pageWidth / 2, logoOffset + 125, { align: 'center' });

  // Signatures
  const sigY = pageHeight - 30;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  doc.line(40, sigY, 110, sigY);
  doc.text(settings?.librarianName || t('certificates.librarianName'), 75, sigY + 6, { align: 'center' });

  doc.line(pageWidth - 110, sigY, pageWidth - 40, sigY);
  doc.text(settings?.principalName || t('certificates.principalName'), pageWidth - 75, sigY + 6, { align: 'center' });

  // Save
  doc.save(`certificate_${student.fullName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export async function exportInventoryCountReportPdf(
  books: Book[],
  verifiedIds: Set<number>,
  t: TFunction,
  language: string,
  settings: Settings | null
): Promise<void> {
  const doc = new jsPDF();

  // Add Cyrillic font support
  await addCyrillicFont(doc);

  const schoolName = getSchoolNameForLang(settings, language);
  let yPos = 15;

  // Logo
  if (settings?.schoolLogo) {
    try {
      doc.addImage(settings.schoolLogo, 'PNG', 90, yPos, 20, 20);
      yPos += 25;
    } catch (e) { /* ignore */ }
  }

  doc.setFontSize(16);
  doc.text(schoolName || t('common.appName'), 105, yPos, { align: 'center' });
  yPos += 10;
  doc.setFontSize(14);
  doc.text(t('inventory.title'), 105, yPos, { align: 'center' });
  yPos += 8;
  doc.setFontSize(10);
  doc.text(`${t('reports.reportDate')}: ${format(new Date(), 'dd.MM.yyyy')}`, 105, yPos, { align: 'center' });
  yPos += 10;

  // Summary
  const verifiedCount = verifiedIds.size;
  const totalCount = books.length;
  const notVerifiedCount = totalCount - verifiedCount;

  doc.setFontSize(12);
  doc.text(`${t('inventory.progress')}: ${verifiedCount} / ${totalCount}`, 14, yPos);
  yPos += 7;
  doc.text(`${t('inventory.notVerified')}: ${notVerifiedCount}`, 14, yPos);
  yPos += 10;

  // Table with all books
  const tableData = books.map((book) => [
    book.inventoryNumber,
    book.title,
    book.shelfLocation || '-',
    verifiedIds.has(book.id) ? t('inventory.verified') : t('inventory.notVerified'),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [
      [
        t('books.inventoryNumber'),
        t('books.bookTitle'),
        t('books.shelfLocation'),
        t('loans.status'),
      ],
    ],
    body: tableData,
    styles: { fontSize: 8, font: 'Roboto' },
    headStyles: { fillColor: [25, 118, 210], font: 'Roboto' },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        if (data.cell.raw === t('inventory.notVerified')) {
          data.cell.styles.textColor = [211, 47, 47];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [46, 125, 50];
        }
      }
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || yPos;

  // Signatures
  const sigY = Math.max(finalY + 25, 250);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  doc.line(20, sigY, 80, sigY);
  doc.text(settings?.librarianName || t('certificates.librarianName'), 50, sigY + 5, { align: 'center' });

  doc.line(130, sigY, 190, sigY);
  doc.text(settings?.principalName || t('certificates.principalName'), 160, sigY + 5, { align: 'center' });

  doc.save(`inventory_count_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export async function exportInventoryCountReportExcel(
  books: Book[],
  verifiedIds: Set<number>,
  t: TFunction,
  _language: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(t('inventory.title'));

  worksheet.columns = [
    { header: t('books.inventoryNumber'), key: 'inventoryNumber', width: 18 },
    { header: t('books.bookTitle'), key: 'title', width: 40 },
    { header: t('books.shelfLocation'), key: 'shelfLocation', width: 15 },
    { header: t('loans.status'), key: 'status', width: 15 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1976D2' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  books.forEach((book) => {
    const row = worksheet.addRow({
      inventoryNumber: book.inventoryNumber,
      title: book.title,
      shelfLocation: book.shelfLocation || '-',
      status: verifiedIds.has(book.id) ? t('inventory.verified') : t('inventory.notVerified'),
    });

    // Color the status cell
    const statusCell = row.getCell(4);
    if (verifiedIds.has(book.id)) {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4CAF50' },
      };
    } else {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF44336' },
      };
      statusCell.font = { color: { argb: 'FFFFFFFF' } };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `inventory_count_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportStudentCardPdf(
  student: Student,
  barcode: string,
  settings: Settings | null,
  t: TFunction,
  language: string
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [86, 54], // Credit card size
  });

  // Add Cyrillic font support
  await addCyrillicFont(doc);

  const cardWidth = 86;
  const cardHeight = 54;

  // Background
  doc.setFillColor(240, 240, 255);
  doc.rect(0, 0, cardWidth, cardHeight, 'F');

  // Header stripe
  doc.setFillColor(25, 118, 210);
  doc.rect(0, 0, cardWidth, 12, 'F');

  // School name in header
  let schoolName = settings?.schoolName || '';
  if (language === 'kk') {
    schoolName = settings?.schoolNameKk || settings?.schoolName || '';
  } else if (language === 'tr' || language === 'en') {
    schoolName = settings?.schoolNameTr || settings?.schoolName || '';
  }

  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(schoolName || t('common.appName'), cardWidth / 2, 5, { align: 'center' });

  doc.setFontSize(5);
  doc.text(t('students.studentId').toLocaleUpperCase(language === 'tr' ? 'tr-TR' : undefined), cardWidth / 2, 9, { align: 'center' });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Add school logo if exists
  if (settings?.schoolLogo) {
    try {
      doc.addImage(settings.schoolLogo, 'PNG', 2, 14, 12, 12);
    } catch (e) {
      console.error('Failed to add logo:', e);
    }
  }

  // Add student photo or placeholder
  const photoX = cardWidth - 22;
  if (student.photo) {
    try {
      doc.addImage(student.photo, 'JPEG', photoX, 14, 18, 22);
    } catch (e) {
      console.error('Failed to add student photo:', e);
      // Draw placeholder
      doc.setFillColor(200, 200, 200);
      doc.rect(photoX, 14, 18, 22, 'F');
    }
  } else {
    // Draw placeholder
    doc.setFillColor(200, 200, 200);
    doc.rect(photoX, 14, 18, 22, 'F');
    doc.setFontSize(5);
    doc.setTextColor(100, 100, 100);
    doc.text('PHOTO', photoX + 9, 26, { align: 'center' });
  }

  // Student info
  const infoX = settings?.schoolLogo ? 16 : 4;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text(student.fullName, infoX, 19);

  doc.setFontSize(7);
  doc.text(`${t('students.grade')}: ${student.grade}`, infoX, 25);
  doc.text(`${t('students.studentId')}: ${student.studentId}`, infoX, 30);

  // Add barcode at the bottom
  if (barcode) {
    doc.addImage(barcode, 'PNG', 4, 38, 50, 12);
  }

  // Student ID text under barcode
  doc.setFontSize(6);
  doc.text(student.studentId, 29, 52, { align: 'center' });

  // Save
  doc.save(`student_card_${student.studentId}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

// ==========================================
// CERTIFICATE AWARD PDF FUNCTIONS
// ==========================================

interface CertAwardee {
  rank: number;
  awardee: string;
  grade?: string;
  booksRead: number;
  awardeeId?: number;
}

function getSchoolNameForLang(settings: Settings | null, language: string): string {
  if (!settings) return '';
  if (language === 'kk') return settings.schoolNameKk || settings.schoolName || '';
  if (language === 'tr' || language === 'en') return settings.schoolNameTr || settings.schoolName || '';
  return settings.schoolName || '';
}

function getMonthName(month: number, t: TFunction): string {
  return t(`certificates.months.${month}`);
}

export async function exportMonthlyStudentCertificatePdf(
  awards: CertAwardee[],
  period: string,
  settings: Settings | null,
  t: TFunction,
  language: string
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  await addCyrillicFont(doc);

  const pageWidth = 297;
  const pageHeight = 210;
  const themeR = 25, themeG = 118, themeB = 210;

  const [yearStr, monthStr] = period.split('-');
  const monthName = getMonthName(parseInt(monthStr), t);
  const schoolName = getSchoolNameForLang(settings, language);

  for (let i = 0; i < awards.length; i++) {
    if (i > 0) doc.addPage();
    const award = awards[i];

    // Border
    doc.setDrawColor(themeR, themeG, themeB);
    doc.setLineWidth(3);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
    doc.setLineWidth(1);
    doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

    // Logo
    let yPos = 25;
    if (settings?.schoolLogo) {
      try { doc.addImage(settings.schoolLogo, 'PNG', pageWidth / 2 - 15, yPos, 30, 30); } catch (e) { /* ignore */ }
      yPos += 35;
    }

    // School name
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(schoolName, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Title
    doc.setFontSize(26);
    doc.setTextColor(themeR, themeG, themeB);
    doc.text(t('certificates.monthlyStudentCert').toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Rank
    doc.setFontSize(18);
    doc.setTextColor(255, 193, 7);
    doc.text(`${award.rank}. ${t('certificates.rank')}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Student name
    doc.setFontSize(28);
    doc.setTextColor(themeR, themeG, themeB);
    doc.text(award.awardee, pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    // Grade
    if (award.grade) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`${t('students.grade')}: ${award.grade}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
    }

    // Period
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`${monthName} ${yearStr}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Books read
    doc.setFontSize(16);
    doc.setTextColor(themeR, themeG, themeB);
    doc.text(`${t('certificates.booksRead')}: ${award.booksRead}`, pageWidth / 2, yPos, { align: 'center' });

    // Signatures
    const sigY = pageHeight - 30;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Librarian - left
    doc.line(40, sigY, 110, sigY);
    doc.text(settings?.librarianName || t('certificates.librarianName'), 75, sigY + 6, { align: 'center' });

    // Principal - right
    doc.line(pageWidth - 110, sigY, pageWidth - 40, sigY);
    doc.text(settings?.principalName || t('certificates.principalName'), pageWidth - 75, sigY + 6, { align: 'center' });
  }

  doc.save(`monthly_student_certificates_${period}.pdf`);
}

export async function exportYearlyStudentCertificatePdf(
  awards: CertAwardee[],
  period: string,
  settings: Settings | null,
  t: TFunction,
  language: string
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  await addCyrillicFont(doc);

  const pageWidth = 297;
  const pageHeight = 210;
  const themeR = 184, themeG = 134, themeB = 11;

  const schoolName = getSchoolNameForLang(settings, language);
  const academicYear = settings?.academicYear || period;

  for (let i = 0; i < awards.length; i++) {
    if (i > 0) doc.addPage();
    const award = awards[i];

    // Double border (gold)
    doc.setDrawColor(themeR, themeG, themeB);
    doc.setLineWidth(4);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
    doc.setLineWidth(1.5);
    doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

    // Logo
    let yPos = 24;
    if (settings?.schoolLogo) {
      try { doc.addImage(settings.schoolLogo, 'PNG', pageWidth / 2 - 15, yPos, 30, 30); } catch (e) { /* ignore */ }
      yPos += 35;
    }

    // School name
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(schoolName, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Title
    doc.setFontSize(26);
    doc.setTextColor(themeR, themeG, themeB);
    doc.text(t('certificates.yearlyStudentCert').toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    // Star/badge
    doc.setFontSize(30);
    doc.setTextColor(255, 193, 7);
    doc.text('\u2605', pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    // Rank
    doc.setFontSize(18);
    doc.setTextColor(themeR, themeG, themeB);
    doc.text(`${award.rank}. ${t('certificates.rank')}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 14;

    // Student name
    doc.setFontSize(30);
    doc.setTextColor(themeR, themeG, themeB);
    doc.text(award.awardee, pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    // Grade
    if (award.grade) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`${t('students.grade')}: ${award.grade}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
    }

    // Academic year
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`${t('textbookModule.academicYear')}: ${academicYear}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Books read (bigger font)
    doc.setFontSize(20);
    doc.setTextColor(themeR, themeG, themeB);
    doc.text(`${t('certificates.booksRead')}: ${award.booksRead}`, pageWidth / 2, yPos, { align: 'center' });

    // Signatures
    const sigY = pageHeight - 28;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.line(40, sigY, 110, sigY);
    doc.text(settings?.librarianName || t('certificates.librarianName'), 75, sigY + 6, { align: 'center' });
    doc.line(pageWidth - 110, sigY, pageWidth - 40, sigY);
    doc.text(settings?.principalName || t('certificates.principalName'), pageWidth - 75, sigY + 6, { align: 'center' });
  }

  doc.save(`yearly_student_certificates_${period}.pdf`);
}

export async function exportMonthlyClassCertificatePdf(
  awards: CertAwardee[],
  period: string,
  settings: Settings | null,
  t: TFunction,
  language: string
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  await addCyrillicFont(doc);

  const pageWidth = 297;
  const pageHeight = 210;
  const themeR = 46, themeG = 125, themeB = 50;

  const [yearStr, monthStr] = period.split('-');
  const monthName = getMonthName(parseInt(monthStr), t);
  const schoolName = getSchoolNameForLang(settings, language);

  for (let i = 0; i < awards.length; i++) {
    if (i > 0) doc.addPage();
    const award = awards[i];

    // Border
    doc.setDrawColor(themeR, themeG, themeB);
    doc.setLineWidth(3);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
    doc.setLineWidth(1);
    doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

    let yPos = 25;
    if (settings?.schoolLogo) {
      try { doc.addImage(settings.schoolLogo, 'PNG', pageWidth / 2 - 15, yPos, 30, 30); } catch (e) { /* ignore */ }
      yPos += 35;
    }

    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(schoolName, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(26);
    doc.setTextColor(themeR, themeG, themeB);
    doc.text(t('certificates.monthlyClassCert').toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Rank
    doc.setFontSize(18);
    doc.setTextColor(255, 193, 7);
    doc.text(`${award.rank}. ${t('certificates.rank')}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Class name
    doc.setFontSize(32);
    doc.setTextColor(themeR, themeG, themeB);
    doc.text(award.awardee, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Period
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`${monthName} ${yearStr}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Books read
    doc.setFontSize(16);
    doc.setTextColor(themeR, themeG, themeB);
    doc.text(`${t('certificates.booksRead')}: ${award.booksRead}`, pageWidth / 2, yPos, { align: 'center' });

    // Signatures
    const sigY = pageHeight - 30;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.line(40, sigY, 110, sigY);
    doc.text(settings?.librarianName || t('certificates.librarianName'), 75, sigY + 6, { align: 'center' });
    doc.line(pageWidth - 110, sigY, pageWidth - 40, sigY);
    doc.text(settings?.principalName || t('certificates.principalName'), pageWidth - 75, sigY + 6, { align: 'center' });
  }

  doc.save(`monthly_class_certificates_${period}.pdf`);
}

export async function exportYearlyClassCertificatePdf(
  awards: CertAwardee[],
  period: string,
  settings: Settings | null,
  t: TFunction,
  language: string
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  await addCyrillicFont(doc);

  const pageWidth = 297;
  const pageHeight = 210;
  const themeR = 136, themeG = 14, themeB = 79;

  const schoolName = getSchoolNameForLang(settings, language);
  const academicYear = settings?.academicYear || period;

  for (let i = 0; i < awards.length; i++) {
    if (i > 0) doc.addPage();
    const award = awards[i];

    // Double border (burgundy)
    doc.setDrawColor(themeR, themeG, themeB);
    doc.setLineWidth(4);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
    doc.setLineWidth(1.5);
    doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

    let yPos = 24;
    if (settings?.schoolLogo) {
      try { doc.addImage(settings.schoolLogo, 'PNG', pageWidth / 2 - 15, yPos, 30, 30); } catch (e) { /* ignore */ }
      yPos += 35;
    }

    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(schoolName, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(26);
    doc.setTextColor(themeR, themeG, themeB);
    doc.text(t('certificates.yearlyClassCert').toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    // Star
    doc.setFontSize(30);
    doc.setTextColor(255, 193, 7);
    doc.text('\u2605', pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    // Rank
    doc.setFontSize(18);
    doc.setTextColor(themeR, themeG, themeB);
    doc.text(`${award.rank}. ${t('certificates.rank')}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 14;

    // Class name
    doc.setFontSize(34);
    doc.setTextColor(themeR, themeG, themeB);
    doc.text(award.awardee, pageWidth / 2, yPos, { align: 'center' });
    yPos += 14;

    // Academic year
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`${t('textbookModule.academicYear')}: ${academicYear}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Books read
    doc.setFontSize(20);
    doc.setTextColor(themeR, themeG, themeB);
    doc.text(`${t('certificates.booksRead')}: ${award.booksRead}`, pageWidth / 2, yPos, { align: 'center' });

    // Signatures
    const sigY = pageHeight - 28;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.line(40, sigY, 110, sigY);
    doc.text(settings?.librarianName || t('certificates.librarianName'), 75, sigY + 6, { align: 'center' });
    doc.line(pageWidth - 110, sigY, pageWidth - 40, sigY);
    doc.text(settings?.principalName || t('certificates.principalName'), pageWidth - 75, sigY + 6, { align: 'center' });
  }

  doc.save(`yearly_class_certificates_${period}.pdf`);
}

// ==========================================
// TEXTBOOK MODULE PDF REPORTS
// ==========================================

export async function exportTextbookDistributionReportPdf(
  distribution: any,
  settings: Settings | null,
  t: TFunction,
  language: string
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await addCyrillicFont(doc);

  const pageWidth = 210;
  const schoolName = getSchoolNameForLang(settings, language);
  const themeColor: [number, number, number] = [106, 27, 154];

  let yPos = 15;

  // Logo
  if (settings?.schoolLogo) {
    try {
      doc.addImage(settings.schoolLogo, 'PNG', pageWidth / 2 - 10, yPos, 20, 20);
      yPos += 25;
    } catch (e) { /* ignore */ }
  }

  // School name
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(schoolName, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Report title
  doc.setFontSize(16);
  doc.setTextColor(...themeColor);
  doc.text(t('textbookModule.reports.distributionReport').toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // Date
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`${t('textbookModule.reports.reportDate')}: ${format(new Date(), 'dd.MM.yyyy')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  // Info block
  doc.setFontSize(11);
  const branch = distribution.branch;
  const branchLabel = `${branch.grade}${branch.name}`;
  const teacherName = branch.teacher?.fullName || '-';

  const getStatusLabel = (s: string) => {
    if (s === 'distributed') return t('textbookModule.distributed');
    if (s === 'returned') return t('textbookModule.returned');
    if (s === 'partial') return t('textbookModule.partial');
    return s;
  };

  doc.text(`${t('textbookModule.branch')}: ${branchLabel}`, 20, yPos); yPos += 7;
  doc.text(`${t('textbookModule.set')}: ${distribution.set.name}`, 20, yPos); yPos += 7;
  doc.text(`${t('textbookModule.teacher')}: ${teacherName}`, 20, yPos); yPos += 7;
  doc.text(`${t('textbookModule.academicYear')}: ${distribution.academicYear}`, 20, yPos); yPos += 7;
  doc.text(`${t('textbookModule.distributionDate')}: ${new Date(distribution.distributedAt).toLocaleDateString()}`, 20, yPos); yPos += 7;
  doc.text(`${t('textbookModule.status')}: ${getStatusLabel(distribution.status)}`, 20, yPos); yPos += 10;

  // Table
  const tableData = distribution.details.map((d: any) => [
    d.textbook.title,
    d.distributedQty.toString(),
    d.returnedQty.toString(),
    d.missingQty.toString(),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [[
      t('textbookModule.textbook'),
      t('textbookModule.distributed'),
      t('textbookModule.returned'),
      t('textbookModule.missing'),
    ]],
    body: tableData,
    styles: { fontSize: 9, font: 'Roboto' },
    headStyles: { fillColor: themeColor, font: 'Roboto' },
  });

  const finalY = (doc as any).lastAutoTable.finalY || yPos;

  // Signatures - 3 columns: librarian (left), teacher (center), principal (right)
  const sigY = Math.max(finalY + 30, 240);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  // Librarian - left
  doc.line(20, sigY, 70, sigY);
  doc.text(settings?.librarianName || t('certificates.librarianName'), 45, sigY + 5, { align: 'center' });
  doc.text(t('textbookModule.reports.signature'), 45, sigY + 10, { align: 'center' });

  // Teacher - center
  doc.line(80, sigY, 130, sigY);
  doc.text(teacherName, 105, sigY + 5, { align: 'center' });
  doc.text(t('textbookModule.reports.classTeacherSignature'), 105, sigY + 10, { align: 'center' });

  // Principal - right
  doc.line(140, sigY, 190, sigY);
  doc.text(settings?.principalName || t('certificates.principalName'), 165, sigY + 5, { align: 'center' });
  doc.text(t('textbookModule.reports.signature'), 165, sigY + 10, { align: 'center' });

  doc.save(`distribution_report_${branchLabel}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export async function exportTextbookStockReportPdf(
  textbooks: any[],
  settings: Settings | null,
  t: TFunction,
  language: string
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  await addCyrillicFont(doc);

  const pageWidth = 297;
  const pageHeight = 210;
  const schoolName = getSchoolNameForLang(settings, language);
  const themeColor: [number, number, number] = [106, 27, 154];

  let yPos = 15;

  // Logo
  if (settings?.schoolLogo) {
    try {
      doc.addImage(settings.schoolLogo, 'PNG', pageWidth / 2 - 10, yPos, 20, 20);
      yPos += 25;
    } catch (e) { /* ignore */ }
  }

  // School name
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(schoolName, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Report title
  doc.setFontSize(16);
  doc.setTextColor(...themeColor);
  doc.text(t('textbookModule.reports.stockReport').toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // Date
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`${t('textbookModule.reports.reportDate')}: ${format(new Date(), 'dd.MM.yyyy')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Table
  const tableData = textbooks.map((tb: any, i: number) => [
    (i + 1).toString(),
    tb.title,
    tb.author || '-',
    tb.subject,
    tb.gradeFrom?.toString() + (tb.gradeTo && tb.gradeTo !== tb.gradeFrom ? `-${tb.gradeTo}` : ''),
    tb.language || '-',
    tb.totalStock?.toString() || '0',
    tb.availableStock?.toString() || '0',
    ((tb.totalStock || 0) - (tb.availableStock || 0)).toString(),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [[
      '#',
      t('textbookModule.textbookTitle'),
      t('textbookModule.author'),
      t('textbookModule.subject'),
      t('textbookModule.grade'),
      t('textbookModule.language'),
      t('textbookModule.totalStock'),
      t('textbookModule.currentStock'),
      t('textbookModule.distributed'),
    ]],
    body: tableData,
    styles: { fontSize: 8, font: 'Roboto' },
    headStyles: { fillColor: themeColor, font: 'Roboto' },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 60 },
      6: { halign: 'center' },
      7: { halign: 'center' },
      8: { halign: 'center' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || yPos;

  // Summary
  const totalTypes = textbooks.length;
  const totalStock = textbooks.reduce((s: number, tb: any) => s + (tb.totalStock || 0), 0);
  const totalAvailable = textbooks.reduce((s: number, tb: any) => s + (tb.availableStock || 0), 0);
  const totalDistributed = totalStock - totalAvailable;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`${t('textbookModule.reports.totalTypes')}: ${totalTypes}`, 20, finalY + 8);
  doc.text(`${t('textbookModule.totalStock')}: ${totalStock}`, 100, finalY + 8);
  doc.text(`${t('textbookModule.currentStock')}: ${totalAvailable}`, 170, finalY + 8);
  doc.text(`${t('textbookModule.reports.totalDistributedQty')}: ${totalDistributed}`, 240, finalY + 8);

  // Signatures
  const sigY = Math.max(finalY + 25, pageHeight - 30);
  doc.setFontSize(10);

  // Librarian - left
  doc.line(30, sigY, 100, sigY);
  doc.text(settings?.librarianName || t('certificates.librarianName'), 65, sigY + 5, { align: 'center' });
  doc.text(t('textbookModule.reports.signature'), 65, sigY + 10, { align: 'center' });

  // Principal - right
  doc.line(pageWidth - 100, sigY, pageWidth - 30, sigY);
  doc.text(settings?.principalName || t('certificates.principalName'), pageWidth - 65, sigY + 5, { align: 'center' });
  doc.text(t('textbookModule.reports.signature'), pageWidth - 65, sigY + 10, { align: 'center' });

  doc.save(`textbook_stock_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export async function exportTextbookIndividualDistReportPdf(
  distributions: any[],
  academicYear: string,
  settings: Settings | null,
  t: TFunction,
  language: string
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  await addCyrillicFont(doc);

  const pageWidth = 297;
  const pageHeight = 210;
  const schoolName = getSchoolNameForLang(settings, language);
  const themeColor: [number, number, number] = [106, 27, 154];

  let yPos = 15;

  // Logo
  if (settings?.schoolLogo) {
    try {
      doc.addImage(settings.schoolLogo, 'PNG', pageWidth / 2 - 10, yPos, 20, 20);
      yPos += 25;
    } catch (e) { /* ignore */ }
  }

  // School name
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(schoolName, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Report title
  doc.setFontSize(16);
  doc.setTextColor(...themeColor);
  doc.text(t('textbookModule.reports.individualReport').toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  // Academic year
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`${t('textbookModule.academicYear')}: ${academicYear}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  // Date
  doc.setFontSize(10);
  doc.text(`${t('textbookModule.reports.reportDate')}: ${format(new Date(), 'dd.MM.yyyy')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  const getStatusLabel = (s: string) => {
    if (s === 'distributed') return t('textbookModule.distributed');
    if (s === 'returned') return t('textbookModule.returned');
    if (s === 'partial') return t('textbookModule.partial');
    return s;
  };

  const getRecipientTypeLabel = (rt: string) => {
    if (rt === 'teacher') return t('textbookModule.teacher');
    if (rt === 'student') return t('textbookModule.student');
    return rt;
  };

  // Table
  const tableData = distributions.map((d: any, i: number) => [
    (i + 1).toString(),
    d.textbook?.title || '-',
    getRecipientTypeLabel(d.recipientType),
    d.recipientName || '-',
    d.quantity?.toString() || '0',
    d.distributedAt ? new Date(d.distributedAt).toLocaleDateString() : '-',
    getStatusLabel(d.status),
    d.returnedQty?.toString() || '0',
    d.missingQty?.toString() || '0',
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [[
      '#',
      t('textbookModule.textbook'),
      t('textbookModule.recipientType'),
      t('textbookModule.recipientName'),
      t('textbookModule.quantity'),
      t('textbookModule.distributedAt'),
      t('textbookModule.status'),
      t('textbookModule.returned'),
      t('textbookModule.missing'),
    ]],
    body: tableData,
    styles: { fontSize: 8, font: 'Roboto' },
    headStyles: { fillColor: themeColor, font: 'Roboto' },
    columnStyles: {
      0: { cellWidth: 10 },
      4: { halign: 'center' },
      7: { halign: 'center' },
      8: { halign: 'center' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || yPos;

  // Signatures
  const sigY = Math.max(finalY + 25, pageHeight - 30);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  // Librarian - left
  doc.line(30, sigY, 100, sigY);
  doc.text(settings?.librarianName || t('certificates.librarianName'), 65, sigY + 5, { align: 'center' });
  doc.text(t('textbookModule.reports.signature'), 65, sigY + 10, { align: 'center' });

  // Principal - right
  doc.line(pageWidth - 100, sigY, pageWidth - 30, sigY);
  doc.text(settings?.principalName || t('certificates.principalName'), pageWidth - 65, sigY + 5, { align: 'center' });
  doc.text(t('textbookModule.reports.signature'), pageWidth - 65, sigY + 10, { align: 'center' });

  doc.save(`individual_distribution_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export async function exportTextbookSummaryReportPdf(
  statistics: any,
  distributions: any[],
  academicYear: string,
  settings: Settings | null,
  t: TFunction,
  language: string
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await addCyrillicFont(doc);

  const pageWidth = 210;
  const schoolName = getSchoolNameForLang(settings, language);
  const themeColor: [number, number, number] = [106, 27, 154];

  let yPos = 15;

  // Logo
  if (settings?.schoolLogo) {
    try {
      doc.addImage(settings.schoolLogo, 'PNG', pageWidth / 2 - 10, yPos, 20, 20);
      yPos += 25;
    } catch (e) { /* ignore */ }
  }

  // School name
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(schoolName, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Report title
  doc.setFontSize(16);
  doc.setTextColor(...themeColor);
  doc.text(t('textbookModule.reports.summaryReport').toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  // Academic year
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`${t('textbookModule.academicYear')}: ${academicYear}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  // Date
  doc.setFontSize(10);
  doc.text(`${t('textbookModule.reports.reportDate')}: ${format(new Date(), 'dd.MM.yyyy')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Summary boxes as text
  doc.setFontSize(11);

  const summaryItems = [
    { label: t('textbookModule.totalDistributions'), value: statistics?.totalDistributions || 0 },
    { label: t('textbookModule.pendingReturns'), value: statistics?.pendingReturns || 0 },
    { label: t('textbookModule.missingBooks'), value: statistics?.totalMissingBooks || 0 },
    { label: t('textbookModule.availableStock'), value: `${statistics?.availableTextbookStock || 0} / ${statistics?.totalTextbookStock || 0}` },
  ];

  // Draw summary boxes
  const boxWidth = 85;
  const boxHeight = 20;
  const gap = 5;
  const startX = (pageWidth - (boxWidth * 2 + gap)) / 2;

  for (let i = 0; i < summaryItems.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = startX + col * (boxWidth + gap);
    const y = yPos + row * (boxHeight + gap);

    doc.setDrawColor(...themeColor);
    doc.setLineWidth(0.5);
    doc.rect(x, y, boxWidth, boxHeight);

    doc.setFontSize(14);
    doc.setTextColor(...themeColor);
    doc.text(String(summaryItems[i].value), x + boxWidth / 2, y + 10, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(summaryItems[i].label, x + boxWidth / 2, y + 16, { align: 'center' });
  }

  yPos += (boxHeight + gap) * 2 + 10;

  // Recent distributions table
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(t('textbookModule.recentDistributions'), 20, yPos);
  yPos += 5;

  const getStatusLabel = (s: string) => {
    if (s === 'distributed') return t('textbookModule.distributed');
    if (s === 'returned') return t('textbookModule.returned');
    if (s === 'partial') return t('textbookModule.partial');
    return s;
  };

  const tableData = distributions.map((d: any) => [
    `${d.branch?.grade || ''}${d.branch?.name || ''}`,
    d.set?.name || '-',
    d.branch?.teacher?.fullName || '-',
    d.distributedAt ? new Date(d.distributedAt).toLocaleDateString() : '-',
    getStatusLabel(d.status),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [[
      t('textbookModule.branch'),
      t('textbookModule.set'),
      t('textbookModule.teacher'),
      t('textbookModule.date'),
      t('textbookModule.status'),
    ]],
    body: tableData,
    styles: { fontSize: 9, font: 'Roboto' },
    headStyles: { fillColor: themeColor, font: 'Roboto' },
  });

  const finalY = (doc as any).lastAutoTable.finalY || yPos;

  // Signatures
  const sigY = Math.max(finalY + 25, 250);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  // Librarian - left
  doc.line(20, sigY, 80, sigY);
  doc.text(settings?.librarianName || t('certificates.librarianName'), 50, sigY + 5, { align: 'center' });
  doc.text(t('textbookModule.reports.signature'), 50, sigY + 10, { align: 'center' });

  // Principal - right
  doc.line(130, sigY, 190, sigY);
  doc.text(settings?.principalName || t('certificates.principalName'), 160, sigY + 5, { align: 'center' });
  doc.text(t('textbookModule.reports.signature'), 160, sigY + 10, { align: 'center' });

  doc.save(`textbook_summary_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
