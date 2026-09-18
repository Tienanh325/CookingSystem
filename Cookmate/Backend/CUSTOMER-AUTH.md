# Đăng nhập khách hàng

Hiện hỗ trợ email/mật khẩu và luồng Google/Apple khi có cấu hình nhà cung cấp. Zalo chưa tích hợp. Đăng nhập số điện thoại/OTP và mở khóa Face ID/vân tay đã được gỡ theo yêu cầu; backend không còn API gửi hoặc xác minh OTP.

SecureStore vẫn dùng để lưu token thông thường. App xóa phiên cũ đã bật sinh trắc học và yêu cầu đăng nhập lại, không gọi xác thực sinh trắc học. Nếu từng build native với quyền Face ID, hãy build lại app để cập nhật cấu hình native.

## Google và Apple

Backend cần URL HTTPS public. Đặt biến `AUTH_PUBLIC_URL` là origin backend, không có `/api` cuối URL:

```dotenv
AUTH_PUBLIC_URL=https://api.example.com
AUTH_REDIRECT_URIS=cookmate://auth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
```

- Google: tạo OAuth **Web application** vì backend đổi code bằng client secret. Đăng ký redirect URI `https://api.example.com/api/auth/oauth/google/callback`; bật consent screen và test users theo cấu hình dự án Google.
- Apple: dùng Services ID cho luồng web, cấu hình domain và return URL `https://api.example.com/api/auth/oauth/apple/callback`. `APPLE_CLIENT_SECRET` là JWT do Apple Developer key ký theo tài liệu Apple, không phải mật khẩu Apple ID. Theo dõi hạn dùng và thay mới trước khi hết hạn.
- Native Expo cần development build với scheme `cookmate`; URL trả về app là `cookmate://auth`. Không dùng Expo Go cho luồng OAuth này.
- Nếu thử web, thêm **chính xác** origin kèm `/` vào `AUTH_REDIRECT_URIS`, ví dụ `cookmate://auth,http://localhost:8081/`; popup cần được trình duyệt cho phép. Không dùng wildcard hoặc cho client tự đặt URL tùy ý.
- Secret chỉ lưu ở backend, tuyệt đối không đặt trong biến `EXPO_PUBLIC_*`.


Nguồn cấu hình: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Sign in with Apple REST API](https://developer.apple.com/documentation/signinwithapplerestapi), [Expo OAuth](https://docs.expo.dev/guides/authentication/).

## Dữ liệu và kiểm thử

Giữ AuthIdentity và AuthChallenge vì Google/Apple vẫn dùng hai bảng này. Không xóa tài khoản hay dữ liệu lịch sử. Email và mật khẩu vẫn có thể NULL cho tài khoản mạng xã hội; đăng ký bằng email bắt buộc nhập email/mật khẩu. Không tự ghép tài khoản chỉ vì trùng email.

Backend xác minh chữ ký, issuer, audience, hạn dùng và nonce của ID token. App đổi vé một lần bằng verifier; không nhận JWT trên URL. Google/Apple cần cấu hình thật để hoạt động; các test OAuth hiện mô phỏng nhà cung cấp.

Chạy `npm test --prefix Backend` để kiểm tra email/OAuth và xác nhận API OTP đã bị gỡ. `npm run test:ui --prefix Frontend` kiểm tra các luồng giao diện và việc không còn lựa chọn OTP/sinh trắc học.
