const nodemailer = require('nodemailer');

let boChuyenThu = null;
const hopThuKiemThu = [];

const taoBoChuyenThu = () => {
  if (boChuyenThu) return boChuyenThu;
  if (!process.env.SMTP_HOST) return null;
  boChuyenThu = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  return boChuyenThu;
};

const guiEmail = async ({ den, tieuDe, vanBan, html, thongTinKiemThu }) => {
  if (process.env.NODE_ENV === 'test') {
    hopThuKiemThu.push({ den, tieuDe, vanBan, html, ...thongTinKiemThu });
    return { messageId: `test-${hopThuKiemThu.length}` };
  }
  const transporter = taoBoChuyenThu();
  if (!transporter) {
    if (process.env.NODE_ENV === 'production')
      throw new Error('SMTP chưa được cấu hình trên máy chủ.');
    console.info(`[EMAIL DEV] ${tieuDe}: ${den}\n${vanBan}`);
    return { messageId: null, development: true };
  }
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Cookmate <no-reply@cookmate.local>',
    to: den,
    subject: tieuDe,
    text: vanBan,
    html,
  });
};

module.exports = { guiEmail, hopThuKiemThu };
