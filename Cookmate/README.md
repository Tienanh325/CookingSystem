# Cookmate

Ứng dụng hướng dẫn nấu ăn gồm API Express/MySQL, web quản trị React/Vite và app khách hàng Expo/React Native.

## Chạy dự án

Mở ba terminal tại thư mục gốc sau khi cấu hình môi trường theo từng README:

```powershell
# Terminal 1 — API
npm ci --prefix Backend
npm run migrate --prefix Backend
npm run seed --prefix Backend
npm run dev --prefix Backend

# Terminal 2 — quản trị
npm ci --prefix Frontend/admin
npm run dev --prefix Frontend/admin

# Terminal 3 — khách hàng
npm ci --prefix Frontend/mobile
npm start --prefix Frontend/mobile
```

- [Cấu hình database, bảo mật và tài khoản quản trị](Backend/README.md).
- [Web quản trị](Frontend/admin/README.md).
- [App Expo và kết nối điện thoại](Frontend/mobile/README.md).
- [Kiểm thử giao diện](Frontend/README.md).
- [Báo cáo rà soát và trạng thái khắc phục](Backend/BACKEND-REVIEW.md).

Tài khoản quản trị được bootstrap bằng `seed`; nếu không chỉ định mật khẩu, thông tin được lưu riêng tại `Backend/.admin-credentials.local` (gitignored). Đăng ký công khai chỉ tạo tài khoản khách hàng. Database mới chưa có món ăn: tạo danh mục, nguyên liệu rồi công thức từ trang quản trị, hoặc chạy `npm run seed:demo --prefix Backend` để nạp [dữ liệu mẫu](Backend/DEMO-DATA.md). Database phát triển hiện đã được nạp bộ mẫu này.

Nhận xét hai tài liệu phân tích cũ và đối chiếu với code hiện tại: [ANALYSIS-FEEDBACK.md](ANALYSIS-FEEDBACK.md).

Đăng nhập khách hàng bằng điện thoại/OTP, Google, Apple và mở khóa bằng sinh trắc học: xem [trạng thái và cấu hình](Backend/CUSTOMER-AUTH.md). OTP hiện thử cục bộ; Google/Apple cần cấu hình nhà cung cấp, Zalo chưa tích hợp.

## Phạm vi giao diện

Admin có tổng quan, công thức, danh mục, nguyên liệu, người dùng, vai trò, kiểm duyệt bình luận/đánh giá, thông báo, nhật ký và hồ sơ. Khách hàng có đăng ký/đăng nhập, khám phá và tìm kiếm cơ bản, chi tiết món, yêu thích, hướng dẫn nấu, lịch sử, đánh giá/bình luận, thông báo và hồ sơ.

Không triển khai ba màn hình khách hàng được yêu cầu loại trừ: đăng công thức, cộng đồng và tìm kiếm nâng cao. Link Stitch chưa cung cấp nội dung thiết kế truy cập được trong phiên làm việc; giao diện hiện tại dùng phong cách kem/cam từ ảnh tham chiếu, chưa xác nhận khớp từng màn hình Stitch.

Đã có kiểm thử API/MySQL và luồng giao diện trên trình duyệt. Bản Expo cần kiểm tra thêm trên thiết bị Android/iOS thật; export JavaScript không tương đương tạo APK/IPA. Quên mật khẩu qua email, xác minh email và push notification chưa nằm trong phần đã triển khai.
