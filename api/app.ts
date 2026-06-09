import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import type { ApiResponse } from '../shared/types.js'

import authRoutes from './routes/auth.js'
import dashboardRoutes from './routes/dashboard.js'
import inventoryRoutes from './routes/inventory.js'
import ordersRoutes from './routes/orders.js'
import customsRoutes from './routes/customs.js'
import logisticsRoutes from './routes/logistics.js'
import returnsRoutes from './routes/returns.js'
import reportsRoutes from './routes/reports.js'
import systemRoutes from './routes/system.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Powered-By', 'SCM-API')
  next()
})

app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/customs', customsRoutes)
app.use('/api/logistics', logisticsRoutes)
app.use('/api/returns', returnsRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/system', systemRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    const response: ApiResponse<{ status: string }> = {
      code: 200,
      message: 'ok',
      data: { status: 'healthy' },
      timestamp: Date.now(),
    }
    res.status(200).json(response)
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error)
  const response: ApiResponse<null> = {
    code: 500,
    message: `服务器内部错误: ${error.message}`,
    data: null,
    timestamp: Date.now(),
  }
  res.status(500).json(response)
})

app.use((req: Request, res: Response) => {
  const response: ApiResponse<null> = {
    code: 404,
    message: `API不存在: ${req.method} ${req.path}`,
    data: null,
    timestamp: Date.now(),
  }
  res.status(404).json(response)
})

export default app
