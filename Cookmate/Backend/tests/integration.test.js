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
let hopThuKiemThu;
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
  hopThuKiemThu = require('../src/services/guiEmail').hopThuKiemThu;
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
    assert.equal(r.data.token, undefined);
    const thu = hopThuKiemThu.findLast((item) => item.den === email && item.loai === 'EMAIL_VERIFY');
    assert.ok(thu?.token);
    assert.equal((await request('POST', '/auth/verify-email', { token: thu.token })).status, 200);
    if (email.startsWith('user')) user = await login(email);
    else other = await login(email);
  }
});
after(async () => {
  if (server) await new Promise((r) => server.close(r));
  if (sequelize) await sequelize.close();
  if (connection) {
    if (created && /^cookmate_test_\d+_[a-f0-9]+$/.test(dbName))
      await connection.query(`DROP DATABASE \`${dbName}\``);
    await connection.end();
  }
});

test('retired phone OTP endpoints are unavailable', async () => {
  const methods = await request('GET', '/auth/methods');
  assert.equal(methods.status, 200);
  assert.equal(methods.data.phone, undefined);
  assert.equal(methods.data.localOtp, undefined);
  assert.equal((await request('POST', '/auth/otp/request', { phone: '0912345678' })).status, 404);
  assert.equal((await request('POST', '/auth/otp/verify', { challengeId: crypto.randomUUID(), code: '123456' })).status, 404);
});
test('email verification and password reset use expiring one-time tokens', async () => {
  const email = 'recovery@test.local';
  const registered = await request('POST', '/auth/register', {
    hoTen: 'Recovery User',
    email,
    matKhau: 'Original123!',
  });
  assert.equal(registered.status, 201, JSON.stringify(registered));
  assert.equal(registered.data.token, undefined);
  assert.equal((await request('POST', '/auth/login', { email, matKhau: 'Original123!' })).status, 403);
  assert.equal(
    (await request('POST', '/auth/verify-email', { token: '0'.repeat(64) })).status,
    400,
  );
  const verifyMail = hopThuKiemThu.findLast(
    (item) => item.den === email && item.loai === 'EMAIL_VERIFY',
  );
  assert.match(verifyMail.duongDan, /^cookmate:\/\/xac-minh-email\?token=/);
  assert.equal(
    (await request('POST', '/auth/verify-email', { token: verifyMail.token })).status,
    200,
  );
  assert.equal(
    (await request('POST', '/auth/verify-email', { token: verifyMail.token })).status,
    400,
  );
  const session = await login(email, 'Original123!');
  const emailCount = hopThuKiemThu.length;
  assert.equal(
    (await request('POST', '/auth/forgot-password', { email: 'missing@test.local' })).status,
    200,
  );
  assert.equal(hopThuKiemThu.length, emailCount);
  assert.equal((await request('POST', '/auth/forgot-password', { email })).status, 200);
  const resetMail = hopThuKiemThu.findLast(
    (item) => item.den === email && item.loai === 'PASSWORD_RESET',
  );
  assert.match(resetMail.duongDan, /^cookmate:\/\/dat-lai-mat-khau\?token=/);
  assert.equal(
    (
      await request('POST', '/auth/reset-password', {
        token: resetMail.token,
        matKhauMoi: 'Replacement123!',
      })
    ).status,
    200,
  );
  assert.equal((await request('GET', '/auth/me', undefined, session)).status, 401);
  assert.equal(
    (
      await request('POST', '/auth/reset-password', {
        token: resetMail.token,
        matKhauMoi: 'AnotherPassword123!',
      })
    ).status,
    400,
  );
  assert.equal((await request('POST', '/auth/login', { email, matKhau: 'Original123!' })).status, 401);
  assert.ok(await login(email, 'Replacement123!'));
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
test('subscription catalog exposes approved prices and free quota', async () => {
  const catalog = await request('GET', '/goi-dich-vu');
  assert.equal(catalog.status, 200, JSON.stringify(catalog));
  assert.deepEqual(
    catalog.data.goiDichVus.map((item) => [item.maGoi, item.giaThang]),
    [
      ['FREE', 0],
      ['BASIC', 39000],
      ['PRO', 79000],
      ['CHEF', 149000],
    ],
  );
  assert.equal(catalog.data.goiDichVus[0].hanMucCongThucMoiMoiNgay, 10);
  assert.equal(catalog.data.mucTieuAnUongs.length, 4);
  const mine = await request('GET', '/goi-dich-vu/me', undefined, user);
  assert.equal(mine.status, 200);
  assert.equal(mine.data.goiDichVu.maGoi, 'FREE');
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
test('recipe nutrition is calculated from ingredient weight per serving', async () => {
  const updatedIngredient = await request(
    'PATCH',
    `/nguyen-lieu/${ingredient.idNguyenLieu}`,
    { nangLuongKcal: 130, proteinG: 2.7, carbG: 28, chatBeoG: 0.3, chatXoG: 0.4, natriMg: 1 },
    admin,
  );
  assert.equal(updatedIngredient.status, 200, JSON.stringify(updatedIngredient));
  const detail = await request('GET', `/mon-an/${recipe.idMonAn}`);
  assert.equal(detail.status, 200, JSON.stringify(detail));
  assert.equal(detail.data.dinhDuong.dayDuDuLieu, true);
  assert.equal(detail.data.dinhDuong.tongMon.nangLuongKcal, 260);
  assert.equal(detail.data.dinhDuong.moiKhauPhan.nangLuongKcal, 130);
  assert.equal(detail.data.dinhDuong.moiKhauPhan.proteinG, 2.7);
});
test('meal calendar supports manual planning, evaluation and Pro automation', async () => {
  const plan = await request('POST', '/lich-an', {
    tenLich: 'Tuần kiểm thử', tuNgay: '2026-09-28', denNgay: '2026-10-04', mucTieuKcalMoiNgay: 1800,
  }, user);
  assert.equal(plan.status, 201, JSON.stringify(plan));
  const meal = await request('POST', `/lich-an/${plan.data.idLichAn}/bua-an`, {
    idMonAn: recipe.idMonAn, ngay: '2026-09-28', loaiBua: 'TRUA', soKhauPhan: 1,
  }, user);
  assert.equal(meal.status, 201, JSON.stringify(meal));
  const evaluation = await request('GET', `/lich-an/${plan.data.idLichAn}/danh-gia`, undefined, user);
  assert.equal(evaluation.status, 200, JSON.stringify(evaluation));
  assert.equal(evaluation.data.theoNgay[0].nangLuongKcal, 130);
  assert.equal((await request('GET', `/lich-an/${plan.data.idLichAn}/danh-sach-mua-sam`, undefined, user)).status, 403);
  const pro = await db.GoiDichVu.findOne({ where: { maGoi: 'PRO' } });
  const account = (await request('GET', '/auth/me', undefined, user)).data;
  await db.DangKyDichVu.create({ idNguoiDung: account.idNguoiDung, idGoiDichVu: pro.idGoiDichVu, thoiGianKetThuc: new Date(Date.now() + 86400000) });
  const generated = await request('POST', `/lich-an/${plan.data.idLichAn}/tao-tu-dong`, {}, user);
  assert.equal(generated.status, 200, JSON.stringify(generated));
  assert.equal(generated.data.buaAns.length, 21);
  const shopping = await request('GET', `/lich-an/${plan.data.idLichAn}/danh-sach-mua-sam`, undefined, user);
  assert.equal(shopping.status, 200, JSON.stringify(shopping));
  assert.ok(shopping.data[0].soLuong > 0);
});
test('manual payment confirmation activates Chef and individual goals', async () => {
  const catalog = (await request('GET', '/goi-dich-vu')).data;
  const chef = catalog.goiDichVus.find((item) => item.maGoi === 'CHEF');
  const chefPayment = await request('POST', '/thanh-toan/yeu-cau', { loaiSanPham: 'GOI_DICH_VU', idGoiDichVu: chef.idGoiDichVu }, user);
  assert.equal(chefPayment.status, 201, JSON.stringify(chefPayment));
  assert.equal((await request('PATCH', `/admin/thanh-toan/${chefPayment.data.idYeuCauThanhToan}/xac-nhan`, {}, admin)).status, 200);
  assert.equal((await request('GET', '/goi-dich-vu/me', undefined, user)).data.goiDichVu.maGoi, 'CHEF');
  const advice = await request('POST', '/tu-van-ai', { cauHoi: 'Tôi nên cân bằng thực đơn thế nào?' }, user);
  assert.equal(advice.status, 200, JSON.stringify(advice));
  assert.equal(advice.data.nguon, 'COOKMATE_RULES_V1');
  assert.equal((await request('POST', '/tu-van-ai', { cauHoi: 'Tư vấn' }, other)).status, 403);

  const goal = catalog.mucTieuAnUongs.find((item) => item.maMucTieu === 'VEGETARIAN');
  const goalPayment = await request('POST', '/thanh-toan/yeu-cau', { loaiSanPham: 'MUC_TIEU', idMucTieuAnUong: goal.idMucTieuAnUong }, other);
  assert.equal(goalPayment.status, 201, JSON.stringify(goalPayment));
  assert.equal((await request('PATCH', `/admin/thanh-toan/${goalPayment.data.idYeuCauThanhToan}/xac-nhan`, {}, admin)).status, 200);
  assert.equal((await request('GET', '/goi-dich-vu/me', undefined, other)).data.mucTieuAnUongs[0].maMucTieu, 'VEGETARIAN');
});
test('users submit owned recipe drafts for admin moderation', async () => {
  const draft = await request(
    'POST',
    '/mon-an/cua-toi',
    {
      tenMonAn: 'Bún người dùng',
      idDanhMuc: category.idDanhMuc,
      khauPhan: 2,
      nguyenLieus: [{ idNguyenLieu: ingredient.idNguyenLieu, soLuong: 100, donVi: 'g' }],
      buocNaus: [{ huongDan: 'Nấu chín và trình bày' }],
    },
    user,
  );
  assert.equal(draft.status, 201, JSON.stringify(draft));
  assert.equal(draft.data.trangThaiDuyet, 'NHAP');
  assert.equal(
    (await request('PATCH', `/mon-an/cua-toi/${draft.data.idMonAn}`, { moTa: 'x' }, other)).status,
    404,
  );
  assert.equal(
    (await request('POST', `/mon-an/cua-toi/${draft.data.idMonAn}/gui-duyet`, {}, user)).status,
    200,
  );
  assert.equal((await request('GET', `/mon-an/${draft.data.idMonAn}`)).status, 404);
  const approved = await request(
    'PATCH',
    `/admin/bai-dang/${draft.data.idMonAn}/kiem-duyet`,
    { quyetDinh: 'DUYET' },
    admin,
  );
  assert.equal(approved.status, 200, JSON.stringify(approved));
  assert.equal(approved.data.trangThaiDuyet, 'DA_DUYET');
  assert.equal((await request('GET', `/mon-an/${draft.data.idMonAn}`)).status, 200);
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
  assert.equal(
    (await request('GET', '/mon-an')).data.some((item) => item.idMonAn === recipe.idMonAn),
    false,
  );
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
test('registered devices receive real Expo push payloads and can be disabled', async () => {
  const pushToken = 'ExponentPushToken[test-user-device-123]';
  const registered = await request(
    'POST',
    '/thong-bao/thiet-bi',
    { token: pushToken, nenTang: 'android', maThietBi: 'test-device' },
    user,
  );
  assert.equal(registered.status, 201, JSON.stringify(registered));
  const originalFetch = global.fetch;
  let pushPayload;
  global.fetch = async (url, options) => {
    if (String(url) === 'https://exp.host/--/api/v2/push/send') {
      pushPayload = JSON.parse(options.body);
      return Response.json({ data: pushPayload.map(() => ({ status: 'ok', id: 'ticket-1' })) });
    }
    return originalFetch(url, options);
  };
  try {
    const sent = await request(
      'POST',
      '/thong-bao',
      {
        tieuDe: 'Món mới',
        noiDung: 'Có một công thức mới dành cho bạn.',
        idNguoiDungs: [(await request('GET', '/auth/me', undefined, user)).data.idNguoiDung],
      },
      admin,
    );
    assert.equal(sent.status, 201, JSON.stringify(sent));
    assert.equal(sent.data.push.daGui, 1);
    assert.equal(pushPayload[0].to, pushToken);
    assert.equal(pushPayload[0].title, 'Món mới');
  } finally {
    global.fetch = originalFetch;
  }
  assert.equal((await request('DELETE', '/thong-bao/thiet-bi', undefined, user)).status, 200);
  assert.equal(
    await db.ThietBiThongBao.count({ where: { token: pushToken, hoatDong: 1 } }),
    0,
  );
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
test('free accounts can open at most ten previously unseen recipes each day', async () => {
  const recipes = await db.MonAn.bulkCreate(Array.from({ length: 11 }, (_, index) => ({
    idDanhMuc: category.idDanhMuc,
    tenMonAn: `Món giới hạn ${index + 1}`,
    khauPhan: 1,
    trangThai: 1,
    trangThaiDuyet: 'DA_DUYET',
  })));
  for (const item of recipes.slice(0, 10))
    assert.equal((await request('GET', `/mon-an/${item.idMonAn}`, undefined, other)).status, 200);
  assert.equal((await request('GET', `/mon-an/${recipes[10].idMonAn}`, undefined, other)).status, 429);
  assert.equal((await request('GET', `/mon-an/${recipes[0].idMonAn}`, undefined, other)).status, 200);
  await recipes[0].update({ capTruyCapToiThieu: 'CHEF' });
  assert.equal((await request('GET', `/mon-an/${recipes[0].idMonAn}`, undefined, other)).status, 403);
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
