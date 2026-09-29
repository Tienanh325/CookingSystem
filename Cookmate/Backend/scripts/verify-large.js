require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const assert = require('node:assert/strict');
const { Op } = require('sequelize');
const db = require('../src/models');
const sequelize = require('../src/config/database');

async function verifyLarge() {
  const rows = [];
  for (const [name, model] of Object.entries(db)) {
    const count = await model.count();
    rows.push({ table: name, count, status: count >= 50 ? 'PASS' : 'FAIL' });
    assert.ok(count >= 50, `${name}: chỉ có ${count} bản ghi`);
  }
  const quote = (name) => sequelize.getQueryInterface().queryGenerator.quoteIdentifier(name);
  const [foreignKeys] = await sequelize.query(`SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL`);
  for (const fk of foreignKeys) {
    const [result] = await sequelize.query(`SELECT COUNT(*) AS n FROM ${quote(fk.TABLE_NAME)} child LEFT JOIN ${quote(fk.REFERENCED_TABLE_NAME)} parent ON child.${quote(fk.COLUMN_NAME)} = parent.${quote(fk.REFERENCED_COLUMN_NAME)} WHERE child.${quote(fk.COLUMN_NAME)} IS NOT NULL AND parent.${quote(fk.REFERENCED_COLUMN_NAME)} IS NULL`);
    assert.equal(Number(result[0].n), 0, `Khóa ngoại mồ côi: ${fk.TABLE_NAME}.${fk.COLUMN_NAME}`);
  }
  const seededIngredients = await db.NguyenLieu.findAll({
    where: { moTa: { [Op.like]: 'COOKMATE_LARGE_V1:%' } },
    attributes: ['donViMacDinh'],
    raw: true,
  });
  const ingredientUnits = new Set(seededIngredients.map((item) => item.donViMacDinh));
  const seededRecipeIngredients = await db.MonAnNguyenLieu.findAll({
    include: [{
      model: db.MonAn,
      as: 'monAn',
      where: { gioiThieu: { [Op.like]: 'COOKMATE_LARGE_V1:%' } },
      attributes: [],
    }],
    attributes: ['donVi'],
    raw: true,
  });
  const recipeUnits = new Set(seededRecipeIngredients.map((item) => item.donVi));
  assert.equal(seededIngredients.length, 50, 'Bộ dữ liệu lớn phải có 50 nguyên liệu');
  assert.ok(ingredientUnits.size >= 10, `Đơn vị nguyên liệu chưa đa dạng: ${[...ingredientUnits].join(', ')}`);
  assert.ok(recipeUnits.size >= 10, `Định lượng công thức chưa đa dạng: ${[...recipeUnits].join(', ')}`);
  console.table(rows);
  console.log(`PASS: ${rows.length} bảng đều có tối thiểu 50 bản ghi, không có khóa ngoại mồ côi và có ${recipeUnits.size} nhóm đơn vị định lượng.`);
}

verifyLarge().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => sequelize.close());
