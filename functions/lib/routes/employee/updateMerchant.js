"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const firestore_1 = require("../../utils/firestore");
const router = (0, express_1.Router)();
router.put("/merchants/:id", auth_1.verifyFirebaseToken, auth_1.isAdminOrEmployee, async (req, res) => {
    try {
        await (0, firestore_1.updateUser)(req.params.id, req.body);
        res.status(200).json({ message: "Rider updated successfully." });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=updateMerchant.js.map