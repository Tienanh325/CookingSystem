const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MonAn = sequelize.define(
  'MonAn',
  {
    idMonAn: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    idDanhMuc: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    idTacGia: { type: DataTypes.INTEGER, allowNull: true },
    idNguoiDuyet: { type: DataTypes.INTEGER, allowNull: true },
    phienBan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    nguonNoiDung: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'BIEN_TAP' },
    trangThaiDuyet: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'DA_DUYET' },
    lyDoTuChoi: { type: DataTypes.STRING(1000), allowNull: true },
    ngayGuiDuyet: { type: DataTypes.DATE, allowNull: true },
    ngayDuyet: { type: DataTypes.DATE, allowNull: true },
    capTruyCapToiThieu: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'FREE' },

    tenMonAn: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },

    moTa: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    gioiThieu: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    anhDaiDien: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    thoiGianChuanBi: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    thoiGianNau: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    tongThoiGian: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    doKho: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'DE',
    },

    khauPhan: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    luotXem: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    diemDanhGia: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 0.0,
    },

    trangThai: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
    },

    ngayTao: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    ngayCapNhat: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'MonAn',
    timestamps: false,
  },
);

module.exports = MonAn;
