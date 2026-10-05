import { useEffect, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import useTaiNguyen from '../moc/useTaiNguyen'
import { useXacThuc } from '../nguCanh/NguCanhXacThuc'
import { DauTrang, ManHinh, Nut, ThongDiep, TrangThai } from '../thanhPhan/GiaoDien'
import { goiApi } from '../dichVu/KetNoiApi'
import { kieuDang as s, mauSac } from '../ChuDe'

const money = (value: number, suffix = '') => new Intl.NumberFormat('vi-VN').format(value) + 'đ' + suffix
const pad = (value: number) => String(value).padStart(2, '0')
function countdown(end: string, now: number) {
  const remaining = Math.max(0, new Date(end).getTime() - now)
  if (!remaining) return 'Đã hết hạn — quyền nâng cao đã được khóa'
  const days = Math.floor(remaining / 86_400_000)
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)
  const seconds = Math.floor((remaining % 60_000) / 1_000)
  return `${days} ngày ${pad(hours)} giờ ${pad(minutes)} phút ${pad(seconds)} giây`
}
export default function GoiDichVu({ navigation }) {
  const { nguoiDung } = useXacThuc()
  const catalog = useTaiNguyen('/goi-dich-vu')
  const mine = useTaiNguyen('/goi-dich-vu/me', !!nguoiDung)
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [now, setNow] = useState(Date.now())
  const expirationReloaded = useRef('')
  const expiration = mine.data?.dangKyDichVu?.thoiGianKetThuc
  useEffect(() => {
    if (!expiration) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [expiration])
  useEffect(() => {
    if (!expiration || now < new Date(expiration).getTime() || expirationReloaded.current === expiration) return
    expirationReloaded.current = expiration
    mine.reload()
  }, [expiration, mine, now])
  async function buy(body: any) {
    if (!nguoiDung) { navigation.navigate('DangNhap'); return }
    setBusy(true); setMessage('')
    try {
      const result = await goiApi('/thanh-toan/vietqr/tao', { method: 'POST', body })
      navigation.navigate('KetQuaThanhToan', { id: result.data.idYeuCauThanhToan })
    }
    catch (e: any) { setMessage(e.message) } finally { setBusy(false) }
  }
  return <ManHinh header={<DauTrang back title="Gói Cookmate" />}>
    <Text style={[s.title, s.serif]}>Chọn cách nấu phù hợp</Text>
    <View style={[s.card, { marginTop: 12 }]}>
      <Text style={s.small}>Gói hiện tại</Text>
      <Text style={[s.heading, { marginTop: 4 }]}>{mine.data?.goiDichVu?.tenGoi || 'Miễn phí'}</Text>
      {expiration && <>
        <Text style={[s.small, { marginTop: 10 }]}>Hết hạn: {new Date(expiration).toLocaleString('vi-VN')}</Text>
        <Text style={[s.body, { color: mauSac.green, fontWeight: '700', marginTop: 5 }]}>{countdown(expiration, now)}</Text>
      </>}
      {!expiration && mine.data?.goiDichVu?.maGoi === 'FREE' && <Text style={[s.muted, { marginTop: 8 }]}>Các tính năng trả phí đang bị khóa.</Text>}
    </View>
    <TrangThai {...catalog} reload={catalog.reload} />
    {catalog.data?.goiDichVus.map((plan: any) => <View key={plan.maGoi} style={[s.card, plan.maGoi === mine.data?.goiDichVu?.maGoi && { borderColor: mauSac.accent, borderWidth: 2 }]}> 
      <Text style={s.heading}>{plan.tenGoi}</Text><Text style={[s.title, { fontSize: 24, marginVertical: 8 }]}>{plan.giaThang ? money(plan.giaThang, '/tháng') : '0đ'}</Text><Text style={s.body}>{plan.moTa}</Text>
      {!!plan.giaThang && plan.maGoi !== mine.data?.goiDichVu?.maGoi && <Nut title="Quét VietQR để thanh toán" secondary busy={busy} onPress={() => buy({ loaiSanPham: 'GOI_DICH_VU', idGoiDichVu: plan.idGoiDichVu })} style={{ marginTop: 12 }} />}
    </View>)}
    <Text style={[s.heading, { marginTop: 12, marginBottom: 8 }]}>Gói mục tiêu mua riêng</Text>
    {catalog.data?.mucTieuAnUongs.map((goal: any) => <View key={goal.maMucTieu} style={s.card}><Text style={s.heading}>{goal.tenMucTieu}</Text><Text style={[s.body, { marginVertical: 6 }]}>{goal.moTa}</Text><Text style={[s.small, { color: mauSac.accent }]}>{money(goal.giaMuaLe)}</Text><Nut title="Quét VietQR để thanh toán" secondary busy={busy} onPress={() => buy({ loaiSanPham: 'MUC_TIEU', idMucTieuAnUong: goal.idMucTieuAnUong })} style={{ marginTop: 10 }} /></View>)}
    <ThongDiep>{message}</ThongDiep>
    <Nut title="Tư vấn thực đơn Chef" icon="sparkles-outline" onPress={() => navigation.navigate('TuVanChef')} style={{ marginTop: 8 }} />
    <Text style={[s.small, { textAlign: 'center' }]}>Pro và Chef đã bao gồm miễn phí cả 4 mục tiêu ăn uống.</Text>
  </ManHinh>
}
