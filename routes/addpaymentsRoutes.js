const express = require("express");

const addPaymentController = require("../controllers/addPaymentController");

const router = express.Router();

router.post("/create", addPaymentController.createPayments);
router.get("/get", addPaymentController.getPayments);
router.get("/getdropdown", addPaymentController.getDropdown);
router.get("/getdropdown/random", addPaymentController.getRandomSuggestions);
router.put("/update/:paymentId", addPaymentController.updatePayments);
router.delete("/delete/:paymentId", addPaymentController.deletePayments);

module.exports = router;
