import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Book, Student, Loan, Settings, LabelTemplate } from '../types';

export async function exportBooksToExcel(
  books: Book[],
  t: (key: string) => string,
  language: string
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(t('books.title'));

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

export function exportOverdueReportToPdf(
  loans: Loan[],
  t: (key: string) => string,
  language: string,
  settings: Settings | null
) {
  const doc = new jsPDF();

  // Title
  const schoolName = language === 'kk' ? settings?.schoolNameKk : settings?.schoolName;
  doc.setFontSize(16);
  doc.text(schoolName || t('common.appName'), 105, 15, { align: 'center' });
  doc.setFontSize(14);
  doc.text(t('reports.overdueReport'), 105, 25, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${t('reports.reportDate')}: ${format(new Date(), 'dd.MM.yyyy')}`, 105, 32, { align: 'center' });

  const feePerDay = settings?.feePerDay || 50;

  const tableData = loans.map((loan) => {
    const overdueDays = differenceInDays(new Date(), parseISO(loan.dueDate));
    const fee = overdueDays * feePerDay;

    return [
      loan.student?.fullName || '-',
      loan.student?.grade || '-',
      loan.book?.title || '-',
      loan.book?.inventoryNumber || '-',
      format(parseISO(loan.dueDate), 'dd.MM.yyyy'),
      overdueDays.toString(),
      `${fee} KZT`,
    ];
  });

  const totalFee = tableData.reduce((sum, row) => sum + parseInt(row[6] || '0'), 0);

  autoTable(doc, {
    startY: 40,
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
    styles: { fontSize: 8 },
    headStyles: { fillColor: [25, 118, 210] },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 40;
  doc.setFontSize(12);
  doc.text(`${t('reports.totalOverdueFees')}: ${totalFee} KZT`, 14, finalY + 10);

  doc.save(`overdue_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportBooksInventoryToPdf(
  books: Book[],
  t: (key: string) => string,
  language: string,
  settings: Settings | null
) {
  const doc = new jsPDF();

  const schoolName = language === 'kk' ? settings?.schoolNameKk : settings?.schoolName;
  doc.setFontSize(16);
  doc.text(schoolName || t('common.appName'), 105, 15, { align: 'center' });
  doc.setFontSize(14);
  doc.text(t('reports.booksInventory'), 105, 25, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${t('reports.reportDate')}: ${format(new Date(), 'dd.MM.yyyy')}`, 105, 32, { align: 'center' });

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
    startY: 40,
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
    styles: { fontSize: 8 },
    headStyles: { fillColor: [25, 118, 210] },
  });

  doc.save(`books_inventory_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportLabelsToPdf(
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
