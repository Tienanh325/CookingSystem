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
import { mauSac, kieuDang as s } from '../ChuDe'
import { duongDanAnh } from '../dichVu/KetNoiApi'
export function BieuTuong({ name, size = 21, color = mauSac.muted, ...props }: any) {
  return <Ionicons name={name} size={size} color={color} {...props} />
}
export function Nut({
  title,
  onPress,
  disabled = false,
  busy = false,
  secondary = false,
  icon,
  style,
}: any) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        cucBo.button,
        secondary && cucBo.secondary,
        (pressed || disabled || busy) && { opacity: 0.6 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? mauSac.accent : '#fff'} />
      ) : icon ? (
        <BieuTuong
          name={icon}
          color={secondary ? mauSac.accent : '#fff'}
          size={18}
        />
      ) : null}
      <Text style={[cucBo.buttonText, secondary && { color: mauSac.accent }]}>
        {title}
      </Text>
    </Pressable>
  )
}
export function TruongNhap({ label, style, ...props }: any) {
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
export function ThongDiep({ children, success = false }: any) {
  return children ? (
    <View
      accessibilityRole="alert"
      style={[cucBo.message, success && { backgroundColor: mauSac.greenSoft }]}
    >
      <Text
        style={{
          fontSize: 13,
          lineHeight: 21,
          color: success ? mauSac.green : mauSac.red,
        }}
      >
        {children}
      </Text>
    </View>
  ) : null
}
export function ManHinh({
  children,
  scroll = true,
  style,
  header,
  refreshControl,
  resetKey,
}: any) {
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
export function DauTrang({ title, back = false, notifications = false }: any) {
  const navigation = useNavigation<any>()
  return (
    <View style={cucBo.header}>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={12}
          onPress={() => navigation.goBack()}
        >
          <BieuTuong name="arrow-back" color={mauSac.ink} />
        </Pressable>
      ) : (
        <MaterialCommunityIcons
          name="chef-hat"
          size={28}
          color={mauSac.accent}
        />
      )}
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text
          style={{
            fontSize: back ? 17 : 21,
            fontWeight: '700',
            color: back ? mauSac.ink : mauSac.accent,
          }}
        >
          {title || 'Cookmate'}
        </Text>
        {!back && (
          <Text style={{ fontSize: 9, color: mauSac.muted }}>
            Bếp xinh mỗi ngày
          </Text>
        )}
      </View>
      {notifications && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thông báo"
          hitSlop={10}
          onPress={() => navigation.navigate('ThongBao')}
        >
          <BieuTuong name="notifications-outline" color={mauSac.ink} />
        </Pressable>
      )}
    </View>
  )
}
export function TrangThai({
  loading,
  error,
  empty,
  reload,
  emptyText = 'Chưa có nội dung ở đây.',
}: any) {
  if (loading)
    return (
      <View style={s.empty}>
        <ActivityIndicator color={mauSac.accent} />
        <Text style={s.muted}>Đang chuẩn bị…</Text>
      </View>
    )
  if (error)
    return (
      <View style={s.empty}>
        <BieuTuong name="cloud-offline-outline" size={35} />
        <ThongDiep>{error}</ThongDiep>
        <Nut title="Thử lại" secondary onPress={reload} />
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
export function LoiMoiDangNhap() {
  const nav = useNavigation<any>()
  return (
    <View
      style={[
        s.card,
        { padding: 28, marginTop: 24, alignItems: 'center', gap: 16 },
      ]}
    >
      <BieuTuong name="heart-circle-outline" size={52} color={mauSac.accent} />
      <Text style={s.heading}>Góc bếp của riêng bạn</Text>
      <Text style={[s.muted, { textAlign: 'center' }]}>
        Đăng nhập để lưu món yêu thích và tiếp tục những bữa ăn đang nấu.
      </Text>
      <Nut title="Đăng nhập" onPress={() => nav.navigate('DangNhap')} />
      <Pressable
        accessibilityRole="button"
        onPress={() => nav.navigate('DangKy')}
      >
        <Text style={s.link}>Chưa có tài khoản? Đăng ký</Text>
      </Pressable>
    </View>
  )
}
export function AnhMonAn({ uri, style }: any) {
  const [failed, setFailed] = useState(false)
  return uri && !failed ? (
    <Image
      source={{ uri: duongDanAnh(uri) }}
      style={[cucBo.foodImage, style]}
      onError={() => setFailed(true)}
    />
  ) : (
    <View style={[cucBo.foodImage, cucBo.foodPlaceholder, style]}>
      <MaterialCommunityIcons name="chef-hat" size={46} color="#be977a" />
      <Text style={{ fontSize: 11, color: '#be977a', marginTop: 6 }}>
        Cookmate kitchen
      </Text>
    </View>
  )
}
export function TheMonAn({ recipe, horizontal = false, onPress }: any) {
  const navigation = useNavigation<any>()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem món ${recipe.tenMonAn}`}
      onPress={
        onPress || (() => navigation.navigate('ChiTietMonAn', { id: recipe.idMonAn }))
      }
      style={[cucBo.recipeCard, horizontal && { width: 235, marginRight: 15 }]}
    >
      <AnhMonAn
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
            color: mauSac.ink,
            marginVertical: 10,
          }}
        >
          {recipe.tenMonAn}
        </Text>
        <View style={s.between}>
          <View style={[s.row, { gap: 5 }]}>
            <BieuTuong name="time-outline" size={14} />
            <Text style={s.small}>{recipe.tongThoiGian} phút</Text>
            <Text style={s.small}> · {recipe.khauPhan} người</Text>
          </View>
          <View style={[s.row, { gap: 4 }]}>
            <BieuTuong name="star" color="#d89435" size={13} />
            <Text style={s.small}>
              {Number(recipe.diemDanhGia || 0).toFixed(1)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  )
}
export function PhanTrang({
  page,
  meta,
  onChange,
  limit,
  onLimitChange,
  loading = false,
}: any) {
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
                backgroundColor: n === limit ? mauSac.accent : '#fff',
              }}
            >
              <Text style={{ color: n === limit ? '#fff' : mauSac.ink }}>
                {n}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={s.between}>
        <Nut
          title="Trước"
          secondary
          disabled={loading || page <= 1}
          onPress={() => onChange(page - 1)}
        />
        <Text style={s.small}>
          {page} / {meta.totalPages}
        </Text>
        <Nut
          title="Tiếp"
          secondary
          disabled={loading || page >= meta.totalPages}
          onPress={() => onChange(page + 1)}
        />
      </View>
    </View>
  ) : null
}
export function TieuDePhan({ title, action, onPress }: any) {
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
const cucBo = StyleSheet.create({
  button: {
    minHeight: 49,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    backgroundColor: mauSac.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  secondary: {
    backgroundColor: mauSac.soft,
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
    borderBottomColor: mauSac.border,
    backgroundColor: mauSac.background,
  },
  foodImage: { width: '100%', height: 200, backgroundColor: '#f6eadd' },
  foodPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  recipeCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: mauSac.border,
    borderRadius: 17,
    overflow: 'hidden',
    marginBottom: 16,
  },
})
