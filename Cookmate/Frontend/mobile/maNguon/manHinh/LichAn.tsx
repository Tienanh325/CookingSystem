import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useXacThuc } from '../nguCanh/NguCanhXacThuc'
import useTaiNguyen from '../moc/useTaiNguyen'
import { goiApi } from '../dichVu/KetNoiApi'
import { DauTrang, LoiMoiDangNhap, ManHinh, Nut, ThongDiep, TruongNhap, TrangThai } from '../thanhPhan/GiaoDien'
import { kieuDang as s, mauSac } from '../ChuDe'

type LoaiBua = 'SANG' | 'TRUA' | 'TOI'
type MonAnGoiY = {
  idMonAn: number
  tenMonAn: string
  capTruyCapToiThieu?: string
  danhMuc?: { tenDanhMuc?: string }
}

const CAC_LOAI_BUA: { value: LoaiBua; label: string }[] = [
  { value: 'SANG', label: 'Bữa sáng' },
  { value: 'TRUA', label: 'Bữa trưa' },
  { value: 'TOI', label: 'Bữa tối' },
]
const NHAN_LOAI_BUA = Object.fromEntries(CAC_LOAI_BUA.map((item) => [item.value, item.label]))
const DINH_DANG_NGAY = /^\d{4}-\d{2}-\d{2}$/

const iso = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const ngayHopLe = (value: string) => {
  if (!DINH_DANG_NGAY.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

const ngayKetThucMacDinh = () => {
  const end = new Date()
  end.setDate(end.getDate() + 6)
  return iso(end)
}

export default function LichAn() {
  const { nguoiDung } = useXacThuc()
  const r = useTaiNguyen('/lich-an', !!nguoiDung)
  const [selected, setSelected] = useState<any>(null)
  const [recipeName, setRecipeName] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState<MonAnGoiY | null>(null)
  const [recipeSuggestions, setRecipeSuggestions] = useState<MonAnGoiY[]>([])
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [recipeSearchError, setRecipeSearchError] = useState('')
  const [mealType, setMealType] = useState<LoaiBua>('TRUA')
  const [startDate, setStartDate] = useState(() => iso(new Date()))
  const [endDate, setEndDate] = useState(ngayKetThucMacDinh)
  const [date, setDate] = useState(() => iso(new Date()))
  const [calorieTarget, setCalorieTarget] = useState('2000')
  const [editingPlan, setEditingPlan] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [messageSuccess, setMessageSuccess] = useState(false)
  const plan = selected || r.data?.[0]
  const grouped = useMemo(() => {
    const value: Record<string, any[]> = {}
    for (const meal of plan?.buaAns || []) (value[meal.ngay] ||= []).push(meal)
    return value
  }, [plan])

  useEffect(() => {
    if (!plan) return
    setStartDate(plan.tuNgay)
    setEndDate(plan.denNgay)
    setCalorieTarget(String(plan.mucTieuKcalMoiNgay || 2000))
    setDate((current) => current >= plan.tuNgay && current <= plan.denNgay ? current : plan.tuNgay)
  }, [plan?.idLichAn, plan?.tuNgay, plan?.denNgay, plan?.mucTieuKcalMoiNgay])

  useEffect(() => {
    const keyword = recipeName.trim()
    if (selectedRecipe?.tenMonAn === keyword || keyword.length < 2) {
      setRecipeSuggestions([])
      setRecipeLoading(false)
      setRecipeSearchError('')
      return
    }
    const controller = new AbortController()
    setRecipeLoading(true)
    setRecipeSearchError('')
    const timeout = setTimeout(() => {
      goiApi(`/mon-an?limit=20&sort=name&nameOnly=1&q=${encodeURIComponent(keyword)}`, { signal: controller.signal })
        .then((result) => {
          if (!controller.signal.aborted) setRecipeSuggestions(result.data || [])
        })
        .catch((error) => {
          if (!controller.signal.aborted) {
            setRecipeSuggestions([])
            setRecipeSearchError(error.message || 'Không thể tìm món ăn.')
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setRecipeLoading(false)
        })
    }, 300)
    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [recipeName, selectedRecipe])

  function validatePlan() {
    if (!ngayHopLe(startDate) || !ngayHopLe(endDate))
      throw new Error('Ngày bắt đầu và ngày kết thúc phải có định dạng YYYY-MM-DD.')
    if (startDate > endDate) throw new Error('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.')
    const numberOfDays = Math.round(
      (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000,
    ) + 1
    if (numberOfDays > 31) throw new Error('Một lịch ăn không được dài quá 31 ngày.')
    const target = Number(calorieTarget)
    if (!Number.isInteger(target) || target < 1000 || target > 5000)
      throw new Error('Mục tiêu năng lượng phải từ 1.000 đến 5.000 kcal mỗi ngày.')
    return target
  }

  function beginAction() {
    setBusy(true)
    setMessage('')
    setMessageSuccess(false)
  }

  async function createWeek() {
    beginAction()
    try {
      const target = validatePlan()
      const result = await goiApi('/lich-an', {
        method: 'POST',
        body: {
          tenLich: `Tuần từ ${startDate}`,
          tuNgay: startDate,
          denNgay: endDate,
          mucTieuKcalMoiNgay: target,
        },
      })
      setSelected({ ...result.data, buaAns: [] })
      setDate(result.data.tuNgay)
      setMessage(result.message || 'Đã tạo lịch ăn.')
      setMessageSuccess(true)
      r.reload()
    } catch (e: any) {
      setMessage(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function updatePlan() {
    if (!plan) return
    beginAction()
    try {
      const target = validatePlan()
      const automaticName = /^Tuần từ \d{4}-\d{2}-\d{2}$/.test(String(plan.tenLich))
      const result = await goiApi(`/lich-an/${plan.idLichAn}`, {
        method: 'PATCH',
        body: {
          ...(automaticName ? { tenLich: `Tuần từ ${startDate}` } : {}),
          tuNgay: startDate,
          denNgay: endDate,
          mucTieuKcalMoiNgay: target,
        },
      })
      setSelected(result.data)
      setDate((current) => current >= result.data.tuNgay && current <= result.data.denNgay ? current : result.data.tuNgay)
      setEditingPlan(false)
      setMessage(result.message || 'Đã cập nhật lịch ăn.')
      setMessageSuccess(true)
      r.reload()
    } catch (e: any) {
      setMessage(e.message)
    } finally {
      setBusy(false)
    }
  }

  function cancelUpdate() {
    if (!plan) return
    setStartDate(plan.tuNgay)
    setEndDate(plan.denNgay)
    setCalorieTarget(String(plan.mucTieuKcalMoiNgay || 2000))
    setEditingPlan(false)
    setMessage('')
  }

  async function addMeal() {
    if (!plan) return
    beginAction()
    try {
      if (!selectedRecipe) throw new Error('Vui lòng chọn một món ăn trong danh sách gợi ý.')
      if (!ngayHopLe(date) || date < plan.tuNgay || date > plan.denNgay)
        throw new Error(`Ngày thêm món phải nằm trong khoảng ${plan.tuNgay} đến ${plan.denNgay}.`)
      await goiApi(`/lich-an/${plan.idLichAn}/bua-an`, {
        method: 'POST',
        body: { idMonAn: selectedRecipe.idMonAn, ngay: date, loaiBua: mealType, soKhauPhan: 1 },
      })
      const detail = await goiApi(`/lich-an/${plan.idLichAn}`)
      setSelected(detail.data)
      setRecipeName('')
      setSelectedRecipe(null)
      setRecipeSuggestions([])
      setMessage(`Đã thêm ${selectedRecipe.tenMonAn} vào ${NHAN_LOAI_BUA[mealType].toLowerCase()}.`)
      setMessageSuccess(true)
      r.reload()
    } catch (e: any) {
      setMessage(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function evaluate() {
    beginAction()
    try {
      const result = await goiApi(`/lich-an/${plan.idLichAn}/danh-gia`)
      const days = result.data.theoNgay
      setMessage(days.map((x: any) => `${x.datMucTieu ? '✓' : '⚠'} ${x.ngay}: ${x.nangLuongKcal} kcal, ${x.proteinG} g protein, ${x.chatXoG} g chất xơ — ${x.deXuat}`).join('\n'))
    } catch (e: any) {
      setMessage(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function autoGenerate() {
    beginAction()
    try {
      const result = await goiApi(`/lich-an/${plan.idLichAn}/tao-tu-dong`, { method: 'POST', body: {} })
      setSelected(result.data)
      const validDays = result.data.danhGiaDinhDuong?.filter((x: any) => x.datMucTieu).length || 0
      setMessage(`Đã tạo ${validDays} ngày đạt mục tiêu năng lượng và dinh dưỡng.`)
      setMessageSuccess(true)
      r.reload()
    } catch (e: any) {
      setMessage(e.message)
    } finally {
      setBusy(false)
    }
  }

  return <ManHinh header={<DauTrang notifications />}>
    <Text style={[s.title, s.serif]}>Lịch ăn</Text>
    <Text style={[s.muted, { marginTop: 8, marginBottom: 18 }]}>Sắp xếp bữa ăn theo tuần và kiểm tra năng lượng mỗi ngày.</Text>
    {!nguoiDung ? <LoiMoiDangNhap /> : <>
      <TrangThai {...r} reload={r.reload} />
      {((!r.loading && !r.error) || plan) ? (!plan ? <>
        <TruongNhap label="Ngày bắt đầu (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2026-10-05" />
        <TruongNhap label="Ngày kết thúc (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} placeholder="2026-10-11" />
        <TruongNhap label="Mục tiêu kcal mỗi ngày" value={calorieTarget} onChangeText={setCalorieTarget} keyboardType="number-pad" />
        <Text style={[s.small, { marginBottom: 12 }]}>Hãy dùng mục tiêu do chuyên gia phù hợp với bạn khuyến nghị. Cookmate chỉ cân bằng trên dữ liệu món ăn hiện có.</Text>
        <Nut title="Tạo lịch ăn" icon="calendar-outline" busy={busy} onPress={createWeek} />
      </> : <>
        <View style={s.card}>
          <View style={[s.between, { gap: 12 }]}>
            <Text style={[s.heading, { flex: 1 }]}>{plan.tenLich}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={editingPlan ? 'Hủy sửa lịch ăn' : 'Chỉnh sửa lịch ăn'}
              disabled={busy}
              onPress={() => editingPlan ? cancelUpdate() : setEditingPlan(true)}
            >
              <Text style={s.link}>{editingPlan ? 'Hủy' : 'Chỉnh sửa'}</Text>
            </Pressable>
          </View>
          <Text style={[s.small, { marginTop: 6 }]}>{plan.tuNgay} → {plan.denNgay}</Text>
          <Text style={[s.small, { marginTop: 4, color: mauSac.accent }]}>Mục tiêu: {plan.mucTieuKcalMoiNgay || 2000} kcal/ngày</Text>
          {editingPlan && <View style={cucBo.editForm}>
            <TruongNhap label="Ngày bắt đầu (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2026-10-05" />
            <TruongNhap label="Ngày kết thúc (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} placeholder="2026-10-11" />
            <TruongNhap label="Mục tiêu kcal mỗi ngày" value={calorieTarget} onChangeText={setCalorieTarget} keyboardType="number-pad" />
            <Nut title="Lưu thay đổi" icon="save-outline" busy={busy} onPress={updatePlan} />
          </View>}
        </View>
        {Object.entries(grouped).map(([day, meals]) => <View key={day} style={s.card}>
          <Text style={[s.heading, { fontSize: 16, marginBottom: 8 }]}>{day}</Text>
          {meals.map((meal: any) => <Text key={meal.idBuaAnTrongLich} style={[s.body, { marginBottom: 5 }]}>{NHAN_LOAI_BUA[meal.loaiBua] || meal.loaiBua} · {meal.monAn?.tenMonAn} · {Number(meal.soKhauPhan)} khẩu phần</Text>)}
        </View>)}
        <TruongNhap label="Ngày thêm món (YYYY-MM-DD)" value={date} onChangeText={setDate} />
        <TruongNhap
          label="Tên món ăn"
          value={recipeName}
          onChangeText={(value: string) => {
            setRecipeName(value)
            setSelectedRecipe(null)
            setRecipeSuggestions([])
            setRecipeLoading(value.trim().length >= 2)
          }}
          placeholder="Nhập ít nhất 2 ký tự để tìm món"
          autoCorrect={false}
          accessibilityRole="combobox"
          accessibilityState={{ expanded: recipeSuggestions.length > 0 }}
        />
        {recipeLoading && <View accessibilityLiveRegion="polite" style={cucBo.searchStatus}>
          <ActivityIndicator size="small" color={mauSac.accent} />
          <Text style={s.small}>Đang tìm món ăn…</Text>
        </View>}
        {!recipeLoading && recipeSearchError ? <Text accessibilityLiveRegion="polite" style={cucBo.searchError}>{recipeSearchError}</Text> : null}
        {!recipeLoading && !recipeSearchError && !selectedRecipe && recipeName.trim().length >= 2 && !recipeSuggestions.length
          ? <Text accessibilityLiveRegion="polite" style={cucBo.searchStatusText}>Không tìm thấy món ăn phù hợp.</Text>
          : null}
        {recipeSuggestions.length > 0 && <View style={cucBo.suggestions}>
          {recipeSuggestions.map((recipe) => <Pressable
            key={recipe.idMonAn}
            accessibilityRole="button"
            accessibilityLabel={`Chọn món ${recipe.tenMonAn}`}
            onPress={() => {
              setSelectedRecipe(recipe)
              setRecipeName(recipe.tenMonAn)
              setRecipeSuggestions([])
              setRecipeSearchError('')
            }}
            style={({ pressed }) => [cucBo.suggestion, pressed && { backgroundColor: mauSac.soft }]}
          >
            <Text style={s.body}>{recipe.tenMonAn}</Text>
            <Text style={s.small}>
              {recipe.danhMuc?.tenDanhMuc || 'Công thức Cookmate'}
              {recipe.capTruyCapToiThieu && recipe.capTruyCapToiThieu !== 'FREE'
                ? ` · Cần gói ${recipe.capTruyCapToiThieu}`
                : ''}
            </Text>
          </Pressable>)}
        </View>}
        {selectedRecipe && <Text style={cucBo.selectedRecipe}>✓ Đã chọn: {selectedRecipe.tenMonAn}</Text>}
        <Text style={s.label}>Loại bữa</Text>
        <View accessibilityRole="radiogroup" style={cucBo.mealTypes}>
          {CAC_LOAI_BUA.map((item) => {
            const active = mealType === item.value
            return <Pressable
              key={item.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => setMealType(item.value)}
              style={[s.chip, active && s.chipActive]}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{item.label}</Text>
            </Pressable>
          })}
        </View>
        <Nut
          title={`Thêm vào ${NHAN_LOAI_BUA[mealType].toLowerCase()}`}
          secondary
          busy={busy}
          disabled={!selectedRecipe}
          onPress={addMeal}
          style={{ marginBottom: 10 }}
        />
        <View style={[s.row, { gap: 10, flexWrap: 'wrap' }]}>
          <Pressable onPress={evaluate} disabled={busy} style={[s.chip, { borderColor: mauSac.accent }, busy && { opacity: 0.6 }]}><Text style={s.chipText}>Đánh giá lịch</Text></Pressable>
          <Pressable onPress={autoGenerate} disabled={busy} style={[s.chip, { borderColor: mauSac.accent }, busy && { opacity: 0.6 }]}><Text style={s.chipText}>Tạo tự động (Pro)</Text></Pressable>
        </View>
      </>) : null}
      <ThongDiep success={messageSuccess}>{message}</ThongDiep>
    </>}
  </ManHinh>
}

const cucBo = StyleSheet.create({
  editForm: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: mauSac.border,
  },
  searchStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -10,
    marginBottom: 18,
  },
  searchStatusText: {
    ...s.small,
    marginTop: -10,
    marginBottom: 18,
  },
  searchError: {
    ...s.small,
    color: mauSac.red,
    marginTop: -10,
    marginBottom: 18,
  },
  suggestions: {
    marginTop: -10,
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: mauSac.border,
    borderRadius: 12,
    backgroundColor: mauSac.card,
  },
  suggestion: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: mauSac.border,
  },
  selectedRecipe: {
    ...s.small,
    color: mauSac.green,
    fontWeight: '600',
    marginTop: -10,
    marginBottom: 18,
  },
  mealTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 18,
  },
})
