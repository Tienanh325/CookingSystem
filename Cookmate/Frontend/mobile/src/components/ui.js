import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { colors, styles as s } from '../theme'
import { imageUrl } from '../services/api'
export function Icon({ name, size = 21, color = colors.muted, ...props }) {
  return <Ionicons name={name} size={size} color={color} {...props} />
}
export function Button({
  title,
  onPress,
  disabled = false,
  busy = false,
  secondary = false,
  icon,
  style,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        local.button,
        secondary && local.secondary,
        (pressed || disabled || busy) && { opacity: 0.6 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.accent : '#fff'} />
      ) : icon ? (
        <Icon
          name={icon}
          color={secondary ? colors.accent : '#fff'}
          size={18}
        />
      ) : null}
      <Text style={[local.buttonText, secondary && { color: colors.accent }]}>
        {title}
      </Text>
    </Pressable>
  )
}
export function Field({ label, style, ...props }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#baa79a"
        style={[s.input, style]}
        {...props}
      />
    </View>
  )
}
export function Message({ children, success = false }) {
  return children ? (
    <View
      accessibilityRole="alert"
      style={[local.message, success && { backgroundColor: colors.greenSoft }]}
    >
      <Text
        style={{
          fontSize: 13,
          lineHeight: 21,
          color: success ? colors.green : colors.red,
        }}
      >
        {children}
      </Text>
    </View>
  ) : null
}
export function Screen({
  children,
  scroll = true,
  style,
  header,
  refreshControl,
  resetKey,
}) {
  const scrollRef = useRef(null)
  useEffect(() => { if (resetKey !== undefined) scrollRef.current?.scrollTo({ y: 0, animated: false }) }, [resetKey])
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.page}>
      {header}
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[s.content, style]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, style]}>{children}</View>
      )}
    </SafeAreaView>
  )
}
export function Header({ title, back = false, notifications = false }) {
  const navigation = useNavigation()
  return (
    <View style={local.header}>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={12}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" color={colors.ink} />
        </Pressable>
      ) : (
        <MaterialCommunityIcons
          name="chef-hat"
          size={28}
          color={colors.accent}
        />
      )}
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text
          style={{
            fontSize: back ? 17 : 21,
            fontWeight: '700',
            color: back ? colors.ink : colors.accent,
          }}
        >
          {title || 'Cookmate'}
        </Text>
        {!back && (
          <Text style={{ fontSize: 9, color: colors.muted }}>
            Bếp xinh mỗi ngày
          </Text>
        )}
      </View>
      {notifications && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thông báo"
          hitSlop={10}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Icon name="notifications-outline" color={colors.ink} />
        </Pressable>
      )}
    </View>
  )
}
export function State({
  loading,
  error,
  empty,
  reload,
  emptyText = 'Chưa có nội dung ở đây.',
}) {
  if (loading)
    return (
      <View style={s.empty}>
        <ActivityIndicator color={colors.accent} />
        <Text style={s.muted}>Đang chuẩn bị…</Text>
      </View>
    )
  if (error)
    return (
      <View style={s.empty}>
        <Icon name="cloud-offline-outline" size={35} />
        <Message>{error}</Message>
        <Button title="Thử lại" secondary onPress={reload} />
      </View>
    )
  if (empty)
    return (
      <View style={s.empty}>
        <MaterialCommunityIcons name="chef-hat" size={42} color="#c9ae98" />
        <Text style={[s.muted, { textAlign: 'center' }]}>{emptyText}</Text>
      </View>
    )
  return null
}
export function LoginPrompt() {
  const nav = useNavigation()
  return (
    <View
      style={[
        s.card,
        { padding: 28, marginTop: 24, alignItems: 'center', gap: 16 },
      ]}
    >
      <Icon name="heart-circle-outline" size={52} color={colors.accent} />
      <Text style={s.heading}>Góc bếp của riêng bạn</Text>
      <Text style={[s.muted, { textAlign: 'center' }]}>
        Đăng nhập để lưu món yêu thích và tiếp tục những bữa ăn đang nấu.
      </Text>
      <Button title="Đăng nhập" onPress={() => nav.navigate('Login')} />
      <Pressable
        accessibilityRole="button"
        onPress={() => nav.navigate('Register')}
      >
        <Text style={s.link}>Chưa có tài khoản? Đăng ký</Text>
      </Pressable>
    </View>
  )
}
export function FoodImage({ uri, style }) {
  const [failed, setFailed] = useState(false)
  return uri && !failed ? (
    <Image
      source={{ uri: imageUrl(uri) }}
      style={[local.foodImage, style]}
      onError={() => setFailed(true)}
    />
  ) : (
    <View style={[local.foodImage, local.foodPlaceholder, style]}>
      <MaterialCommunityIcons name="chef-hat" size={46} color="#be977a" />
      <Text style={{ fontSize: 11, color: '#be977a', marginTop: 6 }}>
        Cookmate kitchen
      </Text>
    </View>
  )
}
export function RecipeCard({ recipe, horizontal = false, onPress }) {
  const navigation = useNavigation()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem món ${recipe.tenMonAn}`}
      onPress={
        onPress || (() => navigation.navigate('Detail', { id: recipe.idMonAn }))
      }
      style={[local.recipeCard, horizontal && { width: 235, marginRight: 15 }]}
    >
      <FoodImage
        uri={recipe.anhDaiDien || recipe.hinhAnhs?.[0]?.duongDan}
        style={{ height: horizontal ? 150 : 185 }}
      />
      <View style={{ padding: 15 }}>
        <Text style={[s.badge, { fontSize: 9 }]}>
          {recipe.danhMuc?.tenDanhMuc || 'Bữa cơm nhà'}
        </Text>
        <Text
          numberOfLines={2}
          style={{
            fontSize: 17,
            fontWeight: '700',
            color: colors.ink,
            marginVertical: 10,
          }}
        >
          {recipe.tenMonAn}
        </Text>
        <View style={s.between}>
          <View style={[s.row, { gap: 5 }]}>
            <Icon name="time-outline" size={14} />
            <Text style={s.small}>{recipe.tongThoiGian} phút</Text>
            <Text style={s.small}> · {recipe.khauPhan} người</Text>
          </View>
          <View style={[s.row, { gap: 4 }]}>
            <Icon name="star" color="#d89435" size={13} />
            <Text style={s.small}>
              {Number(recipe.diemDanhGia || 0).toFixed(1)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  )
}
export function Pager({
  page,
  meta,
  onChange,
  limit,
  onLimitChange,
  loading = false,
}) {
  useEffect(() => {
    if (!loading && meta && page > meta.totalPages)
      onChange(Math.max(1, meta.totalPages))
  }, [meta, page, onChange, loading])
  return meta ? (
    <View style={{ marginVertical: 20, gap: 12 }}>
      <Text
        style={[s.small, { textAlign: 'center' }]}
        accessibilityLiveRegion="polite"
      >
        {meta.totalItems} kết quả · Trang {page}/{Math.max(1, meta.totalPages)}
      </Text>
      {onLimitChange && (
        <View style={[s.between, { gap: 8 }]}>
          <Text style={s.small}>Số mục/trang</Text>
          {[5, 10, 20].map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`${n} mục mỗi trang`}
              accessibilityState={{ selected: n === limit, disabled: loading }}
              disabled={loading}
              onPress={() => {
                onLimitChange(n)
                onChange(1)
              }}
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: n === limit ? colors.accent : '#fff',
              }}
            >
              <Text style={{ color: n === limit ? '#fff' : colors.ink }}>
                {n}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={s.between}>
        <Button
          title="Trước"
          secondary
          disabled={loading || page <= 1}
          onPress={() => onChange(page - 1)}
        />
        <Text style={s.small}>
          {page} / {meta.totalPages}
        </Text>
        <Button
          title="Tiếp"
          secondary
          disabled={loading || page >= meta.totalPages}
          onPress={() => onChange(page + 1)}
        />
      </View>
    </View>
  ) : null
}
export function SectionTitle({ title, action, onPress }) {
  return (
    <View style={[s.between, s.section]}>
      <Text style={s.heading}>{title}</Text>
      {action && (
        <Pressable accessibilityRole="button" onPress={onPress}>
          <Text style={s.link}>{action} →</Text>
        </Pressable>
      )}
    </View>
  )
}
const local = StyleSheet.create({
  button: {
    minHeight: 49,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  secondary: {
    backgroundColor: colors.soft,
    borderWidth: 1,
    borderColor: '#f4d8c7',
  },
  buttonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  message: {
    backgroundColor: '#fff0eb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  header: {
    height: 76,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  foodImage: { width: '100%', height: 200, backgroundColor: '#f6eadd' },
  foodPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  recipeCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 17,
    overflow: 'hidden',
    marginBottom: 16,
  },
})
