const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NguyenLieu = sequelize.define(
  'NguyenLieu',
  {
    idNguyenLieu: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    tenNguyenLieu: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },

    donViMacDinh: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    moTa: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    nangLuongKcal: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    proteinG: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    carbG: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    chatBeoG: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    chatXoG: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    natriMg: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },

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
    tableName: 'NguyenLieu',
    timestamps: false,
  },
);

module.exports = NguyenLieu;
