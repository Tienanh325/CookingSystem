import { useEffect, useState } from 'react'
import { Linking, Pressable, Text, TextInput, View } from 'react-native'
import { useXacThuc } from '../nguCanh/NguCanhXacThuc'
import useTaiNguyen from '../moc/useTaiNguyen'
import { goiApi, dinhDangNgay } from '../dichVu/KetNoiApi'
import {
  Nut,
  AnhMonAn,
  DauTrang,
  BieuTuong,
  ThongDiep,
  PhanTrang,
  ManHinh,
  TieuDePhan,
  TrangThai,
} from '../thanhPhan/GiaoDien'
import { mauSac, kieuDang as s } from '../ChuDe'
export default function ChiTietMonAn({ route, navigation }) {
  const id = route.params.id,
    { nguoiDung } = useXacThuc(),
    r = useTaiNguyen(`/mon-an/${id}`),
    favorite = useTaiNguyen(`/mon-an/${id}/yeu-thich`, !!nguoiDung)
  const [commentPage, setCommentPage] = useState(1),
    [reviewPage, setReviewPage] = useState(1)
  const comments = useTaiNguyen(
      `/mon-an/${id}/binh-luan?limit=5&page=${commentPage}`,
    ),
    reviews = useTaiNguyen(`/mon-an/${id}/danh-gia?limit=5&page=${reviewPage}`)
  const [servings, setServings] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [stars, setStars] = useState(5),
    [review, setReview] = useState(''),
    [comment, setComment] = useState(''),
    [reply, setReply] = useState(null),
    [editing, setEditing] = useState(null)
  useEffect(() => {
    if (r.data) setServings(r.data.khauPhan)
  }, [r.data?.khauPhan])
  function requireUser() {
    if (nguoiDung) return true
    navigation.navigate('DangNhap')
    return false
  }
  async function run(action) {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await action()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  function toggleFavorite() {
    if (!requireUser()) return
    run(async () => {
      await goiApi(`/mon-an/${id}/yeu-thich`, {
        method: favorite.data?.isFavorite ? 'DELETE' : 'POST',
        ...(favorite.data?.isFavorite ? {} : { body: {} }),
      })
      favorite.reload()
    })
  }
  function start() {
    if (!requireUser()) return
    run(async () => {
      const result = await goiApi(`/mon-an/${id}/lich-su-nau`, {
        method: 'POST',
        body: {},
      })
      navigation.navigate('NauAn', { id: result.data.idLichSu })
    })
  }
  function postReview() {
    if (!requireUser()) return
    run(async () => {
      await goiApi(`/mon-an/${id}/danh-gia`, {
        method: 'POST',
        body: { soSao: stars, noiDung: review },
      })
      reviews.reload()
      r.reload()
      setSuccess('Cảm ơn bạn đã chia sẻ đánh giá!')
    })
  }
  function postComment() {
    if (!requireUser()) return
    run(async () => {
      if (!comment.trim()) throw new Error('Hãy viết nội dung bình luận.')
      await goiApi(editing ? `/binh-luan/${editing}` : `/mon-an/${id}/binh-luan`, {
        method: editing ? 'PATCH' : 'POST',
        body: {
          noiDung: comment,
          ...(reply && !editing ? { idBinhLuanCha: reply.id } : {}),
        },
      })
      setComment('')
      setReply(null)
      setEditing(null)
      comments.reload()
      setSuccess('Đã lưu bình luận.')
    })
  }
  const recipe = r.data
  function commentItem(item, child = false) {
    return (
      <View
        key={item.idBinhLuan}
        style={{
          marginTop: 14,
          marginLeft: child ? 20 : 0,
          paddingLeft: child ? 12 : 0,
          borderLeftWidth: child ? 2 : 0,
          borderLeftColor: mauSac.border,
        }}
      >
        <View style={s.between}>
          <Text style={[s.body, { fontWeight: '600' }]}>
            {item.nguoiDung?.hoTen || 'Người dùng'}
          </Text>
          <Text style={s.small}>{dinhDangNgay(item.ngayBinhLuan)}</Text>
        </View>
        <Text style={[s.body, { fontSize: 13, marginVertical: 7 }]}>
          {item.noiDung}
        </Text>
        <View style={[s.row, { gap: 18 }]}>
          {!child && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (requireUser()) {
                  setReply({ id: item.idBinhLuan, name: item.nguoiDung?.hoTen })
                  setEditing(null)
                }
              }}
            >
              <Text style={s.link}>Trả lời</Text>
            </Pressable>
          )}
          {nguoiDung?.idNguoiDung === item.idNguoiDung && (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setEditing(item.idBinhLuan)
                  setComment(item.noiDung)
                  setReply(null)
                }}
              >
                <Text style={s.link}>Sửa</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() =>
                  run(async () => {
                    await goiApi(`/binh-luan/${item.idBinhLuan}`, {
                      method: 'DELETE',
                    })
                    comments.reload()
                  })
                }
              >
                <Text style={[s.link, { color: mauSac.muted }]}>Xóa</Text>
              </Pressable>
            </>
          )}
        </View>
        {item.binhLuanCon?.map((row) => commentItem(row, true))}
      </View>
    )
  }
  return (
    <ManHinh
      header={<DauTrang back title="Công thức món ngon" />}
      style={{ padding: 0, paddingBottom: 30 }}
    >
      <TrangThai {...r} reload={r.reload} />
      {recipe && (
        <>
          <AnhMonAn
            uri={recipe.anhDaiDien || recipe.hinhAnhs?.[0]?.duongDan}
            style={{ height: 270 }}
          />
          <View style={{ padding: 22 }}>
            <View style={s.between}>
              <Text style={s.badge}>
                {recipe.danhMuc?.tenDanhMuc || 'Bữa cơm nhà'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  favorite.data?.isFavorite ? 'Bỏ yêu thích' : 'Lưu yêu thích'
                }
                disabled={busy || (!!nguoiDung && favorite.loading)}
                onPress={toggleFavorite}
                style={{
                  padding: 8,
                  backgroundColor: mauSac.soft,
                  borderRadius: 25,
                }}
              >
                <BieuTuong
                  name={favorite.data?.isFavorite ? 'heart' : 'heart-outline'}
                  color={mauSac.accent}
                  size={24}
                />
              </Pressable>
            </View>
            <Text style={[s.title, s.serif, { marginVertical: 14 }]}>
              {recipe.tenMonAn}
            </Text>
            <Text style={s.muted}>{recipe.moTa || recipe.gioiThieu}</Text>
            {recipe.videoHuongDan && (
              <Pressable accessibilityRole="link" onPress={() => Linking.openURL(recipe.videoHuongDan)} style={[s.card, { marginTop: 16, backgroundColor: '#fff0e7' }]}>
                <Text style={[s.heading, { fontSize: 16 }]}>Video hướng dẫn Chef</Text>
                <Text style={[s.small, { marginTop: 6 }]}>Cùng {recipe.tenDauBep || 'đầu bếp Cookmate'} thực hiện món ăn từng bước.</Text>
              </Pressable>
            )}
            <View
              style={[s.row, { gap: 20, marginVertical: 22, flexWrap: 'wrap' }]}
            >
              {[
                ['time-outline', `${recipe.tongThoiGian} phút`],
                [
                  'bar-chart-outline',
                  { DE: 'Dễ', TRUNG_BINH: 'Vừa', KHO: 'Khó' }[recipe.doKho] ||
                    recipe.doKho,
                ],
                ['star', Number(recipe.diemDanhGia).toFixed(1)],
              ].map(([icon, label]) => (
                <View key={icon} style={[s.row, { gap: 6 }]}>
                  <BieuTuong name={icon} size={17} color={mauSac.accent} />
                  <Text style={s.small}>{label}</Text>
                </View>
              ))}
            </View>
            <ThongDiep>{error || favorite.error}</ThongDiep>
            <Nut
              title="Bắt đầu nấu món này"
              icon="flame-outline"
              busy={busy}
              onPress={start}
            />
            <TieuDePhan title="Nguyên liệu chuẩn bị" />
            <View style={[s.card, { backgroundColor: '#fff7ee' }]}>
              <View style={[s.between, { marginBottom: 16 }]}>
                <Text style={s.muted}>Khẩu phần</Text>
                <View style={[s.row, { gap: 18 }]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Giảm khẩu phần"
                    disabled={servings <= 1}
                    onPress={() => setServings(Math.max(1, servings - 1))}
                  >
                    <BieuTuong
                      name="remove-circle-outline"
                      color={mauSac.accent}
                      size={26}
                    />
                  </Pressable>
                  <Text style={s.body}>{servings} người</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Tăng khẩu phần"
                    disabled={servings >= 100}
                    onPress={() => setServings(Math.min(100, servings + 1))}
                  >
                    <BieuTuong
                      name="add-circle-outline"
                      color={mauSac.accent}
                      size={26}
                    />
                  </Pressable>
                </View>
              </View>
              {recipe.nguyenLieus.map((item) => (
                <View
                  key={item.idNguyenLieu}
                  style={[
                    s.between,
                    {
                      paddingVertical: 12,
                      borderTopWidth: 1,
                      borderTopColor: mauSac.border,
                      gap: 12,
                    },
                  ]}
                >
                  <Text style={[s.body, { flex: 1, fontSize: 13 }]}>
                    {item.tenNguyenLieu}
                  </Text>
                  <Text style={[s.body, { fontWeight: '600', fontSize: 13 }]}>
                    {Math.round(
                      ((Number(item.MonAnNguyenLieu.soLuong) * servings) /
                        recipe.khauPhan) *
                        100,
                    ) / 100}{' '}
                    {item.MonAnNguyenLieu.donVi}
                  </Text>
                </View>
              ))}
            </View>
            {recipe.dinhDuong && (
              <>
                <TieuDePhan title="Dinh dưỡng mỗi khẩu phần" />
                <View style={[s.card, { gap: 10 }]}>
                  {[
                    ['Năng lượng', `${recipe.dinhDuong.moiKhauPhan.nangLuongKcal} kcal`],
                    ['Protein', `${recipe.dinhDuong.moiKhauPhan.proteinG} g`],
                    ['Carbohydrate', `${recipe.dinhDuong.moiKhauPhan.carbG} g`],
                    ['Chất béo', `${recipe.dinhDuong.moiKhauPhan.chatBeoG} g`],
                    ['Chất xơ', `${recipe.dinhDuong.moiKhauPhan.chatXoG} g`],
                    ['Natri', `${recipe.dinhDuong.moiKhauPhan.natriMg} mg`],
                  ].map(([label, value]) => (
                    <View key={label} style={s.between}>
                      <Text style={s.muted}>{label}</Text>
                      <Text style={[s.body, { fontWeight: '700' }]}>{value}</Text>
                    </View>
                  ))}
                  {!recipe.dinhDuong.dayDuDuLieu && (
                    <Text style={[s.small, { color: mauSac.accent }]}>Chưa thể tính đủ do thiếu khối lượng quy đổi của: {recipe.dinhDuong.thieuKhoiLuong.join(', ')}.</Text>
                  )}
                  <Text style={s.small}>{recipe.dinhDuong.ghiChu}</Text>
                </View>
              </>
            )}
            <TieuDePhan title="Các bước thực hiện" />
            {recipe.buocNaus.map((step, i) => (
              <View
                key={step.idBuocNau}
                style={[s.card, { flexDirection: 'row', gap: 13 }]}
              >
                <View
                  style={{
                    width: 29,
                    height: 29,
                    borderRadius: 15,
                    backgroundColor: mauSac.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>
                    {i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.heading, { fontSize: 16, marginBottom: 8 }]}>
                    {step.tieuDe || `Bước ${i + 1}`}
                  </Text>
                  <Text style={s.body}>{step.huongDan}</Text>
                  {step.thoiGian > 0 && (
                    <Text style={[s.small, { marginTop: 10 }]}>
                      ◷ {step.thoiGian} phút
                    </Text>
                  )}
                  {!!step.anh && (
                    <AnhMonAn
                      uri={step.anh}
                      style={{ marginTop: 12, borderRadius: 10 }}
                    />
                  )}
                </View>
              </View>
            ))}
            <TieuDePhan title="Đánh giá từ người nấu" />
            <TrangThai
              {...reviews}
              reload={reviews.reload}
              empty={!reviews.data?.length}
              emptyText="Chưa có đánh giá. Bạn hãy là người đầu tiên nhé."
            />
            {reviews.data?.map((item) => (
              <View key={item.idDanhGia} style={s.card}>
                <View style={s.between}>
                  <Text style={[s.body, { fontWeight: '600' }]}>
                    {item.nguoiDung?.hoTen}
                  </Text>
                  <Text style={{ color: '#d79538' }}>
                    {'★'.repeat(item.soSao)}
                    {'☆'.repeat(5 - item.soSao)}
                  </Text>
                </View>
                {!!item.noiDung && (
                  <Text style={[s.body, { marginTop: 8 }]}>{item.noiDung}</Text>
                )}
                {nguoiDung?.idNguoiDung === item.idNguoiDung && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() =>
                      run(async () => {
                        await goiApi(`/danh-gia/${item.idDanhGia}`, {
                          method: 'DELETE',
                        })
                        reviews.reload()
                        r.reload()
                      })
                    }
                  >
                    <Text style={[s.link, { marginTop: 10 }]}>
                      Xóa đánh giá của tôi
                    </Text>
                  </Pressable>
                )}
              </View>
            ))}
            <PhanTrang
              page={reviewPage}
              meta={reviews.meta}
              loading={reviews.loading}
              onChange={setReviewPage}
            />
            <View style={s.card}>
              <Text style={[s.heading, { fontSize: 16 }]}>
                Món này có hợp khẩu vị bạn?
              </Text>
              <View style={[s.row, { gap: 10, marginVertical: 17 }]}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <Pressable
                    key={v}
                    accessibilityRole="button"
                    accessibilityLabel={`${v} sao`}
                    onPress={() => setStars(v)}
                  >
                    <BieuTuong
                      name={v <= stars ? 'star' : 'star-outline'}
                      color="#d79538"
                      size={30}
                    />
                  </Pressable>
                ))}
              </View>
              <TextInput
                accessibilityLabel="Nội dung đánh giá"
                value={review}
                onChangeText={setReview}
                multiline
                placeholder="Chia sẻ cảm nhận của bạn…"
                style={[
                  s.input,
                  { minHeight: 85, textAlignVertical: 'top', marginBottom: 14 },
                ]}
                maxLength={5000}
              />
              <Nut
                title={
                  nguoiDung ? 'Gửi / cập nhật đánh giá' : 'Đăng nhập để đánh giá'
                }
                secondary
                busy={busy}
                onPress={postReview}
              />
            </View>
            <TieuDePhan
              title={`Bình luận (${comments.meta?.totalItems || 0})`}
            />
            <TrangThai {...comments} reload={comments.reload} />
            <View style={{ marginBottom: 22 }}>
              {comments.data?.map((row) => commentItem(row))}
            </View>
            <PhanTrang
              page={commentPage}
              meta={comments.meta}
              loading={comments.loading}
              onChange={setCommentPage}
            />
            {(reply || editing) && (
              <View style={[s.between, { marginBottom: 10 }]}>
                <Text style={s.small}>
                  {editing ? 'Đang sửa bình luận' : `Trả lời ${reply.name}`}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setReply(null)
                    setEditing(null)
                    setComment('')
                  }}
                >
                  <Text style={s.link}>Hủy</Text>
                </Pressable>
              </View>
            )}
            <TextInput
              accessibilityLabel="Viết bình luận"
              value={comment}
              onChangeText={setComment}
              multiline
              placeholder="Cùng chia sẻ một chút kinh nghiệm…"
              maxLength={5000}
              style={[
                s.input,
                { minHeight: 95, textAlignVertical: 'top', marginBottom: 15 },
              ]}
            />
            <ThongDiep>{error}</ThongDiep>
            <ThongDiep success>{success}</ThongDiep>
            <Nut
              title={
                nguoiDung
                  ? editing
                    ? 'Lưu bình luận'
                    : 'Gửi bình luận'
                  : 'Đăng nhập để bình luận'
              }
              icon="chatbubble-outline"
              busy={busy}
              onPress={postComment}
            />
          </View>
        </>
      )}
    </ManHinh>
  )
}
