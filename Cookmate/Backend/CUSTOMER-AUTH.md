# Đăng nhập khách hàng

Cookmate chỉ hỗ trợ đăng ký và đăng nhập bằng email/mật khẩu:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Email phải đúng định dạng và mật khẩu phải đáp ứng quy tắc kiểm tra của API. Đăng ký xong có thể đăng nhập ngay, không có bước xác minh email.

Trong chức năng quên mật khẩu, “tên tài khoản” chính là email dùng để đăng nhập. Ứng dụng chỉ yêu cầu trường này rồi gửi một liên kết đặt mật khẩu mới đến email đã đăng ký. Mật khẩu cũ không thể được đọc lại vì chỉ bản băm mật khẩu được lưu trong cơ sở dữ liệu.

Các phương thức Google, Apple, Zalo, số điện thoại/OTP và sinh trắc học đã được gỡ khỏi giao diện lẫn API. Những endpoint cũ dưới `/api/auth/oauth/*`, `/api/auth/methods` và `/api/auth/otp/*` trả về `404`.

Token đăng nhập native được lưu bằng SecureStore; bản web dùng sessionStorage. Bảng `AuthIdentity` cũ vẫn được giữ trong database để tránh tự động xóa dữ liệu lịch sử, nhưng ứng dụng không còn đọc hoặc tạo định danh mạng xã hội.

Chạy `npm test --prefix Backend` để kiểm tra luồng email/mật khẩu và xác nhận các endpoint xác thực cũ đã bị vô hiệu hóa.
