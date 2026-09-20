import { StatusBar } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NhaCungCapXacThuc } from './maNguon/nguCanh/NguCanhXacThuc'
import DieuHuongUngDung from './maNguon/dieuHuong/DieuHuongUngDung'
export default function UngDung() {
  return (
    <SafeAreaProvider>
      <NhaCungCapXacThuc>
        <StatusBar barStyle="dark-content" />
        <DieuHuongUngDung />
      </NhaCungCapXacThuc>
    </SafeAreaProvider>
  )
}
