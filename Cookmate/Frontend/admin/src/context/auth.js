import { createContext, useContext } from 'react'
export const AuthContext = createContext(null)
export const isAdmin = (user) =>
  ['ADMIN', 'QUAN_TRI', 'ADMINISTRATOR'].includes(
    user?.vaiTro?.tenVaiTro?.trim().toUpperCase().replace(/[\s-]/g, '_'),
  )
export const useAuth = () => useContext(AuthContext)
