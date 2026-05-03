const transactionService = require('../services/transaction.service');

const getAll = async (req, res, next) => {
  try {
    const result = await transactionService.getAll(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const transaction = await transactionService.getById(req.params.id);
    res.json({ transaction });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const transaction = await transactionService.create({
      ...req.body,
      userId: req.user.id,
    });
    res.status(201).json({ message: 'Transaction recorded', transaction });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create };
