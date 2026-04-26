# School management system

## Stack

- Backend: Node.js + Express + TypeScript + Prisma + PostgreSQL
- Frontend: React + TypeScript + Vite

## Setup

### 1. Database

Create a PostgreSQL database named `school_db`, then update `backend/.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/school_db"
JWT_SECRET="change_this_in_production"
PORT=4000
```

### 2. Backend

```bash
cd backend
npm install
npm run db:generate   # generate Prisma client
npm run db:migrate    # run migrations
npm run db:seed       # seed demo data
npm run dev           # start dev server on port 4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev           # start on port 3000
```

## Demo accounts

| Role        | Email                      | Password      |
|-------------|----------------------------|---------------|
| Super admin | superadmin@school.com      | Admin1234!    |
| Admin       | admin@school.com           | Admin1234!    |
| Teacher     | teacher@school.com         | Teacher1234!  |
| Student     | student@school.com         | Student1234!  |

## Features

- Role-based access: super admin, admin, teacher, student, parent
- Classes and subjects management
- Students and teachers directory
- Grade entry with weighted averages
- Attendance tracking (absences, delays, justifications)
- Weekly timetable
- Automatic bulletin/report card generation with class ranking
- Announcements with audience targeting
- Admin dashboard with stats and charts
