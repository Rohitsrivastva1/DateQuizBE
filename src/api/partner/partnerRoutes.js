const express = require("express");

const { sendPartnerRequest,getIncommingRequests,respondToRequest } = require("./partnerController");

const {protect} = require("../../middleware/authmiddleware");

const router = express.Router();

router.use(protect);

router.post("/request", sendPartnerRequest);
router.post('/request/respond',respondToRequest);
router.get('/request',getIncommingRequests)

module.exports = router;