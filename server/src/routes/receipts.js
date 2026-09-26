// server/src/routes/receipts.js
const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const ctrl   = require('../controllers/receiptsController');

// Protect all receipts routes
router.use(auth);

router.get('/meta/products',         ctrl.listProducts);   // MUST be before /:id
router.get('/',                      ctrl.listReceipts);
router.post('/',                     ctrl.createReceipt);
router.get('/:id',                   ctrl.getReceipt);
router.put('/:id/header',            ctrl.updateHeader);   // edit from_contact, schedule_date
router.post('/:id/lines',            ctrl.addLine);
router.delete('/:id/lines/:lineId',  ctrl.removeLine);
router.put('/:id/todo',              ctrl.markReady);
router.put('/:id/validate',          ctrl.validateReceipt);
router.put('/:id/cancel',            ctrl.cancelReceipt);

module.exports = router;
