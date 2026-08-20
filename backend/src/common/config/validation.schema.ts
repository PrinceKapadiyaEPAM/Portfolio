import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV:     Joi.string().valid('development', 'production', 'test').default('development'),
  PORT:         Joi.number().integer().min(1).max(65535).default(4000),
  DATABASE_URL: Joi.string().required(),

  // Redis — all optional; set REDIS_ENABLED=true to activate
  REDIS_ENABLED:    Joi.boolean().default(false),
  REDIS_HOST:       Joi.string().optional().allow(''),
  REDIS_PORT:       Joi.number().integer().optional(),
  REDIS_PASSWORD:   Joi.string().optional().allow(''),
  REDIS_TLS:        Joi.boolean().optional(),
  REDIS_KEY_PREFIX: Joi.string().optional().allow(''),

  // JWT
  JWT_SECRET:             Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN:  Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  FRONTEND_URL: Joi.string().default('http://localhost:3000'),
  SENTRY_DSN:   Joi.string().uri().optional().allow(''),
}).unknown(true); // allow extra NSE_* keys without failing
