const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const db = require('../models');
const sequelize = require('../config/database');
const error = require('../utils/httpError');
const { jwtSecret } = require('../config/security');
const { sanitizeUser } = require('../utils/serializers');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const oauthReady = (p) =>
  ['google', 'apple'].includes(p) &&
  !!(
    process.env.AUTH_PUBLIC_URL &&
    process.env[`${p.toUpperCase()}_CLIENT_ID`] &&
    process.env[`${p.toUpperCase()}_CLIENT_SECRET`]
  );
const capabilities = () => ({
  google: oauthReady('google'),
  apple: oauthReady('apple'),
  zalo: false,
});
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
      soDienThoai: null,
    },
    { transaction },
  );
  await db.AuthIdentity.create(
    { provider, subject, idNguoiDung: user.idNguoiDung },
    { transaction },
  );
  return user.idNguoiDung;
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
  startOAuth,
  oauthCallback,
  exchangeTicket,
};
