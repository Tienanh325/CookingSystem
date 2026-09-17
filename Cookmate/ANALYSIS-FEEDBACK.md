# Nhận xét phân tích Cookmate — 17/09/2026

## Phạm vi đã đọc

Đã đọc hai file TXT đính kèm: phần BƯỚC 05.3/DDL và phần trao đổi về UML UC06/ngữ cảnh dự án. File thứ nhất bị cắt giữa câu SQL tạo bảng DanhGia; file thứ hai có các đoạn chỉ còn chữ `svg`, tên bốn tài liệu và đường dẫn hội thoại cũ, không có đầy đủ nội dung các tài liệu đó. Vì vậy nhận xét dưới đây dựa trên phần văn bản thực sự có trong hai file và code/database hiện tại; không coi các sơ đồ hay cuộc hội thoại được nhắc tới là đã đọc đầy đủ.

## Đánh giá chung

Hướng phân tích phù hợp với một ứng dụng hướng dẫn nấu ăn: lấy món ăn làm trung tâm, tách nguyên liệu, bước, tương tác và lịch sử. Cách yêu cầu đối chiếu INFORMATION_SCHEMA trước khi viết model là đúng: tên bảng không đủ để suy ra kiểu dữ liệu, khóa và chính sách xóa.

Không cần tạo thêm bảng CongThuc chỉ để đổi tên. Hiện công thức là MonAn + MonAnNguyenLieu + BuocNau; chỉ cần mô hình riêng khi yêu cầu nhiều công thức độc lập cho cùng một món hoặc tác giả/phiên bản có vòng đời riêng. Việc có đủ 16 bảng và đủ dữ liệu không chứng minh đã đủ nghiệp vụ.

## Các điểm cần sửa hoặc bổ sung

| Nội dung trong phân tích cũ | Nhận xét đối chiếu hiện tại |
| --- | --- |
| Gọi danh sách là 16 bảng | Danh sách và cây file hiển thị trong TXT chỉ có 15, thiếu ThongBao. Database và models hiện có đủ 16. |
| ChiTietLichSuNau nối tới MonAn | Khóa trực tiếp là idBuocNau → BuocNau; LichSuNau mới có idMonAn. Mỗi chi tiết theo dõi một bước của phiên nấu. |
| Người dùng → ThongBaoNguoiDung | Cần thể hiện thêm ThongBao → ThongBaoNguoiDung. Nội dung thông báo lưu một lần; trạng thái đọc theo từng người nhận. |
| Khai báo hasMany/belongsTo/hasOne | Chọn theo lực lượng quan hệ; không cần hasOne chỉ để đủ bộ. Nhiều-nhiều dùng belongsToMany qua các bảng nối; code hiện đã có. |
| UNIQUE bước theo món và số thứ tự | Đã thay bằng (idMonAn, phienBan, soThuTu), để sửa công thức không phá lịch sử cũ. DDL gốc cần cập nhật theo migration. |
| Phân quyền người dùng | Hiện một người thuộc một VaiTro; API phân biệt admin và người dùng thường. Chưa có quyền hành động chi tiết, bảng Quyen/VaiTroQuyen hoặc gán nhiều vai trò cho một người. |
| Thêm/xóa tài khoản trong UC06 | API quản trị hiện có xem và PATCH hồ sơ/vai trò/trạng thái. Đăng ký là tạo khách hàng; chưa có endpoint admin thêm tài khoản trực tiếp hoặc xóa cứng người dùng. Chốt lại UC theo yêu cầu thật. |
| Thống kê người dùng, công thức, lượt xem, yêu thích, đánh giá | Dashboard đã có số người dùng, món, danh mục, món ẩn và lượt nấu. Chưa có đủ các chỉ số lượt xem/yêu thích/đánh giá theo mô tả UC06.4. |
| User Web và Mobile là hai bước bắt buộc | Phạm vi hiện tại đã đổi thành admin web + khách hàng Expo React Native. Expo web dùng xem thử/kiểm thử; chưa phải một sản phẩm web khách hàng độc lập. |
| Có Services trong roadmap | Phần lớn nghiệp vụ hiện nằm ở controllers và utils. Có thể tách service transaction khi tái sử dụng hoặc controller khó bảo trì; đây là cải thiện cấu trúc, không tự nó là một chức năng còn thiếu. |

Các cột tokenVersion, phienBan và congThucSnapshot đã được bổ sung sau DDL cũ. ERD/từ điển dữ liệu nên phản ánh schema đang chạy. Việc xóa vật lý bước hoặc món bằng SQL vẫn phải cân nhắc cascade; quy trình API hiện giữ phiên bản bước và ẩn món thay vì xóa để bảo toàn lịch sử.

## UML: sửa theo hành vi, không theo cây chức năng

Nhận định “không nối toàn bộ các nhánh quản lý bằng include” là đúng. Nhưng “tùy chọn nên dùng extend” vẫn chưa đủ: extend mô tả hành vi bổ sung tại điểm mở rộng của use case cơ sở; use case cơ sở có ý nghĩa độc lập. Include có hướng từ use case gọi sang use case được đưa vào; extend có hướng từ use case mở rộng về cơ sở. Đối chiếu [OMG về Include](https://issues.omg.org/issues/UML25-421) và [OMG về ký hiệu Extend](https://issues.omg.org/issues/UML25-428).

Khuyến nghị cho UC06:

- Dùng khung/nhóm “Quản trị hệ thống”; nối actor Admin trực tiếp với các mục tiêu: xem danh sách, sửa tài khoản, gán vai trò, khóa/mở khóa, xem thống kê.
- Không bắt buộc vẽ include từ “Quản lý người dùng” tới “Xem danh sách”; đây có thể chỉ là điều hướng giao diện, không phải hành vi dùng chung bắt buộc của mọi luồng.
- Khóa/mở khóa có thể là use case độc lập. Nếu dùng extend với “Xem chi tiết tài khoản”, phải ghi rõ điểm mở rộng và điều kiện trạng thái; tránh lặp chức năng này cả trong UC06.1 và UC06.3.
- Đăng nhập thường là tiền điều kiện của thao tác đã xác thực, không cần include Đăng nhập vào mọi use case.
- Nhập thông tin, bấm lưu, thêm dòng nguyên liệu thường phù hợp làm bước trong đặc tả luồng hơn là mỗi thao tác một use case.
- Vì hiện hỗ trợ lưu nháp, không đúng nếu nói mọi lần “Thêm công thức” đều bắt buộc có bước và nguyên liệu. Quy tắc đó áp dụng lúc xuất bản; nháp có thể chưa đầy đủ.

## Nghiệp vụ nên chốt trong báo cáo đồ án

1. **Tài khoản:** khách xem món không cần đăng nhập; đăng ký mặc định USER; vai trò/tài khoản bị khóa không truy cập được; không vô hiệu hóa quản trị viên cuối cùng.
2. **Công thức:** admin quản lý; xuất bản cần nguyên liệu và bước hợp lệ; số lượng dương; thời gian tính bằng phút; tổng thời gian bằng chuẩn bị cộng nấu; ẩn món không phá lịch sử đã có.
3. **Phiên nấu:** DANG_NAU → HOAN_THANH hoặc DA_HUY; hoàn thành chỉ khi đủ bước; phiên kết thúc không sửa; snapshot giữ công thức ở thời điểm bắt đầu. Chốt riêng việc cho phép nhiều phiên đang nấu cùng món/người, hiện chưa giới hạn.
4. **Tương tác:** một yêu thích và một đánh giá/người/món; điểm tổng hợp từ đánh giá còn hiển thị; bình luận tối đa một cấp trả lời; nêu rõ quyền sửa/xóa của chủ sở hữu và admin.
5. **Thông báo/nhật ký:** trạng thái đọc thuộc người nhận; nhật ký ghi hành động thật; thông báo hiện trong app, chưa có push/email.
6. **Phạm vi loại trừ:** đăng công thức từ khách, cộng đồng, tìm kiếm nâng cao; không đưa lại vào yêu cầu nghiệm thu của phiên bản đang xây dựng.

Nên lập ma trận `UC → tác nhân → tiền điều kiện → API → màn hình → trường hợp kiểm thử`. Ưu tiên chốt UC06 và các chỉ số thống kê, rồi cập nhật ERD/DDL và đặc tả trạng thái. Sau đó mới mở rộng chức năng; không thêm bảng hoặc màn hình chỉ để khớp một roadmap cũ.

## Về yêu cầu 10 bản ghi mỗi bảng

Đã đáp ứng bằng bộ dữ liệu phát triển; xem [bảng đếm và cách chạy](Backend/DEMO-DATA.md). Riêng vai trò, ứng dụng chưa cần 10 vai trò hoạt động: tám vai trò DEMO dự phòng đều bị vô hiệu hóa và không gán cho ai. Không nên lấy yêu cầu số lượng dữ liệu mẫu làm lý do mở rộng mô hình phân quyền trong sản phẩm thật.
