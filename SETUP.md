# 🚀 Hướng dẫn cấu hình môi trường - IE303 Whiteboard

## 1. Yêu cầu tiên quyết

### Backend
- **Java**: JDK 21+ (hiện tại dùng JDK 21.0.10)
- **Maven**: Tự động (sử dụng `mvnw`)
- **Database**: PostgreSQL (hoặc sử dụng Neon DB remote)

### Frontend
- **Node.js**: v18+
- **npm**: v9+

---

## 2. Cấu hình biến môi trường

### Bước 1: Sao chép `.env.example` → `.env`

```bash
# Ở thư mục gốc dự án
cp .env.example .env
```

### Bước 2: Chỉnh sửa `.env` với thông tin thực tế

Mở file `.env` và cập nhật các giá trị:

```env
# Database Configuration (LOCAL hoặc REMOTE)
# Dùng Neon DB:
DB_URL=jdbc:postgresql://ep-patient-river-aon3tsbg-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
DB_USERNAME=neondb_owner
DB_PASSWORD=your_actual_password

# Hoặc dùng PostgreSQL local:
# DB_URL=jdbc:postgresql://localhost:5432/whiteboard
# DB_USERNAME=postgres
# DB_PASSWORD=your_password

# AI Service (Google Gemini API)
GEMINI_API_KEY=your_actual_gemini_api_key
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent

# Server Configuration
SERVER_PORT=5000

# Spring Profile (dev, prod, test)
SPRING_PROFILES_ACTIVE=dev
```

---

## 3. Chạy dự án

### 3.1 Backend (Spring Boot)

```bash
cd backend

# Option 1: Chạy qua Maven Wrapper
./mvnw spring-boot:run

# Option 2: Build JAR rồi chạy
./mvnw clean package
java -jar target/backend-Whiteboard-0.0.1-SNAPSHOT.jar
```

Backend sẽ khởi động trên: **http://localhost:5000/**

Logs sẽ hiển thị:
```
Backend is running successfully on port 5000
```

### 3.2 Frontend (React + Vite)

```bash
cd frontend

# Cài đặt dependencies (lần đầu)
npm install

# Chạy dev server
npm run dev
```

Frontend sẽ khởi động trên: **http://localhost:5173/** (mặc định Vite)

---

## 4. Tổng quan cấu hình

| Thành phần      | URL/Port      | File cấu hình | Ghi chú |
|-----------------|---------------|---------------|---------|
| **Backend**     | :5000         | `.env` + `backend/src/main/resources/application.properties` | Spring Boot 4.0.5 |
| **Frontend**    | :5173         | `frontend/vite.config.js` | React + Vite |
| **Database**    | Neon/PostgreSQL | `.env` | Remote Neon hoặc Local PostgreSQL |
| **AI Service**  | Gemini API    | `.env` | Google Gemini 2.5 Flash |

---

## 5. Biến môi trường chi tiết

### Backend Variables (Spring Boot)

Các biến môi trường được đọc từ `.env` thông qua Spring Boot:

```properties
# application.properties sử dụng:
spring.datasource.url=${DB_URL:...}
spring.datasource.username=${DB_USERNAME:...}
spring.datasource.password=${DB_PASSWORD:...}
server.port=${SERVER_PORT:5000}
gemini.api.key=${GEMINI_API_KEY}
```

**Ưu tiên:**
1. Biến môi trường từ `.env` (hoặc system environment)
2. Giá trị mặc định trong `application.properties` (`:` default value)

---

## 6. Bảo mật

⚠️ **IMPORTANT:**

- **Đừng commit `.env`** vào Git (đã trong `.gitignore`)
- Commit chỉ **`.env.example`** (mẫu không có secrets)
- Trên **production**, đặt biến môi trường qua:
  - Docker environment variables
  - Cloud platform (AWS, Azure, Heroku, etc.)
  - CI/CD pipeline secrets

### Spring Security

Backend tự động tạo mật khẩu dev:
```
Using generated security password: e549a394-...
```

Cấu hình bảo mật trong production:
- Tạo `application-prod.properties`
- Đặt JWT secret, CORS, HTTPS, v.v.
- Disable dev tools: `spring.devtools.enabled=false`

---

## 7. Kiểm tra kết nối

### Backend - Kiểm tra Database

```bash
# Khi backend chạy, logs sẽ hiển thị:
HikariPool-1 - Start completed.
Database JDBC URL [...your-db-url...]
```

### Frontend - Kiểm tra API

Frontend cần biết URL backend để gọi API. Mặc định:
- **Dev**: `http://localhost:5000/`
- **Prod**: Cập nhật URL trong `.env.production`

---

## 8. Troubleshooting

### ❌ Backend không chạy được

1. **Lỗi compile Java**: Kiểm tra `pom.xml` - `<java.version>` phải tương thích với JDK:
   ```bash
   java -version  # Kiểm tra phiên bản Java
   ```
   Sửa trong `pom.xml`: `<java.version>21</java.version>`

2. **Lỗi database**: Kiểm tra `.env` - `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
   ```bash
   # Test kết nối PostgreSQL
   psql -h your-host -U your-user -d your-db
   ```

3. **Port đang dùng**: Đổi `SERVER_PORT` trong `.env`

### ❌ Frontend không kết nối Backend

1. Kiểm tra URL backend trong code (`useBoardSocket.js`, `useBoardData.js`)
2. Đảm bảo CORS được bật trên backend
3. Kiểm tra network tab trong DevTools

### ❌ Lỗi API Key Gemini

- Kiểm tra `GEMINI_API_KEY` có hợp lệ
- Kiểm tra quota API trên Google Cloud Console

---

## 9. Chạy cả 2 (Backend + Frontend)

### Option 1: 2 terminal riêng

**Terminal 1 - Backend:**
```bash
cd backend
./mvnw spring-boot:run
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Option 2: Sử dụng shell script (Windows PowerShell)

Tạo `run-all.ps1`:
```powershell
# Chạy Backend
Start-Process -NoNewWindow -FilePath "powershell" -ArgumentList "cd backend; ./mvnw spring-boot:run"

# Chạy Frontend
Start-Process -NoNewWindow -FilePath "powershell" -ArgumentList "cd frontend; npm run dev"

Write-Host "✅ Backend: http://localhost:5000"
Write-Host "✅ Frontend: http://localhost:5173"
```

Chạy: `.\run-all.ps1`

---

## 10. Các file liên quan

```
IE303_WhiteBoard/
├── .env                          ← Biến môi trường (LOCAL, không commit)
├── .env.example                  ← Mẫu biến môi trường (commit)
├── .gitignore                    ← Ignore .env
├── backend/
│   ├── pom.xml                   ← Maven config
│   └── src/main/resources/
│       └── application.properties ← Sử dụng biến ${...}
└── frontend/
    ├── package.json
    └── vite.config.js
```

---

## 11. Lệnh nhanh

```bash
# Reset và cài mới
./mvnw clean install
npm ci

# Build production
./mvnw clean package -DskipTests
npm run build

# Run tests
./mvnw test
npm run test

# Check linting
npm run lint
```

---

**Bạn cần hỗ trợ thêm gì không?** 🎯
