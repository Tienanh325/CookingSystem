const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const NhatKyHeThong = sequelize.define(
    "NhatKyHeThong",
    {
        idNhatKy: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        idNguoiDung: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        hanhDong: {
            type: DataTypes.STRING(100),
            allowNull: false
        },

        bangDuLieu: {
            type: DataTypes.STRING(100),
            allowNull: true
        },

        idBanGhi: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        noiDung: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        thoiGian: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: "NhatKyHeThong",
        timestamps: false
    }
);

module.exports = NhatKyHeThong;