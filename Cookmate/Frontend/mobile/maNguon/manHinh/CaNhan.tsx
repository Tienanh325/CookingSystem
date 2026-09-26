import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useXacThuc } from '../nguCanh/NguCanhXacThuc'
import { goiApi } from '../dichVu/KetNoiApi'
import { dangKyThongBaoDay } from '../dichVu/ThongBaoDay'
import { Nut, TruongNhap, DauTrang, BieuTuong, LoiMoiDangNhap, ThongDiep, ManHinh } from '../thanhPhan/GiaoDien'
import { mauSac, kieuDang as s } from '../ChuDe'
export default function CaNhan({ navigation }) {
  const { nguoiDung, dangXuat, loiPhien } = useXacThuc(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [dangBatPush, datDangBatPush] = useState(false),
    [ketQuaPush, datKetQuaPush] = useState('')
  async function leave() {
    setBusy(true)
    try {
      await dangXuat()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  async function batThongBaoDay() {
    datDangBatPush(true)
    datKetQuaPush('')
    setError('')
    try {
      const token = await dangKyThongBaoDay(true)
      if (!token)
        setError('Thiết bị không hỗ trợ hoặc bạn chưa cấp quyền nhận thông báo.')
      else datKetQuaPush('Đã bật push notification cho thiết bị này.')
    } catch (e: any) {
      setError(e.message)
    } finally {
      datDangBatPush(false)
    }
  }
  return (
    <ManHinh header={<DauTrang notifications />}>
      {!nguoiDung ? (
        <>
          <Text style={[s.title, s.serif]}>Góc bếp của bạn</Text>
          <ThongDiep>{loiPhien}</ThongDiep>
          <LoiMoiDangNhap />
        </>
      ) : (
        <>
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <View
              style={{
                width: 82,
                height: 82,
                borderRadius: 41,
                backgroundColor: '#f2ddc5',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 15,
              }}
            >
              <Text style={{ fontSize: 30, fontWeight: '700', color: mauSac.accent }}>
                {nguoiDung.hoTen?.charAt(0)}
              </Text>
            </View>
            <Text style={s.heading}>{nguoiDung.hoTen}</Text>
            <Text style={[s.muted, { marginTop: 6 }]}>{nguoiDung.email || nguoiDung.soDienThoai}</Text>
            <Text style={[s.badge, { alignSelf: 'center', marginTop: 15 }]}>Yêu bếp · Yêu nhà</Text>
          </View>
          <View style={[s.card, { padding: 0 }]}>
            {[
              ['person-outline', 'Thông tin cá nhân', 'SuaHoSo'],
              ['create-outline', 'Công thức của tôi', 'BaiDangCuaToi'],
              ['time-outline', 'Nhật ký vào bếp', 'LichSu'],
              ['sparkles-outline', 'Gói Cookmate', 'GoiDichVu'],
              ['lock-closed-outline', 'Đổi mật khẩu', 'DoiMatKhau'],
              ['notifications-outline', 'Thông báo', 'ThongBao'],
            ]
              .filter(([, , screen]) => screen !== 'DoiMatKhau' || nguoiDung.hasPassword !== false)
              .map(([icon, label, screen]) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  key={screen}
                  onPress={() => navigation.navigate(screen)}
                  style={[
                    s.row,
                    {
                      padding: 20,
                      gap: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: mauSac.border,
                    },
                  ]}
                >
                  <BieuTuong name={icon} color={mauSac.accent} />
                  <Text style={[s.body, { flex: 1 }]}>{label}</Text>
                  <BieuTuong name="chevron-forward" size={18} />
                </Pressable>
              ))}
          </View>
          <Nut
            title="Bật thông báo đẩy"
            secondary
            icon="notifications-outline"
            busy={dangBatPush}
            onPress={batThongBaoDay}
            style={{ marginBottom: 12 }}
          />
          <ThongDiep success>{ketQuaPush}</ThongDiep>
          <ThongDiep>{error}</ThongDiep>
          <Nut
            title="Đăng xuất khỏi các thiết bị"
            secondary
            icon="log-out-outline"
            busy={busy}
            onPress={leave}
          />
          <Text style={[s.small, { textAlign: 'center', marginTop: 35 }]}>
            Cookmate 1.0 · Một chút yêu thương trong từng bữa ăn.
          </Text>
        </>
      )}
    </ManHinh>
  )
}
export function ChinhSuaCaNhan({ navigation, route }) {
  const { nguoiDung, datNguoiDung, xoaPhien } = useXacThuc(),
    passwordMode = route.name === 'DoiMatKhau'
  const [name, setName] = useState(nguoiDung?.hoTen || ''),
    [phone, setPhone] = useState(nguoiDung?.soDienThoai || ''),
    [old, setOld] = useState(''),
    [next, setNext] = useState(''),
    [confirm, setConfirm] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  async function save() {
    setError('')
    if (passwordMode && next !== confirm) {
      setError('Mật khẩu xác nhận chưa khớp.')
      return
    }
    setBusy(true)
    try {
      if (passwordMode) {
        await goiApi('/auth/change-password', {
          method: 'PATCH',
          body: { matKhauCu: old, matKhauMoi: next },
        })
        await xoaPhien()
        navigation.replace('DangNhap')
      } else {
        const r = await goiApi('/auth/me', {
          method: 'PATCH',
          body: { hoTen: name, soDienThoai: phone },
        })
        datNguoiDung(r.data)
        navigation.goBack()
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <ManHinh header={<DauTrang back title={passwordMode ? 'Đổi mật khẩu' : 'Thông tin cá nhân'} />}>
      <ThongDiep>{error}</ThongDiep>
      {!nguoiDung ? (
        <LoiMoiDangNhap />
      ) : (
        <>
          {passwordMode ? (
            <>
              <Text style={[s.muted, { marginBottom: 24 }]}>
                Sau khi đổi mật khẩu, bạn cần đăng nhập lại trên các thiết bị.
              </Text>
              <TruongNhap
                label="Mật khẩu hiện tại"
                secureTextEntry
                value={old}
                onChangeText={setOld}
                autoComplete="current-password"
              />
              <TruongNhap
                label="Mật khẩu mới"
                secureTextEntry
                value={next}
                onChangeText={setNext}
                autoComplete="new-password"
                placeholder="Ít nhất 8 ký tự"
              />
              <TruongNhap
                label="Xác nhận mật khẩu mới"
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
                autoComplete="new-password"
              />
            </>
          ) : (
            <>
              <TruongNhap label="Họ và tên" value={name} onChangeText={setName} maxLength={100} />
              <TruongNhap label="Email" value={nguoiDung.email} editable={false} />
              <TruongNhap
                label="Số điện thoại"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={20}
              />
            </>
          )}
          <Nut title="Lưu thay đổi" busy={busy} onPress={save} />
        </>
      )}
    </ManHinh>
  )
}
