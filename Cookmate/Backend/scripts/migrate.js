require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const { DataTypes } = require('sequelize');
const sequelize = require('../src/config/database');
require('../src/models');

async function migrate() {
  const qi = sequelize.getQueryInterface();
  const tables = (await qi.showAllTables()).map((t) => String(t).toLowerCase());
  const changes = [
    ['NguoiDung', 'tokenVersion', { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }],
    ['NguoiDung', 'emailDaXacMinh', { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 }],
    ['NguoiDung', 'thoiGianXacMinhEmail', { type: DataTypes.DATE, allowNull: true }],
    ['MonAn', 'phienBan', { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }],
    ['BuocNau', 'phienBan', { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }],
    ['LichSuNau', 'congThucSnapshot', { type: DataTypes.JSON, allowNull: true }],
    ['MonAn', 'idTacGia', { type: DataTypes.INTEGER, allowNull: true }],
    ['MonAn', 'idNguoiDuyet', { type: DataTypes.INTEGER, allowNull: true }],
    [
      'MonAn',
      'nguonNoiDung',
      { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'BIEN_TAP' },
    ],
    [
      'MonAn',
      'trangThaiDuyet',
      { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'DA_DUYET' },
    ],
    ['MonAn', 'lyDoTuChoi', { type: DataTypes.STRING(1000), allowNull: true }],
    ['MonAn', 'ngayGuiDuyet', { type: DataTypes.DATE, allowNull: true }],
    ['MonAn', 'ngayDuyet', { type: DataTypes.DATE, allowNull: true }],
    [
      'MonAn',
      'capTruyCapToiThieu',
      { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'FREE' },
    ],
  ];
  for (const [table, column, definition] of changes) {
    if (tables.includes(table.toLowerCase()) && !(await qi.describeTable(table))[column])
      await qi.addColumn(table, column, definition);
  }
  if (tables.includes('buocnau')) {
    const indexes = await qi.showIndex('BuocNau');
    if (!indexes.some((i) => i.name === 'uq_recipe_version_step'))
      await qi.addIndex('BuocNau', ['idMonAn', 'phienBan', 'soThuTu'], {
        unique: true,
        name: 'uq_recipe_version_step',
      });
    for (const i of indexes)
      if (i.unique && i.fields.map((f) => f.attribute).join(',') === 'idMonAn,soThuTu')
        await qi.removeIndex('BuocNau', i.name);
  }
  // No force/alter: creates missing tables only; existing rows remain intact.
  if (tables.includes('nguoidung')) {
    const columns = await qi.describeTable('NguoiDung');
    for (const [column, size] of [
      ['email', 150],
      ['matKhau', 255],
    ]) {
      if (!columns[column].allowNull)
        await qi.changeColumn('NguoiDung', column, {
          type: DataTypes.STRING(size),
          allowNull: true,
        });
    }
  }
  await sequelize.sync();
  await require('../src/services/goiDichVu').damBaoDanhMucGoi();
  console.log(
    'Schema ready: authentication, recipe history and subscription catalog.',
  );
}
module.exports = migrate;
if (require.main === module)
  migrate()
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => sequelize.close());
