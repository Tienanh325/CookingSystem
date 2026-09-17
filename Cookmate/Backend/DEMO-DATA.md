# Dữ liệu mẫu Cookmate

Đã nạp vào database phát triển ngày 17/09/2026. Giữ nguyên tài khoản admin hiện có. Tổng 244 bản ghi, trong đó thêm mới 241 bản ghi.

| Bảng | Số bản ghi |
| --- | ---: |
| VaiTro | 10 |
| NguoiDung | 11 |
| DanhMuc | 10 |
| MonAn | 10 |
| NguyenLieu | 24 |
| MonAnNguyenLieu | 39 |
| BuocNau | 30 |
| HinhAnhMonAn | 10 |
| YeuThich | 10 |
| DanhGia | 10 |
| BinhLuan | 10 |
| LichSuNau | 10 |
| ChiTietLichSuNau | 30 |
| ThongBao | 10 |
| ThongBaoNguoiDung | 10 |
| NhatKyHeThong | 10 |

Các món: cơm chiên trứng, canh bí đỏ đậu phụ, đậu phụ sốt cà chua, rau muống xào tỏi, khoai lang hấp, salad dưa chuột cà chua, cháo nấm cà rốt, mì xào nấm, bánh mì trứng áp chảo, sữa chua chuối yến mạch. Mỗi món có nguyên liệu định lượng, ba bước và ảnh minh họa cục bộ khác nhau. Ảnh là hình minh họa dữ liệu mẫu, không phải ảnh món ăn thật.

10 khách hàng dùng email `demo.customer01@cookmate.local` đến `demo.customer10@cookmate.local`. Mật khẩu riêng từng tài khoản được tạo ngẫu nhiên, băm trong database; xem file `.demo-credentials.local` ở thư mục Backend để đăng nhập. File này được gitignore. Mỗi khách có một món yêu thích, đánh giá, bình luận, lịch sử nấu và thông báo. Lịch sử bao gồm đang nấu, hoàn thành và đã hủy, ngày mẫu cố định 07–16/09/2026 để chạy lại không tạo phiên mới.

Vai trò thực tế vẫn là ADMIN và USER. Tám vai trò `DEMO_*` chỉ là dữ liệu dự phòng để đủ số lượng theo yêu cầu; đều vô hiệu hóa và không gán tài khoản. Chúng không đại diện cho quyền chức năng đã được triển khai. Nhật ký mang hành động `SEED_DEMO`, phản ánh việc script nạp dữ liệu, không giả lập thao tác của admin trên giao diện.

Từ thư mục gốc:

```powershell
npm run seed:demo --prefix Backend
npm run verify:demo --prefix Backend
```

Chạy bootstrap/migration trước nếu là database mới. Script bổ sung dữ liệu bằng transaction, không truncate/xóa dữ liệu; tìm theo khóa nghiệp vụ để tránh thêm trùng khi chạy lại. Không đặt lại mật khẩu hoặc nội dung công thức đã tồn tại. Tên món trùng với món ngoài bộ demo sẽ làm rollback để tránh trộn dữ liệu. Không chạy đồng thời nhiều tiến trình seed hay chỉnh sửa dữ liệu trong lúc seed.

“Không trùng” nghĩa là không lặp bản ghi/khóa nghiệp vụ; cùng nguyên liệu có thể dùng cho nhiều món và một món có nhiều bước. Các giá trị trạng thái hoặc số sao có thể giống nhau, đúng bản chất dữ liệu. `verify:demo` kiểm tra bộ dữ liệu demo hiện tại, không phải quy tắc cấm gửi lại cùng một thông báo/bình luận trong toàn bộ vòng đời sản phẩm.

Đã xác nhận: lần nạp thứ hai thêm 0 dòng ở cả 16 bảng; không khóa ngoại mồ côi; không khóa nghiệp vụ trùng; điểm trung bình đúng; chi tiết lịch sử khớp snapshot; ảnh tồn tại. Thông tin đếm này là tại thời điểm nạp, có thể thay đổi khi sử dụng app.
