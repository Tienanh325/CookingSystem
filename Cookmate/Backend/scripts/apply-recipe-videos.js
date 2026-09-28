require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const assert = require('node:assert/strict');
const videos = require('./recipe-videos.json');
const db = require('../src/models');
const sequelize = require('../src/config/database');

async function run() {
  assert.equal(videos.length, 60, 'The recipe video catalog must contain 60 entries.');
  await sequelize.transaction(async (transaction) => {
    for (const video of videos) {
      const recipe = await db.MonAn.findOne({ where: { tenMonAn: video.tenMonAn }, transaction });
      assert.ok(recipe, `Recipe not found: ${video.tenMonAn}`);
      await recipe.update({ videoHuongDan: video.url }, { transaction });
    }
  });
  console.log(`Updated ${videos.length} recipes with verified YouTube tutorials.`);
}

if (require.main === module) run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => sequelize.close());
module.exports = run;
