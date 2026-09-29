const nodemailer = require('nodemailer');

let boChuyenThu = null;
let chuKyBoChuyenThu = '';
let chuKyDaXacNhan = '';
const hopThuKiemThu = [];

const laCheDoXemTruoc = () =>
  String(process.env.EMAIL_DEV_PREVIEW || '').toLowerCase() === 'true';

const layCauHinhSmtp = () => {
  const host = String(process.env.SMTP_HOST || '').trim();
  const user = String(process.env.SMTP_USER || '').trim();
  const password = String(process.env.SMTP_PASSWORD || '');
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  return {
    host,
    user,
    password,
    port,
    secure,
    from: String(process.env.EMAIL_FROM || '').trim() || `Cookmate <${user}>`,
  };
};

const taoLoiDichVuEmail = (message, cause) =>
  Object.assign(new Error(message, cause ? { cause } : undefined), {
    statusCode: 503,
    expose: true,
    code: 'EMAIL_SERVICE_UNAVAILABLE',
  });

const taoBoChuyenThu = () => {
  const cauHinh = layCauHinhSmtp();
  const chuKy = JSON.stringify([
    cauHinh.host,
    cauHinh.port,
    cauHinh.secure,
    cauHinh.user,
    cauHinh.password,
  ]);
  if (boChuyenThu && chuKyBoChuyenThu === chuKy) return boChuyenThu;
  boChuyenThu = nodemailer.createTransport({
    host: cauHinh.host,
    port: cauHinh.port,
    secure: cauHinh.secure,
    auth: { user: cauHinh.user, pass: cauHinh.password },
  });
  chuKyBoChuyenThu = chuKy;
  chuKyDaXacNhan = '';
  return boChuyenThu;
};

const damBaoEmailSanSang = async () => {
  if (process.env.NODE_ENV === 'test' || laCheDoXemTruoc()) return;

  const cauHinh = layCauHinhSmtp();
  const truongBiThieu = [
    ['SMTP_HOST', cauHinh.host],
    ['SMTP_USER', cauHinh.user],
    ['SMTP_PASSWORD', cauHinh.password],
  ]
    .filter(([, giaTri]) => !giaTri)
    .map(([ten]) => ten);

  if (truongBiThieu.length) {
    console.error(`[EMAIL] Thiếu cấu hình: ${truongBiThieu.join(', ')}`);
    throw taoLoiDichVuEmail(
      'Dịch vụ email tạm thời chưa sẵn sàng. Vui lòng thử lại sau.',
    );
  }

  if (!Number.isInteger(cauHinh.port) || cauHinh.port < 1 || cauHinh.port > 65535) {
    console.error('[EMAIL] SMTP_PORT không hợp lệ.');
    throw taoLoiDichVuEmail(
      'Dịch vụ email tạm thời chưa sẵn sàng. Vui lòng thử lại sau.',
    );
  }

  const transporter = taoBoChuyenThu();
  if (chuKyDaXacNhan === chuKyBoChuyenThu) return;
  try {
    await transporter.verify();
    chuKyDaXacNhan = chuKyBoChuyenThu;
  } catch (error) {
    console.error(`[EMAIL] Không thể kết nối hoặc xác thực SMTP: ${error.message}`);
    throw taoLoiDichVuEmail(
      'Dịch vụ email tạm thời chưa sẵn sàng. Vui lòng thử lại sau.',
      error,
    );
  }
};

const guiEmail = async ({ den, tieuDe, vanBan, html, thongTinKiemThu }) => {
  if (process.env.NODE_ENV === 'test') {
    hopThuKiemThu.push({ den, tieuDe, vanBan, html, ...thongTinKiemThu });
    return { messageId: `test-${hopThuKiemThu.length}` };
  }
  if (laCheDoXemTruoc()) {
    console.info(`[EMAIL DEV] ${tieuDe}: ${den}\n${vanBan}`);
    return { messageId: null, development: true };
  }
  await damBaoEmailSanSang();
  const cauHinh = layCauHinhSmtp();
  try {
    return await taoBoChuyenThu().sendMail({
      from: cauHinh.from,
      to: den,
      subject: tieuDe,
      text: vanBan,
      html,
    });
  } catch (error) {
    chuKyDaXacNhan = '';
    console.error(`[EMAIL] Gửi thư thất bại: ${error.message}`);
    throw taoLoiDichVuEmail(
      'Không thể gửi email lúc này. Vui lòng thử lại sau.',
      error,
    );
  }
};

module.exports = { damBaoEmailSanSang, guiEmail, hopThuKiemThu };
