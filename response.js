// src/utils/response.js

const success = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
  };
  if (data !== null) response.data = data;
  return res.status(statusCode).json(response);
};

const created = (res, data, message = 'Created successfully') => {
  return success(res, data, message, 201);
};

const paginated = (res, { data, total, page, limit }) => {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  });
};

const noContent = (res) => {
  return res.status(204).send();
};

module.exports = { success, created, paginated, noContent };
