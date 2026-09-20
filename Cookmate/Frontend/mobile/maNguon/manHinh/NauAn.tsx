import { useEffect, useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import useTaiNguyen from '../moc/useTaiNguyen'
import { goiApi } from '../dichVu/KetNoiApi'
import { useXacThuc } from '../nguCanh/NguCanhXacThuc'
import { Nut, DauTrang, BieuTuong, LoiMoiDangNhap, ThongDiep, ManHinh, TrangThai } from '../thanhPhan/GiaoDien'
import { mauSac, kieuDang as s } from '../ChuDe'
export default function NauAn({ route, navigation }) {
  const { nguoiDung } = useXacThuc(),
    r = useTaiNguyen(`/lich-su-nau/${route.params.id}`, !!nguoiDung),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(false),
    [deadline, setDeadline] = useState(null),
    [remaining, setRemaining] = useState(0)
  const history = r.data,
    details = [...(history?.chiTietLichSuNaus || [])].sort(
      (a, b) => a.buocNau.soThuTu - b.buocNau.soThuTu,
    ),
    current = details.find((d) => !d.daHoanThanh),
    finished = history?.trangThai !== 'DANG_NAU'
  useEffect(() => {
    setDeadline(null)
    setRemaining((current?.buocNau.thoiGian || 0) * 60)
  }, [current?.idBuocNau])
  useEffect(() => {
    if (!deadline) return
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setRemaining(left)
      if (!left) setDeadline(null)
    }
    tick()
    const timer = setInterval(tick, 500)
    return () => clearInterval(timer)
  }, [deadline])
  async function mark() {
    setBusy(true)
    setError('')
    try {
      await goiApi(`/lich-su-nau/${history.idLichSu}/steps/${current.idBuocNau}`, {
        method: 'PATCH',
        body: { daHoanThanh: true },
      })
      setDeadline(null)
      r.reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  async function cancel() {
    setBusy(true)
    try {
      await goiApi(`/lich-su-nau/${history.idLichSu}/cancel`, { method: 'PATCH', body: {} })
      setConfirm(false)
      setDeadline(null)
      r.reload()
    } catch (e) {
      setError(e.message)
      setConfirm(false)
    } finally {
      setBusy(false)
    }
  }
  const complete = details.filter((d) => d.daHoanThanh).length
  return (
    <ManHinh header={<DauTrang back title="Cùng vào bếp" />}>
      {!nguoiDung ? (
        <LoiMoiDangNhap />
      ) : (
        <>
          <TrangThai {...r} reload={r.reload} />
          <ThongDiep>{error}</ThongDiep>
          {history && (
            <>
              <Text style={s.badge}>
                {finished
                  ? history.trangThai === 'HOAN_THANH'
                    ? 'BỮA ĂN ĐÃ SẴN SÀNG'
                    : 'PHIÊN NẤU ĐÃ HỦY'
                  : 'CHẾ ĐỘ NẤU ĂN'}
              </Text>
              <Text style={[s.title, s.serif, { marginVertical: 15 }]}>
                {history.congThucSnapshot?.tenMonAn || history.monAn?.tenMonAn}
              </Text>
              <View style={[s.between, { marginBottom: 10 }]}>
                <Text style={s.small}>Hành trình món ngon</Text>
                <Text style={s.small}>
                  {complete}/{details.length} bước
                </Text>
              </View>
              <View
                style={{
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: '#efdfd3',
                  overflow: 'hidden',
                  marginBottom: 25,
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${details.length ? (complete / details.length) * 100 : 0}%`,
                    backgroundColor: mauSac.accent,
                  }}
                />
              </View>
              {finished ? (
                <View style={[s.card, { alignItems: 'center', padding: 28, gap: 16 }]}>
                  <BieuTuong
                    name={
                      history.trangThai === 'HOAN_THANH'
                        ? 'checkmark-circle-outline'
                        : 'close-circle-outline'
                    }
                    size={65}
                    color={history.trangThai === 'HOAN_THANH' ? mauSac.green : mauSac.muted}
                  />
                  <Text style={[s.heading, { textAlign: 'center' }]}>
                    {history.trangThai === 'HOAN_THANH'
                      ? 'Bạn đã làm được rồi!'
                      : 'Hẹn bạn ở bữa ăn tiếp theo'}
                  </Text>
                  <Text style={[s.muted, { textAlign: 'center' }]}>
                    {history.trangThai === 'HOAN_THANH'
                      ? 'Thưởng thức thành quả và chia sẻ cảm nhận về món ăn nhé.'
                      : 'Lịch sử của phiên này vẫn được lưu lại.'}
                  </Text>
                  <Nut
                    title="Xem lại công thức"
                    onPress={() => navigation.popTo('ChiTietMonAn', { id: history.idMonAn })}
                  />
                </View>
              ) : (
                current && (
                  <View style={[s.card, { padding: 24, backgroundColor: '#fff5eb' }]}>
                    <Text style={s.badge}>BƯỚC {current.buocNau.soThuTu}</Text>
                    <Text style={[s.heading, { fontSize: 24, marginVertical: 18 }]}>
                      {current.buocNau.tieuDe || 'Bắt tay thực hiện'}
                    </Text>
                    <Text style={[s.body, { lineHeight: 27, fontSize: 16, marginBottom: 25 }]}>
                      {current.buocNau.huongDan}
                    </Text>
                    {current.buocNau.thoiGian > 0 && (
                      <View
                        style={{
                          alignItems: 'center',
                          padding: 20,
                          backgroundColor: '#fff',
                          borderRadius: 14,
                          marginBottom: 22,
                        }}
                      >
                        <BieuTuong name="timer-outline" size={28} color={mauSac.accent} />
                        <Text
                          style={{
                            fontSize: 35,
                            fontWeight: '600',
                            color: mauSac.ink,
                            marginVertical: 10,
                          }}
                        >
                          {String(Math.floor(remaining / 60)).padStart(2, '0')}:
                          {String(remaining % 60).padStart(2, '0')}
                        </Text>
                        <Nut
                          title={
                            deadline ? 'Dừng hẹn giờ' : `Hẹn giờ ${current.buocNau.thoiGian} phút`
                          }
                          secondary
                          onPress={() => {
                            if (deadline) {
                              setDeadline(null)
                            } else {
                              setRemaining(current.buocNau.thoiGian * 60)
                              setDeadline(Date.now() + current.buocNau.thoiGian * 60000)
                            }
                          }}
                        />
                      </View>
                    )}
                    <Nut
                      title={
                        complete === details.length - 1
                          ? 'Hoàn thành món ăn'
                          : 'Xong bước này, tiếp tục'
                      }
                      icon="checkmark"
                      busy={busy || r.loading}
                      onPress={mark}
                    />
                  </View>
                )
              )}
              <Text style={[s.heading, { fontSize: 18, marginBottom: 18 }]}>
                Các bước trong phiên nấu
              </Text>
              {details.map((d) => (
                <View
                  key={d.idChiTiet}
                  style={[
                    s.row,
                    {
                      gap: 13,
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: mauSac.border,
                    },
                  ]}
                >
                  <BieuTuong
                    name={d.daHoanThanh ? 'checkmark-circle' : 'ellipse-outline'}
                    color={d.daHoanThanh ? mauSac.green : mauSac.muted}
                  />
                  <Text
                    style={[s.body, { flex: 1, color: d.daHoanThanh ? mauSac.green : mauSac.ink }]}
                  >
                    {d.buocNau.soThuTu}. {d.buocNau.tieuDe || 'Thực hiện bước nấu'}
                  </Text>
                </View>
              ))}
              {!finished && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setConfirm(true)}
                  style={{ alignItems: 'center', padding: 25 }}
                >
                  <Text style={{ color: mauSac.red, fontSize: 13 }}>Dừng và hủy phiên nấu</Text>
                </Pressable>
              )}
            </>
          )}
        </>
      )}
      <Modal
        transparent
        visible={confirm}
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setConfirm(false)
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#38271999',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 25,
          }}
        >
          <View style={[s.card, { width: '100%', maxWidth: 400, padding: 24 }]}>
            <Text style={[s.heading, { marginBottom: 12 }]}>Dừng nấu món này?</Text>
            <Text style={[s.muted, { marginBottom: 22 }]}>
              Phiên nấu sẽ được lưu là đã hủy. Bạn có thể bắt đầu một phiên mới sau.
            </Text>
            <ThongDiep>{error}</ThongDiep>
            <Nut
              title="Tiếp tục nấu"
              secondary
              disabled={busy}
              onPress={() => setConfirm(false)}
            />
            <Nut title="Hủy phiên nấu" busy={busy} style={{ marginTop: 12 }} onPress={cancel} />
          </View>
        </View>
      </Modal>
    </ManHinh>
  )
}
