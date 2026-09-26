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

Đăng nhập khách hàng bằng email/mật khẩu và Google/Apple: xem [trạng thái và cấu hình](Backend/CUSTOMER-AUTH.md). Google/Apple cần cấu hình nhà cung cấp, Zalo chưa tích hợp.

## Phạm vi giao diện

Admin có tổng quan, công thức, dinh dưỡng nguyên liệu, danh mục, người dùng, vai trò, kiểm duyệt bài đăng/bình luận/đánh giá, xác nhận thanh toán, thông báo, nhật ký và hồ sơ. Khách hàng có đăng ký/đăng nhập, tìm kiếm chữ hoặc giọng nói, đăng công thức, chi tiết món và dinh dưỡng, lịch ăn, đánh giá thực đơn, yêu thích, hướng dẫn nấu, lịch sử, thông báo, gói dịch vụ và tư vấn Chef.

Gói Miễn phí được mở tối đa 10 công thức chưa từng xem mỗi ngày và thấy quảng cáo nội bộ Cookmate. Basic bỏ quảng cáo; Pro thêm lịch tự động, phân tích dinh dưỡng, danh sách mua sắm và bao gồm bốn mục tiêu ăn uống; Chef thêm tư vấn, video và nội dung độc quyền. Eat Healthy, Gym & Fitness, Vegetarian và Family Pack cũng có thể mua riêng.

Thanh toán hiện dùng quy trình yêu cầu–xác nhận thủ công để không phụ thuộc khóa cổng thanh toán: người dùng tạo yêu cầu, quản trị viên đối soát và kích hoạt quyền 30 ngày. Có thể thay lớp xác nhận này bằng webhook của nhà cung cấp khi chọn cổng thanh toán chính thức.

Đã có kiểm thử API/MySQL cùng kiểm tra kiểu mobile và build admin. Bản Expo vẫn cần kiểm tra microphone, push notification và deep link trên thiết bị Android/iOS thật; kiểm tra TypeScript không tương đương tạo APK/IPA.
