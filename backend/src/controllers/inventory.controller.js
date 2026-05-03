const inventoryService = require('../services/inventory.service');

const getAll = async (req, res, next) => {
  try {
    const result = await inventoryService.getAll(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getByProductId = async (req, res, next) => {
  try {
    const item = await inventoryService.getByProductId(req.params.productId);
    res.json({ inventory: item });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await inventoryService.update(req.params.productId, req.body);
    res.json({ message: 'Inventory updated', inventory: item });
  } catch (err) {
    next(err);
  }
};

const getLowStockAlerts = async (req, res, next) => {
  try {
    const alerts = await inventoryService.getLowStockAlerts();
    res.json({ alerts });
  } catch (err) {
    next(err);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const summary = await inventoryService.getSummary();
    res.json({ summary });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getByProductId, update, getLowStockAlerts, getSummary };
