import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Image, Text, View } from 'react-native'
import { goiApi } from '../dichVu/KetNoiApi'
import { DauTrang, ManHinh, Nut, ThongDiep, TrangThai } from '../thanhPhan/GiaoDien'
import { kieuDang as s, mauSac } from '../ChuDe'

const labels: Record<string, string> = {
  CHO_THANH_TOAN: 'Chờ bạn xác nhận đã chuyển khoản',
  CHO_XAC_NHAN: 'Đang chờ quản trị viên phê duyệt',
  DA_THANH_TOAN: 'Thanh toán thành công',
  TU_CHOI: 'Thanh toán chưa được xác nhận',
}
const pad = (value: number) => String(value).padStart(2, '0')
function countdown(end: string | null, now: number) {
  if (!end) return ''
  const remaining = Math.max(0, new Date(end).getTime() - now)
  if (!remaining) return 'Đã hết hạn'
  const days = Math.floor(remaining / 86_400_000)
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)
  const seconds = Math.floor((remaining % 60_000) / 1_000)
  return `${days} ngày ${pad(hours)} giờ ${pad(minutes)} phút ${pad(seconds)} giây`
}

export default function KetQuaThanhToan({ navigation, route }) {
  const id = route.params?.id
  const [payment, setPayment] = useState<any>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  const announced = useRef(false)

  const reload = useCallback(async () => {
    if (!id) { setError('Không tìm thấy mã giao dịch.'); setLoading(false); return }
    setLoading(true)
    try { const result = await goiApi(`/thanh-toan/${id}`); setPayment(result.data); setError('') }
    catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }, [id])

  useEffect(() => { reload() }, [reload])
  useEffect(() => {
    if (!id || payment?.trangThai !== 'CHO_XAC_NHAN') return
    const timer = setInterval(reload, 3000)
    return () => clearInterval(timer)
  }, [id, payment?.trangThai, reload])
  useEffect(() => {
    if (payment?.trangThai !== 'DA_THANH_TOAN' || !payment?.quyenHetHanLuc) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [payment?.trangThai, payment?.quyenHetHanLuc])

  const success = payment?.trangThai === 'DA_THANH_TOAN'
  useEffect(() => {
    if (!success || announced.current) return
    announced.current = true
    Alert.alert('Thanh toán thành công', 'Cookmate đã cập nhật quyền sử dụng của bạn trong 30 ngày.')
  }, [success])

  async function customerConfirm() {
    setConfirming(true)
    setError('')
    try {
      const result = await goiApi(`/thanh-toan/${id}/da-thanh-toan`, { method: 'PATCH', body: {} })
      setPayment(result.data)
      Alert.alert('Đã gửi yêu cầu', 'Quản trị viên sẽ kiểm tra số dư và phản hồi cho bạn.')
    } catch (requestError: any) {
      setError(requestError.message)
    } finally {
      setConfirming(false)
    }
  }

  return <ManHinh header={<DauTrang back title="Kết quả thanh toán" />}>
    <Text style={[s.title, s.serif]}>Thanh toán VietQR</Text>
    <Text style={[s.muted, { marginVertical: 10 }]}>Quét mã bằng ứng dụng ngân hàng. Số tiền, người thụ hưởng và nội dung đã được điền riêng cho giao dịch này.</Text>
    <TrangThai loading={loading && !payment} />
    <ThongDiep>{error}</ThongDiep>

    {payment?.qrUrl && payment.trangThai === 'CHO_THANH_TOAN' && <View style={s.card}>
      <Image source={{ uri: payment.qrUrl }} resizeMode="contain" style={{ width: '100%', aspectRatio: 600 / 776 }} />
      <Nut title="Xác nhận đã thanh toán" busy={confirming} onPress={customerConfirm} style={{ marginTop: 14, marginBottom: 10 }} />
      <Nut title="Quay lại" secondary disabled={confirming} onPress={() => navigation.goBack()} />
    </View>}

    {payment && <View style={[s.card, success && { borderColor: mauSac.green, borderWidth: 2 }]}> 
      <Text style={[s.heading, { color: success ? mauSac.green : mauSac.ink }]}>{labels[payment.trangThai] || payment.trangThai}</Text>
      {payment.tenSanPham && <Text style={[s.body, { marginTop: 10 }]}>Thanh toán: {payment.tenSanPham}</Text>}
      <Text style={[s.body, { marginTop: 5 }]}>Ngân hàng: {payment.nganHang}</Text>
      <Text selectable style={[s.body, { marginTop: 5 }]}>Số tài khoản: {payment.soTaiKhoan}</Text>
      <Text style={[s.body, { marginTop: 5 }]}>Người thụ hưởng: {payment.nguoiThuHuong}</Text>
      <Text style={[s.body, { marginTop: 5 }]}>Số tiền: {Number(payment.soTien).toLocaleString('vi-VN')}đ</Text>
      <Text selectable style={[s.body, { marginTop: 5 }]}>Nội dung: {payment.noiDungChuyenKhoan}</Text>
      {payment.trangThai === 'CHO_XAC_NHAN' && <Text style={[s.muted, { marginTop: 12 }]}>Yêu cầu đã được gửi đến quản trị viên. Màn hình sẽ tự cập nhật sau khi giao dịch được duyệt hoặc từ chối.</Text>}
      {payment.trangThai === 'TU_CHOI' && <Text style={[s.body, { color: mauSac.red, marginTop: 12 }]}>Lý do: {payment.lyDoTuChoi}</Text>}
      {success && <View style={{ marginTop: 14 }}>
        <Text style={s.small}>Thời gian sử dụng còn lại</Text>
        <Text style={[s.heading, { color: mauSac.green, marginTop: 5 }]}>{countdown(payment.quyenHetHanLuc, now)}</Text>
      </View>}
    </View>}

    {payment?.trangThai !== 'CHO_THANH_TOAN' && <Nut title="Quay lại các gói" secondary onPress={() => navigation.navigate('GoiDichVu')} />}
  </ManHinh>
}
