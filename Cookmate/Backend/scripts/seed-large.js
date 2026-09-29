require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const db = require('../src/models');
const sequelize = require('../src/config/database');
const recipeImages = require('./recipe-images');
const recipeVideos = require('./recipe-videos.json');

const SIZE = 50;
const MARKER = 'COOKMATE_LARGE_V1';
const pad = (value) => String(value).padStart(2, '0');
const day = (index) => new Date(Date.UTC(2026, index % 12, (index % 25) + 1, 5, 0, 0));
const dateOnly = (value) => value.toISOString().slice(0, 10);

const categoryNames = [
  'Món cơm', 'Món canh', 'Món kho', 'Món xào', 'Món hấp', 'Món nướng', 'Món chiên', 'Món luộc',
  'Món cuốn', 'Món gỏi', 'Món súp', 'Món cháo', 'Bún và phở', 'Mì và nui', 'Bánh Việt',
  'Bữa sáng', 'Bữa trưa', 'Bữa tối', 'Bữa phụ', 'Món chay', 'Eat Clean', 'Giàu protein',
  'Ít tinh bột', 'Ít chất béo', 'Giàu chất xơ', 'Món cho bé', 'Món gia đình', 'Món tiệc',
  'Món nhanh', 'Nồi chiên không dầu', 'Món miền Bắc', 'Món miền Trung', 'Món miền Nam',
  'Món Á', 'Món Âu', 'Món Nhật', 'Món Hàn', 'Món Thái', 'Đồ uống', 'Sinh tố', 'Nước ép',
  'Tráng miệng', 'Bánh ngọt', 'Salad', 'Sốt và nước chấm', 'Món theo mùa', 'Món lễ Tết',
  'Món dã ngoại', 'Món tiết kiệm', 'Món đầu bếp',
];
const ingredientNames = [
  'Gạo lứt', 'Ức gà', 'Cá hồi', 'Thịt bò', 'Thịt heo nạc', 'Trứng gà', 'Đậu hũ', 'Đậu xanh',
  'Đậu đỏ', 'Đậu đen', 'Yến mạch', 'Khoai lang', 'Khoai tây', 'Bí đỏ', 'Cà rốt', 'Cà chua',
  'Bông cải xanh', 'Cải bó xôi', 'Cải thìa', 'Rau muống', 'Xà lách', 'Dưa leo', 'Ớt chuông',
  'Nấm hương', 'Nấm đùi gà', 'Ngô ngọt', 'Hành tây', 'Hành lá', 'Tỏi', 'Gừng', 'Sả',
  'Chanh', 'Bơ', 'Chuối', 'Táo', 'Cam', 'Sữa chua', 'Sữa tươi', 'Phô mai', 'Hạt chia',
  'Hạt điều', 'Hạnh nhân', 'Dầu ô liu', 'Nước tương', 'Nước mắm', 'Mật ong', 'Bún gạo',
  'Mì nguyên cám', 'Tôm', 'Mực',
];
// Đơn vị hiển thị theo cách đo phổ biến trong bếp. gramsPerUnit chỉ dùng để
// giữ khối lượng quy đổi phục vụ tính dinh dưỡng, không hiển thị thay đơn vị.
const ingredientMeasures = [
  ['g', 1], ['g', 1], ['g', 1], ['g', 1], ['g', 1], ['quả', 55], ['miếng', 100], ['g', 1],
  ['g', 1], ['g', 1], ['g', 1], ['củ', 150], ['củ', 150], ['g', 1], ['củ', 100], ['quả', 100],
  ['cây', 300], ['bó', 300], ['cây', 100], ['bó', 300], ['cây', 300], ['quả', 150], ['quả', 150],
  ['g', 1], ['cây', 80], ['bắp', 200], ['củ', 150], ['bó', 100], ['tép', 5], ['củ', 100], ['cây', 40],
  ['quả', 80], ['quả', 200], ['quả', 120], ['quả', 180], ['quả', 200], ['hũ', 100], ['ml', 1],
  ['lát', 20], ['g', 1], ['g', 1], ['g', 1], ['ml', 1], ['ml', 1], ['ml', 1], ['ml', 1], ['g', 1],
  ['g', 1], ['con', 25], ['con', 250],
].map(([unit, gramsPerUnit]) => ({ unit, gramsPerUnit }));
const quantityFromGrams = (grams, gramsPerUnit) => {
  if (gramsPerUnit === 1) return grams;
  return Math.max(0.5, Math.round((grams / gramsPerUnit) * 2) / 2);
};
const recipeNames = [
  'Cơm gạo lứt ức gà', 'Cá hồi áp chảo', 'Bò xào ớt chuông', 'Heo nạc kho gừng',
  'Trứng cuộn rau củ', 'Đậu hũ sốt cà', 'Cháo đậu xanh', 'Salad đậu đỏ', 'Chè đậu đen ít ngọt',
  'Yến mạch chuối', 'Khoai lang nướng', 'Súp khoai tây', 'Canh bí đỏ', 'Cà rốt hấp mật ong',
  'Salad cà chua', 'Bông cải xanh xào tỏi', 'Cải bó xôi trứng', 'Cải thìa sốt nấm',
  'Canh rau muống', 'Xà lách cuộn thịt', 'Dưa leo trộn chua ngọt', 'Ớt chuông nhồi thịt',
  'Nấm hương kho tiêu', 'Nấm đùi gà nướng', 'Súp ngô ngọt', 'Hành tây xào bò',
  'Gà hành lá', 'Tôm rang tỏi', 'Cá hấp gừng', 'Gà nướng sả', 'Nước chanh hạt chia',
  'Bánh mì bơ trứng', 'Sinh tố chuối', 'Salad táo', 'Nước cam cà rốt', 'Sữa chua trái cây',
  'Súp sữa tươi bí đỏ', 'Mì phô mai rau củ', 'Pudding hạt chia', 'Gà hạt điều',
  'Yến mạch hạnh nhân', 'Salad dầu ô liu', 'Đậu hũ sốt nước tương', 'Cá kho nước mắm',
  'Sữa chua mật ong', 'Bún gạo tôm', 'Mì nguyên cám bò', 'Tôm hấp sả', 'Mực xào rau củ',
  'Cơm gia đình Cookmate',
];
const familyNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng'];
const givenNames = ['Minh Anh', 'Gia Huy', 'Thu Hà', 'Hoàng Nam', 'Ngọc Mai'];

async function seedLarge() {
  if (process.env.NODE_ENV === 'production') throw new Error('Large seed is for development only.');
  assert.equal(categoryNames.length, SIZE);
  assert.equal(ingredientNames.length, SIZE);
  assert.equal(ingredientMeasures.length, SIZE);
  assert.equal(recipeNames.length, SIZE);
  for (const image of recipeImages.slice(10)) {
    await fs.access(path.join(__dirname, '../uploads/mon-an', image.filename));
  }
  await require('./migrate')();
  const passwordHash = await bcrypt.hash('CookmateDemo@2026', 12);
  const before = Object.fromEntries(await Promise.all(Object.entries(db).map(async ([name, model]) => [name, await model.count()])));

  await sequelize.transaction(async (transaction) => {
    const ensure = async (model, where, defaults = {}) => (await model.findOrCreate({ where, defaults, transaction }))[0];
    const adminRole = await ensure(db.VaiTro, { tenVaiTro: 'ADMIN' }, { moTa: 'Quản trị viên', trangThai: 1 });
    const userRole = await ensure(db.VaiTro, { tenVaiTro: 'USER' }, { moTa: 'Khách hàng', trangThai: 1 });
    for (let i = 1; i <= SIZE; i++) await ensure(db.VaiTro, { tenVaiTro: `DATA_ROLE_${pad(i)}` }, { moTa: `${MARKER}: vai trò dữ liệu kiểm thử ${i}`, trangThai: 0 });

    let admin = await db.NguoiDung.findOne({ where: { idVaiTro: adminRole.idVaiTro, trangThai: 1 }, transaction });
    if (!admin) admin = await ensure(db.NguoiDung, { email: 'large.admin@cookmate.local' }, { idVaiTro: adminRole.idVaiTro, hoTen: 'Quản trị dữ liệu lớn', matKhau: passwordHash, emailDaXacMinh: 1, thoiGianXacMinhEmail: new Date() });
    const users = [];
    for (let i = 1; i <= SIZE; i++) users.push(await ensure(db.NguoiDung, { email: `data.user${pad(i)}@cookmate.local` }, {
      idVaiTro: userRole.idVaiTro,
      hoTen: `${familyNames[(i - 1) % familyNames.length]} ${givenNames[(i - 1) % givenNames.length]} ${pad(i)}`,
      matKhau: passwordHash,
      soDienThoai: `09${String(10000000 + i).slice(-8)}`,
      emailDaXacMinh: 1,
      thoiGianXacMinhEmail: day(i),
      trangThai: 1,
    }));

    const categories = [];
    const ingredients = [];
    for (let i = 0; i < SIZE; i++) {
      categories.push(await ensure(db.DanhMuc, { tenDanhMuc: `${categoryNames[i]} · Dữ liệu ${pad(i + 1)}` }, { moTa: `${MARKER}: nhóm ${categoryNames[i].toLowerCase()} dùng cho dữ liệu phong phú.`, trangThai: 1 }));
      const ingredient = await ensure(db.NguyenLieu, { tenNguyenLieu: `${ingredientNames[i]} · Mẫu ${pad(i + 1)}` }, {
        donViMacDinh: ingredientMeasures[i].unit, moTa: `${MARKER}: thông tin dinh dưỡng tham khảo trên 100 g.`,
        nangLuongKcal: 35 + (i * 17) % 330, proteinG: 1 + (i * 1.7) % 28,
        carbG: 2 + (i * 2.3) % 65, chatBeoG: 0.2 + (i * 0.7) % 18,
        chatXoG: 0.5 + (i * 0.4) % 12, natriMg: 2 + (i * 19) % 600, trangThai: 1,
      });
      // Cập nhật cả dữ liệu đã seed trước đây khi chạy lại script.
      await ingredient.update({ donViMacDinh: ingredientMeasures[i].unit }, { transaction });
      ingredients.push(ingredient);
    }

    const recipes = [];
    const steps = [];
    for (let i = 0; i < SIZE; i++) {
      const prep = 5 + (i % 4) * 5;
      const cook = 10 + (i % 6) * 5;
      const cover = recipeImages[i + 10].publicPath;
      const video = recipeVideos[i + 10].url;
      const recipe = await ensure(db.MonAn, { tenMonAn: `${recipeNames[i]} · ${pad(i + 1)}` }, {
        idDanhMuc: categories[i].idDanhMuc, idTacGia: users[i].idNguoiDung, idNguoiDuyet: admin.idNguoiDung,
        nguonNoiDung: 'BIEN_TAP', trangThaiDuyet: 'DA_DUYET', ngayDuyet: day(i),
        moTa: `${recipeNames[i]} với nguyên liệu dễ tìm và khẩu phần cân bằng.`,
        gioiThieu: `${MARKER}: công thức số ${i + 1} trong bộ dữ liệu lớn.`,
        anhDaiDien: cover,
        thoiGianChuanBi: prep, thoiGianNau: cook, tongThoiGian: prep + cook,
        doKho: ['DE', 'TRUNG_BINH', 'KHO'][i % 3], khauPhan: 2 + (i % 4), luotXem: 20 + i * 3,
        capTruyCapToiThieu: ['FREE', 'FREE', 'BASIC', 'PRO', 'CHEF'][i % 5],
        tenDauBep: i % 5 === 4 ? `Đầu bếp Cookmate ${pad(i + 1)}` : null,
        videoHuongDan: video,
        trangThai: 1,
      });
      if (recipe.anhDaiDien !== cover) await recipe.update({ anhDaiDien: cover }, { transaction });
      if (!recipe.videoHuongDan || /[?&]v=cookmate\d+$/i.test(recipe.videoHuongDan)) {
        await recipe.update({ videoHuongDan: video }, { transaction });
      }
      recipes.push(recipe);
      const ingredient = ingredients[i];
      const ingredientGrams = 120 + i * 2;
      const ingredientMeasure = ingredientMeasures[i];
      const recipeIngredient = await ensure(db.MonAnNguyenLieu, { idMonAn: recipe.idMonAn, idNguyenLieu: ingredient.idNguyenLieu }, {
        soLuong: quantityFromGrams(ingredientGrams, ingredientMeasure.gramsPerUnit), donVi: ingredientMeasure.unit,
        khoiLuongGram: ingredientGrams, ghiChu: 'Cân sau khi sơ chế.',
      });
      await recipeIngredient.update({
        soLuong: quantityFromGrams(ingredientGrams, ingredientMeasure.gramsPerUnit),
        donVi: ingredientMeasure.unit, khoiLuongGram: ingredientGrams,
      }, { transaction });

      const secondIndex = (i + 7) % SIZE;
      const secondIngredient = ingredients[secondIndex];
      const secondIngredientGrams = 40 + i;
      const secondIngredientMeasure = ingredientMeasures[secondIndex];
      const secondRecipeIngredient = await ensure(db.MonAnNguyenLieu, { idMonAn: recipe.idMonAn, idNguyenLieu: secondIngredient.idNguyenLieu }, {
        soLuong: quantityFromGrams(secondIngredientGrams, secondIngredientMeasure.gramsPerUnit), donVi: secondIngredientMeasure.unit,
        khoiLuongGram: secondIngredientGrams, ghiChu: 'Điều chỉnh theo khẩu vị.',
      });
      await secondRecipeIngredient.update({
        soLuong: quantityFromGrams(secondIngredientGrams, secondIngredientMeasure.gramsPerUnit),
        donVi: secondIngredientMeasure.unit, khoiLuongGram: secondIngredientGrams,
      }, { transaction });
      let firstStep;
      for (let j = 1; j <= 3; j++) {
        const step = await ensure(db.BuocNau, { idMonAn: recipe.idMonAn, phienBan: 1, soThuTu: j }, {
          tieuDe: ['Sơ chế', 'Chế biến', 'Hoàn thiện'][j - 1],
          huongDan: `${MARKER}: ${['Rửa sạch và chuẩn bị nguyên liệu.', 'Nấu nguyên liệu đúng thời gian, nêm vừa vị.', 'Trình bày món ăn và dùng khi còn ấm.'][j - 1]}`,
          thoiGian: j === 2 ? cook : 3,
        });
        if (j === 1) firstStep = step;
      }
      steps.push(firstStep);
      const existingCover = await db.HinhAnhMonAn.findOne({ where: { idMonAn: recipe.idMonAn, anhDaiDien: 1 }, transaction });
      if (existingCover) await existingCover.update({ duongDan: cover, moTa: `Ảnh đúng món ${recipeNames[i]}` }, { transaction });
      else await ensure(db.HinhAnhMonAn, { idMonAn: recipe.idMonAn, duongDan: cover }, { moTa: `Ảnh đúng món ${recipeNames[i]}`, thuTu: 1, anhDaiDien: 1 });
    }

    const plans = [];
    const goals = [];
    for (let i = 1; i <= SIZE; i++) {
      plans.push(await ensure(db.GoiDichVu, { maGoi: `DATA_PLAN_${pad(i)}` }, { tenGoi: `Gói dữ liệu ${pad(i)}`, moTa: `${MARKER}: gói ẩn phục vụ kiểm thử quan hệ.`, giaThang: 10000 + i * 1000, capDo: i % 4, trangThai: 0 }));
      goals.push(await ensure(db.MucTieuAnUong, { maMucTieu: `DATA_GOAL_${pad(i)}` }, { tenMucTieu: `Mục tiêu dữ liệu ${pad(i)}`, moTa: `${MARKER}: mục tiêu ẩn phục vụ kiểm thử.`, giaMuaLe: 9000 + i * 500, trangThai: 0 }));
    }

    for (let i = 0; i < SIZE; i++) {
      const user = users[i], recipe = recipes[i], step = steps[i], plan = plans[i], goal = goals[i];
      await ensure(db.GoiMucTieuAnUong, { idGoiDichVu: plan.idGoiDichVu, idMucTieuAnUong: goal.idMucTieuAnUong });
      await ensure(db.AuthChallenge, { id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}` }, { kind: 'DEMO', subject: user.email, payload: { marker: MARKER, index: i + 1 }, expiresAt: new Date('2025-01-01T00:00:00Z'), consumed: true, attempts: i % 3 });
      await ensure(db.YeuThich, { idNguoiDung: user.idNguoiDung, idMonAn: recipe.idMonAn });
      await ensure(db.DanhGia, { idNguoiDung: user.idNguoiDung, idMonAn: recipe.idMonAn }, { soSao: 3 + (i % 3), noiDung: `${MARKER}: đánh giá khác nhau cho công thức ${pad(i + 1)}.`, trangThai: 1 });
      await ensure(db.BinhLuan, { idNguoiDung: user.idNguoiDung, idMonAn: recipe.idMonAn, noiDung: `${MARKER}: bình luận trải nghiệm món ${pad(i + 1)}.` }, { trangThai: 1 });
      await ensure(db.CongThucDaMo, { idNguoiDung: user.idNguoiDung, idMonAn: recipe.idMonAn }, { ngayMoDauTien: day(i) });
      await ensure(db.ThietBiThongBao, { token: `ExponentPushToken[data-seed-${String(i + 1).padStart(3, '0')}]` }, { idNguoiDung: user.idNguoiDung, nenTang: i % 2 ? 'android' : 'ios', maThietBi: `data-device-${pad(i + 1)}`, hoatDong: 0 });

      const start = day(i);
      const end = new Date(start.getTime() + recipe.tongThoiGian * 60000);
      const history = await ensure(db.LichSuNau, { idNguoiDung: user.idNguoiDung, idMonAn: recipe.idMonAn, thoiGianBatDau: start }, { thoiGianKetThuc: end, trangThai: 'HOAN_THANH', buocHienTai: 3, congThucSnapshot: { marker: MARKER, idMonAn: recipe.idMonAn, tenMonAn: recipe.tenMonAn, buocNaus: [{ idBuocNau: step.idBuocNau }] } });
      await ensure(db.ChiTietLichSuNau, { idLichSu: history.idLichSu, idBuocNau: step.idBuocNau }, { daHoanThanh: 1, thoiGianHoanThanh: end });

      const notification = await ensure(db.ThongBao, { tieuDe: `[Dữ liệu ${pad(i + 1)}] Món mới dành cho bạn` }, { noiDung: `${MARKER}: khám phá ${recipe.tenMonAn}.`, loai: 'HE_THONG', duongDan: `/mon-an/${recipe.idMonAn}` });
      await ensure(db.ThongBaoNguoiDung, { idThongBao: notification.idThongBao, idNguoiDung: user.idNguoiDung }, { daDoc: i % 2, thoiGianDoc: i % 2 ? end : null });
      await ensure(db.NhatKyHeThong, { hanhDong: 'SEED_LARGE', bangDuLieu: 'MonAn', idBanGhi: recipe.idMonAn }, { idNguoiDung: admin.idNguoiDung, noiDung: `${MARKER}: tạo dữ liệu công thức ${pad(i + 1)}.` });

      const scheduleStart = new Date(Date.UTC(2026, 9, 5 + (i % 20)));
      const scheduleEnd = new Date(scheduleStart); scheduleEnd.setUTCDate(scheduleEnd.getUTCDate() + 6);
      const schedule = await ensure(db.LichAn, { idNguoiDung: user.idNguoiDung, tenLich: `${MARKER} · Tuần ${pad(i + 1)}` }, { tuNgay: dateOnly(scheduleStart), denNgay: dateOnly(scheduleEnd), mucTieuKcalMoiNgay: 1600 + (i % 6) * 100, trangThai: 1 });
      await ensure(db.BuaAnTrongLich, { idLichAn: schedule.idLichAn, idMonAn: recipe.idMonAn, ngay: dateOnly(scheduleStart), loaiBua: ['SANG', 'TRUA', 'TOI', 'PHU'][i % 4] }, { soKhauPhan: 1 + (i % 3) * 0.5, thuTu: 1, ghiChu: `${MARKER}: bữa ăn mẫu ${pad(i + 1)}.` });

      const expired = new Date('2025-12-31T23:59:59Z');
      await ensure(db.DangKyDichVu, { idNguoiDung: user.idNguoiDung, idGoiDichVu: plan.idGoiDichVu, nguon: 'DU_LIEU_MAU' }, { thoiGianBatDau: new Date('2025-12-01T00:00:00Z'), thoiGianKetThuc: expired, trangThai: 'HET_HAN', tuDongGiaHan: 0 });
      await ensure(db.NguoiDungMucTieu, { idNguoiDung: user.idNguoiDung, idMucTieuAnUong: goal.idMucTieuAnUong, nguonQuyen: 'DU_LIEU_MAU' }, { thoiGianBatDau: new Date('2025-12-01T00:00:00Z'), thoiGianKetThuc: expired, trangThai: 0 });
      await ensure(db.YeuCauThanhToan, { maThamChieu: `DATA-PAY-${String(i + 1).padStart(4, '0')}` }, { idNguoiDung: user.idNguoiDung, loaiSanPham: 'GOI_DICH_VU', idGoiDichVu: plan.idGoiDichVu, soTien: Number(plan.giaThang), nhaCungCap: 'DU_LIEU_MAU', trangThai: 'TU_CHOI', ngayTao: day(i), ngayXacNhan: day(i), idNguoiXacNhan: admin.idNguoiDung });
      await recipe.update({ diemDanhGia: 3 + (i % 3) }, { transaction });
    }

    for (const [name, model] of Object.entries(db)) assert.ok(await model.count({ transaction }) >= SIZE, `${name} has fewer than ${SIZE} rows`);
  });

  const rows = [];
  for (const [name, model] of Object.entries(db)) {
    const after = await model.count();
    rows.push({ table: name, before: before[name], added: after - before[name], after });
  }
  console.table(rows);
  console.log(`PASS: ${rows.length} tables have at least ${SIZE} rows. Demo login: data.user01@cookmate.local / CookmateDemo@2026`);
  return rows;
}

if (require.main === module) seedLarge().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => sequelize.close());
module.exports = seedLarge;
