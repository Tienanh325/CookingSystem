import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { DauTrang, ManHinh, Nut, ThongDiep, TruongNhap, TrangThai } from '../thanhPhan/GiaoDien'
import useTaiNguyen from '../moc/useTaiNguyen'
import { goiApi } from '../dichVu/KetNoiApi'
import { kieuDang as s } from '../ChuDe'

const blank = {
  tenMonAn: '',
  idDanhMuc: '',
  moTa: '',
  khauPhan: '2',
  thoiGianChuanBi: '10',
  thoiGianNau: '20',
  nguyenLieus: [],
  buocNaus: [{ huongDan: '', thoiGian: '0' }],
}

export default function DangCongThuc({ navigation, route }) {
  const id = route.params?.id
  const categories = useTaiNguyen('/danh-muc?limit=100')
  const ingredients = useTaiNguyen('/nguyen-lieu?limit=100')
  const [form, setForm] = useState(blank)
  const [loading, setLoading] = useState(Boolean(id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    goiApi(`/mon-an/cua-toi/${id}`)
      .then((result) => {
        const value = result.data
        setForm({
          ...blank,
          ...value,
          idDanhMuc: String(value.idDanhMuc),
          khauPhan: String(value.khauPhan),
          thoiGianChuanBi: String(value.thoiGianChuanBi),
          thoiGianNau: String(value.thoiGianNau),
          nguyenLieus: value.nguyenLieus.map((item) => ({
            idNguyenLieu: item.idNguyenLieu,
            soLuong: String(item.MonAnNguyenLieu.soLuong),
            donVi: item.MonAnNguyenLieu.donVi,
            khoiLuongGram: String(item.MonAnNguyenLieu.khoiLuongGram || ''),
          })),
          buocNaus: value.buocNaus.map((item) => ({
            huongDan: item.huongDan,
            thoiGian: String(item.thoiGian || 0),
          })),
        })
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const updateRow = (key, index, field, value) =>
    setForm((current) => ({
      ...current,
      [key]: current[key].map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    }))
  const toggleIngredient = (item) => {
    const exists = form.nguyenLieus.some((row) => row.idNguyenLieu === item.idNguyenLieu)
    update(
      'nguyenLieus',
      exists
        ? form.nguyenLieus.filter((row) => row.idNguyenLieu !== item.idNguyenLieu)
        : [
            ...form.nguyenLieus,
            { idNguyenLieu: item.idNguyenLieu, soLuong: '1', donVi: item.donViMacDinh || 'g', khoiLuongGram: item.donViMacDinh === 'g' ? '1' : '' },
          ],
    )
  }

  async function save() {
    setBusy(true)
    setError('')
    try {
      const payload = {
        tenMonAn: form.tenMonAn,
        idDanhMuc: Number(form.idDanhMuc),
        moTa: form.moTa || null,
        khauPhan: Number(form.khauPhan),
        thoiGianChuanBi: Number(form.thoiGianChuanBi),
        thoiGianNau: Number(form.thoiGianNau),
        nguyenLieus: form.nguyenLieus.map((row) => ({
          ...row,
          soLuong: Number(row.soLuong),
          khoiLuongGram: row.khoiLuongGram ? Number(row.khoiLuongGram) : null,
        })),
        buocNaus: form.buocNaus.map((row, index) => ({
          ...row,
          soThuTu: index + 1,
          thoiGian: Number(row.thoiGian),
        })),
      }
      await goiApi(id ? `/mon-an/cua-toi/${id}` : '/mon-an/cua-toi', {
        method: id ? 'PATCH' : 'POST',
        body: payload,
      })
      navigation.replace('BaiDangCuaToi')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <ManHinh header={<DauTrang back title="Đăng công thức" />}><TrangThai loading /></ManHinh>
  return (
    <ManHinh header={<DauTrang back title={id ? 'Sửa công thức' : 'Đăng công thức'} />}>
      <ThongDiep>{error}</ThongDiep>
      <TruongNhap label="Tên món ăn" value={form.tenMonAn} onChangeText={(v) => update('tenMonAn', v)} />
      <Text style={[s.label, { marginBottom: 8 }]}>Danh mục</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
        {categories.data?.map((item) => (
          <Pressable
            key={item.idDanhMuc}
            onPress={() => update('idDanhMuc', String(item.idDanhMuc))}
            style={[s.chip, form.idDanhMuc === String(item.idDanhMuc) && s.chipActive]}
          >
            <Text style={[s.chipText, form.idDanhMuc === String(item.idDanhMuc) && s.chipTextActive]}>
              {item.tenDanhMuc}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <TruongNhap label="Mô tả" value={form.moTa} onChangeText={(v) => update('moTa', v)} multiline />
      <View style={[s.row, { gap: 10 }]}> 
        <TruongNhap label="Khẩu phần" value={form.khauPhan} onChangeText={(v) => update('khauPhan', v)} keyboardType="number-pad" style={{ flex: 1 }} />
        <TruongNhap label="Chuẩn bị (phút)" value={form.thoiGianChuanBi} onChangeText={(v) => update('thoiGianChuanBi', v)} keyboardType="number-pad" style={{ flex: 1 }} />
      </View>
      <TruongNhap label="Nấu (phút)" value={form.thoiGianNau} onChangeText={(v) => update('thoiGianNau', v)} keyboardType="number-pad" />
      <Text style={[s.heading, { marginTop: 12, marginBottom: 8 }]}>Nguyên liệu</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {ingredients.data?.map((item) => {
          const active = form.nguyenLieus.some((row) => row.idNguyenLieu === item.idNguyenLieu)
          return (
            <Pressable key={item.idNguyenLieu} onPress={() => toggleIngredient(item)} style={[s.chip, active && s.chipActive]}>
              <Text style={[s.chipText, active && s.chipTextActive]}>{item.tenNguyenLieu}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
      {form.nguyenLieus.map((row, index) => {
        const item = ingredients.data?.find((value) => value.idNguyenLieu === row.idNguyenLieu)
        return (
          <View key={row.idNguyenLieu} style={[s.card, { padding: 14, marginBottom: 10 }]}> 
            <Text style={s.label}>{item?.tenNguyenLieu || `Nguyên liệu ${index + 1}`}</Text>
            <View style={[s.row, { gap: 10 }]}> 
              <TruongNhap label="Số lượng" value={row.soLuong} onChangeText={(v) => updateRow('nguyenLieus', index, 'soLuong', v)} keyboardType="decimal-pad" style={{ flex: 1 }} />
              <TruongNhap label="Đơn vị" value={row.donVi} onChangeText={(v) => updateRow('nguyenLieus', index, 'donVi', v)} style={{ flex: 1 }} />
            </View>
            <TruongNhap label="Khối lượng quy đổi (gram)" value={row.khoiLuongGram} onChangeText={(v) => updateRow('nguyenLieus', index, 'khoiLuongGram', v)} keyboardType="decimal-pad" />
          </View>
        )
      })}
      <Text style={[s.heading, { marginTop: 12, marginBottom: 8 }]}>Các bước nấu</Text>
      {form.buocNaus.map((step, index) => (
        <View key={index} style={[s.card, { padding: 14, marginBottom: 10 }]}> 
          <TruongNhap label={`Bước ${index + 1}`} value={step.huongDan} onChangeText={(v) => updateRow('buocNaus', index, 'huongDan', v)} multiline />
          {form.buocNaus.length > 1 && <Pressable onPress={() => update('buocNaus', form.buocNaus.filter((_, i) => i !== index))}><Text style={s.link}>Xóa bước</Text></Pressable>}
        </View>
      ))}
      <Nut title="Thêm bước" secondary icon="add" onPress={() => update('buocNaus', [...form.buocNaus, { huongDan: '', thoiGian: '0' }])} style={{ marginBottom: 12 }} />
      <Nut title="Lưu bản nháp" busy={busy} onPress={save} />
    </ManHinh>
  )
}
