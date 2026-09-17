> **Cập nhật sau khắc phục — 17/09/2026:** Nội dung bên dưới là báo cáo lịch sử trước khi sửa, không phải trạng thái hiện tại. Các lỗi được xác nhận đã được xử lý: secret JWT và thu hồi phiên; quyền vai trò và quản trị viên cuối cùng; phiên bản bước/snapshot lịch sử; trạng thái nấu; kiểm tra ảnh; truy vấn món ẩn của admin; bình luận trả lời; tổng hợp đánh giá đồng thời; nhật ký và validation. Đã bổ sung migration, bootstrap ADMIN/USER và kiểm thử tích hợp.
>
> Kiểm chứng hiện tại: 10/10 test HTTP/MySQL đạt; kiểm thử giao diện admin và khách hàng qua trình duyệt đạt. Xem `tests/integration.test.js`, `../Frontend/tests/ui-smoke.cjs` và các README để chạy lại. Migration và bootstrap đã áp dụng trên database phát triển; dữ liệu test dùng database riêng. Chưa nghiệm thu native trên điện thoại thật. Các tính năng mở rộng như quên mật khẩu qua email, xác minh email và push notification chưa triển khai; chưa thể tuyên bố đầy đủ mọi nghiệp vụ khi chưa có đặc tả nghiệm thu.

---
# Rà soát backend Cookmate

Ngày kiểm tra: 17/09/2026.

## Kết luận

Backend đã có phần lớn nhóm API của một ứng dụng hướng dẫn nấu ăn, nhưng **chưa đầy đủ nghiệp vụ và chưa nên coi là hoàn thiện**. Có lỗi phân quyền, nguy cơ mất chi tiết lịch sử nấu khi sửa công thức, thiếu luồng quản trị món đã ẩn và một số quy tắc trạng thái chưa được kiểm soát.

Trong repository chưa có tài liệu yêu cầu nghiệp vụ để đối chiếu nghiệm thu. Báo cáo phân biệt lỗi trong chức năng hiện có với các chức năng cần xác nhận thêm về phạm vi sản phẩm.

## Phạm vi và bằng chứng kiểm tra

- Đọc toàn bộ routes, controllers, middleware, utils và các model liên quan. Có 56 khai báo route HTTP trong thư mục routes, bao gồm health và các đường dẫn thay thế của cùng nghiệp vụ.
- `node --check` thành công với 55 file JavaScript trong `Backend/src`.
- Kết nối MySQL thành công; kiểm tra metadata của 16 bảng. Không phát hiện cột model bị thiếu trong database hiện tại.
- Database hiện tại có khóa UNIQUE ghép cho đánh giá, chi tiết lịch sử và thứ tự bước nấu. Các model tương ứng chưa khai báo những khóa này.
- Database không có trigger. Khóa ngoại từ chi tiết lịch sử tới bước nấu dùng `ON DELETE CASCADE`.
- Chạy HTTP smoke test với app trên cổng tạm: health, danh sách món ăn, danh mục, nguyên liệu trả 200; người dùng, lịch sử nấu và thông báo trả 401 khi thiếu token.
- Dữ liệu món ăn/danh mục/nguyên liệu đang không có bản ghi hoạt động; vai trò và người dùng đều có 0 bản ghi. Vì vậy kiểm tra HTTP này chưa chứng minh được toàn bộ các luồng có dữ liệu.
- Chạy kiểm tra controller/middleware bằng dữ liệu mô phỏng để xác nhận lỗi trạng thái lịch sử, vai trò bị khóa, upload, bình luận nhiều cấp và truy vấn món đã ẩn.
- Chỉ đọc database; không tạo tài khoản, sửa/xóa dữ liệu hay thay đổi mã nguồn backend trong lần rà soát này.

## Các nhóm chức năng đã có

| Nhóm | Đã có trong mã nguồn | Khoảng trống chính |
| --- | --- | --- |
| Tài khoản | Đăng ký, đăng nhập JWT, xem/sửa hồ sơ, đổi mật khẩu | Chưa thu hồi phiên khi đổi mật khẩu; chưa có quên mật khẩu, đăng xuất phía server |
| Phân quyền | Xác thực người dùng; bảo vệ các API quản trị; kiểm tra chủ sở hữu lịch sử/bình luận/đánh giá | Chưa xét trạng thái vai trò; chưa bảo vệ admin cuối cùng |
| Món ăn | Danh sách, chi tiết, tìm kiếm; lọc danh mục, nguyên liệu, thời gian, độ khó; sắp xếp; tạo/sửa/ẩn | Admin chưa xem được danh sách/chi tiết món đã ẩn; sửa bước làm mất liên kết lịch sử |
| Công thức | Nguyên liệu và định lượng, bước nấu, thời gian, khẩu phần, hình ảnh | Chưa lưu phiên bản công thức cho lịch sử; validation chưa đầy đủ |
| Danh mục/nguyên liệu | Danh sách, chi tiết, tạo/sửa/ẩn | Chính sách dữ liệu đã ẩn chưa nhất quán giữa API công khai và quản trị |
| Yêu thích | Thêm, bỏ, xem danh sách và trạng thái | Danh sách chưa lọc món đã ẩn |
| Đánh giá | Tạo/cập nhật theo người dùng và món, xem danh sách, xóa; cập nhật điểm trung bình | Điểm tổng hợp chưa được bảo vệ khi có cập nhật đồng thời |
| Bình luận | Tạo, trả lời, sửa/xóa theo quyền; xem danh sách | Cho tạo trả lời nhiều tầng nhưng chỉ đọc một tầng |
| Lịch sử nấu | Bắt đầu, xem, đánh dấu bước, hoàn thành, hủy | Chưa kiểm soát chuyển trạng thái; thiếu transaction cho cập nhật nhiều bảng |
| Thông báo | Admin tạo cho người nhận hoặc toàn bộ người dùng; xem và đánh dấu đọc | Chưa có push notification; chưa có quản lý thông báo đã gửi cho admin |
| Upload | Upload ảnh có xác thực và giới hạn 5 MB | Tin vào MIME do client khai báo; giữ đuôi file không được kiểm tra |
| Nhật ký | Model và API admin đọc nhật ký | Không có luồng ghi nhật ký |

`src/models/CongThuc.js` đang rỗng và không được đăng ký. Tuy nhiên dữ liệu công thức hiện nằm trong MonAn, MonAnNguyenLieu và BuocNau; file rỗng này tự nó không chứng minh thiếu chức năng công thức.

## Lỗi và thiếu sót cần xử lý

### 1. Cao — JWT dùng khóa mặc định biết trước

Nguồn: `src/controllers/AuthController.js:18`, `src/middleware/authMiddleware.js:29`.

Cả ký và xác minh token đều fallback về chuỗi cố định trong source. Kiểm tra cấu hình hiện tại cũng xác nhận JWT_SECRET đang bằng giá trị mặc định này, không chỉ là một nhánh dự phòng chưa dùng. Khi có tài khoản trong database, người biết khóa có thể tự ký token cho ID tài khoản đó; middleware chỉ tải người dùng đang hoạt động theo ID.

Cần thay bằng secret ngẫu nhiên đủ mạnh, không có fallback cố định và dừng khởi động nếu thiếu cấu hình. Việc đổi secret sẽ vô hiệu hóa token cũ. Báo cáo không ghi lại giá trị secret.

### 2. Cao — Sửa các bước công thức xóa chi tiết lịch sử nấu

Nguồn: `src/controllers/MonAnController.js:348`, `src/models/index.js:288`.

Khi PATCH món ăn có `buocNaus`, controller xóa toàn bộ BuocNau của món rồi tạo lại, kể cả chỉ sửa nội dung một bước. Database thực tế có CASCADE từ BuocNau sang ChiTietLichSuNau, nên chi tiết tiến độ của những lần nấu tham chiếu bước cũ sẽ bị xóa. Bản ghi LichSuNau còn tồn tại nhưng mất chi tiết.

Cần giữ ID khi cập nhật bước và có chính sách cho bước đang được tham chiếu; tốt hơn là lưu phiên bản/snapshot công thức cho mỗi phiên nấu. Không nên sửa lỗi này bằng cách bỏ khóa ngoại.

### 3. Cao — Khóa vai trò chưa chặn quyền truy cập

Nguồn: `src/middleware/authMiddleware.js:28`, `src/controllers/VaiTroController.js:62`, `src/controllers/NguoiDungController.js:117`.

Middleware chỉ kiểm tra trạng thái người dùng, không kiểm tra `VaiTro.trangThai`; quyền admin lấy từ tên vai trò. Kiểm tra mô phỏng xác nhận vai trò ADMIN có trạng thái 0 vẫn qua xác thực và được đánh dấu admin. Ngoài ra admin có thể tự khóa/hạ quyền tài khoản quản trị cuối cùng, hoặc đổi tên vai trò quản trị khiến hệ thống mất đường quản trị.

Cần kiểm tra vai trò hoạt động, dùng mã quyền ổn định và bảo vệ admin cuối cùng trong transaction. Database hiện chưa có vai trò/người dùng, trong khi đăng ký chỉ tạo USER; repository chưa có seed/bootstrap để tạo admin đầu tiên.

### 4. Cao — Lịch sử nấu cho phép chuyển trạng thái không hợp lệ

Nguồn: `src/controllers/LichSuNauController.js:54`, `:204`, `:254`, `:307`.

Đã xác nhận bằng controller mô phỏng: cập nhật bước của phiên DA_HUY làm nó chuyển lại DANG_NAU; phiên HOAN_THANH vẫn hủy được. `finish` cũng không kiểm tra trạng thái đầu vào và đánh dấu tất cả bước hoàn thành. Các thao tác cập nhật chi tiết và trạng thái phiên không nằm trong cùng transaction.

Cần xác định các chuyển trạng thái hợp lệ, chặn sửa phiên kết thúc nếu không có thao tác mở lại rõ ràng; xử lý đồng thời trong transaction. Nếu cho hoàn thành nhanh mà chưa đánh dấu đủ bước, phải coi đó là quy tắc sản phẩm được xác nhận.

### 5. Cao — Upload không xác minh loại file thực tế

Nguồn: `src/middleware/uploadMiddleware.js:9`, `:16`; `src/app.js:15`.

Bộ lọc chỉ kiểm tra chuỗi MIME bắt đầu bằng `image/`, trong khi tên lưu giữ nguyên phần mở rộng từ tên gốc. Kiểm tra mô phỏng xác nhận file tên `.html` với MIME khai báo `image/png` được chấp nhận và giữ đuôi `.html`. File được phục vụ công khai tại `/uploads`. Header Helmet có thể giảm một số cách khai thác trên trình duyệt nhưng không thay thế kiểm tra nội dung file.

Cần danh sách loại ảnh cho phép, xác minh nội dung/giải mã ảnh, chọn đuôi lưu từ định dạng đã xác minh; cân nhắc xử lý riêng SVG. Cũng cần cơ chế dọn file không còn được tham chiếu.

### 6. Trung bình — Đổi mật khẩu không vô hiệu hóa token cũ

Nguồn: `src/controllers/AuthController.js:169`, `src/middleware/authMiddleware.js:28`, `src/routes/authRoutes.js`.

Đổi mật khẩu chỉ cập nhật hash. Token cũ vẫn hợp lệ tới khi hết hạn, mặc định 7 ngày; middleware không kiểm tra phiên hay thời điểm đổi mật khẩu. Không có endpoint thu hồi phiên/đăng xuất phía server.

Cần tokenVersion hoặc kho session/refresh token có khả năng thu hồi. Việc xóa token trên điện thoại không làm bản sao token bị lộ mất hiệu lực.

### 7. Trung bình — Thiếu luồng admin xem và khôi phục món đã ẩn

Nguồn: `src/controllers/MonAnController.js:112`, `:410`; `src/routes/monAnRoutes.js`.

Danh sách luôn dùng `trangThai: 1`, kể cả admin gửi `trangThai=0`; chi tiết cũng chỉ lấy món hoạt động. API PATCH có thể đặt trạng thái về 1 nếu biết ID, nhưng chưa có danh sách/chi tiết phục vụ việc tìm và khôi phục món ẩn. Đã xác nhận bộ lọc trạng thái bị bỏ qua bằng controller mô phỏng.

Cần API truy vấn riêng có quyền admin, hỗ trợ cả món ẩn; giữ API khách hàng chỉ trả nội dung được công bố. Ngược lại, danh sách danh mục/nguyên liệu đang cho khách chưa đăng nhập truyền `trangThai=0`. Cần thống nhất chính sách; danh sách yêu thích cũng chưa lọc món ẩn.

### 8. Trung bình — Trả lời bình luận có thể lưu được nhưng không đọc lại được qua danh sách

Nguồn: `src/controllers/BinhLuanController.js:22`, `:29`, `:78`.

API tạo cho phép trả lời một bình luận con; kiểm tra mô phỏng trả 201. API danh sách chỉ lấy bình luận gốc và một tầng `binhLuanCon`, nên tầng sâu hơn không được trả về. Xóa mềm bình luận gốc cũng làm các trả lời còn hoạt động biến mất khỏi danh sách.

Cần giới hạn một tầng khi tạo, hoặc hỗ trợ truy vấn/phân trang trả lời cho cấu trúc nhiều tầng; thống nhất cách hiển thị con khi cha bị xóa.

### 9. Trung bình — Điểm trung bình có nguy cơ sai khi cập nhật đồng thời

Nguồn: `src/controllers/DanhGiaController.js:8`, `:139`, `:164`.

Ghi/xóa đánh giá, tính AVG và ghi MonAn.diemDanhGia là các thao tác tách rời, không có transaction/khóa tuần tự. Một request có thể ghi kết quả AVG cũ sau request khác đã ghi kết quả mới, hoặc đánh giá đã lưu nhưng cập nhật điểm thất bại. Đây là rủi ro suy ra từ thứ tự thao tác; chưa chạy kiểm thử tải để tái hiện.

Cần bảo vệ toàn bộ cập nhật bằng cơ chế transaction/khóa phù hợp hoặc tính điểm từ nguồn dữ liệu đánh giá khi đọc.

### 10. Trung bình — Nhật ký hệ thống mới có phần đọc

Nguồn: `src/controllers/NhatKyHeThongController.js:19`; tìm kiếm toàn bộ `src`; metadata trigger MySQL.

Không có lời gọi tạo NhatKyHeThong, hook ghi log hay trigger database. Do đó các thao tác thêm/sửa/ẩn món, thay quyền và khóa tài khoản chưa tự ghi nhật ký.

Cần ghi người thực hiện, thao tác, đối tượng và thời gian cho các thay đổi quản trị; ghi trong transaction liên quan nếu yêu cầu nhật ký phải nhất quán với dữ liệu.

### 11. Trung bình — Kiểm tra dữ liệu đầu vào chưa đủ

Nguồn: `src/controllers/AuthController.js:54`, `src/models/NguoiDung.js:23`, `src/controllers/MonAnController.js:194`, `:257`, `:279`, `src/controllers/DanhGiaController.js:99`, `src/utils/query.js:1`.

Ví dụ: email chỉ được kiểm tra không rỗng; model cũng chấp nhận chuỗi không phải email khi chạy validate. `parseInt` chấp nhận tiền tố số như `5abc` hoặc cắt phần thập phân; độ khó/trạng thái chưa giới hạn tập giá trị; thời gian/định lượng âm bị đổi âm thầm về 0; mảng sai kiểu có thể bị bỏ qua. Tạo món chỉ yêu cầu tên và danh mục, có thể công bố món chưa có bước/nguyên liệu. Không kiểm tra trạng thái hoạt động của nguyên liệu trước khi gắn vào món.

Cần schema validation cho params/query/body, thống nhất lỗi 400, kiểm tra dữ liệu liên quan và quy tắc bắt buộc trước khi công bố công thức. Nếu hỗ trợ bản nháp thì cần trạng thái/phân quyền bản nháp rõ ràng.

### 12. Trung bình — Schema thực tế và khả năng tái tạo dự án chưa đồng bộ

Nguồn: `src/models/DanhGia.js:52`, `src/models/ChiTietLichSuNau.js:35`, `src/models/BuocNau.js:56`, `src/server.js`, `package.json`.

UNIQUE `(idNguoiDung,idMonAn)`, `(idLichSu,idBuocNau)` và `(idMonAn,soThuTu)` có trong MySQL hiện tại nhưng không được khai báo trong các model tương ứng. Chưa có migration/SQL schema/seed trong repository. Server chỉ authenticate kết nối, không tự tạo schema. Không thể bảo đảm cài đặt trên máy khác sẽ có cùng ràng buộc nghiệp vụ.

Cần migration phản ánh schema hiện tại, seed vai trò/admin qua cấu hình an toàn, `.env.example`, tài liệu API và hướng dẫn dựng database. Chưa có script test hay bộ kiểm thử nghiệp vụ trong package backend.

## Chức năng cần xác nhận thêm về phạm vi

Các mục dưới đây chưa thấy triển khai, nhưng cần đối chiếu đặc tả trước khi coi là yêu cầu bắt buộc:

- Quên/đặt lại mật khẩu, xác minh email, quản lý phiên và xóa tài khoản khách hàng.
- Push notification cho Expo: lưu token thiết bị, gửi push, xử lý token hết hiệu lực. Thông báo hiện tại chỉ được đọc qua API khi app gọi tới.
- Dashboard admin tổng hợp người dùng/món ăn/lượt nấu theo thời gian; hiện chỉ có thống kê từng món.
- Trang quản lý toàn bộ bình luận/đánh giá, báo cáo nội dung và quy trình kiểm duyệt. Admin hiện có quyền sửa/xóa qua ID và xem theo từng món, chưa có danh sách quản trị tổng hợp.
- Danh sách thông báo đã gửi, chi tiết người nhận, chỉnh sửa/hủy hoặc nháp. Hiện tạo thông báo với danh sách người nhận trống vẫn trả thành công; danh sách ID được chỉ định chưa được đối chiếu rõ ràng trước khi gửi.
- Điều kiện được đánh giá: có bắt buộc từng nấu món không? Có cho nhiều phiên nấu đồng thời cùng món không? Có tự mở lại phiên hoàn tất không?
- Gợi ý theo nguyên liệu: hiện tìm món chứa tất cả nguyên liệu chọn, không đồng nghĩa với món có thể nấu chỉ bằng số nguyên liệu đang có. Cần chốt ý nghĩa mong muốn.

## Thứ tự xử lý đề xuất

1. Secret JWT, vai trò bị khóa, an toàn upload và bảo vệ lịch sử khi sửa bước nấu.
2. Quy tắc trạng thái phiên nấu, luồng món ẩn của admin, quản lý token sau đổi mật khẩu.
3. Validation, bình luận, đồng bộ điểm đánh giá và nhật ký.
4. Migration/seed, tài liệu API và test tích hợp cho các luồng khách hàng/admin trên database kiểm thử riêng.
5. Chốt đặc tả cho các chức năng mở rộng trước khi bổ sung.

Kiểm tra cú pháp và các GET trên database trống không thay thế nghiệm thu đầu cuối. Chưa chạy các thao tác ghi trên database thật, kiểm thử đồng thời hay kiểm thử ứng dụng Expo với dữ liệu thực.
