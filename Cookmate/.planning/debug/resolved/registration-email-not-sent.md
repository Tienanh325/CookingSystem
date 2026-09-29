---
status: resolved
trigger: "Đăng ký thành công nhưng Gmail không nhận được thư xác minh"
created: 2026-09-29
updated: 2026-09-29
---

## Triệu chứng

- Mong đợi: sau khi đăng ký, người dùng nhận được email xác minh.
- Thực tế: ứng dụng chuyển sang màn hình xác minh nhưng Gmail không nhận được thư.
- Không có lỗi hiển thị cho người dùng; API vẫn trả về thông báo gửi thành công.

## Tái hiện

1. Chạy backend ở `NODE_ENV=development`.
2. Đăng ký một tài khoản bằng địa chỉ Gmail.
3. API trả HTTP 201 và ứng dụng yêu cầu kiểm tra email.
4. Gmail không nhận được thư.

## Bằng chứng

- `Backend/.env` không có `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` hoặc `EMAIL_FROM`.
- `guiEmail.js` trả `{ development: true }` và chỉ in liên kết ra terminal khi thiếu `SMTP_HOST` ở môi trường development.
- `AuthController.register` không phân biệt email thật với bản xem trước development nên luôn trả thông báo đã gửi.

## Giả thuyết

Nguyên nhân gốc đã xác nhận: SMTP chưa được cấu hình và fallback development bị coi nhầm là gửi email thành công.

## Hướng sửa

- Kiểm tra đầy đủ cấu hình và xác thực kết nối SMTP trước khi tạo tài khoản.
- Chỉ cho phép bản xem trước terminal khi bật cờ rõ ràng.
- Trả lỗi 503 có thể hiển thị cho ứng dụng nếu dịch vụ email chưa sẵn sàng.
- Thêm cấu hình mẫu Gmail và lệnh kiểm tra SMTP.
- Theo yêu cầu cập nhật, email xác minh chỉ chứa mã OTP 6 số thay vì liên kết deep link.

## Resolution

- root_cause: Luồng đăng ký phụ thuộc dịch vụ SMTP Gmail trong khi thông tin xác thực SMTP không hợp lệ.
- fix: Theo quyết định sản phẩm mới, gỡ toàn bộ bước xác minh email khỏi đăng ký/đăng nhập; SMTP chỉ còn phục vụ quên mật khẩu.
- verification: 24/24 kiểm thử backend đạt, bao gồm đăng nhập ngay sau đăng ký và tài khoản cũ chưa xác minh; Expo dependency check và TypeScript đạt.
- files_changed: Backend auth controller/routes/services/validation/tests/docs; mobile registration, navigation and account recovery screens.
