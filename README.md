
# Diagnostics Appointment & Reporting System

A full-stack patient portal demo that allows users to create an account, log in securely, manage their profile, view diagnostic appointments, track appointment status, view reports, and upload diagnostic images/documents.

## 🚀 Live Application

Deployed using Vercel.

> https://frontend-six-tau-4bu6jguq6k.vercel.app/

## ✨ Features

- User Sign Up and Login
- Supabase Authentication
- Patient profile and patient ID
- Profile picture upload
- Upcoming diagnostic appointment
- Appointment status timeline
- Diagnostic report details
- Diagnostic image/document upload
- Uploaded diagnostic image preview
- User logout
- Responsive patient dashboard
- User-specific data access using Supabase Row Level Security (RLS)
- User-specific file organization in Supabase Storage

## 🛠️ Tech Stack

### Frontend
- React
- Vite
- JavaScript
- CSS

### Backend / Services
- Supabase Authentication
- Supabase PostgreSQL Database
- Supabase Storage
- Node.js / Express backend
- REST API

### Deployment
- Vercel - Frontend
- AWS EC2 - Backend

## 🔐 Authentication & Security

Authentication is handled using Supabase Auth.

Database tables use Row Level Security (RLS) so authenticated users can access their own records.

The application was tested with two separate users to verify data isolation:

- User A can access User A's data
- User B can access User B's data
- User A cannot see User B's database records
- User B cannot see User A's database records

Environment files containing configuration values are excluded from Git.

> This project is a demonstration application and is not intended for production healthcare data without additional security, privacy, compliance, and access-control measures.

## 🗄️ Database

The application uses Supabase PostgreSQL with the following main tables:

### `patient_profiles`

Stores patient profile information such as:

- User ID
- Patient ID
- Full name
- Phone
- Date of birth
- Gender
- Blood group
- Profile picture URL

### `appointments`

Stores diagnostic appointment information such as:

- Appointment code
- Appointment date
- Appointment time
- Test name
- Diagnostic center
- Doctor
- Appointment status

### `diagnostic_reports`

Stores diagnostic report information such as:

- Report code
- Test name
- Report date
- Result status
- Uploaded diagnostic image URL
- Notes

## 📁 Storage

Supabase Storage is used for uploaded files.

The application organizes files by authenticated user:

```text
customer-images/
└── <user-id>/
    ├── profile/
    ├── reports/
    └── uploads/