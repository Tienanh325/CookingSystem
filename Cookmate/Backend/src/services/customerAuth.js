const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const db = require('../models');
const sequelize = require('../config/database');
const error = require('../utils/httpError');
const { jwtSecret } = require('../config/security');
const { sanitizeUser } = require('../utils/serializers');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const mac = (value) => crypto.createHmac('sha256', jwtSecret()).update(value).digest('hex');
const localOtp = () =>
  process.env.OTP_DELIVERY === 'local' && ['development', 'test'].includes(process.env.NODE_ENV);
const smsReady = () =>
  !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_VERIFY_SERVICE_SID
  );
const oauthReady = (p) =>
  ['google', 'apple'].includes(p) &&
  !!(
    process.env.AUTH_PUBLIC_URL &&
    process.env[`${p.toUpperCase()}_CLIENT_ID`] &&
    process.env[`${p.toUpperCase()}_CLIENT_SECRET`]
  );
const capabilities = () => ({
  phone: localOtp() || smsReady(),
  localOtp: localOtp(),
  google: oauthReady('google'),
  apple: oauthReady('apple'),
  zalo: false,
});
function normalizePhone(input) {
  let phone = String(input || '').replace(/[\s()-]/g, '');
  if (/^0[35789]\d{8}$/.test(phone)) phone = '+84' + phone.slice(1);
  if (!/^\+84[35789]\d{8}$/.test(phone)) throw error(400, 'Nhập số di động Việt Nam hợp lệ.');
  return phone;
}
async function sessionFor(id, transaction) {
  const user = await db.NguoiDung.findByPk(id, {
    include: [{ model: db.VaiTro, as: 'vaiTro' }],
    transaction,
  });
  if (!user || user.trangThai !== 1 || user.vaiTro?.trangThai !== 1)
    throw error(403, 'Tài khoản hoặc vai trò đã bị khóa.');
  return {
    user: sanitizeUser(user),
    token: jwt.sign({ idNguoiDung: id, tokenVersion: user.tokenVersion }, jwtSecret(), {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }),
  };
}
async function identityUser(provider, subject, details, transaction) {
  const existing = await db.AuthIdentity.findOne({ where: { provider, subject }, transaction });
  if (existing) {
    if (existing.subject !== subject) throw error(409, 'Định danh đăng nhập không khớp.');
    return existing.idNguoiDung;
  }
  // Never infer account ownership from a profile phone or an email collision.
  if (
    details.email &&
    (await db.NguoiDung.findOne({ where: { email: details.email }, transaction }))
  )
    throw error(409, 'Email đã có tài khoản. Hãy đăng nhập bằng email/mật khẩu hiện có.');
  const role = await db.VaiTro.findOne({
    where: { tenVaiTro: 'USER', trangThai: 1 },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!role) throw error(403, 'Đăng ký hiện đang tạm dừng.');
  // Serialize new registrations through the role lock, then check again.
  const again = await db.AuthIdentity.findOne({
    where: { provider, subject },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (again) {
    if (again.subject !== subject) throw error(409, 'Định danh đăng nhập không khớp.');
    return again.idNguoiDung;
  }
  const user = await db.NguoiDung.create(
    {
      idVaiTro: role.idVaiTro,
      hoTen: details.name || 'Khách hàng Cookmate',
      email: details.email || null,
      matKhau: null,
      soDienThoai: provider === 'phone' ? subject : null,
    },
    { transaction },
  );
  await db.AuthIdentity.create(
    { provider, subject, idNguoiDung: user.idNguoiDung },
    { transaction },
  );
  return user.idNguoiDung;
}
async function twilio(endpoint, values) {
  const r = await fetch(
    `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/${endpoint}`,
    {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(
            `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`,
          ).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(values),
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!r.ok) throw error(502, 'Dịch vụ SMS chưa xử lý được yêu cầu. Vui lòng thử lại sau.');
  return r.json();
}
async function requestOtp(phoneInput, name) {
  if (!capabilities().phone) throw error(503, 'Đăng nhập điện thoại chưa được cấu hình.');
  const phone = normalizePhone(phoneInput),
    id = crypto.randomUUID();
  const code = String(crypto.randomInt(100000, 1000000));
  // Lock the USER role to serialize resend cooldown checks across processes.
  await sequelize.transaction(async (transaction) => {
    await db.VaiTro.findOne({
      where: { tenVaiTro: 'USER' },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const recent = await db.AuthChallenge.findOne({
      where: { kind: 'otp', subject: phone, createdAt: { [Op.gt]: new Date(Date.now() - 60000) } },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (recent) throw error(429, 'Vui lòng chờ 60 giây trước khi gửi lại mã.');
    const hourly = await db.AuthChallenge.count({
      where: {
        kind: 'otp',
        subject: phone,
        createdAt: { [Op.gt]: new Date(Date.now() - 3600000) },
      },
      transaction,
    });
    if (hourly >= 5) throw error(429, 'Số điện thoại đã vượt giới hạn gửi mã trong giờ này.');
    await db.AuthChallenge.update(
      { consumed: true },
      { where: { kind: 'otp', subject: phone }, transaction },
    );
    await db.AuthChallenge.create(
      {
        id,
        kind: 'otp',
        subject: phone,
        expiresAt: new Date(Date.now() + 300000),
        payload: { digest: mac(id + ':' + code), name, local: localOtp() },
      },
      { transaction },
    );
  });
  try {
    if (localOtp())
      await fs.writeFile(
        path.join(
          __dirname,
          process.env.NODE_ENV === 'test'
            ? '../../.otp-test-preview.local'
            : '../../.otp-preview.local',
        ),
        JSON.stringify(
          { challengeId: id, phone, code, expiresAt: new Date(Date.now() + 300000) },
          null,
          2,
        ),
        { mode: 0o600 },
      );
    else await twilio('Verifications', { To: phone, Channel: 'sms' });
  } catch (e) {
    await db.AuthChallenge.update({ consumed: true }, { where: { id } });
    throw e;
  }
  return {
    challengeId: id,
    phone: phone.slice(0, 3) + ' ***** ' + phone.slice(-3),
    expiresIn: 300,
    resendAfter: 60,
    local: localOtp(),
  };
}
async function verifyOtp(id, code) {
  const result = await sequelize.transaction(async (transaction) => {
    const row = await db.AuthChallenge.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (
      !row ||
      row.kind !== 'otp' ||
      row.consumed ||
      row.expiresAt <= new Date() ||
      row.attempts >= 5
    )
      return { failure: 'Mã đã hết hạn hoặc không còn hiệu lực. Hãy yêu cầu mã mới.' };
    await row.increment('attempts', { transaction });
    let valid;
    if (row.payload.local)
      valid =
        localOtp() &&
        crypto.timingSafeEqual(Buffer.from(row.payload.digest), Buffer.from(mac(id + ':' + code)));
    else
      valid =
        smsReady() &&
        (await twilio('VerificationCheck', { To: row.subject, Code: code })).status === 'approved';
    if (!valid) return { failure: 'Mã OTP không đúng.' };
    const uid = await identityUser('phone', row.subject, { name: row.payload.name }, transaction);
    const session = await sessionFor(uid, transaction);
    await row.update({ consumed: true }, { transaction });
    return session;
  });
  if (result.failure) throw error(400, result.failure);
  return result;
}
const providers = {
  google: {
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    jwks: 'https://www.googleapis.com/oauth2/v3/certs',
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
  },
  apple: {
    authorize: 'https://appleid.apple.com/auth/authorize',
    token: 'https://appleid.apple.com/auth/token',
    jwks: 'https://appleid.apple.com/auth/keys',
    issuer: 'https://appleid.apple.com',
  },
};
function callbackUrl(provider) {
  return (
    process.env.AUTH_PUBLIC_URL.replace(/\/$/, '') + '/api/auth/oauth/' + provider + '/callback'
  );
}
async function startOAuth(provider, redirectUri, challenge) {
  if (!oauthReady(provider)) throw error(503, 'Phương thức đăng nhập này chưa được cấu hình.');
  const allowed = (process.env.AUTH_REDIRECT_URIS || 'cookmate://auth')
    .split(',')
    .map((s) => s.trim());
  if (!allowed.includes(redirectUri)) throw error(400, 'Địa chỉ quay lại ứng dụng không hợp lệ.');
  const id = crypto.randomUUID(),
    nonce = crypto.randomBytes(32).toString('hex');
  const verifier = crypto.randomBytes(32).toString('base64url');
  await db.AuthChallenge.create({
    id,
    kind: 'oauth',
    subject: provider,
    payload: { redirectUri, challenge, nonce, verifier },
    expiresAt: new Date(Date.now() + 600000),
  });
  const url = new URL(providers[provider].authorize);
  const params = {
    client_id: process.env[`${provider.toUpperCase()}_CLIENT_ID`],
    redirect_uri: callbackUrl(provider),
    response_type: 'code',
    scope: provider === 'apple' ? 'name email' : 'openid email profile',
    state: id,
    nonce,
  };
  if (provider === 'apple') params.response_mode = 'form_post';
  else {
    params.code_challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    params.code_challenge_method = 'S256';
  }
  url.search = new URLSearchParams(params).toString();
  return { url: url.toString(), state: id };
}
const jwksCache = {};
async function oauthCallback(provider, state, code) {
  const row = await sequelize.transaction(async (transaction) => {
    const c = await db.AuthChallenge.findByPk(state, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (
      !c ||
      c.kind !== 'oauth' ||
      c.subject !== provider ||
      c.consumed ||
      c.expiresAt <= new Date()
    )
      throw error(400, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    await c.update({ consumed: true }, { transaction });
    return c;
  });
  const redirect = new URL(row.payload.redirectUri);
  redirect.searchParams.set('state', state);
  try {
    if (!code || !oauthReady(provider))
      throw error(400, 'Đăng nhập đã hủy hoặc chưa được cấu hình.');
    const r = await fetch(providers[provider].token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env[`${provider.toUpperCase()}_CLIENT_ID`],
        client_secret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`],
        redirect_uri: callbackUrl(provider),
        grant_type: 'authorization_code',
        ...(provider === 'google' ? { code_verifier: row.payload.verifier } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw error(400, 'Nhà cung cấp từ chối đăng nhập.');
    const tokens = await r.json();
    const { jwtVerify, createRemoteJWKSet } = await import('jose');
    const key = (jwksCache[provider] ||= createRemoteJWKSet(new URL(providers[provider].jwks)));
    const { payload } = await jwtVerify(tokens.id_token, key, {
      issuer: providers[provider].issuer,
      audience: process.env[`${provider.toUpperCase()}_CLIENT_ID`],
      algorithms: ['RS256'],
    });
    if (payload.nonce !== row.payload.nonce || !payload.sub || !payload.exp)
      throw error(400, 'Không xác minh được phiên đăng nhập.');
    const email =
      (payload.email_verified === true || payload.email_verified === 'true') &&
      typeof payload.email === 'string'
        ? payload.email.toLowerCase()
        : null;
    const ticket = crypto.randomBytes(32).toString('hex');
    await db.AuthChallenge.create({
      id: crypto.randomUUID(),
      kind: 'ticket',
      subject: hash(ticket),
      payload: {
        provider,
        subject: payload.sub,
        email,
        name: typeof payload.name === 'string' ? payload.name.slice(0, 100) : null,
        challenge: row.payload.challenge,
      },
      expiresAt: new Date(Date.now() + 60000),
    });
    redirect.searchParams.set('ticket', ticket);
  } catch {
    redirect.searchParams.set('error', 'Đăng nhập không thành công. Vui lòng thử lại.');
  }
  return redirect.toString();
}
async function exchangeTicket(ticket, verifier) {
  return sequelize.transaction(async (transaction) => {
    const row = await db.AuthChallenge.findOne({
      where: { kind: 'ticket', subject: hash(ticket) },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (
      !row ||
      row.consumed ||
      row.expiresAt <= new Date() ||
      row.payload.challenge !== hash(verifier)
    )
      throw error(400, 'Phiên đăng nhập không hợp lệ.');
    const id = await identityUser(
      row.payload.provider,
      row.payload.subject,
      row.payload,
      transaction,
    );
    const session = await sessionFor(id, transaction);
    await row.update({ consumed: true }, { transaction });
    return session;
  });
}
module.exports = {
  capabilities,
  normalizePhone,
  requestOtp,
  verifyOtp,
  startOAuth,
  oauthCallback,
  exchangeTicket,
};
