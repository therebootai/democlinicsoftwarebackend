const express = require("express");

const addPaymentController = require("../controllers/addPaymentController");

const router = express.Router();

router.post("/create", addPaymentController.createPayments);
router.get("/get", addPaymentController.getPayments);
router.put("/update/:paymentId", addPaymentController.updatePayments);
router.delete("/delete/:paymentId", addPaymentController.deletePayments);

module.exports = router;
