const { authenticate, authorize } = require('./auth');
const { errorHandler, notFound } = require('./errorHandler');

module.exports = {
  authenticate,
  authorize,
  errorHandler,
  notFound,
};
