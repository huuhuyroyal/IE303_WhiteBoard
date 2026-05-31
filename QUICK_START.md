# 🚀 Quick Start - IE303 Whiteboard

## 1️⃣ Chuẩn bị môi trường (lần đầu)

```bash
# Sao chép mẫu biến môi trường
cp .env.example .env

# Chỉnh sửa .env với thông tin thực tế (DB, API keys)
# nano .env  hoặc mở bằng editor yêu thích
```

**`.env` cần có:**
- `DB_URL` - PostgreSQL connection string
- `DB_USERNAME` - Database user
- `DB_PASSWORD` - Database password
- `GEMINI_API_KEY` - Google Gemini API key
- `SERVER_PORT` - Backend port (mặc định 5000)

---

## 2️⃣ Chạy Backend (Spring Boot)

```bash
cd backend

# Chạy trực tiếp
./mvnw spring-boot:run

# Hoặc build & chạy
./mvnw clean package -DskipTests
java -jar target/backend-Whiteboard-0.0.1-SNAPSHOT.jar
```

✅ Backend: **http://localhost:5000/**

---

## 3️⃣ Chạy Frontend (React)

```bash
cd frontend

# Cài dependencies (lần đầu)
npm install

# Chạy dev server
npm run dev
```

✅ Frontend: **http://localhost:5173/**

---

## 4️⃣ Kiểm tra hoạt động

- **Backend health**: `curl http://localhost:5000/`
- **Database**: Logs sẽ hiển thị "HikariPool-1 - Start completed"
- **Frontend**: Mở trình duyệt → http://localhost:5173

---

## 📋 Các lệnh thường dùng

| Lệnh | Mục đích |
|------|---------|
| `./mvnw spring-boot:run` | Chạy backend dev |
| `./mvnw clean package` | Build JAR production |
| `npm run dev` | Chạy frontend dev |
| `npm run build` | Build frontend production |
| `npm run lint` | Kiểm tra code style |
| `./mvnw test` | Chạy unit tests backend |

---

## ⚠️ Bảo mật

- **Đừng commit `.env`** → Đã trong `.gitignore`
- Commit chỉ `.env.example` (template)
- Trên production, dùng environment variables hoặc secrets manager

---

## 🆘 Troubleshooting

| Lỗi | Giải pháp |
|-----|----------|
| "release version 25 not supported" | Kiểm tra Java version & update `pom.xml` |
| Database connection error | Kiểm tra `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` trong `.env` |
| Port already in use | Đổi `SERVER_PORT` trong `.env` |
| CORS error | Kiểm tra frontend URL trong backend CORS config |

---

📖 **Chi tiết**: Xem [SETUP.md](SETUP.md)
