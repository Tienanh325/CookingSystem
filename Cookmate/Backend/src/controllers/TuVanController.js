const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const error = require('../utils/httpError');
const { sendSuccess } = require('../utils/apiResponse');
const { layGoiHienTai } = require('../services/goiDichVu');

const advise = asyncHandler(async (req, res) => {
  const goi = await layGoiHienTai(req.auth.idNguoiDung);
  if (!goi?.tuVanAi) throw error(403, 'Tư vấn thực đơn AI cần gói Chef.');
  const question = String(req.body.cauHoi || '').trim();
  if (!question || question.length > 1000) throw error(400, 'Câu hỏi phải có từ 1 đến 1000 ký tự.');
  let context = '';
  if (req.body.idLichAn) {
    const plan = await db.LichAn.findOne({ where: { idLichAn: Number(req.body.idLichAn), idNguoiDung: req.auth.idNguoiDung }, include: [{ model: db.BuaAnTrongLich, as: 'buaAns' }] });
    if (!plan) throw error(404, 'Không tìm thấy lịch ăn.');
    const days = new Set(plan.buaAns.map((item) => item.ngay)).size;
    context = ` Lịch “${plan.tenLich}” hiện có ${plan.buaAns.length} bữa trong ${days} ngày.`;
  }
  const answer = `Gợi ý của Cookmate Chef:${context} Hãy ưu tiên đủ rau, nguồn đạm đa dạng, tinh bột nguyên hạt và điều chỉnh khẩu phần theo mục tiêu năng lượng. Với câu hỏi “${question}”, bạn nên dùng phần đánh giá lịch để đối chiếu kcal, protein, carb, chất béo và natri trước khi thay đổi thực đơn. Đây là gợi ý tham khảo, không thay thế tư vấn y khoa hoặc chuyên gia dinh dưỡng.`;
  return sendSuccess(res, 200, 'Đã tạo tư vấn thực đơn.', { cauTraLoi: answer, nguon: 'COOKMATE_RULES_V1', canhBaoYTe: true });
});

module.exports = { advise };
