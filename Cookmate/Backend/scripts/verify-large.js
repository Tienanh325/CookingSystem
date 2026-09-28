require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const assert = require('node:assert/strict');
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
  console.table(rows);
  console.log(`PASS: ${rows.length} bảng đều có tối thiểu 50 bản ghi và không có khóa ngoại mồ côi.`);
}

verifyLarge().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => sequelize.close());
