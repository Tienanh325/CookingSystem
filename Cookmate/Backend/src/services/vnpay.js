const crypto = require('crypto');

const PAYMENT_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

function config() {
  const tmnCode = String(process.env.VNPAY_TMN_CODE || '').trim();
  const hashSecret = String(process.env.VNPAY_HASH_SECRET || '').trim();
  const returnUrl = String(
    process.env.VNPAY_RETURN_URL ||
      (process.env.AUTH_PUBLIC_URL
        ? `${process.env.AUTH_PUBLIC_URL.replace(/\/$/, '')}/api/thanh-toan/vnpay/return`
        : ''),
  ).trim();
  if (!tmnCode || !hashSecret || !returnUrl) {
    const error = new Error('VNPAY chưa được cấu hình. Cần VNPAY_TMN_CODE, VNPAY_HASH_SECRET và VNPAY_RETURN_URL.');
    error.statusCode = 503;
    throw error;
  }
  return {
    tmnCode,
    hashSecret,
    returnUrl,
    paymentUrl: String(process.env.VNPAY_PAYMENT_URL || PAYMENT_URL).trim(),
    appReturnUrl: String(process.env.VNPAY_APP_RETURN_URL || 'cookmate://thanh-toan').trim(),
  };
}

const encode = (value) => encodeURIComponent(String(value)).replace(/%20/g, '+');
const canonical = (params) =>
  Object.keys(params)
    .filter((key) => key.startsWith('vnp_') && params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort()
    .map((key) => `${encode(key)}=${encode(params[key])}`)
    .join('&');

const sign = (params, secret) =>
  crypto.createHmac('sha512', secret).update(canonical(params), 'utf8').digest('hex');

function formatVnTime(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  );
  return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`;
}

function normalizeIp(value) {
  const ip = String(value || '127.0.0.1').split(',')[0].trim().replace(/^::ffff:/, '');
  return ip === '::1' ? '127.0.0.1' : ip.slice(0, 45);
}

function createPaymentUrl({ reference, amount, ipAddress, createdAt = new Date(), expiresAt }) {
  const settings = config();
  const expiry = expiresAt || new Date(createdAt.getTime() + 15 * 60 * 1000);
  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: settings.tmnCode,
    vnp_Amount: Math.round(Number(amount) * 100),
    vnp_CurrCode: 'VND',
    vnp_TxnRef: reference,
    vnp_OrderInfo: `Thanh toan Cookmate ${reference}`,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: settings.returnUrl,
    vnp_IpAddr: normalizeIp(ipAddress),
    vnp_CreateDate: formatVnTime(createdAt),
    vnp_ExpireDate: formatVnTime(expiry),
  };
  const secureHash = sign(params, settings.hashSecret);
  return {
    paymentUrl: `${settings.paymentUrl}?${canonical(params)}&vnp_SecureHash=${secureHash}`,
    expiresAt: expiry,
  };
}

function verifyCallback(query) {
  const settings = config();
  const received = String(query.vnp_SecureHash || '').toLowerCase();
  const params = {};
  for (const [key, value] of Object.entries(query)) {
    if (!key.startsWith('vnp_') || ['vnp_SecureHash', 'vnp_SecureHashType'].includes(key)) continue;
    if (Array.isArray(value)) return { valid: false, params: {}, settings };
    params[key] = value;
  }
  const expected = sign(params, settings.hashSecret);
  const valid = received.length === expected.length && crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  return { valid, params, settings };
}

module.exports = { canonical, config, createPaymentUrl, formatVnTime, sign, verifyCallback };
