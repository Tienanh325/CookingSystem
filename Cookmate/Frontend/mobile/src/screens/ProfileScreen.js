import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { Button, Field, Header, Icon, LoginPrompt, Message, Screen } from '../components/ui'
import { colors, styles as s } from '../theme'
export default function ProfileScreen({ navigation }) {
  const { user, logout, sessionError, biometricEnabled, enableBiometric, lock } = useAuth(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function leave() {
    setBusy(true)
    try {
      await logout()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Screen header={<Header notifications />}>
      {!user ? (
        <>
          <Text style={[s.title, s.serif]}>Góc bếp của bạn</Text>
          <Message>{sessionError}</Message>
          <LoginPrompt />
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
              <Text style={{ fontSize: 30, fontWeight: '700', color: colors.accent }}>
                {user.hoTen?.charAt(0)}
              </Text>
            </View>
            <Text style={s.heading}>{user.hoTen}</Text>
            <Text style={[s.muted, { marginTop: 6 }]}>{user.email || user.soDienThoai}</Text>
            <Text style={[s.badge, { alignSelf: 'center', marginTop: 15 }]}>Yêu bếp · Yêu nhà</Text>
          </View>
          <View style={[s.card, { padding: 0 }]}>
            {[
              ['person-outline', 'Thông tin cá nhân', 'EditProfile'],
              ['lock-closed-outline', 'Đổi mật khẩu', 'ChangePassword'],
              ['notifications-outline', 'Thông báo', 'Notifications'],
            ]
              .filter(([, , screen]) => screen !== 'ChangePassword' || user.hasPassword !== false)
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
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <Icon name={icon} color={colors.accent} />
                  <Text style={[s.body, { flex: 1 }]}>{label}</Text>
                  <Icon name="chevron-forward" size={18} />
                </Pressable>
              ))}
          </View>
          <Message>{error}</Message>
          <Button
            title={biometricEnabled ? 'Khóa phiên trên thiết bị' : 'Bật Face ID / Vân tay'}
            secondary
            icon="finger-print-outline"
            busy={busy}
            onPress={async () => {
              setError('')
              setBusy(true)
              try {
                if (biometricEnabled) lock()
                else await enableBiometric()
              } catch (e) {
                setError(e.message)
              } finally {
                setBusy(false)
              }
            }}
          />
          <Button
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
    </Screen>
  )
}
export function EditProfileScreen({ navigation, route }) {
  const { user, setUser, clear } = useAuth(),
    passwordMode = route.name === 'ChangePassword'
  const [name, setName] = useState(user?.hoTen || ''),
    [phone, setPhone] = useState(user?.soDienThoai || ''),
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
        await api('/auth/change-password', {
          method: 'PATCH',
          body: { matKhauCu: old, matKhauMoi: next },
        })
        await clear()
        navigation.replace('Login')
      } else {
        const r = await api('/auth/me', {
          method: 'PATCH',
          body: { hoTen: name, soDienThoai: phone },
        })
        setUser(r.data)
        navigation.goBack()
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Screen header={<Header back title={passwordMode ? 'Đổi mật khẩu' : 'Thông tin cá nhân'} />}>
      <Message>{error}</Message>
      {!user ? (
        <LoginPrompt />
      ) : (
        <>
          {passwordMode ? (
            <>
              <Text style={[s.muted, { marginBottom: 24 }]}>
                Sau khi đổi mật khẩu, bạn cần đăng nhập lại trên các thiết bị.
              </Text>
              <Field
                label="Mật khẩu hiện tại"
                secureTextEntry
                value={old}
                onChangeText={setOld}
                autoComplete="current-password"
              />
              <Field
                label="Mật khẩu mới"
                secureTextEntry
                value={next}
                onChangeText={setNext}
                autoComplete="new-password"
                placeholder="Ít nhất 8 ký tự"
              />
              <Field
                label="Xác nhận mật khẩu mới"
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
                autoComplete="new-password"
              />
            </>
          ) : (
            <>
              <Field label="Họ và tên" value={name} onChangeText={setName} maxLength={100} />
              <Field label="Email" value={user.email} editable={false} />
              <Field
                label="Số điện thoại"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={20}
              />
            </>
          )}
          <Button title="Lưu thay đổi" busy={busy} onPress={save} />
        </>
      )}
    </Screen>
  )
}
