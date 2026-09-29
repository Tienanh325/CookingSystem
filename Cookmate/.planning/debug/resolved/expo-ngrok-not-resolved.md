---
status: resolved
trigger: "Expo báo Installed @expo/ngrok nhưng tiếp tục báo Install @expo/ngrok and try again."
created: 2026-09-29
updated: 2026-09-29
---

## Symptoms

- expected: `expo start --go --tunnel` tạo tunnel và QR cho Expo Go.
- actual: Expo cài ngrok global xong vẫn báo không tìm thấy package.
- errors: `CommandError: Install @expo/ngrok@^4.1.0 and try again`.
- timeline: Xảy ra khi chuyển từ QR development build sang Expo Go tunnel.
- reproduction: Chạy Expo với tùy chọn `--tunnel`, đồng ý cài `@expo/ngrok` global.

## Current Focus

- hypothesis: Expo trên Windows dò sai thư mục npm global nên không resolve được package vừa cài.
- test: So sánh npm global root với kết quả `@expo/require-utils.resolveGlobal`, sau đó cài package cục bộ.
- expecting: Global package tồn tại nhưng resolveGlobal thất bại; local package được nhận diện.
- next_action: resolved
- reasoning_checkpoint: Package cục bộ được Expo resolve và tunnel đã kết nối thành công.
- tdd_checkpoint: not_applicable

## Evidence

- timestamp: 2026-09-29T08:15:00+07:00
  observation: npm liệt kê @expo/ngrok@4.1.3 tại AppData/Roaming/npm/node_modules.
- timestamp: 2026-09-29T08:16:00+07:00
  observation: @expo/require-utils.resolveGlobal không tìm thấy package vì danh sách dò npm prefix thêm thư mục lib trên Windows.

## Eliminated

- hypothesis: Package global chưa được cài.
  reason: npm list --global xác nhận @expo/ngrok@4.1.3 đã tồn tại.

## Resolution

- root_cause: Expo CLI trên Windows dò npm global prefix dưới thư mục `lib`, trong khi npm đặt package tại `AppData/Roaming/npm/node_modules`.
- fix: Thêm `@expo/ngrok@^4.1.3` vào devDependencies và lệnh `npm run start:go` dùng Expo Go qua tunnel.
- verification: Expo in đường dẫn local package, sau đó báo `Tunnel connected`, `Tunnel ready` và tạo QR `exp://...exp.direct` cho Expo Go.
- files_changed: Frontend/mobile/package.json, Frontend/mobile/package-lock.json, Frontend/mobile/README.md
