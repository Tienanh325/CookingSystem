# Đăng nhập khách hàng

Cookmate chỉ hỗ trợ đăng ký và đăng nhập bằng email/mật khẩu:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password` (chỉ dành cho bản demo ngoài production)
- `GET /api/auth/me`
- `POST /api/auth/logout`

Email phải đúng định dạng và mật khẩu phải đáp ứng quy tắc kiểm tra của API. Đăng ký xong có thể đăng nhập ngay, không có bước xác minh email.

Các phương thức Google, Apple, Zalo, số điện thoại/OTP và sinh trắc học đã được gỡ khỏi giao diện lẫn API. Những endpoint cũ dưới `/api/auth/oauth/*`, `/api/auth/methods` và `/api/auth/otp/*` trả về `404`.

Cookmate không kết nối Gmail/SMTP. Ở môi trường development hoặc test, màn hình quên mật khẩu nhận email đăng nhập, tạo một mật khẩu tạm mới, lưu bản băm bằng bcrypt và hiển thị mật khẩu tạm đúng một lần. Luồng demo này bị khóa khi `NODE_ENV=production`; endpoint cũ `/api/auth/reset-password` vẫn trả về `404`. Người dùng đang đăng nhập có thể đổi mật khẩu trong phần hồ sơ.

Token đăng nhập native được lưu bằng SecureStore; bản web dùng sessionStorage. Bảng `AuthIdentity` cũ vẫn được giữ trong database để tránh tự động xóa dữ liệu lịch sử, nhưng ứng dụng không còn đọc hoặc tạo định danh mạng xã hội.

Chạy `npm test --prefix Backend` để kiểm tra luồng email/mật khẩu và xác nhận các endpoint xác thực cũ đã bị vô hiệu hóa.
