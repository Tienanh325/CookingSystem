---
status: resolved
trigger: "Phía khách hàng hiển thị: Kết nối quá thời gian. Vui lòng thử lại."
created: 2026-09-29
updated: 2026-09-29
---

## Symptoms

- expected: Trang Khám phá tải được dữ liệu món ăn từ API.
- actual: Màn hình lỗi kết nối quá thời gian và nút Thử lại.
- errors: "Kết nối quá thời gian. Vui lòng thử lại."
- timeline: Đang xảy ra hiện tại.
- reproduction: Mở ứng dụng khách hàng và truy cập tab Khám phá.

## Current Focus

- hypothesis: IP LAN được cấu hình trong ứng dụng đã cũ sau khi đổi mạng.
- test: So sánh API tại IP cấu hình, localhost và IP LAN hiện tại; chạy Playwright trên tab Khám phá.
- expecting: IP cũ timeout, IP hiện tại trả 200 và giao diện tải danh sách sau khi tự sửa hostname.
- next_action: resolved
- reasoning_checkpoint: Giả thuyết được xác nhận bằng kiểm tra trực tiếp và E2E trình duyệt.
- tdd_checkpoint:

## Evidence

- timestamp: 2026-09-29T08:00:00+07:00
  observation: EXPO_PUBLIC_API_URL trỏ tới 172.20.10.4 trong khi IPv4 hiện tại là 172.20.10.3.
- timestamp: 2026-09-29T08:01:00+07:00
  observation: 172.20.10.4 timeout; localhost và 172.20.10.3 trả health/danh sách món với HTTP 200.
- timestamp: 2026-09-29T08:05:00+07:00
  observation: Playwright mở tab Khám phá, thấy tiêu đề và món ăn; không có timeout hay request thất bại.

## Eliminated

## Resolution

- root_cause: IP LAN trong cấu hình Expo bị cũ sau khi máy đổi từ 172.20.10.4 sang 172.20.10.3.
- fix: Bản web nội bộ thay hostname cũ bằng hostname đang mở; cấu hình native cục bộ được cập nhật sang IP hiện tại.
- verification: TypeScript check đạt, Expo web export đạt, E2E Playwright không có timeout và không có request thất bại.
- files_changed: Frontend/mobile/maNguon/dichVu/KetNoiApi.ts, Frontend/mobile/src/services/api.js, Frontend/mobile/README.md, Frontend/mobile/.env (local only)
