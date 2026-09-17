# Đăng nhập khách hàng bổ sung

## Trạng thái thực tế

| Phương thức | Đã triển khai | Điều kiện sử dụng |
| --- | --- | --- |
| Email/mật khẩu | Giữ nguyên đăng ký/đăng nhập | Dùng được ngay |
| Điện thoại/OTP | Xin mã, xác minh, gửi lại, tạo khách hàng và đăng nhập | Hiện bật thử cục bộ; SMS thật cần Twilio Verify |
| Google | Authorization Code + PKCE, kiểm tra ID token phía backend, đổi vé một lần sang phiên Cookmate | Cần Google OAuth Web Client ID/secret và callback public |
| Apple | Authorization Code, form_post callback, kiểm tra ID token phía backend | Cần Apple Services ID và client-secret JWT còn hạn |
| Face ID/vân tay | Bật trong hồ sơ; khóa/mở lại phiên trên thiết bị bằng SecureStore có xác thực | Cần development build và thiết bị có sinh trắc học; không hoạt động trong Expo Go/web |
| Zalo | Vị trí nút trong giao diện, vô hiệu hóa | Chưa triển khai tích hợp Zalo |

Không trả kết quả đăng nhập giả khi nhà cung cấp chưa được cấu hình. `/api/auth/methods` cho app biết phương thức nào khả dụng. Google/Apple chưa được kiểm chứng với tài khoản nhà cung cấp thật; kiểm thử tự động dùng ID token ký bằng khóa kiểm thử và mô phỏng endpoint nhà cung cấp.

## Thử OTP cục bộ ngay

Database phát triển đã chạy migration bổ sung hai bảng `AuthIdentity`, `AuthChallenge`; không thêm dữ liệu xác thực mẫu vào hai bảng này. File `.env` phát triển hiện có:

```dotenv
NODE_ENV=development
OTP_DELIVERY=local
```

1. Chạy backend và Expo, mở Đăng nhập → Điện thoại / OTP.
2. Nhập số di động Việt Nam hợp lệ (dạng 09…, 03…, 05…, 07…, 08… hoặc +84…).
3. Bấm Nhận mã OTP, mở `Backend/.otp-preview.local` trên máy để lấy mã mới nhất, rồi nhập 6 chữ số trong app.
4. Lần đầu xác minh tạo tài khoản USER mới; các lần sau dùng cùng tài khoản.

Chế độ này **không gửi SMS**. API không trả mã OTP; file mã là file riêng gitignored. Mã tồn tại 5 phút, tối đa 5 lần thử, gửi lại cách nhau ít nhất 60 giây và tối đa 5 yêu cầu/số/giờ; có thêm giới hạn theo IP. Gửi lại vô hiệu mã cũ. Local OTP chỉ hoạt động khi NODE_ENV là development hoặc test, không dùng ở production.

## Bật SMS thật

Trong Backend/.env, đặt `OTP_DELIVERY=disabled` và điền:

```dotenv
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
```

Backend gọi Twilio Verify để gửi SMS và xác minh trạng thái approved. Cần cấu hình dịch vụ, quyền gửi tới Việt Nam và điều kiện tài khoản tại Twilio; chưa phát sinh gửi SMS thật trong quá trình triển khai. Xem [Twilio Verify](https://www.twilio.com/docs/verify/api/verification).

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
- Có thể tạo bản native bằng `npx expo run:android` trong `Frontend/mobile` khi máy đã có Android SDK; iOS dùng `npx expo run:ios` trên macOS có Xcode. Đây khác với `npm run android` hiện chỉ mở Expo. Sau thay đổi plugin/quyền sinh trắc học phải build lại bản native.
- Nếu thử web, thêm **chính xác** origin kèm `/` vào `AUTH_REDIRECT_URIS`, ví dụ `cookmate://auth,http://localhost:8081/`; popup cần được trình duyệt cho phép. Không dùng wildcard hoặc cho client tự đặt URL tùy ý.
- Secret chỉ lưu ở backend, tuyệt đối không đặt trong biến `EXPO_PUBLIC_*`.

Backend xác minh chữ ký, issuer, audience, expiry, nonce của ID token. App nhận vé ngắn hạn một lần thay vì JWT trên URL; đổi vé phải có verifier chỉ app khởi tạo biết. Vé hết hạn sau 60 giây. State, OTP và vé được kiểm soát trong transaction.

Nguồn cấu hình: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Sign in with Apple REST API](https://developer.apple.com/documentation/signinwithapplerestapi), [Expo OAuth](https://docs.expo.dev/guides/authentication/).

## Sinh trắc học

Đăng nhập trước, vào Cá nhân → Bật Face ID / Vân tay. Khi được bật, token được lưu với yêu cầu xác thực sinh trắc học trong SecureStore; mở lại app không tự đưa token vào phiên hoạt động. Dùng nút mở khóa tại màn hình đăng nhập. Nút Khóa phiên trên thiết bị giữ token đã bảo vệ để mở lại; Đăng xuất thu hồi token phía server và xóa token/thiết lập cục bộ. Token hết hạn hoặc sinh trắc học trên thiết bị thay đổi thì phải đăng nhập lại.

Đây là mở khóa phiên đã xác thực, không phải đăng nhập tài khoản mới bằng khuôn mặt/vân tay. Dữ liệu sinh trắc học do hệ điều hành xử lý, không gửi lên backend. Cần kiểm tra trên thiết bị thật. Xem [Expo SecureStore](https://docs.expo.dev/versions/v55.0.0/sdk/securestore/).

## Tài khoản và schema

- `AuthIdentity`: khóa duy nhất provider + subject, gắn tới NguoiDung. Số điện thoại xác minh lưu dưới dạng +84…; email/phone trong hồ sơ không tự tạo liên kết đăng nhập.
- `AuthChallenge`: các yêu cầu OTP/OAuth/vé, thời hạn, số lần thử và trạng thái đã dùng. Không seed 10 dòng giả vì đây là dữ liệu xác thực tạm thời. Có thể dọn bản ghi hết hạn theo chính sách lưu trữ khi triển khai.
- `NguoiDung.email` và `matKhau` cho phép NULL để tài khoản điện thoại hoặc mạng xã hội không cần email/mật khẩu giả. Đăng ký email vẫn bắt buộc có cả hai. Phiên trả về `hasPassword`; app không hiển thị Đổi mật khẩu cho tài khoản chưa có mật khẩu.
- Không tự ghép tài khoản mạng xã hội vào tài khoản cũ có email trùng. Người dùng nhận hướng dẫn đăng nhập bằng phương thức cũ. Liên kết nhiều phương thức vào một tài khoản là chức năng tiếp theo, chưa triển khai.
- Mọi phương thức mới chỉ tạo USER; tài khoản/vai trò bị khóa không được đăng nhập. JWT vẫn bị thu hồi khi đổi mật khẩu/đăng xuất như trước.

## Kiểm thử

`npm test --prefix Backend` kiểm tra OTP, hạn dùng, số lần thử, chống dùng lại, tránh chiếm tài khoản theo số hồ sơ, khóa tài khoản, production local mode và OAuth có ID token ký thật bằng khóa kiểm thử. `npm run test:ui --prefix Frontend` sau export web kiểm tra email cũ và OTP từ nhập số → mã sai → mã đúng → phiên khách hàng. Các test tạo database riêng và không gửi SMS thật. Không chạy hai bộ test cùng lúc vì dùng chung file OTP test tạm.
