import { useState } from 'react'
import { Text } from 'react-native'
import { goiApi } from '../dichVu/KetNoiApi'
import { DauTrang, ManHinh, Nut, ThongDiep, TruongNhap } from '../thanhPhan/GiaoDien'
import { kieuDang as s } from '../ChuDe'

export default function TuVanChef() {
  const [question, setQuestion] = useState(''), [answer, setAnswer] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  async function ask() { setBusy(true); setError(''); setAnswer(''); try { const result = await goiApi('/tu-van-ai', { method: 'POST', body: { cauHoi: question } }); setAnswer(result.data.cauTraLoi) } catch (e: any) { setError(e.message) } finally { setBusy(false) } }
  return <ManHinh header={<DauTrang back title="Cookmate Chef" />}><Text style={[s.title, s.serif]}>Tư vấn thực đơn</Text><Text style={[s.muted, { marginVertical: 12 }]}>Dành cho gói Chef. Gợi ý dựa trên dữ liệu Cookmate và không thay thế chuyên gia y tế.</Text><TruongNhap label="Bạn muốn hỏi gì?" value={question} onChangeText={setQuestion} multiline /><ThongDiep>{error}</ThongDiep><Nut title="Nhận tư vấn" busy={busy} onPress={ask} />{!!answer && <Text style={[s.body, s.card, { marginTop: 16 }]}>{answer}</Text>}</ManHinh>
}
