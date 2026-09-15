const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const BinhLuan = sequelize.define(
    "BinhLuan",
    {
        idBinhLuan: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        idNguoiDung: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        idMonAn: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        idBinhLuanCha: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        noiDung: {
            type: DataTypes.TEXT,
            allowNull: false
        },

        trangThai: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 1
        },

        ngayBinhLuan: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },

        ngayCapNhat: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: "BinhLuan",
        timestamps: false
    }
);

module.exports = BinhLuan;