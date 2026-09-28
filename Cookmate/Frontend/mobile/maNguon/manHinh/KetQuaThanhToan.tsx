import { useCallback, useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { goiApi } from '../dichVu/KetNoiApi'
import { DauTrang, ManHinh, Nut, ThongDiep, TrangThai } from '../thanhPhan/GiaoDien'
import { kieuDang as s, mauSac } from '../ChuDe'

const labels: Record<string, string> = {
  CHO_THANH_TOAN: 'Đang chờ VNPAY xác nhận',
  DA_THANH_TOAN: 'Thanh toán thành công',
  THAT_BAI: 'Thanh toán không thành công',
}

export default function KetQuaThanhToan({ navigation, route }) {
  const id = route.params?.id
  const [payment, setPayment] = useState<any>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState(route.params?.valid === '0' ? 'Chữ ký phản hồi VNPAY không hợp lệ.' : '')

  const reload = useCallback(async () => {
    if (!id) { setError('Không tìm thấy mã giao dịch.'); setLoading(false); return }
    setLoading(true)
    try { const result = await goiApi(`/thanh-toan/${id}`); setPayment(result.data); setError('') }
    catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }, [id])

  useEffect(() => { reload() }, [reload])
  useEffect(() => {
    if (!id || payment?.trangThai !== 'CHO_THANH_TOAN') return
    const timer = setInterval(reload, 2500)
    return () => clearInterval(timer)
  }, [id, payment?.trangThai, reload])

  const success = payment?.trangThai === 'DA_THANH_TOAN'
  return <ManHinh header={<DauTrang back title="Kết quả thanh toán" />}>
    <Text style={[s.title, s.serif]}>VNPAY</Text>
    <TrangThai loading={loading && !payment} />
    <ThongDiep>{error}</ThongDiep>
    {payment && <View style={[s.card, success && { borderColor: mauSac.green, borderWidth: 2 }]}> 
      <Text style={[s.heading, { color: success ? mauSac.green : mauSac.ink }]}>{labels[payment.trangThai] || payment.trangThai}</Text>
      <Text style={[s.body, { marginTop: 10 }]}>Mã giao dịch: {payment.maThamChieu}</Text>
      <Text style={[s.body, { marginTop: 5 }]}>Số tiền: {Number(payment.soTien).toLocaleString('vi-VN')}đ</Text>
      {payment.maGiaoDichNhaCungCap && <Text style={[s.small, { marginTop: 5 }]}>Mã VNPAY: {payment.maGiaoDichNhaCungCap}</Text>}
    </View>}
    {payment?.trangThai === 'CHO_THANH_TOAN' && <Text style={[s.muted, { marginBottom: 12 }]}>Cookmate đang chờ IPN an toàn từ VNPAY. Trạng thái sẽ tự cập nhật.</Text>}
    <Nut title="Kiểm tra lại trạng thái" secondary busy={loading} onPress={reload} style={{ marginBottom: 10 }} />
    <Nut title="Quay lại các gói" onPress={() => navigation.navigate('GoiDichVu')} />
  </ManHinh>
}
