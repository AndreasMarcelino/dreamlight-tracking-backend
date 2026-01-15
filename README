# Dreamlight Production Tracking - Backend API

Backend API untuk sistem tracking produksi content, dibangun dengan Express.js dan PostgreSQL.

## 🚀 Tech Stack

- **Framework**: Express.js
- **Database**: MySQL with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting

## 📋 Prerequisites

- Node.js >= 16.x
- MySQL >= 5.7 or MySQL >= 8.0
- npm or yarn

## 🛠 Installation

### 1. Clone dan Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Buat file `.env` dari template `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` sesuai konfigurasi Anda:

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_NAME=dreamlight_db
DB_USER=root
DB_PASSWORD=your_password

JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

UPLOAD_PATH=./uploads
MAX_FILE_SIZE=52428800

CORS_ORIGIN=http://localhost:3000
```

### 3. Setup Database

Buat database MySQL:

```sql
CREATE DATABASE dreamlight_db;
```

Atau menggunakan MySQL command line:

```bash
mysql -u root -p
CREATE DATABASE dreamlight_db;
exit;
```

### 4. Run Database Migration

```bash
npm run migrate
```

Atau jika ingin menggunakan auto-sync (development):

```bash
npm run dev
```

Server akan otomatis sync database models saat pertama kali running.

### 5. Seed Initial Data (Optional)

```bash
npm run seed
```

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

Server akan running di `http://localhost:5000`

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication

Semua endpoint (kecuali login) memerlukan JWT token di header:

```
Authorization: Bearer <your_jwt_token>
```

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": {...},
  "message": "Optional message"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message"
}
```

---

## 🔐 Authentication Endpoints

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Selamat Datang, John Doe!",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin"
    }
  }
}
```

### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Logout

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### Register New User (Admin Only)

```http
POST /api/auth/register
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password123",
  "role": "crew"
}
```

---

## 📽 Project Endpoints

### Get All Projects

```http
GET /api/projects
Authorization: Bearer <token>

# Optional Query Parameters:
?status=In Progress
?type=Series
?client_id=1
?investor_id=2
```

### Get Project by ID

```http
GET /api/projects/:id
Authorization: Bearer <token>
```

Response includes: project details, episodes, milestones, finances, assets, and progress stats.

### Create Project

```http
POST /api/projects
Authorization: Bearer <token> (Admin/Producer only)
Content-Type: application/json

{
  "title": "FTV Cinta di Semarang",
  "client_id": 5,
  "investor_id": 3,
  "type": "Movie",
  "total_budget_plan": 500000000,
  "target_income": 750000000,
  "start_date": "2025-02-01",
  "deadline_date": "2025-06-30",
  "description": "Film TV tentang kisah cinta di Semarang"
}
```

### Update Project

```http
PUT /api/projects/:id
Authorization: Bearer <token> (Admin/Producer only)
Content-Type: application/json

{
  "title": "Updated Title",
  "global_status": "In Progress",
  ...
}
```

### Delete Project

```http
DELETE /api/projects/:id
Authorization: Bearer <token> (Admin only)
```

### Get Broadcaster Projects

```http
GET /api/projects/broadcaster/my-projects
Authorization: Bearer <broadcaster_token>
```

Returns dashboard-formatted project list with progress stats.

### Get Investor Projects

```http
GET /api/projects/investor/my-investments
Authorization: Bearer <investor_token>
```

Returns investment portfolio with ROI calculations.

---

## 🎬 Episode Endpoints

### Get Episodes

```http
GET /api/episodes?project_id=1
Authorization: Bearer <token>
```

### Get Episode by ID

```http
GET /api/episodes/:id
Authorization: Bearer <token>
```

### Create Episode

```http
POST /api/episodes
Authorization: Bearer <token> (Admin/Producer only)
Content-Type: application/json

{
  "project_id": 1,
  "title": "Episode Pilot",
  "episode_number": 1,
  "status": "Scripting",
  "synopsis": "Episode pertama series",
  "airing_date": "2025-07-15"
}
```

### Update Episode

```http
PUT /api/episodes/:id
Authorization: Bearer <token> (Admin/Producer only)
Content-Type: application/json

{
  "status": "Filming",
  "airing_date": "2025-07-20"
}
```

### Delete Episode

```http
DELETE /api/episodes/:id
Authorization: Bearer <token> (Admin/Producer only)
```

---

## 👥 Milestone (Tasks) Endpoints

### Get Milestones

```http
GET /api/milestones
Authorization: Bearer <token>

# Optional Query Parameters:
?project_id=1
?user_id=5
?episode_id=2
?work_status=Pending
?payment_status=Unpaid
```

### Get Crew Tasks (For Crew Dashboard)

```http
GET /api/milestones/crew/my-tasks?view=active
Authorization: Bearer <crew_token>

# view parameter: 'active' or 'history'
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [...tasks],
  "stats": {
    "pendingPayment": 5000000,
    "receivedPayment": 15000000,
    "activeTaskCount": 3
  }
}
```

### Create Milestone (Assign Crew)

```http
POST /api/milestones
Authorization: Bearer <token> (Admin/Producer only)
Content-Type: application/json

{
  "project_id": 1,
  "episode_id": 2,  // Optional, null for general project tasks
  "user_id": 5,
  "task_name": "Director of Photography",
  "phase_category": "Production",
  "honor_amount": 5000000
}
```

### Update Milestone

```http
PUT /api/milestones/:id
Authorization: Bearer <token> (Admin/Producer only)
Content-Type: application/json

{
  "work_status": "Done",
  "payment_status": "Paid"
}
```

### Update Milestone Status (Crew)

```http
PATCH /api/milestones/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "work_status": "In Progress"
}
```

Crew can only update their own tasks.

### Delete Milestone

```http
DELETE /api/milestones/:id
Authorization: Bearer <token> (Admin/Producer only)
```

---

## 💰 Finance Endpoints

### Get Finances

```http
GET /api/finance
Authorization: Bearer <token>

# Optional Query Parameters:
?project_id=1
?type=Expense
?status=Paid
?month=2025-01
```

### Create Finance Transaction

```http
POST /api/finance
Authorization: Bearer <token> (Admin/Producer only)
Content-Type: application/json

{
  "project_id": 1,
  "type": "Expense",
  "category": "Sewa Kamera",
  "amount": 10000000,
  "transaction_date": "2025-01-15",
  "status": "Paid",
  "description": "Sewa equipment 3 hari"
}
```

### Pay Crew Honor

```http
POST /api/finance/pay-crew
Authorization: Bearer <token> (Admin/Producer only)
Content-Type: application/json

{
  "milestone_id": 10
}
```

Updates milestone payment_status to 'Paid'.

### Get Finance Summary

```http
GET /api/finance/summary?project_id=1
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalIncome": 50000000,
    "totalExpense": 35000000,
    "crewExpense": 15000000,
    "pendingAR": 10000000,
    "netProfit": 15000000
  }
}
```

---

## 📁 Asset (File) Endpoints

### Get Assets

```http
GET /api/assets?project_id=1
Authorization: Bearer <token>

# Optional Query Parameters:
?episode_id=2
?category=Script
?is_public_to_broadcaster=true
```

### Upload Asset

```http
POST /api/assets
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "project_id": 1,
  "episode_id": 2,  // Optional
  "category": "Preview Video",
  "is_public_to_broadcaster": true,
  "file": <binary>
}
```

**Accepted Categories:**
- Script
- Contract
- Preview Video
- Master Video
- Other

### Download Asset

```http
GET /api/assets/:id/download
Authorization: Bearer <token>
```

Broadcasters can only download public assets.

### Delete Asset

```http
DELETE /api/assets/:id
Authorization: Bearer <token> (Admin/Producer/Uploader)
```

---

## 📊 Dashboard Endpoints

### Admin Dashboard

```http
GET /api/dashboard/admin
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProjects": 15,
    "ongoingProjects": 8,
    "totalCrew": 25,
    "recentProjects": [...]
  }
}
```

### Crew Dashboard

```http
GET /api/dashboard/crew
Authorization: Bearer <crew_token>
```

Returns crew tasks and payment statistics.

### Broadcaster Dashboard

```http
GET /api/dashboard/broadcaster
Authorization: Bearer <broadcaster_token>
```

Returns projects/episodes assigned to broadcaster with progress.

### Investor Dashboard

```http
GET /api/dashboard/investor
Authorization: Bearer <investor_token>
```

Returns investment portfolio with ROI analysis.

---

## 🔒 Role-Based Access Control

### Roles:

1. **admin**: Full access
2. **producer**: Manage projects, episodes, milestones, finance
3. **crew**: View and update own tasks
4. **broadcaster**: View assigned projects and download public files
5. **investor**: View investment portfolio and ROI

### Permission Matrix:

| Endpoint | Admin | Producer | Crew | Broadcaster | Investor |
|----------|-------|----------|------|-------------|----------|
| Projects CRUD | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Projects | ✅ | ✅ | ✅ | Own only | Own only |
| Episodes CRUD | ✅ | ✅ | ❌ | ❌ | ❌ |
| Milestones CRUD | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update Task Status | ✅ | ✅ | Own only | ❌ | ❌ |
| Finance CRUD | ✅ | ✅ | ❌ | ❌ | ❌ |
| Upload Files | ✅ | ✅ | ❌ | ❌ | ❌ |
| Download Files | ✅ | ✅ | ✅ | Public only | ❌ |

---

## 📂 Project Structure

```
dreamlight-backend/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── project.controller.js
│   │   ├── episode.controller.js
│   │   ├── milestone.controller.js
│   │   ├── finance.controller.js
│   │   ├── asset.controller.js
│   │   └── dashboard.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── upload.middleware.js
│   │   └── validation.middleware.js
│   ├── models/
│   │   ├── index.js
│   │   ├── User.js
│   │   ├── Project.js
│   │   ├── Episode.js
│   │   ├── Milestone.js
│   │   ├── Finance.js
│   │   └── Asset.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── project.routes.js
│   │   ├── episode.routes.js
│   │   ├── milestone.routes.js
│   │   ├── finance.routes.js
│   │   ├── asset.routes.js
│   │   └── dashboard.routes.js
│   ├── utils/
│   │   └── helpers.js
│   └── server.js
├── uploads/
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 🧪 Testing

### Test Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dreamlight.com","password":"admin123"}'
```

### Test Protected Endpoint

```bash
curl -X GET http://localhost:5000/api/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔄 Migration dari Laravel

### Perbedaan Utama:

1. **ORM**: Eloquent → Sequelize
2. **Routing**: Laravel Routes → Express Router
3. **Middleware**: Laravel Middleware → Express Middleware
4. **Validation**: Laravel Request Validation → express-validator
5. **File Storage**: Laravel Storage → Multer + File System
6. **Session**: Laravel Session → JWT Token

### Mapping Eloquent ke Sequelize:

| Laravel Eloquent | Sequelize |
|------------------|-----------|
| `Model::all()` | `Model.findAll()` |
| `Model::find($id)` | `Model.findByPk(id)` |
| `Model::where()` | `Model.findAll({ where })` |
| `Model::create()` | `Model.create()` |
| `$model->update()` | `model.update()` |
| `$model->delete()` | `model.destroy()` |
| `with('relation')` | `include: [...]` |
| `->get()` | `await query` |

---

## 🚀 Deployment

### Environment Variables untuk Production:

```env
NODE_ENV=production
PORT=5000
DB_HOST=your-production-db-host
JWT_SECRET=very-strong-secret-key
CORS_ORIGIN=https://your-frontend-domain.com
```

### PM2 Deployment:

```bash
npm install -g pm2
pm2 start src/server.js --name dreamlight-api
pm2 save
pm2 startup
```

---

## 📝 TODO / Next Steps

- [ ] Add express-validator untuk validasi input
- [ ] Implement refresh token mechanism
- [ ] Add unit tests (Jest/Mocha)
- [ ] Add API rate limiting per user
- [ ] Implement real-time notifications (Socket.io)
- [ ] Add export to Excel/PDF features
- [ ] Implement file compression for uploads
- [ ] Add audit log for critical operations
- [ ] Setup CI/CD pipeline
- [ ] Create Swagger/OpenAPI documentation

---

## 🤝 Contributing

Untuk menambah fitur atau fix bugs:

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

MIT License - Dreamlight World Media © 2025

---

## 🆘 Support

Untuk bantuan atau pertanyaan:
- Email: tech@dreamlight.com
- Slack: #dreamlight-dev