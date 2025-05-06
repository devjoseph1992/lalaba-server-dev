"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firestore_1 = require("../../utils/firestore");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.delete("/riders/:id", auth_1.verifyFirebaseToken, auth_1.isAdminOrEmployee, async (req, res) => {
    try {
        await (0, firestore_1.deleteUser)(req.params.id);
        res.status(200).json({ message: "Rider deleted successfully." });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=deleteRider.js.map