const saleService = require('../services/sale.service');

const createSale = async (req, res, next) => {
  try {
    const sale = await saleService.createSale({ ...req.body, sellerId: req.user.id });
    res.status(201).json({ message: 'Продажа оформлена', sale });
  } catch (err) { next(err); }
};

const getSales = async (req, res, next) => {
  try {
    // Sellers can only see their own sales
    const query = req.user.role === 'SELLER'
      ? { ...req.query, sellerId: req.user.id }
      : req.query;
    const result = await saleService.getSales(query);
    res.json(result);
  } catch (err) { next(err); }
};

const getSaleById = async (req, res, next) => {
  try {
    const sale = await saleService.getSaleById(req.params.id);
    res.json({ sale });
  } catch (err) { next(err); }
};

const getSummary = async (req, res, next) => {
  try {
    const sellerId = req.user.role === 'SELLER' ? req.user.id : req.query.sellerId;
    const summary  = await saleService.getSalesSummary(sellerId);
    res.json({ summary });
  } catch (err) { next(err); }
};

module.exports = { createSale, getSales, getSaleById, getSummary };
