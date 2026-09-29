const { after, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');

const bienMoiTruongBanDau = { ...process.env };
const { damBaoEmailSanSang, guiEmail } = require('../src/services/guiEmail');

beforeEach(() => {
  process.env.NODE_ENV = 'development';
  delete process.env.EMAIL_DEV_PREVIEW;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASSWORD;
});

after(() => {
  process.env = bienMoiTruongBanDau;
});

test('từ chối gửi thật khi thiếu cấu hình SMTP', async () => {
  await assert.rejects(damBaoEmailSanSang(), (error) => {
    assert.equal(error.statusCode, 503);
    assert.equal(error.expose, true);
    assert.equal(error.code, 'EMAIL_SERVICE_UNAVAILABLE');
    return true;
  });
});

test('chỉ dùng bản xem trước terminal khi được bật rõ ràng', async () => {
  process.env.EMAIL_DEV_PREVIEW = 'true';
  const ketQua = await guiEmail({
    den: 'user@example.com',
    tieuDe: 'Kiểm thử',
    vanBan: 'Liên kết kiểm thử',
    html: '<p>Liên kết kiểm thử</p>',
  });
  assert.equal(ketQua.development, true);
});
