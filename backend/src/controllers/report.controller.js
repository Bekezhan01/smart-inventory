const reportService = require('../services/report.service');

const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await reportService.getDashboardStats();
    res.json({ stats });
  } catch (err) {
    next(err);
  }
};

const getTransactionReport = async (req, res, next) => {
  try {
    const report = await reportService.getTransactionReport(req.query);
    res.json({ report });
  } catch (err) {
    next(err);
  }
};

const getTopProducts = async (req, res, next) => {
  try {
    const products = await reportService.getTopProducts(req.query);
    res.json({ products });
  } catch (err) {
    next(err);
  }
};

const getInventoryReport = async (req, res, next) => {
  try {
    const report = await reportService.getInventoryReport();
    res.json({ report });
  } catch (err) {
    next(err);
  }
};

const getDemandForecast = async (req, res, next) => {
  try {
    const forecast = await reportService.getDemandForecast(req.query);
    res.json({ forecast });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboardStats, getTransactionReport, getTopProducts, getInventoryReport, getDemandForecast };
