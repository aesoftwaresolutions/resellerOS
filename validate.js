// src/middleware/validate.js
const { ValidationError } = require('../utils/errors');

/**
 * Generic Joi validation middleware
 * @param {Object} schema - Joi schema with body, query, params keys
 */
const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];

    ['body', 'query', 'params'].forEach((key) => {
      if (schema[key]) {
        const { error, value } = schema[key].validate(req[key], {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
        });

        if (error) {
          errors.push(
            ...error.details.map((d) => ({
              field: d.path.join('.'),
              message: d.message,
              type: d.type,
            }))
          );
        } else {
          req[key] = value; // Use validated/sanitized values
        }
      }
    });

    if (errors.length > 0) {
      return next(new ValidationError('Validation failed', errors));
    }

    next();
  };
};

module.exports = validate;
