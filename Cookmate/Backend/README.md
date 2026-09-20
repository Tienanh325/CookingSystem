# Cookmate API

Express, Sequelize và MySQL. Chạy lệnh dưới đây từ thư mục `Backend`.

## Thiết lập lần đầu

1. Tạo database MySQL dùng UTF-8 (`utf8mb4`) và tài khoản có quyền trên database đó.
2. Sao chép `.env.example` thành `.env` nếu chưa có; điền `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
3. Tạo `JWT_SECRET` ngẫu nhiên bằng lệnh sau rồi lưu vào `.env`. Không chia sẻ hoặc commit file này.

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npm ci
npm run migrate
npm run seed
npm run dev
```

Để gửi email thật, cấu hình `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` và `APP_PUBLIC_URL`. `APP_PUBLIC_URL=cookmate://` mở trực tiếp ứng dụng từ liên kết xác minh/đặt lại mật khẩu. Trong môi trường development chưa có SMTP, liên kết được in ra terminal; production sẽ từ chối gửi nếu SMTP chưa được cấu hình.

Push notification sử dụng Expo Push Service. Mobile đăng ký Expo push token với backend; có thể đặt `EXPO_ACCESS_TOKEN` nếu dự án bật enhanced push security.

API mặc định tại `http://localhost:8080/api`. Upload tại `/uploads`.

Nếu frontend báo `Route GET /api/admin/... not found` trong khi route đã có trong code, hãy kiểm tra tiến trình đang giữ cổng 8080 và khởi động lại đúng backend bằng `npm run dev --prefix Backend` từ thư mục gốc. Backend nạp `.env` theo vị trí file, không phụ thuộc thư mục terminal. `nodemon.json` bật theo dõi bằng polling trên Windows để tự nạp lại khi đổi `src` hoặc `.env`.

Địa chỉ frontend: admin dùng proxy của Vite; Expo dùng `EXPO_PUBLIC_API_URL` trỏ tới IP LAN của máy chạy backend. Ảnh `/uploads` cho phép hiển thị từ frontend khác origin. Khi đổi secret hoặc khởi động lại từ phiên backend cũ, nếu phiên đăng nhập không còn hợp lệ hãy đăng nhập lại.

`migrate` tạo bảng còn thiếu và bổ sung phiên bản token, phiên bản công thức/bước nấu, snapshot lịch sử và khóa UNIQUE. Không dùng sync force/alter. Với dữ liệu đang vận hành, sao lưu database trước khi chạy migration.

`seed` tạo vai trò ADMIN/USER và tài khoản quản trị ban đầu. Có thể đặt `ADMIN_EMAIL`, `ADMIN_PASSWORD` (ít nhất 12 ký tự); nếu bỏ trống, email mặc định `admin@cookmate.local` và mật khẩu ngẫu nhiên được ghi vào `.admin-credentials.local`. Chạy lại không đổi mật khẩu tài khoản đã có. Mở file này tại máy để lấy thông tin đăng nhập rồi đổi mật khẩu trong trang quản trị.

## Các quy tắc đã triển khai

Dữ liệu trải nghiệm có thể nạp bằng `npm run seed:demo`, kiểm tra bằng `npm run verify:demo`. Xem [DEMO-DATA.md](DEMO-DATA.md) để biết số lượng từng bảng, tài khoản khách hàng và giới hạn dữ liệu mẫu.

- JWT yêu cầu secret hợp lệ, kiểm tra tài khoản và vai trò đang hoạt động; đổi mật khẩu/đăng xuất thu hồi các phiên cũ.
- Đăng ký luôn là USER. Chỉ ADMIN hoạt động truy cập API quản trị; bảo vệ quản trị viên hoạt động cuối cùng.
- Công thức công khai phải có nguyên liệu và bước. Công thức ẩn chỉ xuất hiện trong API quản trị.
- Sửa bước tạo phiên bản mới; lịch sử đang nấu giữ nguyên snapshot và các bước cũ. Lịch sử đã hoàn thành/hủy không sửa tiến độ; hoàn thành cần đủ bước.
- Mỗi người chỉ có một đánh giá/món; cập nhật điểm tổng hợp trong transaction có khóa.
- Bình luận hỗ trợ một cấp trả lời; ẩn bình luận gốc cũng ẩn trả lời.
- Upload ảnh JPEG/PNG/WebP tối đa 5 MB, giải mã thực tế và tái mã hóa WebP; không tin MIME do client gửi.
- Ghi nhật ký thao tác quản trị; kiểm tra dữ liệu đầu vào, người nhận thông báo và giới hạn tần suất xác thực/upload.

Các endpoint quản trị mở rộng nằm dưới `/api/admin`; các route hiện có tiếp tục nằm trong `src/routes`. Thông báo được lưu trong ứng dụng và đồng thời gửi push qua Expo tới các thiết bị đã đăng ký.

## Kiểm thử

```powershell
npm test
```

Bộ test gọi HTTP thực với MySQL, tự tạo database `cookmate_test_*` và chỉ xóa database tạm do chính lần chạy tạo ra. Tài khoản MySQL dùng cho test cần quyền CREATE/DROP DATABASE. Không chạy test bằng tài khoản production. Xem `tests/integration.test.js` và báo cáo `BACKEND-REVIEW.md`.
