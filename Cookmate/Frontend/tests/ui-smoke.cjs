// Runs against a unique disposable MySQL database, never the configured app database.
// Prerequisite: export the Expo web preview with EXPO_PUBLIC_API_URL=/api to .work/mobile-web.
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'),
  backend = path.join(root, 'Backend'),
  adminDir = path.join(root, 'Frontend/admin');
const br = createRequire(path.join(backend, 'package.json')),
  ar = createRequire(path.join(adminDir, 'package.json'));
br('dotenv').config({ path: path.join(backend, '.env'), quiet: true });
const { chromium, expect } = ar('@playwright/test');
const dbName = `cookmate_ui_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
process.env.DB_NAME = dbName;
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
process.env.NODE_ENV = 'test';
let connection,
  sequelize,
  server,
  vite,
  browser,
  created = false,
  currentPage;
const out = path.join(root, '.work/previews');
fs.mkdirSync(out, { recursive: true });
async function main() {
  const web = path.join(root, '.work/mobile-web');
  assert.ok(fs.existsSync(path.join(web, 'index.html')), 'Export mobile web preview first');
  connection = await br('mysql2/promise').createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  assert.match(dbName, /^cookmate_ui_\d+_[a-f0-9]+$/);
  await connection.query(
    `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  created = true;
  sequelize = br('./src/config/database');
  const db = br('./src/models');
  await br('./scripts/migrate')();
  const role = await db.VaiTro.create({ tenVaiTro: 'ADMIN' });
  await db.VaiTro.create({ tenVaiTro: 'USER' });
  await db.NguoiDung.create({
    hoTen: 'Minh Anh',
    email: 'admin@ui.local',
    idVaiTro: role.idVaiTro,
    matKhau: await br('bcryptjs').hash('UiPassword123!', 12),
  });
  const express = br('express'),
    outer = express(),
    app = br('./src/app');
  const hopThuKiemThu = br('./src/services/guiEmail').hopThuKiemThu;
  outer.use((req, res, next) =>
    req.path.startsWith('/api') || req.path.startsWith('/uploads') ? app(req, res, next) : next(),
  );
  outer.use(express.static(web));
  outer.get('/{*splat}', (req, res) => res.sendFile(path.join(web, 'index.html')));
  server = outer.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, route, body, token) => {
    const r = await fetch(base + '/api' + route, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await r.json();
    assert.ok(r.ok, JSON.stringify(data));
    return data.data;
  };
  const auth = await call('POST', '/auth/login', {
    email: 'admin@ui.local',
    matKhau: 'UiPassword123!',
  });
  const category = await call(
    'POST',
    '/danh-muc',
    { tenDanhMuc: 'Bữa cơm nhà', moTa: 'Món ngon thân thuộc' },
    auth.token,
  );
  const ingredient = await call(
    'POST',
    '/nguyen-lieu',
    { tenNguyenLieu: 'Gạo', donViMacDinh: 'g' },
    auth.token,
  );
  const initial = await call(
    'POST',
    '/mon-an',
    {
      tenMonAn: 'Cơm gà gừng ấm áp',
      moTa: 'Bữa cơm giản dị, thơm hương gừng cho cả gia đình.',
      idDanhMuc: category.idDanhMuc,
      thoiGianNau: 25,
      khauPhan: 2,
      nguyenLieus: [{ idNguyenLieu: ingredient.idNguyenLieu, soLuong: 200, donVi: 'g' }],
      buocNaus: [
        { tieuDe: 'Chuẩn bị nguyên liệu', huongDan: 'Vo gạo và chuẩn bị nguyên liệu.' },
        {
          tieuDe: 'Nấu và thưởng thức',
          huongDan: 'Nấu chín, trình bày và dùng khi còn ấm.',
          thoiGian: 1,
        },
      ],
    },
    auth.token,
  );
  const port = Number(process.env.UI_ADMIN_PORT || 5187);
  vite = spawn(
    process.execPath,
    [
      path.join(adminDir, 'node_modules/vite/bin/vite.js'),
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    {
      cwd: adminDir,
      env: { ...process.env, NODE_ENV: 'development', COOKMATE_API_PROXY: base },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );
  let viteLog = '';
  vite.stdout.on('data', (d) => (viteLog += d));
  vite.stderr.on('data', (d) => (viteLog += d));
  const adminUrl = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (vite.exitCode !== null) throw new Error(viteLog);
    try {
      if ((await fetch(adminUrl)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  assert.ok(ready, viteLog);
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
    headless: true,
  });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  currentPage = page;
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(adminUrl + '/login');
  await expect(page.getByRole('heading', { name: 'Mừng bạn trở lại' })).toBeVisible();
  await page.screenshot({ path: path.join(out, 'admin-login.png'), fullPage: true });
  await page.getByLabel('Email', { exact: true }).fill('admin@ui.local');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('UiPassword123!');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Xin chào, Anh!' })).toBeVisible();
  await page.screenshot({ path: path.join(out, 'admin-dashboard.png'), fullPage: true });
  await page.getByRole('link', { name: 'Thêm công thức', exact: true }).click();
  await page.getByLabel('Tên món ăn *').fill('Cơm nhà kiểm thử');
  await page.getByLabel('Danh mục *').selectOption(String(category.idDanhMuc));
  await page.getByRole('button', { name: 'Thêm', exact: true }).click();
  await page
    .getByLabel('Nguyên liệu 1', { exact: true })
    .selectOption(String(ingredient.idNguyenLieu));
  await page.getByLabel('Số lượng 1', { exact: true }).fill('150');
  await page.getByLabel('Tiêu đề', { exact: true }).fill('Vo và nấu gạo');
  await page.getByLabel('Hướng dẫn *').fill('Vo sạch gạo, thêm nước và nấu chín.');
  await page.getByLabel('Trạng thái', { exact: true }).selectOption('1');
  await page.getByRole('button', { name: 'Lưu công thức' }).click();
  await expect(page.getByRole('heading', { name: 'Cơm nhà kiểm thử', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Cơm nhà kiểm thử', exact: true }).click();
  await expect(page.getByLabel('Tên món ăn *')).toHaveValue('Cơm nhà kiểm thử');
  await page.screenshot({ path: path.join(out, 'admin-recipe-editor.png'), fullPage: true });
  for (const [route, title] of [
    ['categories', 'Danh mục món ăn'],
    ['ingredients', 'Nguyên liệu'],
    ['users', 'Người dùng'],
    ['roles', 'Vai trò'],
    ['comments', 'Bình luận'],
    ['reviews', 'Đánh giá'],
    ['notifications', 'Thông báo'],
    ['logs', 'Nhật ký hoạt động'],
    ['settings', 'Cài đặt tài khoản'],
  ]) {
    await page.goto(adminUrl + '/' + route);
    await expect(page.getByRole('heading', { name: title, exact: true }).first()).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(adminUrl + '/register');
  await page.getByLabel('Họ và tên', { exact: true }).fill('Khách web');
  await page.getByLabel('Email', { exact: true }).fill('web@ui.local');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Customer123!');
  await page.getByLabel('Xác nhận mật khẩu').fill('Customer123!');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Đã tạo tài khoản khách hàng');
  console.log('Admin UI: login, dashboard, recipe create/edit, all modules, registration passed.');
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  currentPage = mobile;
  mobile.on('pageerror', (e) => errors.push(e.message));
  await mobile.goto(base);
  await expect(mobile.getByText('Hôm nay mình', { exact: false })).toBeVisible({ timeout: 30000 });
  await mobile.screenshot({ path: path.join(out, 'mobile-home.png'), fullPage: true });
  await mobile.getByRole('tab', { name: /Khám phá/ }).click();
  await mobile.getByLabel('Tìm món ăn', { exact: true }).fill('Cơm gà');
  await mobile.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await expect(
    mobile.getByRole('button', { name: 'Xem món Cơm gà gừng ấm áp', exact: true }),
  ).toBeVisible();
  await mobile.getByRole('button', { name: 'Bộ lọc tìm kiếm', exact: true }).click();
  await mobile.getByRole('radio', { name: 'Dễ', exact: true }).click();
  await mobile.getByRole('checkbox', { name: 'Gạo', exact: true }).click();
  await expect(
    mobile.getByRole('button', { name: 'Xem món Cơm gà gừng ấm áp', exact: true }),
  ).toBeVisible();
  await mobile.screenshot({ path: path.join(out, 'mobile-search.png'), fullPage: true });
  await mobile.getByRole('tab', { name: /Bếp nhà/ }).click();
  await mobile.getByRole('button', { name: 'Xem món Cơm gà gừng ấm áp', exact: true }).click();
  await expect(mobile.getByText('Nguyên liệu chuẩn bị', { exact: true })).toBeVisible();
  await mobile.getByRole('button', { name: 'Lưu yêu thích', exact: true }).click();
  await expect(mobile.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await mobile.getByRole('button', { name: 'Đăng ký miễn phí', exact: true }).click();
  await mobile.getByLabel('Họ và tên', { exact: true }).fill('Bạn yêu bếp');
  await mobile.getByLabel('Email', { exact: true }).fill('mobile@ui.local');
  await mobile.getByLabel('Mật khẩu', { exact: true }).fill('Customer123!');
  await mobile.getByLabel('Xác nhận mật khẩu', { exact: true }).fill('Customer123!');
  await mobile.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await expect(mobile.getByText('Xác minh email', { exact: true }).first()).toBeVisible();
  const thuXacMinh = hopThuKiemThu.findLast(
    (item) => item.den === 'mobile@ui.local' && item.loai === 'EMAIL_VERIFY',
  );
  assert.ok(thuXacMinh?.token);
  await call('POST', '/auth/verify-email', { token: thuXacMinh.token });
  await mobile
    .getByRole('button', { name: 'Tôi đã xác minh, đăng nhập', exact: true })
    .click();
  await mobile.getByLabel('Email', { exact: true }).fill('mobile@ui.local');
  await mobile.getByLabel('Mật khẩu', { exact: true }).fill('Customer123!');
  await mobile.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(mobile.getByText('Hôm nay mình', { exact: false })).toBeVisible();
  await mobile.getByRole('button', { name: 'Xem món Cơm gà gừng ấm áp', exact: true }).click();
  await mobile.getByRole('button', { name: 'Lưu yêu thích', exact: true }).click();
  await expect(mobile.getByRole('button', { name: 'Bỏ yêu thích', exact: true })).toBeVisible();
  await mobile.screenshot({ path: path.join(out, 'mobile-detail.png'), fullPage: true });
  await mobile.getByRole('button', { name: 'Bắt đầu nấu món này', exact: true }).click();
  await expect(mobile.getByText('CHẾ ĐỘ NẤU ĂN', { exact: true })).toBeVisible();
  await mobile.getByRole('button', { name: 'Xong bước này, tiếp tục', exact: true }).click();
  await expect(
    mobile.getByRole('button', { name: 'Hoàn thành món ăn', exact: true }),
  ).toBeVisible();
  await mobile.screenshot({ path: path.join(out, 'mobile-cooking.png'), fullPage: true });
  await mobile.getByRole('button', { name: 'Hoàn thành món ăn', exact: true }).click();
  await expect(mobile.getByText('Bạn đã làm được rồi!', { exact: true })).toBeVisible();
  await mobile.getByRole('button', { name: 'Xem lại công thức', exact: true }).click();
  await mobile
    .getByRole('textbox', { name: 'Nội dung đánh giá', exact: true })
    .fill('Dễ nấu và ngon!');
  await mobile.getByRole('button', { name: 'Gửi / cập nhật đánh giá', exact: true }).click();
  await expect(mobile.getByText('Cảm ơn bạn đã chia sẻ đánh giá!', { exact: true })).toBeVisible();
  await mobile
    .getByRole('textbox', { name: 'Viết bình luận', exact: true })
    .fill('Cảm ơn công thức nhé');
  await mobile.getByRole('button', { name: 'Gửi bình luận', exact: true }).click();
  await expect(mobile.getByText('Đã lưu bình luận.', { exact: true })).toBeVisible();
  await mobile.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await mobile.getByRole('tab', { name: /Yêu thích/ }).click();
  await expect(
    mobile.getByRole('button', { name: 'Xem món Cơm gà gừng ấm áp', exact: true }),
  ).toBeVisible();
  await mobile.getByRole('tab', { name: /Lịch sử/ }).click();
  await expect(mobile.getByText('Đã hoàn thành', { exact: true })).toBeVisible();
  await call(
    'POST',
    '/thong-bao',
    { tieuDe: 'Hôm nay cùng vào bếp', noiDung: 'Một lời chào từ Cookmate.', guiTatCa: true },
    auth.token,
  );
  await mobile.getByRole('button', { name: 'Thông báo', exact: true }).click();
  await expect(mobile.getByText('Hôm nay cùng vào bếp', { exact: true })).toBeVisible();
  await mobile.getByRole('button', { name: 'Đánh dấu tất cả đã đọc', exact: true }).click();
  await expect(mobile.getByText(/· Đã đọc/)).toBeVisible();
  await mobile.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await mobile.getByRole('tab', { name: /Cá nhân/ }).click();
  await expect(mobile.getByText('Bạn yêu bếp', { exact: true })).toBeVisible();
  await mobile.getByRole('button', { name: 'Thông tin cá nhân', exact: true }).click();
  await mobile.getByLabel('Họ và tên', { exact: true }).fill('Người yêu bếp');
  await mobile.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(mobile.getByText('Người yêu bếp', { exact: true })).toBeVisible();
  await mobile.getByRole('button', { name: 'Đăng xuất khỏi các thiết bị', exact: true }).click();
  await expect(mobile.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
  const cooked = await db.LichSuNau.count({
    where: { idMonAn: initial.idMonAn, trangThai: 'HOAN_THANH' },
  });
  assert.equal(cooked, 1);
  await mobile.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(mobile.getByLabel('Email', { exact: true })).toBeVisible();
  await expect(mobile.getByRole('tab', { name: 'Điện thoại / OTP', exact: true })).toHaveCount(0);
  await expect(mobile.getByText(/Face ID|Vân tay|Nhận mã OTP/)).toHaveCount(0);
  assert.deepEqual(errors, []);
  console.log(
    'Mobile web UI: guest browsing, registration, favorite, cooking, review/comment, history, notifications, profile and logout passed.',
  );
  console.log('Screenshots: .work/previews (native device testing still required).');
}
main()
  .catch(async (e) => {
    console.error(e);
    if (currentPage) {
      console.error((await currentPage.locator('body').innerText()).slice(-8000));
      console.error(
        await currentPage
          .locator('textarea')
          .evaluateAll((nodes) =>
            nodes.map((n) => ({
              label: n.getAttribute('aria-label'),
              rect: JSON.stringify(n.getBoundingClientRect()),
              ancestors: [
                n,
                n.parentElement,
                n.parentElement.parentElement,
                n.parentElement.parentElement.parentElement,
              ].map((a) => ({
                tag: a.tagName,
                display: getComputedStyle(a).display,
                visibility: getComputedStyle(a).visibility,
                height: getComputedStyle(a).height,
              })),
            })),
          ),
      );
      await currentPage
        .screenshot({ path: path.join(out, 'failure.png'), fullPage: true })
        .catch(() => {});
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (vite) vite.kill();
    if (server) {
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
    }
    if (sequelize) await sequelize.close();
    if (connection) {
      if (created && /^cookmate_ui_\d+_[a-f0-9]+$/.test(dbName))
        await connection.query(`DROP DATABASE \`${dbName}\``);
      await connection.end();
    }
  });
