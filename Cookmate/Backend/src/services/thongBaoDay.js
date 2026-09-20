const db = require('../models');

const laExpoToken = (token) => /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token);

const guiThongBaoDay = async (idNguoiDungs, thongBao) => {
  const thietBis = await db.ThietBiThongBao.findAll({
    where: { idNguoiDung: idNguoiDungs, hoatDong: 1 },
  });
  const hopLe = thietBis.filter((item) => laExpoToken(item.token));
  if (!hopLe.length) return { daGui: 0, thatBai: 0 };
  const thongDieps = hopLe.map((item) => ({
    to: item.token,
    sound: 'default',
    channelId: 'default',
    title: thongBao.tieuDe,
    body: thongBao.noiDung,
    data: {
      idThongBao: thongBao.idThongBao,
      loai: thongBao.loai,
      duongDan: thongBao.duongDan,
    },
  }));
  let daGui = 0;
  let thatBai = 0;
  for (let i = 0; i < thongDieps.length; i += 100) {
    const nhom = thongDieps.slice(i, i + 100);
    const phanHoi = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(process.env.EXPO_ACCESS_TOKEN
          ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(nhom),
    });
    if (!phanHoi.ok) throw new Error(`Expo Push trả về HTTP ${phanHoi.status}.`);
    const ketQua = await phanHoi.json();
    const ve = Array.isArray(ketQua.data) ? ketQua.data : [ketQua.data];
    const tokenHong = [];
    ve.forEach((item, viTri) => {
      if (item?.status === 'ok') daGui += 1;
      else {
        thatBai += 1;
        if (item?.details?.error === 'DeviceNotRegistered')
          tokenHong.push(nhom[viTri]?.to);
      }
    });
    if (tokenHong.length)
      await db.ThietBiThongBao.update(
        { hoatDong: 0, ngayCapNhat: new Date() },
        { where: { token: tokenHong } },
      );
  }
  return { daGui, thatBai };
};

module.exports = { guiThongBaoDay, laExpoToken };
