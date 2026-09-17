const express = require('express');
const { z } = require('zod');
const { rateLimit } = require('express-rate-limit');
const service = require('../services/customerAuth');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const router = express.Router();
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
const limit = (count, minutes) =>
  rateLimit({
    windowMs: minutes * 60000,
    limit: count,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, message: 'Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau.' },
  });
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return sendError(res, 400, 'Thông tin xác thực không hợp lệ.');
  req.body = result.data;
  next();
};
const wrap = (fn) =>
  asyncHandler(async (req, res) => sendSuccess(res, 200, 'Thành công', await fn(req)));
router.get(
  '/methods',
  wrap(() => service.capabilities()),
);
router.post(
  '/otp/request',
  limit(10, 60),
  validate(
    z.object({
      phone: z.string().min(9).max(25),
      name: z.string().trim().min(1).max(100).optional(),
    }),
  ),
  wrap((req) => service.requestOtp(req.body.phone, req.body.name)),
);
router.post(
  '/otp/verify',
  limit(30, 15),
  validate(z.object({ challengeId: z.uuid(), code: z.string().regex(/^\d{6}$/) })),
  wrap((req) => service.verifyOtp(req.body.challengeId, req.body.code)),
);
router.post(
  '/oauth/start',
  limit(30, 15),
  validate(
    z.object({
      provider: z.enum(['google', 'apple']),
      redirectUri: z.string().max(255),
      challenge: z.string().regex(/^[a-f0-9]{64}$/),
    }),
  ),
  wrap((req) => service.startOAuth(req.body.provider, req.body.redirectUri, req.body.challenge)),
);
router.post(
  '/oauth/exchange',
  limit(30, 15),
  validate(
    z.object({ ticket: z.string().regex(/^[a-f0-9]{64}$/), verifier: z.string().min(43).max(128) }),
  ),
  wrap((req) => service.exchangeTicket(req.body.ticket, req.body.verifier)),
);
for (const method of ['get', 'post'])
  router[method](
    '/oauth/:provider/callback',
    limit(30, 15),
    asyncHandler(async (req, res) => {
      const data = method === 'get' ? req.query : req.body;
      if (
        !['google', 'apple'].includes(req.params.provider) ||
        !z.uuid().safeParse(data.state).success
      )
        return sendError(res, 400, 'Phiên đăng nhập không hợp lệ.');
      res.set('Cache-Control', 'no-store');
      res.redirect(
        303,
        await service.oauthCallback(
          req.params.provider,
          data.state,
          typeof data.code === 'string' ? data.code : null,
        ),
      );
    }),
  );
module.exports = router;
