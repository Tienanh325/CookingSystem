const { Op } = require('sequelize');
const db = require('../models');

const GOI_MAC_DINH = [
  {
    maGoi: 'FREE',
    tenGoi: 'Miễn phí',
    moTa: 'Công thức cơ bản, tối đa 10 công thức chưa từng mở mỗi ngày.',
    giaThang: 0,
    capDo: 0,
    hanMucCongThucMoiMoiNgay: 10,
    hienThiQuangCao: 1,
  },
  {
    maGoi: 'BASIC',
    tenGoi: 'Basic',
    moTa: 'Toàn bộ công thức thường và không quảng cáo.',
    giaThang: 39000,
    capDo: 1,
  },
  {
    maGoi: 'PRO',
    tenGoi: 'Pro',
    moTa: 'Lập thực đơn tuần, phân tích dinh dưỡng và danh sách mua sắm.',
    giaThang: 79000,
    capDo: 2,
    lapThucDonTuDong: 1,
    phanTichDinhDuong: 1,
    xuatDanhSachMuaSam: 1,
  },
  {
    maGoi: 'CHEF',
    tenGoi: 'Chef',
    moTa: 'Tư vấn AI, nội dung độc quyền và video hướng dẫn chi tiết.',
    giaThang: 149000,
    capDo: 3,
    lapThucDonTuDong: 1,
    phanTichDinhDuong: 1,
    xuatDanhSachMuaSam: 1,
    tuVanAi: 1,
    noiDungDocQuyen: 1,
    videoChiTiet: 1,
  },
];

const MUC_TIEU_MAC_DINH = [
  ['EAT_HEALTHY', 'Eat Healthy', 'Thực đơn cân bằng, giảm cân và eat clean.', 29000],
  ['GYM_FITNESS', 'Gym & Fitness', 'Công thức giàu protein hỗ trợ luyện tập.', 29000],
  ['VEGETARIAN', 'Vegetarian', 'Công thức và thực đơn chay.', 29000],
  ['FAMILY', 'Family Pack', 'Món ăn phù hợp gia đình từ 4 đến 6 người.', 39000],
];

async function damBaoDanhMucGoi(transaction) {
  const plans = {};
  for (const item of GOI_MAC_DINH) {
    const [plan] = await db.GoiDichVu.findOrCreate({
      where: { maGoi: item.maGoi },
      defaults: item,
      transaction,
    });
    plans[item.maGoi] = plan;
  }
  const goals = [];
  for (const [maMucTieu, tenMucTieu, moTa, giaMuaLe] of MUC_TIEU_MAC_DINH) {
    const [goal] = await db.MucTieuAnUong.findOrCreate({
      where: { maMucTieu },
      defaults: { maMucTieu, tenMucTieu, moTa, giaMuaLe },
      transaction,
    });
    goals.push(goal);
  }
  for (const code of ['PRO', 'CHEF']) {
    await db.GoiMucTieuAnUong.bulkCreate(
      goals.map((goal) => ({
        idGoiDichVu: plans[code].idGoiDichVu,
        idMucTieuAnUong: goal.idMucTieuAnUong,
      })),
      { ignoreDuplicates: true, transaction },
    );
  }
}

async function layGoiHienTai(idNguoiDung) {
  if (!idNguoiDung) return db.GoiDichVu.findOne({ where: { maGoi: 'FREE', trangThai: 1 } });
  const now = new Date();
  const active = await db.DangKyDichVu.findOne({
    where: {
      idNguoiDung,
      trangThai: 'HOAT_DONG',
      [Op.or]: [{ thoiGianKetThuc: null }, { thoiGianKetThuc: { [Op.gt]: now } }],
    },
    include: [{ model: db.GoiDichVu, as: 'goiDichVu', where: { trangThai: 1 } }],
    order: [[db.GoiDichVu, 'capDo', 'DESC'], ['thoiGianBatDau', 'DESC']],
  });
  return active?.goiDichVu || db.GoiDichVu.findOne({ where: { maGoi: 'FREE', trangThai: 1 } });
}

async function layQuyenNguoiDung(idNguoiDung) {
  const goi = await layGoiHienTai(idNguoiDung);
  const goals = goi
    ? await goi.getMucTieuAnUongs({ where: { trangThai: 1 }, joinTableAttributes: [] })
    : [];
  const purchased = idNguoiDung
    ? await db.NguoiDungMucTieu.findAll({
        where: {
          idNguoiDung,
          trangThai: 1,
          [Op.or]: [{ thoiGianKetThuc: null }, { thoiGianKetThuc: { [Op.gt]: new Date() } }],
        },
        include: [{ model: db.MucTieuAnUong, as: 'mucTieuAnUong', where: { trangThai: 1 } }],
      })
    : [];
  const mucTieu = new Map(goals.map((item) => [item.maMucTieu, item]));
  for (const item of purchased) mucTieu.set(item.mucTieuAnUong.maMucTieu, item.mucTieuAnUong);
  return { goi, mucTieuAnUongs: [...mucTieu.values()] };
}

module.exports = { GOI_MAC_DINH, MUC_TIEU_MAC_DINH, damBaoDanhMucGoi, layGoiHienTai, layQuyenNguoiDung };
