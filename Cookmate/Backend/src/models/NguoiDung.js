const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NguoiDung = sequelize.define(
  'NguoiDung',
  {
    idNguoiDung: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    idVaiTro: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tokenVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    hoTen: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
      unique: true,
    },

    matKhau: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    soDienThoai: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    anhDaiDien: {
      type: DataTypes.STRING(255),
      allowNull: true,
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
    tableName: 'NguoiDung',
    timestamps: false,
  },
);

module.exports = NguoiDung;
