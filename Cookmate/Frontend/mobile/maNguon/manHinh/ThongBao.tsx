import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useXacThuc } from '../nguCanh/NguCanhXacThuc'
import useTaiNguyen from '../moc/useTaiNguyen'
import { goiApi, dinhDangNgay } from '../dichVu/KetNoiApi'
import {
  Nut,
  DauTrang,
  BieuTuong,
  LoiMoiDangNhap,
  ThongDiep,
  PhanTrang,
  ManHinh,
  TrangThai,
} from '../thanhPhan/GiaoDien'
import { mauSac, kieuDang as s } from '../ChuDe'
export default function ThongBao({ navigation }) {
  const { nguoiDung } = useXacThuc(),
    [limit, setLimit] = useState(5),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    r = useTaiNguyen(`/thong-bao?page=${page}&limit=${limit}`, !!nguoiDung)
  async function read(id?: number) {
    setBusy(true)
    setError('')
    try {
      await goiApi(id ? `/thong-bao/${id}/read` : '/thong-bao/read-all', {
        method: 'PATCH',
        body: {},
      })
      r.reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  async function open(item: any) {
    setBusy(true)
    setError('')
    try {
      if (!item.daDoc)
        await goiApi(`/thong-bao/${item.idThongBao}/read`, { method: 'PATCH', body: {} })
      const paymentId = String(item.thongBao?.duongDan || '').match(/[?&]id=(\d+)/)?.[1]
      if (String(item.thongBao?.loai || '').startsWith('THANH_TOAN_') && paymentId)
        navigation.navigate('KetQuaThanhToan', { id: Number(paymentId) })
      r.reload()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <ManHinh resetKey={`${page}:${limit}`} header={<DauTrang back title="Thông báo" />}>
      {!nguoiDung ? (
        <LoiMoiDangNhap />
      ) : (
        <>
          <View style={[s.between, { marginBottom: 20 }]}>
            <Text style={s.heading}>Lời nhắn từ căn bếp</Text>
          </View>
          <Nut
            secondary
            title="Đánh dấu tất cả đã đọc"
            busy={busy}
            onPress={() => read()}
          />
          <ThongDiep>{error}</ThongDiep>
          <TrangThai
            {...r}
            reload={r.reload}
            empty={!r.data?.length}
            emptyText="Bạn chưa có thông báo mới."
          />
          {!r.loading &&
            r.data?.map((item) => (
              <Pressable
                disabled={busy}
                accessibilityRole="button"
                onPress={() => open(item)}
                key={item.idThongBao}
                style={[
                  s.card,
                  {
                    marginTop: 12,
                    backgroundColor: item.daDoc ? '#fff' : '#fff2e8',
                  },
                ]}
              >
                <View style={[s.row, { gap: 10, marginBottom: 10 }]}>
                  <BieuTuong
                    name={
                      item.daDoc ? 'mail-open-outline' : 'mail-unread-outline'
                    }
                    color={mauSac.accent}
                  />
                  <Text style={[s.heading, { fontSize: 16, flex: 1 }]}>
                    {item.thongBao.tieuDe}
                  </Text>
                </View>
                <Text style={s.body}>{item.thongBao.noiDung}</Text>
                <Text style={[s.small, { marginTop: 14 }]}>
                  {dinhDangNgay(item.thongBao.ngayTao)} ·{' '}
                  {item.daDoc ? 'Đã đọc · Chạm để mở' : 'Chạm để đọc và mở'}
                </Text>
              </Pressable>
            ))}
          <PhanTrang
            page={page}
            meta={r.meta}
            onChange={setPage}
            limit={limit}
            onLimitChange={setLimit}
            loading={r.loading}
          />
        </>
      )}
    </ManHinh>
  )
}
