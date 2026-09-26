import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useXacThuc } from '../nguCanh/NguCanhXacThuc'
import useTaiNguyen from '../moc/useTaiNguyen'
import { goiApi } from '../dichVu/KetNoiApi'
import { DauTrang, LoiMoiDangNhap, ManHinh, Nut, ThongDiep, TruongNhap, TrangThai } from '../thanhPhan/GiaoDien'
import { kieuDang as s, mauSac } from '../ChuDe'

const iso = (date: Date) => date.toISOString().slice(0, 10)

export default function LichAn() {
  const { nguoiDung } = useXacThuc()
  const r = useTaiNguyen('/lich-an', !!nguoiDung)
  const [selected, setSelected] = useState<any>(null)
  const [recipeId, setRecipeId] = useState('')
  const [date, setDate] = useState(iso(new Date()))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const plan = selected || r.data?.[0]
  const grouped = useMemo(() => {
    const value: Record<string, any[]> = {}
    for (const meal of plan?.buaAns || []) (value[meal.ngay] ||= []).push(meal)
    return value
  }, [plan])

  async function createWeek() {
    setBusy(true); setMessage('')
    try {
      const start = new Date(); const end = new Date(start); end.setDate(end.getDate() + 6)
      const result = await goiApi('/lich-an', { method: 'POST', body: { tenLich: `Tuần từ ${iso(start)}`, tuNgay: iso(start), denNgay: iso(end), mucTieuKcalMoiNgay: 2000 } })
      setSelected({ ...result.data, buaAns: [] }); setDate(result.data.tuNgay); r.reload()
    } catch (e: any) { setMessage(e.message) } finally { setBusy(false) }
  }
  async function addMeal() {
    if (!plan) return
    setBusy(true); setMessage('')
    try {
      await goiApi(`/lich-an/${plan.idLichAn}/bua-an`, { method: 'POST', body: { idMonAn: Number(recipeId), ngay: date, loaiBua: 'TRUA', soKhauPhan: 1 } })
      const detail = await goiApi(`/lich-an/${plan.idLichAn}`); setSelected(detail.data); setRecipeId(''); r.reload()
    } catch (e: any) { setMessage(e.message) } finally { setBusy(false) }
  }
  async function evaluate() {
    setBusy(true); setMessage('')
    try {
      const result = await goiApi(`/lich-an/${plan.idLichAn}/danh-gia`)
      const days = result.data.theoNgay
      setMessage(days.length ? days.map((x: any) => `${x.ngay}: ${x.nangLuongKcal} kcal — ${x.deXuat}`).join('\n') : 'Lịch chưa có bữa ăn để đánh giá.')
    } catch (e: any) { setMessage(e.message) } finally { setBusy(false) }
  }
  async function autoGenerate() {
    setBusy(true); setMessage('')
    try { const result = await goiApi(`/lich-an/${plan.idLichAn}/tao-tu-dong`, { method: 'POST', body: {} }); setSelected(result.data); setMessage('Đã lập thực đơn tự động.'); r.reload() }
    catch (e: any) { setMessage(e.message) } finally { setBusy(false) }
  }

  return <ManHinh header={<DauTrang notifications />}>
    <Text style={[s.title, s.serif]}>Lịch ăn</Text>
    <Text style={[s.muted, { marginTop: 8, marginBottom: 18 }]}>Sắp xếp bữa ăn theo tuần và kiểm tra năng lượng mỗi ngày.</Text>
    {!nguoiDung ? <LoiMoiDangNhap /> : <>
      <TrangThai {...r} reload={r.reload} />
      {!plan ? <Nut title="Tạo lịch 7 ngày" icon="calendar-outline" busy={busy} onPress={createWeek} /> : <>
        <View style={s.card}><Text style={s.heading}>{plan.tenLich}</Text><Text style={[s.small, { marginTop: 6 }]}>{plan.tuNgay} → {plan.denNgay}</Text></View>
        {Object.entries(grouped).map(([day, meals]) => <View key={day} style={s.card}>
          <Text style={[s.heading, { fontSize: 16, marginBottom: 8 }]}>{day}</Text>
          {meals.map((meal: any) => <Text key={meal.idBuaAnTrongLich} style={[s.body, { marginBottom: 5 }]}>{meal.loaiBua} · {meal.monAn?.tenMonAn}</Text>)}
        </View>)}
        <TruongNhap label="Ngày (YYYY-MM-DD)" value={date} onChangeText={setDate} />
        <TruongNhap label="Mã công thức" value={recipeId} onChangeText={setRecipeId} keyboardType="number-pad" />
        <Nut title="Thêm vào bữa trưa" secondary busy={busy} onPress={addMeal} style={{ marginBottom: 10 }} />
        <View style={[s.row, { gap: 10 }]}>
          <Pressable onPress={evaluate} style={[s.chip, { borderColor: mauSac.accent }]}><Text style={s.chipText}>Đánh giá lịch</Text></Pressable>
          <Pressable onPress={autoGenerate} style={[s.chip, { borderColor: mauSac.accent }]}><Text style={s.chipText}>Tạo tự động (Pro)</Text></Pressable>
        </View>
      </>}
      <ThongDiep>{message}</ThongDiep>
    </>}
  </ManHinh>
}
