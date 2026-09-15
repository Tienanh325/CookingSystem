const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ThongBaoNguoiDung = sequelize.define(
    "ThongBaoNguoiDung",
    {
        idThongBao: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false
        },

        idNguoiDung: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false
        },

        daDoc: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 0
        },

        thoiGianDoc: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
    {
        tableName: "ThongBaoNguoiDung",
        timestamps: false
    }
);

module.exports = ThongBaoNguoiDung;