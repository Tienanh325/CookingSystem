import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { goiApi } from './KetNoiApi'

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })
}

export async function dangKyThongBaoDay(yeuCauQuyen = false) {
  if (Platform.OS === 'web' || !Device.isDevice) return null
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Thông báo Cookmate',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#BD420B',
    })
  }
  let quyen = await Notifications.getPermissionsAsync()
  if (quyen.status !== 'granted' && yeuCauQuyen)
    quyen = await Notifications.requestPermissionsAsync()
  if (quyen.status !== 'granted') return null
  const maDuAn =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId
  if (!maDuAn) throw new Error('Chưa cấu hình EXPO_PUBLIC_EAS_PROJECT_ID cho push notification.')
  const token = (await Notifications.getExpoPushTokenAsync({ projectId: maDuAn })).data
  await goiApi('/thong-bao/thiet-bi', {
    method: 'POST',
    body: {
      token,
      nenTang: Platform.OS,
      maThietBi: Device.modelId || Device.modelName || null,
    },
  })
  return token
}

export async function huyDangKyThongBaoDay() {
  if (Platform.OS !== 'web')
    await goiApi('/thong-bao/thiet-bi', { method: 'DELETE' })
}

export function langNgheMoThongBao(xuLy: (duLieu: any) => void) {
  if (Platform.OS === 'web') return () => {}
  const dangKy = Notifications.addNotificationResponseReceivedListener((phanHoi) =>
    xuLy(phanHoi.notification.request.content.data),
  )
  return () => dangKy.remove()
}

export async function layThongBaoDaMoUngDung() {
  if (Platform.OS === 'web') return null
  const phanHoi = await Notifications.getLastNotificationResponseAsync()
  if (!phanHoi) return null
  await Notifications.clearLastNotificationResponseAsync()
  return phanHoi.notification.request.content.data
}
