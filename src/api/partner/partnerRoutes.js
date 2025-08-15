const express = require("express");

const { 
    sendPartnerRequest,
    getIncommingRequests,
    respondToRequest,
    generatePartnerLink,
    connectViaLink,
    getPartnerStatus,
    disconnectPartner
} = require("./partnerController");

const {protect} = require("../../middleware/authmiddleware");

const router = express.Router();

router.use(protect);

// Legacy username-based routes
router.post("/request", sendPartnerRequest);
router.post('/request/respond',respondToRequest);
router.get('/request',getIncommingRequests);

// New partner link routes
router.post("/generate-link", generatePartnerLink);
router.post("/connect-via-link", connectViaLink);
router.get("/status", getPartnerStatus);
router.post("/disconnect", disconnectPartner);

module.exports = router;