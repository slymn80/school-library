import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      fullName: 'Администратор',
      role: 'ADMIN',
      mustChangePassword: true,
    },
  });
  console.log('Admin user created:', admin.username);

  // Create librarian user for demo
  const librarianPassword = await bcrypt.hash('librarian123', 10);
  const librarian = await prisma.user.upsert({
    where: { username: 'librarian' },
    update: {},
    create: {
      username: 'librarian',
      password: librarianPassword,
      fullName: 'Библиотекарь',
      role: 'LIBRARIAN',
      mustChangePassword: true,
    },
  });
  console.log('Librarian user created:', librarian.username);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, name: 'Художественная литература', nameKk: 'Көркем әдебиет' },
    }),
    prisma.category.upsert({
      where: { id: 2 },
      update: {},
      create: { id: 2, name: 'Учебники', nameKk: 'Оқулықтар' },
    }),
    prisma.category.upsert({
      where: { id: 3 },
      update: {},
      create: { id: 3, name: 'Научная литература', nameKk: 'Ғылыми әдебиет' },
    }),
    prisma.category.upsert({
      where: { id: 4 },
      update: {},
      create: { id: 4, name: 'Энциклопедии', nameKk: 'Энциклопедиялар' },
    }),
    prisma.category.upsert({
      where: { id: 5 },
      update: {},
      create: { id: 5, name: 'Детская литература', nameKk: 'Балалар әдебиеті' },
    }),
  ]);
  console.log('Categories created:', categories.length);

  // Create sample books
  const books = await Promise.all([
    prisma.book.upsert({
      where: { inventoryNumber: 'INV-001' },
      update: {},
      create: {
        title: 'Война и мир',
        author: 'Лев Толстой',
        isbn: '978-5-17-090000-1',
        publisher: 'АСТ',
        year: 2020,
        categoryId: 1,
        shelfLocation: 'A-1-1',
        inventoryNumber: 'INV-001',
        totalCopies: 3,
        availableCopies: 3,
      },
    }),
    prisma.book.upsert({
      where: { inventoryNumber: 'INV-002' },
      update: {},
      create: {
        title: 'Абай жолы',
        author: 'Мұхтар Әуезов',
        isbn: '978-601-80000-1-1',
        publisher: 'Атамұра',
        year: 2019,
        categoryId: 1,
        shelfLocation: 'A-1-2',
        inventoryNumber: 'INV-002',
        totalCopies: 5,
        availableCopies: 5,
      },
    }),
    prisma.book.upsert({
      where: { inventoryNumber: 'INV-003' },
      update: {},
      create: {
        title: 'Математика 7 класс',
        author: 'А.Е. Абылкасымова',
        isbn: '978-601-80000-2-2',
        publisher: 'Мектеп',
        year: 2023,
        categoryId: 2,
        shelfLocation: 'B-2-1',
        inventoryNumber: 'INV-003',
        totalCopies: 30,
        availableCopies: 30,
      },
    }),
    prisma.book.upsert({
      where: { inventoryNumber: 'INV-004' },
      update: {},
      create: {
        title: 'Физика 8 класс',
        author: 'С.Т. Туякбаев',
        publisher: 'Мектеп',
        year: 2023,
        categoryId: 2,
        shelfLocation: 'B-2-2',
        inventoryNumber: 'INV-004',
        totalCopies: 25,
        availableCopies: 25,
      },
    }),
    prisma.book.upsert({
      where: { inventoryNumber: 'INV-005' },
      update: {},
      create: {
        title: 'Гарри Поттер и философский камень',
        author: 'Дж.К. Роулинг',
        isbn: '978-5-389-07435-4',
        publisher: 'Махаон',
        year: 2021,
        categoryId: 5,
        shelfLocation: 'C-3-1',
        inventoryNumber: 'INV-005',
        totalCopies: 2,
        availableCopies: 2,
      },
    }),
  ]);
  console.log('Books created:', books.length);

  // Create sample students
  const students = await Promise.all([
    prisma.student.upsert({
      where: { studentId: 'STU-2024-001' },
      update: {},
      create: {
        fullName: 'Иванов Иван Иванович',
        studentId: 'STU-2024-001',
        grade: '7А',
        school: 'Талгарская частная школа-интернат-лицей №1',
        phone: '+7 777 123 4567',
      },
    }),
    prisma.student.upsert({
      where: { studentId: 'STU-2024-002' },
      update: {},
      create: {
        fullName: 'Ахметова Айгуль Сериковна',
        studentId: 'STU-2024-002',
        grade: '8Б',
        school: 'Талгарская частная школа-интернат-лицей №1',
        phone: '+7 777 234 5678',
      },
    }),
    prisma.student.upsert({
      where: { studentId: 'STU-2024-003' },
      update: {},
      create: {
        fullName: 'Касымов Арман Нурланович',
        studentId: 'STU-2024-003',
        grade: '9В',
        school: 'Талгарская частная школа-интернат-лицей №1',
        phone: '+7 777 345 6789',
      },
    }),
    prisma.student.upsert({
      where: { studentId: 'STU-2024-004' },
      update: {},
      create: {
        fullName: 'Петрова Мария Александровна',
        studentId: 'STU-2024-004',
        grade: '7А',
        school: 'Талгарская частная школа-интернат-лицей №1',
      },
    }),
    prisma.student.upsert({
      where: { studentId: 'STU-2024-005' },
      update: {},
      create: {
        fullName: 'Сейітов Нұрлан Қайратұлы',
        studentId: 'STU-2024-005',
        grade: '10А',
        school: 'Талгарская частная школа-интернат-лицей №1',
        phone: '+7 777 456 7890',
      },
    }),
  ]);
  console.log('Students created:', students.length);

  // Create settings
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      feePerDay: 50,
      schoolName: 'Талгарская частная школа-интернат-лицей №1',
      schoolNameKk: 'Талғар жеке мектеп-интернат лицейі №1',
    },
  });
  console.log('Settings created');

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
