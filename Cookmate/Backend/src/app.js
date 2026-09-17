const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { rateLimit } = require('express-rate-limit');
const { validateRequest } = require('./middleware/validationMiddleware');

const apiRoutes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const app = express();

app.use(cors());
app.use(helmet());
if (process.env.NODE_ENV !== 'test')
  app.use(morgan('dev', { skip: (req) => req.path.startsWith('/api/auth/oauth/') }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  '/uploads',
  helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }),
  express.static(path.join(__dirname, '../uploads')),
);
app.use(
  '/api/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, message: 'Quá nhiều lần đăng nhập. Vui lòng thử lại sau.' },
  }),
);
app.use(
  '/api/auth/register',
  rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, message: 'Quá nhiều lần đăng ký. Vui lòng thử lại sau.' },
  }),
);
app.use('/api', validateRequest);
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Cookmate backend is running',
    health: '/api/health',
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
