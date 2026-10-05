const CHI_SO = ['nangLuongKcal', 'proteinG', 'carbG', 'chatBeoG', 'chatXoG', 'natriMg'];
const TEN_CHI_SO = {
  nangLuongKcal: 'Năng lượng',
  proteinG: 'Protein',
  carbG: 'Carbohydrate',
  chatBeoG: 'Chất béo',
  chatXoG: 'Chất xơ',
  natriMg: 'Natri',
};
const CAC_BUA_CHINH = [
  { loaiBua: 'SANG', tyLeKcal: 0.25 },
  { loaiBua: 'TRUA', tyLeKcal: 0.35 },
  { loaiBua: 'TOI', tyLeKcal: 0.4 },
];
const KHAU_PHAN_TOI_THIEU = 0.5;
// Một số công thức trong dữ liệu hiện tại được khai báo cho khẩu phần nhỏ.
// Cho phép tối đa 4 khẩu phần để vẫn ghép đủ năng lượng nhưng tránh hệ số quá lớn.
const KHAU_PHAN_TOI_DA = 4;

const lamTron = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

function taoMucTieuDinhDuong(mucTieuKcal) {
  const kcal = Number(mucTieuKcal) || 2000;
  // AMDR cho người lớn: protein 10–35%, carbohydrate 45–65%, chất béo 20–35%.
  // DRI chất xơ: 14 g/1.000 kcal; giới hạn natri dùng trong ứng dụng: 2.300 mg/ngày.
  return {
    nangLuongKcal: { min: lamTron(kcal * 0.95), max: lamTron(kcal * 1.05), donVi: 'kcal' },
    proteinG: { min: lamTron((kcal * 0.1) / 4), max: lamTron((kcal * 0.35) / 4), donVi: 'g' },
    carbG: { min: lamTron((kcal * 0.45) / 4), max: lamTron((kcal * 0.65) / 4), donVi: 'g' },
    chatBeoG: { min: lamTron((kcal * 0.2) / 9), max: lamTron((kcal * 0.35) / 9), donVi: 'g' },
    chatXoG: { min: lamTron((kcal / 1000) * 14), donVi: 'g' },
    natriMg: { max: 2300, donVi: 'mg' },
  };
}

function congDinhDuong(items) {
  const tong = Object.fromEntries(CHI_SO.map((key) => [key, 0]));
  for (const item of items) {
    for (const key of CHI_SO) tong[key] += Number(item.dinhDuong[key] || 0) * Number(item.soKhauPhan || 0);
  }
  return Object.fromEntries(CHI_SO.map((key) => [key, lamTron(tong[key])]));
}

function danhGiaDinhDuong(tong, mucTieuKcal, loaiBuas = [], dayDuDuLieu = true) {
  const mucTieu = taoMucTieuDinhDuong(mucTieuKcal);
  const chuaDat = [];
  if (!dayDuDuLieu) chuaDat.push('Có món ăn thiếu dữ liệu dinh dưỡng hoặc khối lượng quy đổi.');
  for (const loaiBua of CAC_BUA_CHINH.map((item) => item.loaiBua))
    if (!loaiBuas.includes(loaiBua)) chuaDat.push(`Thiếu bữa ${loaiBua.toLowerCase()}.`);
  for (const key of CHI_SO) {
    const value = Number(tong[key] || 0);
    const target = mucTieu[key];
    if (target.min !== undefined && value < target.min)
      chuaDat.push(`${TEN_CHI_SO[key]} thấp hơn mức tối thiểu ${target.min} ${target.donVi}.`);
    if (target.max !== undefined && value > target.max)
      chuaDat.push(`${TEN_CHI_SO[key]} vượt mức tối đa ${target.max} ${target.donVi}.`);
  }
  return { datMucTieu: chuaDat.length === 0, chuaDat, mucTieu };
}

function taoLuaChon(candidate, meal, mucTieuKcal) {
  const kcalMoiKhauPhan = Number(candidate.dinhDuong.nangLuongKcal);
  if (!Number.isFinite(kcalMoiKhauPhan) || kcalMoiKhauPhan <= 0) return null;
  const soKhauPhan = lamTron((mucTieuKcal * meal.tyLeKcal) / kcalMoiKhauPhan);
  if (soKhauPhan < KHAU_PHAN_TOI_THIEU || soKhauPhan > KHAU_PHAN_TOI_DA) return null;
  return {
    idMonAn: candidate.idMonAn,
    loaiBua: meal.loaiBua,
    soKhauPhan,
    dinhDuong: candidate.dinhDuong,
  };
}

function diemThucDon(items, tong, mucTieuKcal, soLanDung) {
  const mucTieu = taoMucTieuDinhDuong(mucTieuKcal);
  const tam = {
    nangLuongKcal: mucTieuKcal,
    proteinG: (mucTieu.proteinG.min + mucTieu.proteinG.max) / 2,
    carbG: (mucTieu.carbG.min + mucTieu.carbG.max) / 2,
    chatBeoG: (mucTieu.chatBeoG.min + mucTieu.chatBeoG.max) / 2,
    chatXoG: mucTieu.chatXoG.min * 1.1,
    natriMg: 1500,
  };
  let score = CHI_SO.reduce((sum, key) => sum + Math.abs(tong[key] - tam[key]) / Math.max(1, tam[key]), 0);
  score += items.reduce((sum, item) => sum + (soLanDung.get(item.idMonAn) || 0) * 0.08, 0);
  return score;
}

function chonThucDonTrongNgay(candidates, mucTieuKcal, soLanDung = new Map()) {
  const options = CAC_BUA_CHINH.map((meal) =>
    candidates.map((candidate) => taoLuaChon(candidate, meal, mucTieuKcal)).filter(Boolean),
  );
  let best = null;
  for (const sang of options[0]) {
    for (const trua of options[1]) {
      if (trua.idMonAn === sang.idMonAn) continue;
      for (const toi of options[2]) {
        if (toi.idMonAn === sang.idMonAn || toi.idMonAn === trua.idMonAn) continue;
        const items = [sang, trua, toi];
        const tong = congDinhDuong(items);
        const danhGia = danhGiaDinhDuong(tong, mucTieuKcal, items.map((item) => item.loaiBua));
        if (!danhGia.datMucTieu) continue;
        const score = diemThucDon(items, tong, mucTieuKcal, soLanDung);
        if (!best || score < best.score) best = { items, tong, danhGia, score };
      }
    }
  }
  return best;
}

module.exports = {
  CAC_BUA_CHINH,
  CHI_SO,
  chonThucDonTrongNgay,
  congDinhDuong,
  danhGiaDinhDuong,
  taoMucTieuDinhDuong,
};
