const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const YeuThich = sequelize.define(
    "YeuThich",
    {
        idNguoiDung: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false
        },

        idMonAn: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false
        },

        ngayThem: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: "YeuThich",
        timestamps: false
    }
);

module.exports = YeuThich;