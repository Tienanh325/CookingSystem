import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { socialAuth } from '../services/socialAuth'
import { Button, Field, Header, Message, Screen } from '../components/ui'
import { colors, styles as s, headingFont } from '../theme'
export default function AuthScreen({ navigation, route }) {
  const register = route.name === 'Register',
    { authenticate, acceptSession, biometricEnabled, unlockBiometric } = useAuth()
  const [method, setMethod] = useState('email'),
    [phone, setPhone] = useState(''),
    [methods, setMethods] = useState(null),
    [otp, setOtp] = useState(null),
    [code, setCode] = useState(''),
    [now, setNow] = useState(Date.now())
  useEffect(() => {
    const controller = new AbortController()
    api('/auth/methods', { signal: controller.signal })
      .then((r) => setMethods(r.data))
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message)
      })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    if (!otp) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [otp])
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function submit() {
    setError('')
    if (method === 'phone') {
      await requestCode()
      return
    }
    if (!email.trim() || !password || (register && !name.trim())) {
      setError('Vui lòng điền đầy đủ thông tin.')
      return
    }
    if (register && password !== confirm) {
      setError('Mật khẩu xác nhận chưa khớp.')
      return
    }
    setBusy(true)
    try {
      await authenticate(
        {
          email: email.trim().toLowerCase(),
          matKhau: password,
          ...(register ? { hoTen: name.trim() } : {}),
        },
        register,
      )
      navigation.popToTop()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  async function requestCode() {
    if (register && !name.trim()) {
      setError('Vui lòng nhập họ tên.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const r = await api('/auth/otp/request', {
        method: 'POST',
        body: { phone, ...(name.trim() ? { name: name.trim() } : {}) },
      })
      const time = Date.now()
      setNow(time)
      setCode('')
      setOtp({
        ...r.data,
        expiresAt: time + r.data.expiresIn * 1000,
        resendAt: time + r.data.resendAfter * 1000,
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  async function verifyCode() {
    setBusy(true)
    setError('')
    try {
      const r = await api('/auth/otp/verify', {
        method: 'POST',
        body: { challengeId: otp.challengeId, code },
      })
      await acceptSession(r.data)
      navigation.popToTop()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  async function alternative(provider) {
    setBusy(true)
    setError('')
    try {
      if (provider === 'biometric') await unlockBiometric()
      else await acceptSession(await socialAuth(provider))
      navigation.popToTop()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  if (otp)
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Screen header={<Header back title="Xác thực mã OTP" />}>
          <View style={{ alignItems: 'center', marginVertical: 28, gap: 16 }}>
            <MaterialCommunityIcons name="message-lock-outline" size={64} color={colors.accent} />
            <Text style={s.title}>Xác thực mã OTP</Text>
            <Text style={[s.muted, { textAlign: 'center' }]}>
              Nhập mã 6 chữ số để xác minh số điện thoại
            </Text>
            <Text style={s.badge}>{otp.phone}</Text>
          </View>
          {otp.local && (
            <Message>Đang dùng OTP thử nghiệm cục bộ; không gửi SMS đến điện thoại.</Message>
          )}
          <Field
            label="Mã OTP"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            maxLength={6}
            placeholder="000000"
            style={{ fontSize: 28, letterSpacing: 14, textAlign: 'center' }}
          />
          <Text style={[s.small, { textAlign: 'center', marginBottom: 20 }]}>
            {now < otp.expiresAt
              ? `Mã còn hiệu lực ${Math.ceil((otp.expiresAt - now) / 1000)} giây`
              : 'Mã đã hết hạn. Hãy gửi lại mã.'}
          </Text>
          <Message>{error}</Message>
          <Button
            title="Xác thực & Tiếp tục"
            onPress={verifyCode}
            busy={busy}
            disabled={code.length !== 6 || now >= otp.expiresAt}
          />
          <Button
            title={
              now < otp.resendAt
                ? `Gửi lại mã sau ${Math.ceil((otp.resendAt - now) / 1000)} giây`
                : 'Gửi lại mã'
            }
            secondary
            disabled={busy || now < otp.resendAt}
            onPress={requestCode}
          />
          <Button
            title="Đổi số điện thoại"
            secondary
            disabled={busy}
            onPress={() => {
              setOtp(null)
              setCode('')
              setError('')
            }}
          />
          <Text style={[s.small, { marginTop: 24, textAlign: 'center' }]}>
            Không chia sẻ mã xác thực cho người khác.
          </Text>
        </Screen>
      </KeyboardAvoidingView>
    )
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen header={<Header back title={register ? 'Đăng ký' : 'Đăng nhập'} />}>
        <View style={{ alignItems: 'center', marginVertical: 25 }}>
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 25,
              backgroundColor: colors.soft,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <MaterialCommunityIcons name="chef-hat" size={42} color={colors.accent} />
          </View>
          <Text
            style={{
              fontSize: 30,
              fontFamily: headingFont,
              color: colors.ink,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            {register ? 'Bắt đầu một căn bếp mới' : 'Mừng bạn trở lại!'}
          </Text>
          <Text style={[s.muted, { textAlign: 'center', maxWidth: 285 }]}>
            {register
              ? 'Lưu công thức yêu thích và tìm niềm vui trong từng bữa ăn.'
              : 'Góc bếp của bạn đang chờ. Cùng nấu một món thật ngon nhé.'}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.soft,
            borderRadius: 16,
            padding: 5,
            marginBottom: 24,
          }}
        >
          {[
            ['phone', 'Điện thoại / OTP'],
            ['email', 'Email & Mật khẩu'],
          ].map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: method === value, disabled: busy }}
              disabled={busy}
              onPress={() => {
                setMethod(value)
                setError('')
              }}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: method === value ? '#fff' : 'transparent',
              }}
            >
              <Text
                style={{
                  textAlign: 'center',
                  color: method === value ? colors.accent : colors.muted,
                  fontWeight: '600',
                  fontSize: 12,
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        {register && (
          <Field
            label="Họ và tên"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            placeholder="Tên của bạn"
            maxLength={100}
          />
        )}
        {method === 'phone' ? (
          <>
            <Field
              label="Số điện thoại"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="0912 345 678"
              maxLength={25}
            />
            <Text style={[s.small, { marginBottom: 18 }]}>
              Xác minh bằng OTP. Lần đầu xác minh sẽ tạo tài khoản khách hàng mới. Số điện thoại
              trong hồ sơ cũ không tự liên kết tài khoản.
            </Text>
            {methods && !methods.phone && (
              <Message>
                Đăng nhập điện thoại chưa khả dụng. Bạn có thể dùng email và mật khẩu.
              </Message>
            )}
          </>
        ) : (
          <>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="ban@example.com"
              maxLength={150}
            />
            <Field
              label="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!visible}
              autoCapitalize="none"
              autoComplete={register ? 'new-password' : 'current-password'}
              placeholder={register ? 'Ít nhất 8 ký tự' : 'Nhập mật khẩu'}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setVisible(!visible)}
              style={{ alignSelf: 'flex-end', marginTop: -9, marginBottom: 18 }}
            >
              <Text style={s.link}>{visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</Text>
            </Pressable>
            {register && (
              <Field
                label="Xác nhận mật khẩu"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu"
              />
            )}
          </>
        )}
        <Message>{error}</Message>
        <Button
          title={
            method === 'phone' ? 'Nhận mã OTP xác thực' : register ? 'Tạo tài khoản' : 'Đăng nhập'
          }
          icon="arrow-forward"
          busy={busy}
          disabled={method === 'phone' && !methods?.phone}
          onPress={submit}
        />
        {!register && (
          <Button
            title={
              biometricEnabled
                ? 'Mở khóa bằng Face ID / Vân tay'
                : 'Face ID / Vân tay — bật trong hồ sơ sau đăng nhập'
            }
            secondary
            icon="finger-print-outline"
            disabled={!biometricEnabled || busy}
            onPress={() => alternative('biometric')}
          />
        )}
        <Text style={[s.small, { textAlign: 'center', marginVertical: 20 }]}>
          Hoặc tiếp tục với
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            ['google', 'Google', 'google'],
            ['apple', 'Apple', 'apple'],
            ['zalo', 'Zalo', 'chat'],
          ].map(([provider, label, icon]) => (
            <Pressable
              key={provider}
              accessibilityRole="button"
              accessibilityLabel={`Đăng nhập bằng ${label}`}
              accessibilityState={{ disabled: busy || !methods?.[provider] }}
              disabled={busy || !methods?.[provider]}
              onPress={() => alternative(provider)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 15,
                gap: 6,
                backgroundColor: '#fff',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: methods?.[provider] ? 1 : 0.55,
              }}
            >
              <MaterialCommunityIcons
                name={icon}
                size={23}
                color={provider === 'zalo' ? '#0068ff' : colors.ink}
              />
              <Text style={s.small}>{label}</Text>
              {!methods?.[provider] && (
                <Text style={{ fontSize: 9, color: colors.muted }}>Chưa khả dụng</Text>
              )}
            </Pressable>
          ))}
        </View>
        <View style={{ alignItems: 'center', marginTop: 28, gap: 10 }}>
          <Text style={s.muted}>{register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.replace(register ? 'Login' : 'Register')}
          >
            <Text style={s.link}>{register ? 'Đăng nhập ngay' : 'Đăng ký miễn phí'}</Text>
          </Pressable>
        </View>
        <Text style={[s.small, { textAlign: 'center', marginTop: 35 }]}>
          Cookmate · Bếp ấm, cơm ngon, nhà vui.
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  )
}
