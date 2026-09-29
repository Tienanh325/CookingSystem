---
status: resolved
trigger: "Ứng dụng lỗi bằng stack Hermes ngay sau khi mở bundle iOS trong Expo Go."
created: 2026-09-29
updated: 2026-09-29
---

## Symptoms

- expected: Quét QR Expo Go và mở được ứng dụng khách hàng.
- actual: Expo Go hiển thị màn hình lỗi với stack `metroRequire` trên bundle iOS Hermes.
- errors: Phần stack được cung cấp không có dòng thông báo đầu tiên.
- timeline: Xảy ra sau khi tunnel và QR Expo Go hoạt động.
- reproduction: Chạy `npm run start:go`, quét QR bằng iPhone và mở bundle trong Expo Go.

## Current Focus

- hypothesis: Import tĩnh `expo-speech-recognition` yêu cầu native module không được đóng gói trong Expo Go.
- test: Đối chiếu hook ứng dụng với mã thư viện và tạo native hook dùng optional native module.
- expecting: Expo Go không còn lỗi lúc nạp bundle; development build vẫn nhận module giọng nói.
- next_action: resolved
- reasoning_checkpoint: Bundle iOS dùng optional native module, không còn import tĩnh thư viện giọng nói.
- tdd_checkpoint: not_applicable

## Evidence

- timestamp: 2026-09-29T08:30:00+07:00
  observation: useTimKiemGiongNoi import tĩnh ExpoSpeechRecognitionModule và useSpeechRecognitionEvent.
- timestamp: 2026-09-29T08:31:00+07:00
  observation: ExpoSpeechRecognitionModule.ts của thư viện gọi requireNativeModule("ExpoSpeechRecognition") ngay khi import.
- timestamp: 2026-09-29T08:32:00+07:00
  observation: README của thư viện yêu cầu development build cho dự án Expo.

## Eliminated

- hypothesis: Tunnel hoặc Metro không chuyển được bundle tới điện thoại.
  reason: Điện thoại đã tải và chạy bundle đến giai đoạn Hermes module loading.

## Resolution

- root_cause: Hook tìm kiếm giọng nói import tĩnh thư viện gọi requireNativeModule ngay khi ứng dụng nạp; Expo Go không đóng gói ExpoSpeechRecognition.
- fix: Thêm native hook dùng requireOptionalNativeModule và fallback rõ ràng khi chạy trong Expo Go; giữ implementation web hiện có.
- verification: Expo dependency check và TypeScript đạt; bundle iOS 5.7 MB có optional module/fallback và không còn import tĩnh expo-speech-recognition.
- files_changed: Frontend/mobile/maNguon/moc/useTimKiemGiongNoi.native.ts, Frontend/mobile/README.md
