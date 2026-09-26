import { Pressable, Text, View } from 'react-native'
import { useState } from 'react'
import { DauTrang, LoiMoiDangNhap, ManHinh, Nut, ThongDiep, TrangThai } from '../thanhPhan/GiaoDien'
import { useXacThuc } from '../nguCanh/NguCanhXacThuc'
import useTaiNguyen from '../moc/useTaiNguyen'
import { goiApi } from '../dichVu/KetNoiApi'
import { kieuDang as s, mauSac } from '../ChuDe'

const nhanTrangThai = {
  NHAP: 'Bản nháp',
  CHO_DUYET: 'Chờ duyệt',
  DA_DUYET: 'Đã công khai',
  TU_CHOI: 'Cần chỉnh sửa',
}

export default function BaiDangCuaToi({ navigation }) {
  const { nguoiDung } = useXacThuc()
  const resource = useTaiNguyen('/mon-an/cua-toi?limit=20', Boolean(nguoiDung))
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(id) {
    setBusyId(id)
    setError('')
    setMessage('')
    try {
      await goiApi(`/mon-an/cua-toi/${id}/gui-duyet`, { method: 'POST', body: {} })
      setMessage('Công thức đã được gửi tới quản trị viên.')
      resource.reload()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <ManHinh header={<DauTrang back title="Công thức của tôi" />}>
      {!nguoiDung ? (
        <LoiMoiDangNhap />
      ) : (
        <>
          <Nut
            title="Đăng công thức mới"
            icon="add-circle-outline"
            onPress={() => navigation.navigate('DangCongThuc')}
            style={{ marginBottom: 18 }}
          />
          <ThongDiep success>{message}</ThongDiep>
          <ThongDiep>{error}</ThongDiep>
          <TrangThai
            {...resource}
            reload={resource.reload}
            empty={!resource.data?.length}
            emptyText="Bạn chưa có công thức nào."
          />
          {resource.data?.map((item) => {
            const editable = ['NHAP', 'TU_CHOI'].includes(item.trangThaiDuyet)
            return (
              <View key={item.idMonAn} style={[s.card, { padding: 18, marginBottom: 14 }]}> 
                <View style={s.between}>
                  <Text style={[s.heading, { flex: 1, marginRight: 10 }]}>{item.tenMonAn}</Text>
                  <Text style={[s.badge, { color: mauSac.accent }]}> 
                    {nhanTrangThai[item.trangThaiDuyet] || item.trangThaiDuyet}
                  </Text>
                </View>
                {!!item.lyDoTuChoi && (
                  <Text style={[s.small, { color: mauSac.red, marginTop: 10 }]}>
                    Lý do: {item.lyDoTuChoi}
                  </Text>
                )}
                {editable && (
                  <View style={[s.row, { gap: 10, marginTop: 15 }]}> 
                    <Pressable onPress={() => navigation.navigate('DangCongThuc', { id: item.idMonAn })}>
                      <Text style={s.link}>Chỉnh sửa</Text>
                    </Pressable>
                    <Nut
                      title="Gửi duyệt"
                      busy={busyId === item.idMonAn}
                      onPress={() => submit(item.idMonAn)}
                      style={{ flex: 1 }}
                    />
                  </View>
                )}
              </View>
            )
          })}
        </>
      )}
    </ManHinh>
  )
}
