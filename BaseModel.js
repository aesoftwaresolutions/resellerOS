// src/models/BaseModel.js
const db = require('../config/database');
const { NotFoundError } = require('../utils/errors');

class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = db;
  }

  query() {
    return this.db(this.tableName);
  }

  async findById(id, columns = '*') {
    return this.query().select(columns).where({ id }).first();
  }

  async findByIdOrFail(id, columns = '*') {
    const row = await this.findById(id, columns);
    if (!row) throw new NotFoundError(this.tableName);
    return row;
  }

  async findOne(conditions, columns = '*') {
    return this.query().select(columns).where(conditions).first();
  }

  async findMany(conditions = {}, { columns = '*', orderBy = 'created_at', order = 'desc', limit, offset } = {}) {
    let q = this.query().select(columns).where(conditions).orderBy(orderBy, order);
    if (limit) q = q.limit(limit);
    if (offset) q = q.offset(offset);
    return q;
  }

  async create(data) {
    const [row] = await this.query().insert(data).returning('*');
    return row;
  }

  async createMany(dataArray) {
    return this.query().insert(dataArray).returning('*');
  }

  async update(id, data) {
    const [row] = await this.query()
      .where({ id })
      .update({ ...data, updated_at: this.db.fn.now() })
      .returning('*');
    return row;
  }

  async updateWhere(conditions, data) {
    return this.query()
      .where(conditions)
      .update({ ...data, updated_at: this.db.fn.now() })
      .returning('*');
  }

  async delete(id) {
    return this.query().where({ id }).del();
  }

  async softDelete(id) {
    return this.update(id, { deleted_at: this.db.fn.now() });
  }

  async count(conditions = {}) {
    const result = await this.query().where(conditions).count('id as count').first();
    return parseInt(result.count, 10);
  }

  async paginate(conditions = {}, { page = 1, limit = 25, columns = '*', orderBy = 'created_at', order = 'desc' } = {}) {
    const offset = (page - 1) * limit;

    const [data, countResult] = await Promise.all([
      this.query()
        .select(columns)
        .where(conditions)
        .orderBy(orderBy, order)
        .limit(limit)
        .offset(offset),
      this.query().where(conditions).count('id as count').first(),
    ]);

    const total = parseInt(countResult.count, 10);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }
}

module.exports = BaseModel;
