import { useState } from 'react'
import { Text, View } from 'react-native'
import useTaiNguyen from '../moc/useTaiNguyen'
import { useXacThuc } from '../nguCanh/NguCanhXacThuc'
import { DauTrang, ManHinh, Nut, ThongDiep, TrangThai } from '../thanhPhan/GiaoDien'
import { goiApi } from '../dichVu/KetNoiApi'
import { kieuDang as s, mauSac } from '../ChuDe'

const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ/tháng'
export default function GoiDichVu({ navigation }) {
  const { nguoiDung } = useXacThuc()
  const catalog = useTaiNguyen('/goi-dich-vu')
  const mine = useTaiNguyen('/goi-dich-vu/me', !!nguoiDung)
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  async function buy(body: any) {
    if (!nguoiDung) { navigation.navigate('DangNhap'); return }
    setBusy(true); setMessage('')
    try { const result = await goiApi('/thanh-toan/yeu-cau', { method: 'POST', body }); setMessage(`Đã tạo yêu cầu ${result.data.maThamChieu}. Quản trị viên sẽ xác nhận thanh toán.`) }
    catch (e: any) { setMessage(e.message) } finally { setBusy(false) }
  }
  return <ManHinh header={<DauTrang back title="Gói Cookmate" />}>
    <Text style={[s.title, s.serif]}>Chọn cách nấu phù hợp</Text>
    <Text style={[s.muted, { marginVertical: 10 }]}>Gói hiện tại: {mine.data?.goiDichVu?.tenGoi || 'Miễn phí'}</Text>
    <TrangThai {...catalog} reload={catalog.reload} />
    {catalog.data?.goiDichVus.map((plan: any) => <View key={plan.maGoi} style={[s.card, plan.maGoi === mine.data?.goiDichVu?.maGoi && { borderColor: mauSac.accent, borderWidth: 2 }]}> 
      <Text style={s.heading}>{plan.tenGoi}</Text><Text style={[s.title, { fontSize: 24, marginVertical: 8 }]}>{plan.giaThang ? money(plan.giaThang) : '0đ'}</Text><Text style={s.body}>{plan.moTa}</Text>
      {!!plan.giaThang && plan.maGoi !== mine.data?.goiDichVu?.maGoi && <Nut title="Tạo yêu cầu thanh toán" secondary busy={busy} onPress={() => buy({ loaiSanPham: 'GOI_DICH_VU', idGoiDichVu: plan.idGoiDichVu })} style={{ marginTop: 12 }} />}
    </View>)}
    <Text style={[s.heading, { marginTop: 12, marginBottom: 8 }]}>Gói mục tiêu mua riêng</Text>
    {catalog.data?.mucTieuAnUongs.map((goal: any) => <View key={goal.maMucTieu} style={s.card}><Text style={s.heading}>{goal.tenMucTieu}</Text><Text style={[s.body, { marginVertical: 6 }]}>{goal.moTa}</Text><Text style={[s.small, { color: mauSac.accent }]}>{money(goal.giaMuaLe)}</Text><Nut title="Mua riêng mục tiêu" secondary busy={busy} onPress={() => buy({ loaiSanPham: 'MUC_TIEU', idMucTieuAnUong: goal.idMucTieuAnUong })} style={{ marginTop: 10 }} /></View>)}
    <ThongDiep success>{message}</ThongDiep>
    <Nut title="Tư vấn thực đơn Chef" icon="sparkles-outline" onPress={() => navigation.navigate('TuVanChef')} style={{ marginTop: 8 }} />
    <Text style={[s.small, { textAlign: 'center' }]}>Pro và Chef đã bao gồm miễn phí cả 4 mục tiêu ăn uống.</Text>
  </ManHinh>
}
