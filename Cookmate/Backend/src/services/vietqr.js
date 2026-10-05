const QUICK_LINK_ORIGIN = 'https://img.vietqr.io/image';

function configurationError(message) {
  const configError = new Error(message);
  configError.statusCode = 503;
  return configError;
}

function config() {
  const settings = {
    bankId: String(process.env.VIETQR_BANK_ID || 'TCB').trim(),
    bankName: String(process.env.VIETQR_BANK_NAME || 'Techcombank').trim(),
    accountNo: String(process.env.VIETQR_ACCOUNT_NO || '9330302005').trim(),
    accountName: String(process.env.VIETQR_ACCOUNT_NAME || 'DƯƠNG TIẾN ANH').trim(),
    template: String(process.env.VIETQR_TEMPLATE || 'print').trim(),
    quickLinkOrigin: String(process.env.VIETQR_QUICK_LINK_ORIGIN || QUICK_LINK_ORIGIN)
      .trim()
      .replace(/\/$/, ''),
  };
  if (!/^[A-Za-z0-9]+$/.test(settings.bankId))
    throw configurationError('VIETQR_BANK_ID không hợp lệ.');
  if (!/^[A-Za-z0-9]{6,19}$/.test(settings.accountNo))
    throw configurationError('VIETQR_ACCOUNT_NO không hợp lệ.');
  if (!settings.accountName || settings.accountName.length > 50)
    throw configurationError('VIETQR_ACCOUNT_NAME không hợp lệ.');
  if (!/^[A-Za-z0-9_-]+$/.test(settings.template))
    throw configurationError('VIETQR_TEMPLATE không hợp lệ.');
  return settings;
}

function createQrUrl({ amount, addInfo }) {
  const settings = config();
  const numericAmount = Number(amount);
  const description = String(addInfo || '').trim();
  if (!Number.isSafeInteger(numericAmount) || numericAmount <= 0)
    throw new Error('Số tiền tạo VietQR không hợp lệ.');
  if (!description || description.length > 50 || /[^A-Za-z0-9 ]/.test(description))
    throw new Error('Nội dung chuyển khoản VietQR không hợp lệ.');
  const url = new URL(
    `${settings.quickLinkOrigin}/${settings.bankId}-${settings.accountNo}-${settings.template}.png`,
  );
  url.searchParams.set('amount', String(numericAmount));
  url.searchParams.set('addInfo', description);
  url.searchParams.set('accountName', settings.accountName);
  return url.toString();
}

module.exports = { config, createQrUrl };
