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
    { authenticate, acceptSession } = useAuth()
  const [methods, setMethods] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    api('/auth/methods', { signal: controller.signal })
      .then((r) => setMethods(r.data))
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message)
      })
    return () => controller.abort()
  }, [])
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function submit() {
    setError('')
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
  async function alternative(provider) {
    setBusy(true)
    setError('')
    try {
      await acceptSession(await socialAuth(provider))
      navigation.popToTop()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
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
        <Message>{error}</Message>
        <Button
          title={register ? 'Tạo tài khoản' : 'Đăng nhập'}
          icon="arrow-forward"
          busy={busy}
          onPress={submit}
        />
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
