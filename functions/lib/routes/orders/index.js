"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const acceptMerchant_route_1 = __importDefault(require("./acceptMerchant.route"));
const cancelOrder_route_1 = __importDefault(require("./cancelOrder.route"));
const placeOrder_route_1 = __importDefault(require("./placeOrder.route"));
const getCustomerOrders_route_1 = __importDefault(require("./getCustomerOrders.route"));
const getOrderById_route_1 = __importDefault(require("./getOrderById.route"));
const getMerchantOrders_route_1 = __importDefault(require("./getMerchantOrders.route"));
const getRiderOrder_1 = __importDefault(require("./getRiderOrder"));
const acceptRider_route_1 = __importDefault(require("./acceptRider.route"));
const rider_status_1 = __importDefault(require("./rider-status"));
const book_return_qr_1 = __importDefault(require("./book-return-qr"));
const complete_return_1 = __importDefault(require("./complete-return"));
const verify_delivery_qr_1 = __importDefault(require("./verify-delivery-qr"));
const verify_return_qr_1 = __importDefault(require("./verify-return-qr"));
const riderDeliver_route_1 = __importDefault(require("./riderDeliver.route"));
const set_completion_time_1 = __importDefault(require("./set-completion-time"));
const paymentStatus_1 = __importDefault(require("./paymentStatus"));
exports.default = [
    getCustomerOrders_route_1.default,
    placeOrder_route_1.default,
    acceptMerchant_route_1.default,
    getRiderOrder_1.default,
    cancelOrder_route_1.default,
    getOrderById_route_1.default,
    getMerchantOrders_route_1.default,
    acceptRider_route_1.default,
    rider_status_1.default,
    book_return_qr_1.default,
    complete_return_1.default,
    verify_delivery_qr_1.default,
    verify_return_qr_1.default,
    riderDeliver_route_1.default,
    set_completion_time_1.default,
    paymentStatus_1.default,
];
//# sourceMappingURL=index.js.map