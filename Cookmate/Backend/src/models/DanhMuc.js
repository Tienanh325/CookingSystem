const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const DanhMuc = sequelize.define(
    "DanhMuc",
    {
        idDanhMuc: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        tenDanhMuc: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },

        moTa: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        anh: {
            type: DataTypes.STRING(255),
            allowNull: true
        },

        trangThai: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 1
        },

        ngayTao: {
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
        tableName: "DanhMuc",
        timestamps: false
    }
);

module.exports = DanhMuc;