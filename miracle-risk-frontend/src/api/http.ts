import axios from 'axios'

// 从 .env 文件读取 API 根地址，默认空字符串（走 vite proxy）
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// ---------- 请求拦截：自动带上 token ----------
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ---------- 响应拦截：统一处理错误 ----------
http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status
    const message = error.response?.data?.message ?? error.message

    if (status === 401) {
      localStorage.removeItem('token')
      // 当前 MVP 无登录页：勿整页跳转 /login（生产上会 404）。接入登录后可用 env 再打开跳转。
      return Promise.reject(
        new Error(
          typeof message === 'string' && message
            ? message
            : '未登录或登录已过期，请重新登录后重试',
        ),
      )
    }

    // 统一抛出，让调用方的 catch 捕获
    return Promise.reject(new Error(message))
  },
)

export default http
