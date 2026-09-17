const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const dbName = `cookmate_test_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
process.env.DB_NAME = dbName;
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
process.env.NODE_ENV = 'test';
let connection,
  sequelize,
  db,
  server,
  base,
  admin,
  user,
  other,
  recipe,
  category,
  ingredient,
  adminRole,
  userRole,
  created = false;
async function request(method, route, body, token) {
  const response = await fetch(base + route, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, ...(await response.json()) };
}
async function login(email, password = 'Password123!') {
  const r = await request('POST', '/auth/login', { email, matKhau: password });
  assert.equal(r.status, 200, JSON.stringify(r));
  return r.data.token;
}
before(async () => {
  connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  assert.match(dbName, /^cookmate_test_\d+_[a-f0-9]+$/);
  await connection.query(
    `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  created = true;
  sequelize = require('../src/config/database');
  db = require('../src/models');
  await require('../scripts/migrate')();
  adminRole = await db.VaiTro.create({ tenVaiTro: 'ADMIN' });
  userRole = await db.VaiTro.create({ tenVaiTro: 'USER' });
  await db.NguoiDung.create({
    idVaiTro: adminRole.idVaiTro,
    hoTen: 'Admin',
    email: 'admin@test.local',
    matKhau: await bcrypt.hash('Password123!', 12),
  });
  const app = require('../src/app');
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
  admin = await login('admin@test.local');
  for (const email of ['user@test.local', 'other@test.local']) {
    const r = await request('POST', '/auth/register', {
      hoTen: 'Test User',
      email,
      matKhau: 'Password123!',
    });
    assert.equal(r.status, 201);
    if (email.startsWith('user')) user = r.data.token;
    else other = r.data.token;
  }
});
after(async () => {
  await require('fs/promises')
    .unlink(path.join(__dirname, '../.otp-test-preview.local'))
    .catch(() => {});
  if (server) await new Promise((r) => server.close(r));
  if (sequelize) await sequelize.close();
  if (connection) {
    if (created && /^cookmate_test_\d+_[a-f0-9]+$/.test(dbName))
      await connection.query(`DROP DATABASE \`${dbName}\``);
    await connection.end();
  }
});

test('phone OTP: validation, cooldown, one-time use, no profile-phone takeover', async () => {
  process.env.OTP_DELIVERY = 'local';
  const phone = '0912345678';
  const oldUser = await db.NguoiDung.findOne({ where: { email: 'user@test.local' } });
  await oldUser.update({ soDienThoai: phone });
  assert.equal((await request('POST', '/auth/otp/request', { phone: 'invalid' })).status, 400);
  const start = await request('POST', '/auth/otp/request', { phone, name: 'OTP Customer' });
  assert.equal(start.status, 200);
  assert.equal(start.data.code, undefined);
  assert.equal((await request('POST', '/auth/otp/request', { phone })).status, 429);
  const preview = JSON.parse(
    await require('fs/promises').readFile(
      path.join(__dirname, '../.otp-test-preview.local'),
      'utf8',
    ),
  );
  const result = await request('POST', '/auth/otp/verify', {
    challengeId: start.data.challengeId,
    code: preview.code,
  });
  assert.equal(result.status, 200);
  assert.notEqual(result.data.user.idNguoiDung, oldUser.idNguoiDung);
  assert.equal(result.data.user.email, null);
  assert.equal(result.data.user.hasPassword, false);
  assert.equal(result.data.user.vaiTro.tenVaiTro, 'USER');
  assert.equal(result.data.user.soDienThoai, '+84912345678');
  assert.equal((await request('GET', '/auth/me', undefined, result.data.token)).status, 200);
  assert.equal(
    (
      await request('POST', '/auth/otp/verify', {
        challengeId: start.data.challengeId,
        code: preview.code,
      })
    ).status,
    400,
  );
  await oldUser.update({ soDienThoai: null });
});

test('OTP rejects five wrong attempts, expiration, blocked users and production local mode', async () => {
  const service = require('../src/services/customerAuth');
  async function begin(phone) {
    const start = await service.requestOtp(phone);
    const preview = JSON.parse(
      await require('fs/promises').readFile(
        path.join(__dirname, '../.otp-test-preview.local'),
        'utf8',
      ),
    );
    return { ...start, code: preview.code };
  }
  const a = await begin('0912345679');
  for (let i = 0; i < 5; i++) await assert.rejects(service.verifyOtp(a.challengeId, '000000'));
  await assert.rejects(service.verifyOtp(a.challengeId, a.code));
  assert.equal((await db.AuthChallenge.findByPk(a.challengeId)).attempts, 5);
  const b = await begin('0912345680');
  await db.AuthChallenge.update(
    { expiresAt: new Date(Date.now() - 1000) },
    { where: { id: b.challengeId } },
  );
  await assert.rejects(service.verifyOtp(b.challengeId, b.code));
  const c = await begin('0912345681');
  const first = await service.verifyOtp(c.challengeId, c.code);
  await db.NguoiDung.update({ trangThai: 0 }, { where: { idNguoiDung: first.user.idNguoiDung } });
  await db.AuthChallenge.update(
    { createdAt: new Date(Date.now() - 61000) },
    { where: { id: c.challengeId } },
  );
  const again = await begin('0912345681');
  await assert.rejects(service.verifyOtp(again.challengeId, again.code), /khóa/);
  process.env.NODE_ENV = 'production';
  try {
    assert.equal(service.capabilities().localOtp, false);
    await assert.rejects(service.verifyOtp(again.challengeId, again.code));
  } finally {
    process.env.NODE_ENV = 'test';
  }
});

test('OAuth validates state, redirect, signed identity, proof key and one-time ticket', async () => {
  const service = require('../src/services/customerAuth');
  process.env.AUTH_PUBLIC_URL = 'https://cookmate.example';
  process.env.GOOGLE_CLIENT_ID = 'test-client';
  process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
  process.env.AUTH_REDIRECT_URIS = 'cookmate://auth';
  const verifier = crypto.randomBytes(32).toString('hex');
  const challenge = crypto.createHash('sha256').update(verifier).digest('hex');
  await assert.rejects(service.startOAuth('google', 'https://attacker.example', challenge));
  await assert.rejects(service.oauthCallback('google', crypto.randomUUID(), 'bad-code'));
  const start = await service.startOAuth('google', 'cookmate://auth', challenge);
  const state = await db.AuthChallenge.findByPk(start.state);
  const { generateKeyPair, exportJWK, SignJWT } = await import('jose');
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
  const identity = await new SignJWT({
    sub: 'google-user-123',
    nonce: state.payload.nonce,
    email: 'oauth@test.local',
    email_verified: true,
    name: 'Google Customer',
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer('https://accounts.google.com')
    .setAudience('test-client')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    if (String(url) === 'https://oauth2.googleapis.com/token')
      return Response.json({ id_token: identity });
    if (String(url) === 'https://www.googleapis.com/oauth2/v3/certs')
      return Response.json({ keys: [jwk] });
    return originalFetch(url, options);
  };
  let callback;
  try {
    callback = new URL(await service.oauthCallback('google', start.state, 'test-code'));
  } finally {
    global.fetch = originalFetch;
  }
  assert.equal(callback.searchParams.get('error'), null);
  const ticket = callback.searchParams.get('ticket');
  assert.ok(ticket);
  await assert.rejects(service.exchangeTicket(ticket, 'wrong-verifier'));
  const session = await service.exchangeTicket(ticket, verifier);
  assert.equal(session.user.email, 'oauth@test.local');
  assert.equal(session.user.vaiTro.tenVaiTro, 'USER');
  await assert.rejects(service.exchangeTicket(ticket, verifier));
  await assert.rejects(service.oauthCallback('google', start.state, 'test-code'));
  const badNonceStart = await service.startOAuth('google', 'cookmate://auth', challenge);
  global.fetch = async (url, options) => {
    if (String(url) === 'https://oauth2.googleapis.com/token') return Response.json({ id_token: identity });
    return originalFetch(url, options);
  };
  try {
    const denied = new URL(await service.oauthCallback('google', badNonceStart.state, 'other-code'));
    assert.ok(denied.searchParams.get('error'));
    assert.equal(denied.searchParams.get('ticket'), null);
  } finally { global.fetch = originalFetch; }
  async function fixtureTicket(subject, email, expiresAt = new Date(Date.now() + 60000)) {
    const value = crypto.randomBytes(32).toString('hex');
    await db.AuthChallenge.create({ id: crypto.randomUUID(), kind: 'ticket', subject: crypto.createHash('sha256').update(value).digest('hex'), payload: { provider: 'google', subject, email, challenge }, expiresAt });
    return value;
  }
  const collision = await fixtureTicket('different-google-user', 'user@test.local');
  await assert.rejects(service.exchangeTicket(collision, verifier), /Email đã có tài khoản/);
  const expired = await fixtureTicket('expired-user', null, new Date(Date.now() - 1000));
  await assert.rejects(service.exchangeTicket(expired, verifier));
  const returning = await fixtureTicket('google-user-123', 'changed-email@test.local');
  assert.equal((await service.exchangeTicket(returning, verifier)).user.idNguoiDung, session.user.idNguoiDung);
  const caseMismatch = await fixtureTicket('GOOGLE-USER-123', null);
  await assert.rejects(service.exchangeTicket(caseMismatch, verifier), /không khớp/);
  delete process.env.AUTH_PUBLIC_URL;
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
});
test('authentication, validation and protected admin API', async () => {
  assert.equal(
    (await request('POST', '/auth/register', { hoTen: 'X', email: 'invalid', matKhau: 'short' }))
      .status,
    400,
  );
  assert.equal((await request('POST', '/auth/login')).status, 400);
  assert.equal((await request('GET', '/admin/dashboard', undefined, user)).status, 403);
  assert.equal((await request('GET', '/admin/dashboard')).status, 401);
  assert.equal((await request('GET', '/auth/me', undefined, admin)).data.user, undefined);
  const profile = await request('GET', '/auth/me', undefined, user);
  assert.equal(profile.data.matKhau, undefined);
  assert.equal(profile.data.tokenVersion, undefined);
});
test('admin creates catalog and publishable recipe; audits persist', async () => {
  category = (await request('POST', '/danh-muc', { tenDanhMuc: 'Món chính' }, admin)).data;
  ingredient = (
    await request('POST', '/nguyen-lieu', { tenNguyenLieu: 'Gạo', donViMacDinh: 'g' }, admin)
  ).data;
  assert.equal(
    (
      await request(
        'POST',
        '/mon-an',
        { tenMonAn: 'Thiếu bước', idDanhMuc: category.idDanhMuc },
        admin,
      )
    ).status,
    400,
  );
  const r = await request(
    'POST',
    '/mon-an',
    {
      tenMonAn: 'Cơm nhà',
      idDanhMuc: category.idDanhMuc,
      khauPhan: 2,
      thoiGianChuanBi: 5,
      thoiGianNau: 20,
      nguyenLieus: [{ idNguyenLieu: ingredient.idNguyenLieu, soLuong: 200, donVi: 'g' }],
      buocNaus: [{ soThuTu: 1, tieuDe: 'Bước cũ', huongDan: 'Vo gạo' }],
    },
    admin,
  );
  assert.equal(r.status, 201, JSON.stringify(r));
  recipe = r.data;
  assert.equal(recipe.buocNaus.length, 1);
  assert.equal(recipe.tongThoiGian, 25);
  assert.ok((await db.NhatKyHeThong.count()) >= 3);
});
test('editing recipe keeps old history steps and snapshots', async () => {
  const history = (await request('POST', `/mon-an/${recipe.idMonAn}/lich-su-nau`, {}, user)).data;
  const oldStep = history.chiTietLichSuNaus[0].idBuocNau;
  const r = await request(
    'PATCH',
    `/mon-an/${recipe.idMonAn}`,
    { buocNaus: [{ soThuTu: 1, tieuDe: 'Bước mới', huongDan: 'Ngâm gạo' }] },
    admin,
  );
  assert.equal(r.status, 200, JSON.stringify(r));
  assert.notEqual(r.data.buocNaus[0].idBuocNau, oldStep);
  const preserved = (await request('GET', `/lich-su-nau/${history.idLichSu}`, undefined, user))
    .data;
  assert.equal(preserved.chiTietLichSuNaus[0].buocNau.tieuDe, 'Bước cũ');
  assert.equal(preserved.congThucSnapshot.buocNaus[0].tieuDe, 'Bước cũ');
  assert.equal(
    (await request('GET', `/lich-su-nau/${history.idLichSu}`, undefined, other)).status,
    403,
  );
  assert.equal(
    (await request('PATCH', `/lich-su-nau/${history.idLichSu}/finish`, {}, user)).status,
    409,
  );
  assert.equal(
    (
      await request(
        'PATCH',
        `/lich-su-nau/${history.idLichSu}/steps/${oldStep}`,
        { daHoanThanh: true },
        user,
      )
    ).data.trangThai,
    'HOAN_THANH',
  );
  assert.equal(
    (await request('PATCH', `/lich-su-nau/${history.idLichSu}/cancel`, {}, user)).status,
    409,
  );
  const cancelled = (await request('POST', `/mon-an/${recipe.idMonAn}/lich-su-nau`, {}, user)).data;
  await request('PATCH', `/lich-su-nau/${cancelled.idLichSu}/cancel`, {}, user);
  assert.equal(
    (
      await request(
        'PATCH',
        `/lich-su-nau/${cancelled.idLichSu}/steps/${cancelled.chiTietLichSuNaus[0].idBuocNau}`,
        { daHoanThanh: false },
        user,
      )
    ).status,
    409,
  );
});
test('simultaneous ratings keep aggregate consistent and unique', async () => {
  const results = await Promise.all([
    request('POST', `/mon-an/${recipe.idMonAn}/danh-gia`, { soSao: 5 }, user),
    request('POST', `/mon-an/${recipe.idMonAn}/danh-gia`, { soSao: 3 }, other),
  ]);
  for (const r of results) assert.equal(r.status, 200, JSON.stringify(r));
  assert.equal(Number((await db.MonAn.findByPk(recipe.idMonAn)).diemDanhGia), 4);
  assert.equal(await db.DanhGia.count(), 2);
  assert.equal(
    (await request('POST', `/mon-an/${recipe.idMonAn}/danh-gia`, { soSao: '5abc' }, user)).status,
    400,
  );
});
test('comments only allow one reply level; deleting parent hides replies', async () => {
  const parent = (
    await request('POST', `/mon-an/${recipe.idMonAn}/binh-luan`, { noiDung: 'Ngon' }, user)
  ).data;
  const child = (
    await request(
      'POST',
      `/mon-an/${recipe.idMonAn}/binh-luan`,
      { noiDung: 'Cảm ơn', idBinhLuanCha: parent.idBinhLuan },
      other,
    )
  ).data;
  for (let i = 0; i < 2; i++) {
    const listed = await request('GET', `/mon-an/${recipe.idMonAn}/binh-luan`);
    assert.equal(listed.status, 200);
    assert.equal(listed.meta.totalItems, 1);
    assert.equal(listed.data[0].binhLuanCon[0].idBinhLuan, child.idBinhLuan);
  }
  assert.equal(
    (
      await request(
        'POST',
        `/mon-an/${recipe.idMonAn}/binh-luan`,
        { noiDung: 'Tầng ba', idBinhLuanCha: child.idBinhLuan },
        user,
      )
    ).status,
    400,
  );
  assert.equal(
    (await request('DELETE', `/binh-luan/${parent.idBinhLuan}`, undefined, other)).status,
    403,
  );
  assert.equal(
    (await request('DELETE', `/binh-luan/${parent.idBinhLuan}`, undefined, user)).status,
    200,
  );
  assert.equal((await db.BinhLuan.findByPk(child.idBinhLuan)).trangThai, 0);
});
test('hidden recipes are available only in admin catalog and excluded from favorites', async () => {
  await request('POST', `/yeu-thich/${recipe.idMonAn}`, {}, user);
  assert.equal(
    (await request('DELETE', `/mon-an/${recipe.idMonAn}`, undefined, admin)).status,
    200,
  );
  assert.equal((await request('GET', '/mon-an')).data.length, 0);
  assert.equal((await request('GET', '/yeu-thich', undefined, user)).data.length, 0);
  assert.equal(
    (await request('GET', '/admin/mon-an?trangThai=0', undefined, admin)).data.length,
    1,
  );
  assert.equal(
    (await request('GET', `/admin/mon-an/${recipe.idMonAn}`, undefined, admin)).status,
    200,
  );
  assert.equal(
    (await request('PATCH', `/mon-an/${recipe.idMonAn}`, { trangThai: 1 }, admin)).status,
    200,
  );
});
test('last admin protection and disabled-role authentication', async () => {
  const me = (await request('GET', '/auth/me', undefined, admin)).data;
  assert.equal(
    (await request('PATCH', `/nguoi-dung/${me.idNguoiDung}`, { trangThai: 0 }, admin)).status,
    409,
  );
  assert.equal(
    (await request('PATCH', `/vai-tro/${adminRole.idVaiTro}`, { trangThai: 0 }, admin)).status,
    409,
  );
  await userRole.update({ trangThai: 0 });
  assert.equal((await request('GET', '/auth/me', undefined, user)).status, 401);
  await userRole.update({ trangThai: 1 });
});
test('notification recipient validation and read ownership', async () => {
  assert.equal(
    (
      await request(
        'POST',
        '/thong-bao',
        { tieuDe: 'Hi', noiDung: 'Test', idNguoiDungs: [999999] },
        admin,
      )
    ).status,
    400,
  );
  const r = await request(
    'POST',
    '/thong-bao',
    { tieuDe: 'Bữa cơm mới', noiDung: 'Cùng vào bếp', guiTatCa: true },
    admin,
  );
  assert.equal(r.status, 201);
  assert.equal(r.data.soNguoiNhan, await db.NguoiDung.count({ where: { trangThai: 1 } }));
  const n = r.data.thongBao.idThongBao;
  assert.equal((await request('PATCH', `/thong-bao/${n}/read`, {}, user)).status, 200);
  assert.equal((await request('GET', '/thong-bao?daDoc=0', undefined, user)).data.length, 0);
});
test('upload rejects forged MIME and reencodes valid image with safe extension', async () => {
  const fake = new FormData();
  fake.append('image', new Blob(['<html>bad</html>'], { type: 'image/png' }), 'test.html');
  assert.equal(
    (
      await fetch(base + '/uploads/image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${user}` },
        body: fake,
      })
    ).status,
    400,
  );
  const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ff6600' } })
    .png()
    .toBuffer();
  const form = new FormData();
  form.append('image', new Blob([bytes], { type: 'image/png' }), 'test.html');
  const response = await fetch(base + '/uploads/image', {
    method: 'POST',
    headers: { Authorization: `Bearer ${user}` },
    body: form,
  });
  const r = await response.json();
  assert.equal(response.status, 201);
  assert.match(r.data.filename, /^[a-f0-9-]+\.webp$/);
  const imageResponse = await fetch(new URL(`/uploads/${r.data.filename}`, base));
  assert.equal(imageResponse.status, 200);
  assert.equal(imageResponse.headers.get('cross-origin-resource-policy'), 'cross-origin');
  assert.match(imageResponse.headers.get('content-type'), /image\/webp/);
  await require('fs/promises').unlink(path.join(__dirname, '../uploads', r.data.filename));
});
test('password change and logout revoke existing tokens', async () => {
  assert.equal(
    (
      await request(
        'PATCH',
        '/auth/change-password',
        { matKhauCu: 'Password123!', matKhauMoi: 'Changed123!' },
        user,
      )
    ).status,
    200,
  );
  assert.equal((await request('GET', '/auth/me', undefined, user)).status, 401);
  const next = await login('user@test.local', 'Changed123!');
  assert.equal((await request('POST', '/auth/logout', {}, next)).status, 200);
  assert.equal((await request('GET', '/auth/me', undefined, next)).status, 401);
});
