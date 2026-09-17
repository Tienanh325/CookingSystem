const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LichSuNau = sequelize.define(
  'LichSuNau',
  {
    idLichSu: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    idNguoiDung: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    idMonAn: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    congThucSnapshot: { type: DataTypes.JSON, allowNull: true },

    thoiGianBatDau: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    thoiGianKetThuc: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    trangThai: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'DANG_NAU',
    },

    buocHienTai: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    tableName: 'LichSuNau',
    timestamps: false,
  },
);

module.exports = LichSuNau;
