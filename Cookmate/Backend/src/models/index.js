const VaiTro = require('./VaiTro');
const NguoiDung = require('./NguoiDung');

const DanhMuc = require('./DanhMuc');
const MonAn = require('./MonAn');

const NguyenLieu = require('./NguyenLieu');
const MonAnNguyenLieu = require('./MonAnNguyenLieu');

const BuocNau = require('./BuocNau');
const HinhAnhMonAn = require('./HinhAnhMonAn');

const YeuThich = require('./YeuThich');
const DanhGia = require('./DanhGia');
const BinhLuan = require('./BinhLuan');

const LichSuNau = require('./LichSuNau');
const ChiTietLichSuNau = require('./ChiTietLichSuNau');

const ThongBao = require('./ThongBao');
const ThongBaoNguoiDung = require('./ThongBaoNguoiDung');
const ThietBiThongBao = require('./ThietBiThongBao');

const NhatKyHeThong = require('./NhatKyHeThong');
const GoiDichVu = require('./GoiDichVu');
const MucTieuAnUong = require('./MucTieuAnUong');
const GoiMucTieuAnUong = require('./GoiMucTieuAnUong');
const DangKyDichVu = require('./DangKyDichVu');
const NguoiDungMucTieu = require('./NguoiDungMucTieu');
const CongThucDaMo = require('./CongThucDaMo');

// ======================================================
// 1. VaiTro - NguoiDung
// ======================================================

VaiTro.hasMany(NguoiDung, {
  foreignKey: 'idVaiTro',
  as: 'nguoiDungs',
});

NguoiDung.belongsTo(VaiTro, {
  foreignKey: 'idVaiTro',
  as: 'vaiTro',
});

// ======================================================
// 2. DanhMuc - MonAn
// ======================================================

DanhMuc.hasMany(MonAn, {
  foreignKey: 'idDanhMuc',
  as: 'monAns',
});

MonAn.belongsTo(DanhMuc, {
  foreignKey: 'idDanhMuc',
  as: 'danhMuc',
});

NguoiDung.hasMany(MonAn, { foreignKey: 'idTacGia', as: 'monAnDaDang' });
MonAn.belongsTo(NguoiDung, { foreignKey: 'idTacGia', as: 'tacGia' });
NguoiDung.hasMany(MonAn, { foreignKey: 'idNguoiDuyet', as: 'monAnDaDuyet' });
MonAn.belongsTo(NguoiDung, { foreignKey: 'idNguoiDuyet', as: 'nguoiDuyet' });

// ======================================================
// 3. MonAn - NguyenLieu
// Quan hệ N-N thông qua MonAnNguyenLieu
// ======================================================

MonAn.belongsToMany(NguyenLieu, {
  through: MonAnNguyenLieu,
  foreignKey: 'idMonAn',
  otherKey: 'idNguyenLieu',
  as: 'nguyenLieus',
});

NguyenLieu.belongsToMany(MonAn, {
  through: MonAnNguyenLieu,
  foreignKey: 'idNguyenLieu',
  otherKey: 'idMonAn',
  as: 'monAns',
});

// ======================================================
// 4. MonAn - MonAnNguyenLieu
// ======================================================

MonAn.hasMany(MonAnNguyenLieu, {
  foreignKey: 'idMonAn',
  as: 'monAnNguyenLieus',
});

MonAnNguyenLieu.belongsTo(MonAn, {
  foreignKey: 'idMonAn',
  as: 'monAn',
});

// ======================================================
// 5. NguyenLieu - MonAnNguyenLieu
// ======================================================

NguyenLieu.hasMany(MonAnNguyenLieu, {
  foreignKey: 'idNguyenLieu',
  as: 'monAnNguyenLieus',
});

MonAnNguyenLieu.belongsTo(NguyenLieu, {
  foreignKey: 'idNguyenLieu',
  as: 'nguyenLieu',
});

// ======================================================
// 6. MonAn - BuocNau
// ======================================================

MonAn.hasMany(BuocNau, {
  foreignKey: 'idMonAn',
  as: 'buocNaus',
});

BuocNau.belongsTo(MonAn, {
  foreignKey: 'idMonAn',
  as: 'monAn',
});

// ======================================================
// 7. MonAn - HinhAnhMonAn
// ======================================================

MonAn.hasMany(HinhAnhMonAn, {
  foreignKey: 'idMonAn',
  as: 'hinhAnhs',
});

HinhAnhMonAn.belongsTo(MonAn, {
  foreignKey: 'idMonAn',
  as: 'monAn',
});

// ======================================================
// 8. NguoiDung - YeuThich - MonAn
// ======================================================

NguoiDung.belongsToMany(MonAn, {
  through: YeuThich,
  foreignKey: 'idNguoiDung',
  otherKey: 'idMonAn',
  as: 'monAnYeuThich',
});

MonAn.belongsToMany(NguoiDung, {
  through: YeuThich,
  foreignKey: 'idMonAn',
  otherKey: 'idNguoiDung',
  as: 'nguoiDungYeuThich',
});

// Quan hệ trực tiếp với bảng YeuThich

NguoiDung.hasMany(YeuThich, {
  foreignKey: 'idNguoiDung',
  as: 'yeuThichs',
});

YeuThich.belongsTo(NguoiDung, {
  foreignKey: 'idNguoiDung',
  as: 'nguoiDung',
});

MonAn.hasMany(YeuThich, {
  foreignKey: 'idMonAn',
  as: 'yeuThichs',
});

YeuThich.belongsTo(MonAn, {
  foreignKey: 'idMonAn',
  as: 'monAn',
});

// ======================================================
// 9. NguoiDung - DanhGia - MonAn
// ======================================================

NguoiDung.hasMany(DanhGia, {
  foreignKey: 'idNguoiDung',
  as: 'danhGias',
});

DanhGia.belongsTo(NguoiDung, {
  foreignKey: 'idNguoiDung',
  as: 'nguoiDung',
});

MonAn.hasMany(DanhGia, {
  foreignKey: 'idMonAn',
  as: 'danhGias',
});

DanhGia.belongsTo(MonAn, {
  foreignKey: 'idMonAn',
  as: 'monAn',
});

// ======================================================
// 10. NguoiDung - BinhLuan - MonAn
// ======================================================

NguoiDung.hasMany(BinhLuan, {
  foreignKey: 'idNguoiDung',
  as: 'binhLuans',
});

BinhLuan.belongsTo(NguoiDung, {
  foreignKey: 'idNguoiDung',
  as: 'nguoiDung',
});

MonAn.hasMany(BinhLuan, {
  foreignKey: 'idMonAn',
  as: 'binhLuans',
});

BinhLuan.belongsTo(MonAn, {
  foreignKey: 'idMonAn',
  as: 'monAn',
});

// ======================================================
// 11. BinhLuan tự tham chiếu
// Bình luận cha - bình luận con
// ======================================================

BinhLuan.hasMany(BinhLuan, {
  foreignKey: 'idBinhLuanCha',
  as: 'binhLuanCon',
});

BinhLuan.belongsTo(BinhLuan, {
  foreignKey: 'idBinhLuanCha',
  as: 'binhLuanCha',
});

// ======================================================
// 12. NguoiDung - LichSuNau - MonAn
// ======================================================

NguoiDung.hasMany(LichSuNau, {
  foreignKey: 'idNguoiDung',
  as: 'lichSuNaus',
});

LichSuNau.belongsTo(NguoiDung, {
  foreignKey: 'idNguoiDung',
  as: 'nguoiDung',
});

MonAn.hasMany(LichSuNau, {
  foreignKey: 'idMonAn',
  as: 'lichSuNaus',
});

LichSuNau.belongsTo(MonAn, {
  foreignKey: 'idMonAn',
  as: 'monAn',
});

// ======================================================
// 13. LichSuNau - ChiTietLichSuNau
// ======================================================

LichSuNau.hasMany(ChiTietLichSuNau, {
  foreignKey: 'idLichSu',
  as: 'chiTietLichSuNaus',
});

ChiTietLichSuNau.belongsTo(LichSuNau, {
  foreignKey: 'idLichSu',
  as: 'lichSuNau',
});

// ======================================================
// 14. BuocNau - ChiTietLichSuNau
// ======================================================

BuocNau.hasMany(ChiTietLichSuNau, {
  foreignKey: 'idBuocNau',
  as: 'chiTietLichSuNaus',
});

ChiTietLichSuNau.belongsTo(BuocNau, {
  foreignKey: 'idBuocNau',
  as: 'buocNau',
});

// ======================================================
// 15. ThongBao - ThongBaoNguoiDung
// ======================================================

ThongBao.hasMany(ThongBaoNguoiDung, {
  foreignKey: 'idThongBao',
  as: 'thongBaoNguoiDungs',
});

ThongBaoNguoiDung.belongsTo(ThongBao, {
  foreignKey: 'idThongBao',
  as: 'thongBao',
});

// ======================================================
// 16. NguoiDung - ThongBaoNguoiDung
// ======================================================

NguoiDung.hasMany(ThongBaoNguoiDung, {
  foreignKey: 'idNguoiDung',
  as: 'thongBaoNguoiDungs',
});

ThongBaoNguoiDung.belongsTo(NguoiDung, {
  foreignKey: 'idNguoiDung',
  as: 'nguoiDung',
});

// ======================================================
// 17. NguoiDung - ThongBao
// Quan hệ N-N thông qua ThongBaoNguoiDung
// ======================================================

NguoiDung.belongsToMany(ThongBao, {
  through: ThongBaoNguoiDung,
  foreignKey: 'idNguoiDung',
  otherKey: 'idThongBao',
  as: 'thongBaos',
});

ThongBao.belongsToMany(NguoiDung, {
  through: ThongBaoNguoiDung,
  foreignKey: 'idThongBao',
  otherKey: 'idNguoiDung',
  as: 'nguoiDungs',
});

NguoiDung.hasMany(ThietBiThongBao, {
  foreignKey: 'idNguoiDung',
  as: 'thietBiThongBaos',
  onDelete: 'CASCADE',
});

ThietBiThongBao.belongsTo(NguoiDung, {
  foreignKey: 'idNguoiDung',
  as: 'nguoiDung',
});

// ======================================================
// 18. NguoiDung - NhatKyHeThong
// ======================================================

NguoiDung.hasMany(NhatKyHeThong, {
  foreignKey: 'idNguoiDung',
  as: 'nhatKyHeThongs',
});

NhatKyHeThong.belongsTo(NguoiDung, {
  foreignKey: 'idNguoiDung',
  as: 'nguoiDung',
});

// ======================================================
// 19. Thuê bao, mục tiêu ăn uống và hạn mức công thức
// ======================================================

NguoiDung.hasMany(DangKyDichVu, { foreignKey: 'idNguoiDung', as: 'dangKyDichVus' });
DangKyDichVu.belongsTo(NguoiDung, { foreignKey: 'idNguoiDung', as: 'nguoiDung' });
GoiDichVu.hasMany(DangKyDichVu, { foreignKey: 'idGoiDichVu', as: 'dangKyDichVus' });
DangKyDichVu.belongsTo(GoiDichVu, { foreignKey: 'idGoiDichVu', as: 'goiDichVu' });

GoiDichVu.belongsToMany(MucTieuAnUong, {
  through: GoiMucTieuAnUong,
  foreignKey: 'idGoiDichVu',
  otherKey: 'idMucTieuAnUong',
  as: 'mucTieuAnUongs',
});
MucTieuAnUong.belongsToMany(GoiDichVu, {
  through: GoiMucTieuAnUong,
  foreignKey: 'idMucTieuAnUong',
  otherKey: 'idGoiDichVu',
  as: 'goiDichVus',
});

NguoiDung.hasMany(NguoiDungMucTieu, { foreignKey: 'idNguoiDung', as: 'quyenMucTieuAnUongs' });
NguoiDungMucTieu.belongsTo(NguoiDung, { foreignKey: 'idNguoiDung', as: 'nguoiDung' });
MucTieuAnUong.hasMany(NguoiDungMucTieu, {
  foreignKey: 'idMucTieuAnUong',
  as: 'quyenNguoiDungs',
});
NguoiDungMucTieu.belongsTo(MucTieuAnUong, {
  foreignKey: 'idMucTieuAnUong',
  as: 'mucTieuAnUong',
});

NguoiDung.hasMany(CongThucDaMo, { foreignKey: 'idNguoiDung', as: 'congThucDaMos' });
CongThucDaMo.belongsTo(NguoiDung, { foreignKey: 'idNguoiDung', as: 'nguoiDung' });
MonAn.hasMany(CongThucDaMo, { foreignKey: 'idMonAn', as: 'luotMoDauTiens' });
CongThucDaMo.belongsTo(MonAn, { foreignKey: 'idMonAn', as: 'monAn' });

// ======================================================
// Export tất cả Model
// ======================================================

module.exports = {
  AuthIdentity: require('./AuthIdentity'),
  AuthChallenge: require('./AuthChallenge'),
  VaiTro,
  NguoiDung,
  DanhMuc,
  MonAn,
  NguyenLieu,
  MonAnNguyenLieu,
  BuocNau,
  HinhAnhMonAn,
  YeuThich,
  DanhGia,
  BinhLuan,
  LichSuNau,
  ChiTietLichSuNau,
  ThongBao,
  ThongBaoNguoiDung,
  ThietBiThongBao,
  NhatKyHeThong,
  GoiDichVu,
  MucTieuAnUong,
  GoiMucTieuAnUong,
  DangKyDichVu,
  NguoiDungMucTieu,
  CongThucDaMo,
};
