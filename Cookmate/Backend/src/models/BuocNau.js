const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BuocNau = sequelize.define(
  'BuocNau',
  {
    idBuocNau: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    idMonAn: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    soThuTu: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    phienBan: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },

    tieuDe: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },

    huongDan: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    anh: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    thoiGian: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    ghiChu: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    ngayTao: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'BuocNau',
    indexes: [
      { unique: true, fields: ['idMonAn', 'phienBan', 'soThuTu'], name: 'uq_recipe_version_step' },
    ],
    timestamps: false,
  },
);

module.exports = BuocNau;
