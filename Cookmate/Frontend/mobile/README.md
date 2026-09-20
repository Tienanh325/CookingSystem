# App khách hàng Cookmate

Expo SDK 55, React Native, TypeScript và React Navigation; mã ứng dụng nằm trong `maNguon/`. Tên file, component và màn hình do dự án định nghĩa sử dụng tiếng Việt không dấu, ví dụ `TrangChu`, `KhamPha`, `ChiTietMonAn`.

```powershell
npm ci
# Chỉ sao chép nếu chưa có .env
Copy-Item .env.example .env
npm start
```

Đặt `EXPO_PUBLIC_API_URL` trong `.env` thành URL của máy chạy backend:

- Điện thoại thật cùng Wi-Fi: `http://IP_LAN_CUA_MAY:8080/api`.
- Android Emulator: `http://10.0.2.2:8080/api`.
- Trình duyệt trên máy phát triển: `http://localhost:8080/api`.

Đặt `EXPO_PUBLIC_EAS_PROJECT_ID` bằng Project ID trong Expo/EAS để nhận push notification trên bản cài Android/iOS. Remote push không hoạt động trên Expo web hoặc Expo Go của SDK 53 trở lên; cần development build hoặc bản release có credential FCM/APNs.

```powershell
npx eas-cli init
npx eas-cli credentials
npx eas-cli build --profile development --platform android
```

Sau `eas init`, điền Project ID được cấp vào `.env`. Profile build đã được khai báo trong `eas.json`; không commit file credential dịch vụ vào repository.

Có thể dùng Expo Go để xem các chức năng không phụ thuộc remote push. Để thử push thật, cài development build từ EAS rồi mở bundler bằng `npx expo start --dev-client`. Cho phép kết nối backend qua firewall nếu mạng chặn; đổi IP cần khởi động lại Expo. Không dùng localhost của điện thoại để trỏ về máy tính.

## Chức năng

Đăng nhập bằng email/mật khẩu; Google/Apple bật theo cấu hình backend. Xem [hướng dẫn xác thực](../../Backend/CUSTOMER-AUTH.md); Zalo hiện chưa khả dụng. Đã bỏ đăng nhập điện thoại/OTP và Face ID/vân tay.

Khám phá, yêu thích, lịch sử và thông báo có phân trang trước/sau, tổng kết quả và chọn 5/10/20 mục (mặc định 5). Đổi trang cuộn lên đầu danh sách; đổi số mục quay về trang 1. Bình luận và đánh giá phân trang riêng, 5 mục/trang. Sau xóa, trang vượt quá tổng số trang tự điều chỉnh về trang hợp lệ.

Khám phá món, tìm theo từ khóa và lọc nâng cao theo danh mục, độ khó, thời gian, nhiều nguyên liệu; sắp xếp theo độ mới, độ phổ biến, đánh giá, thời gian hoặc tên. Ứng dụng còn có xác minh email, quên/đặt lại mật khẩu bằng liên kết một lần, push notification qua Expo, chi tiết và đổi khẩu phần, đăng ký/đăng nhập, yêu thích, nấu từng bước kèm bộ đếm giờ, lịch sử nấu, đánh giá và bình luận/trả lời, thông báo đã đọc, sửa hồ sơ, đổi mật khẩu và đăng xuất. Khách chưa đăng nhập vẫn xem được món công khai. Token native lưu bằng SecureStore; bản web xem thử dùng sessionStorage.

Theo yêu cầu, không có màn hình đăng công thức hoặc cộng đồng. Giao diện kem/cam dựa trên ảnh tham chiếu; chưa đối chiếu được toàn bộ thiết kế từ link Stitch.

```powershell
npm run check
npm run web
npm run export:android
```

`npm run check` kiểm tra đồng thời phiên bản thư viện Expo và kiểu dữ liệu TypeScript.

`export:android` kiểm tra/đóng gói JavaScript, không tạo APK. Cần kiểm thử trên điện thoại thật cho bàn phím, vùng an toàn, kết nối LAN, lưu phiên native và nhận push nền qua Expo/EAS.
