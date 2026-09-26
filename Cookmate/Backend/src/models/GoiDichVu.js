const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GoiDichVu = sequelize.define(
  'GoiDichVu',
  {
    idGoiDichVu: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    maGoi: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    tenGoi: { type: DataTypes.STRING(80), allowNull: false },
    moTa: { type: DataTypes.TEXT, allowNull: true },
    giaThang: { type: DataTypes.DECIMAL(12, 0), allowNull: false, defaultValue: 0 },
    capDo: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    hanMucCongThucMoiMoiNgay: { type: DataTypes.INTEGER, allowNull: true },
    hienThiQuangCao: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    lapThucDonTuDong: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    phanTichDinhDuong: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    xuatDanhSachMuaSam: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    tuVanAi: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    noiDungDocQuyen: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    videoChiTiet: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    trangThai: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  },
  { tableName: 'GoiDichVu', timestamps: false },
);

module.exports = GoiDichVu;
