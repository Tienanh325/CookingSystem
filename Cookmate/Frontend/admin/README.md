# Web quản trị Cookmate

React + Vite. Chạy trong thư mục này:

```powershell
npm ci
npm run dev
npm run lint
npm run build
```

Vite proxy `/api` và `/uploads` tới `http://localhost:8080`; có thể đổi bằng `COOKMATE_API_PROXY` khi chạy Vite. `VITE_API_URL` mặc định `/api`. Production cần cấu hình reverse proxy cho cả API và ảnh hoặc đặt URL API trước khi build. Kết quả build nằm trong `build/`.

Đăng nhập bằng tài khoản bootstrap trong `Backend/.admin-credentials.local`, hoặc tài khoản ADMIN đã có. Trang đăng ký tạo tài khoản khách hàng, không tự cấp quyền quản trị.

Các màn hình kết nối dữ liệu thật: tổng quan; danh sách/tạo/sửa/ẩn/khôi phục công thức; danh mục; nguyên liệu; người dùng; vai trò; kiểm duyệt đánh giá/bình luận; gửi thông báo; nhật ký; hồ sơ và đổi mật khẩu. Tạo danh mục và nguyên liệu trước khi xuất bản công thức.

Phiên lưu trong sessionStorage. Đổi mật khẩu hoặc đăng xuất thu hồi token trên backend. Mọi quyền vẫn được kiểm tra tại API.

Danh sách có phân trang theo số trang, trước/sau, tổng kết quả và chọn 5/10/20/50 mục mỗi trang (mặc định 10). Tìm kiếm, lọc hoặc đổi số mục quay về trang 1; nếu trang cuối không còn dữ liệu sau thao tác xóa, tự chuyển về trang hợp lệ. Thanh phân trang vẫn hiển thị khi chỉ có một trang.
