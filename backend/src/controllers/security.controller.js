const auditService = require('../services/audit.service');

const getSummary = async (req, res, next) => {
  try {
    const summary = await auditService.getSummary();
    res.json({ summary });
  } catch (err) { next(err); }
};

const listEvents = async (req, res, next) => {
  try {
    const result = await auditService.listEvents(req.query);
    res.json(result);
  } catch (err) { next(err); }
};

const getPermissions = async (req, res) => {
  res.json({ roles: auditService.PERMISSION_MATRIX });
};

module.exports = { getSummary, listEvents, getPermissions };
