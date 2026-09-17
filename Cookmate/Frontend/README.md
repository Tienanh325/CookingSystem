# Cookmate Frontend

Hai ứng dụng độc lập dùng chung Backend Express:

- `admin/`: React/Vite, web quản trị. [Hướng dẫn](admin/README.md).
- `mobile/`: Expo/React Native, khách hàng Android/iOS. [Hướng dẫn](mobile/README.md).

Cài dependency riêng bằng `npm ci` tại từng thư mục. Từ `Frontend`, dùng `npm run dev:admin`, `npm run dev:mobile`, `npm run build` hoặc `npm run lint`. Build/lint cấp này dành cho admin.

## Kiểm thử giao diện

Test dùng Edge headless, MySQL database tạm riêng và backend/Vite trên cổng kiểm thử. Cần cài dependency Backend/admin/mobile, có Microsoft Edge và tài khoản MySQL trong Backend/.env có quyền tạo/xóa database. Chạy từ thư mục gốc:

```powershell
$env:EXPO_PUBLIC_API_URL='/api'
npm run export:web --prefix Frontend/mobile -- --output-dir ../../.work/mobile-web
Remove-Item Env:EXPO_PUBLIC_API_URL
npm run test:ui --prefix Frontend
```

Test kiểm tra đăng nhập admin, dashboard, tạo/sửa công thức, các trang quản trị, đăng ký khách hàng, duyệt món, yêu thích, hoàn thành nấu, đánh giá/bình luận, lịch sử, thông báo, hồ sơ và đăng xuất. Database tạm được dọn sau kiểm thử; dữ liệu ứng dụng không bị dùng làm fixture. Ảnh chụp lưu tại `.work/previews`.

Bản web của Expo giúp kiểm tra luồng dùng chung; không thay thế nghiệm thu Android/iOS thật. Ba giao diện khách hàng được loại trừ là đăng công thức, cộng đồng, tìm kiếm nâng cao.