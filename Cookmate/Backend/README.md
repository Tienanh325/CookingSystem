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

Đăng ký và đăng nhập chỉ kiểm tra định dạng email cùng mật khẩu; không yêu cầu xác minh email và không gửi thư sau đăng ký.

SMTP chỉ được dùng cho chức năng quên mật khẩu. Để gửi email đặt lại mật khẩu bằng Gmail, bật Xác minh 2 bước cho tài khoản gửi rồi tạo App Password. Trong `.env`, đặt `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`, `SMTP_USER` là địa chỉ Gmail và `SMTP_PASSWORD` là App Password 16 ký tự. `EMAIL_FROM` có thể bỏ trống để dùng tài khoản gửi; `APP_PUBLIC_URL=cookmate://` mở ứng dụng từ liên kết đặt lại mật khẩu. Chạy `npm run email:verify` để kiểm tra kết nối.

Push notification sử dụng Expo Push Service. Mobile đăng ký Expo push token với backend; có thể đặt `EXPO_ACCESS_TOKEN` nếu dự án bật enhanced push security.

API mặc định tại `http://localhost:8080/api`. Upload tại `/uploads`.

Ảnh của 60 món ăn được lưu tại `uploads/mon-an` dưới dạng WebP. Chạy `npm run images:recipes` để tải hoặc khôi phục ảnh và cập nhật đường dẫn trong cơ sở dữ liệu; chạy `npm run images:review` để tạo contact sheet phục vụ rà soát. Thông tin trang nguồn của từng ảnh nằm trong `uploads/mon-an/sources.json`.

Video hướng dẫn của 60 món được ánh xạ trong `scripts/recipe-videos.json`. Chạy `npm run videos:apply` để cập nhật các liên kết này vào cơ sở dữ liệu. Khi cần rà soát lại nguồn trên YouTube, chạy `npm run videos:search` rồi kiểm tra kết quả trước khi áp dụng. API chỉ trả URL video chi tiết cho quản trị viên hoặc người dùng đang có gói Chef; các tài khoản khác chỉ nhận trạng thái khóa để giao diện giới thiệu quyền lợi nâng cấp.

Nếu frontend báo `Route GET /api/admin/... not found` trong khi route đã có trong code, hãy kiểm tra tiến trình đang giữ cổng 8080 và khởi động lại đúng backend bằng `npm run dev --prefix Backend` từ thư mục gốc. Backend nạp `.env` theo vị trí file, không phụ thuộc thư mục terminal. `nodemon.json` bật theo dõi bằng polling trên Windows để tự nạp lại khi đổi `src` hoặc `.env`.

Địa chỉ frontend: admin dùng proxy của Vite; Expo dùng `EXPO_PUBLIC_API_URL` trỏ tới IP LAN của máy chạy backend. Ảnh `/uploads` cho phép hiển thị từ frontend khác origin. Khi đổi secret hoặc khởi động lại từ phiên backend cũ, nếu phiên đăng nhập không còn hợp lệ hãy đăng nhập lại.

`migrate` tạo bảng còn thiếu và bổ sung phiên bản token, phiên bản công thức/bước nấu, snapshot lịch sử và khóa UNIQUE. Không dùng sync force/alter. Với dữ liệu đang vận hành, sao lưu database trước khi chạy migration.

`seed` tạo vai trò ADMIN/USER và tài khoản quản trị ban đầu. Có thể đặt `ADMIN_EMAIL`, `ADMIN_PASSWORD` (ít nhất 12 ký tự); nếu bỏ trống, email mặc định `admin@cookmate.local` và mật khẩu ngẫu nhiên được ghi vào `.admin-credentials.local`. Chạy lại không đổi mật khẩu tài khoản đã có. Mở file này tại máy để lấy thông tin đăng nhập rồi đổi mật khẩu trong trang quản trị.

## Các quy tắc đã triển khai

Dữ liệu trải nghiệm có thể nạp bằng `npm run seed:demo`, kiểm tra bằng `npm run verify:demo`. Xem [DEMO-DATA.md](DEMO-DATA.md) để biết số lượng từng bảng, tài khoản khách hàng và giới hạn dữ liệu mẫu.

Để nạp bộ dữ liệu lớn, khác nhau và đảm bảo **tối thiểu 50 bản ghi cho toàn bộ 28 bảng**, dùng:

```powershell
npm run seed:large
npm run verify:large
```

Script chỉ chạy ngoài production, có transaction và có thể chạy lại mà không nhân đôi dữ liệu. Các vai trò, gói dịch vụ và mục tiêu bổ sung được để ẩn; đăng ký/quyền mua mẫu được để hết hạn nên không ảnh hưởng chính sách Free/Basic/Pro/Chef. Có thể đăng nhập một tài khoản mẫu bằng `data.user01@cookmate.local` / `CookmateDemo@2026` (chỉ dành cho môi trường phát triển).

- JWT yêu cầu secret hợp lệ, kiểm tra tài khoản và vai trò đang hoạt động; đổi mật khẩu/đăng xuất thu hồi các phiên cũ.
- Đăng ký luôn là USER. Chỉ ADMIN hoạt động truy cập API quản trị; bảo vệ quản trị viên hoạt động cuối cùng.
- Công thức công khai phải có nguyên liệu và bước. Công thức ẩn chỉ xuất hiện trong API quản trị.
- Sửa bước tạo phiên bản mới; lịch sử đang nấu giữ nguyên snapshot và các bước cũ. Lịch sử đã hoàn thành/hủy không sửa tiến độ; hoàn thành cần đủ bước.
- Mỗi người chỉ có một đánh giá/món; cập nhật điểm tổng hợp trong transaction có khóa.
- Bình luận hỗ trợ một cấp trả lời; ẩn bình luận gốc cũng ẩn trả lời.
- Upload ảnh JPEG/PNG/WebP tối đa 5 MB, giải mã thực tế và tái mã hóa WebP; không tin MIME do client gửi.
- Ghi nhật ký thao tác quản trị; kiểm tra dữ liệu đầu vào, người nhận thông báo và giới hạn tần suất xác thực/upload.
- Gói miễn phí giới hạn 10 công thức chưa từng mở mỗi ngày; công thức đã mở không tính lại. Cấp truy cập FREE/BASIC/PRO/CHEF được kiểm tra khi mở chi tiết.
- Lịch ăn thủ công dùng được sau đăng nhập; tạo tự động và danh sách mua sắm yêu cầu Pro/Chef. Dinh dưỡng được ước tính từ dữ liệu mỗi 100 g và khối lượng quy đổi của nguyên liệu.
- Thanh toán thật qua VNPAY dùng URL có chữ ký HMAC-SHA512. Quyền chỉ được kích hoạt từ IPN có chữ ký, terminal, mã đơn và số tiền hợp lệ; Return URL chỉ chuyển người dùng về ứng dụng. Luồng xác nhận thủ công cũ vẫn giữ làm phương án quản trị riêng và không thể xác nhận giao dịch VNPAY.
- `/api/tu-van-ai` chỉ dành cho Chef và hiện dùng bộ quy tắc minh bạch (`COOKMATE_RULES_V1`), luôn kèm cảnh báo không thay thế tư vấn y tế.

Các endpoint quản trị mở rộng nằm dưới `/api/admin`; các route hiện có tiếp tục nằm trong `src/routes`. Thông báo được lưu trong ứng dụng và đồng thời gửi push qua Expo tới các thiết bị đã đăng ký.

## Thanh toán VNPAY

Đăng ký merchant Sandbox tại `https://sandbox.vnpayment.vn/devreg/`, sau đó đặt các biến sau trong `.env` cục bộ; không commit mã terminal hoặc secret:

```dotenv
VNPAY_TMN_CODE=...
VNPAY_HASH_SECRET=...
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://your-public-api.example/api/thanh-toan/vnpay/return
VNPAY_APP_RETURN_URL=cookmate://thanh-toan
```

Đăng ký IPN URL tại VNPAY là `https://your-public-api.example/api/thanh-toan/vnpay/ipn`. Cả IPN và Return URL cần truy cập được qua HTTPS công khai; localhost không nhận được callback từ VNPAY. Ứng dụng mobile mở URL thanh toán do `POST /api/thanh-toan/vnpay/tao` trả về và nhận kết quả qua deep link `cookmate://thanh-toan`. Hãy dùng development build/ứng dụng cài thật để kiểm tra custom scheme, không dựa vào Expo Go.

Khi chuyển production, thay payment URL và bộ khóa bằng thông tin VNPAY production; không dùng khóa Sandbox. Tài liệu kỹ thuật chính thức: `https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html`.

## Kiểm thử

```powershell
npm test
```

Bộ test gọi HTTP thực với MySQL, tự tạo database `cookmate_test_*` và chỉ xóa database tạm do chính lần chạy tạo ra. Tài khoản MySQL dùng cho test cần quyền CREATE/DROP DATABASE. Không chạy test bằng tài khoản production. Xem `tests/integration.test.js` và báo cáo `BACKEND-REVIEW.md`.
