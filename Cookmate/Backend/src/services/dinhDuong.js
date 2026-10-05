const CHI_SO = ['nangLuongKcal', 'proteinG', 'carbG', 'chatBeoG', 'chatXoG', 'natriMg'];
const LA_NGUYEN_LIEU_KHONG_NANG_LUONG = /^(nước|nước lọc|nước đá)$/i;

const lamTron = (value) => Math.round((Number(value) || 0) * 100) / 100;

function tinhDinhDuong(monAn) {
  const data = monAn?.toJSON ? monAn.toJSON() : monAn;
  const tong = Object.fromEntries(CHI_SO.map((key) => [key, 0]));
  const thieuKhoiLuong = [];
  const thieuDuLieuDinhDuong = [];

  for (const nguyenLieu of data?.nguyenLieus || []) {
    const khoiLuongGram = Number(nguyenLieu.MonAnNguyenLieu?.khoiLuongGram);
    if (!Number.isFinite(khoiLuongGram) || khoiLuongGram <= 0) {
      thieuKhoiLuong.push(nguyenLieu.tenNguyenLieu);
      continue;
    }
    const coDuLieu = CHI_SO.some((key) => Number(nguyenLieu[key]) > 0);
    if (!coDuLieu && !LA_NGUYEN_LIEU_KHONG_NANG_LUONG.test(nguyenLieu.tenNguyenLieu || '')) {
      thieuDuLieuDinhDuong.push(nguyenLieu.tenNguyenLieu);
      continue;
    }
    for (const key of CHI_SO) tong[key] += (Number(nguyenLieu[key]) || 0) * khoiLuongGram / 100;
  }

  const khauPhan = Math.max(1, Number(data?.khauPhan) || 1);
  return {
    tongMon: Object.fromEntries(CHI_SO.map((key) => [key, lamTron(tong[key])])),
    moiKhauPhan: Object.fromEntries(CHI_SO.map((key) => [key, lamTron(tong[key] / khauPhan)])),
    khauPhan,
    dayDuDuLieu: thieuKhoiLuong.length === 0 && thieuDuLieuDinhDuong.length === 0,
    thieuKhoiLuong,
    thieuDuLieuDinhDuong,
    ghiChu: 'Giá trị dinh dưỡng là ước tính từ dữ liệu trên mỗi 100 g nguyên liệu.',
  };
}

module.exports = { tinhDinhDuong };
