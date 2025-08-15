const db = require('../../config/db');

const createrPartnerRequest = async (requester_id, receiver_id) => {

    const query = ` INSERT INTO partner_requests (requester_id, receiver_id, status) VALUES ($1, $2,'pending') returning *`;

    const values = [requester_id, receiver_id];

    const result = await db.query(query, values);

    return result.rows[0];
}

const findPendingRequests = async (requester_id, receiver_id) => {

    const query = ` SELECT * FROM partner_requests WHERE ((requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1)) AND status = 'pending'`;

    const {rows} = await db.query(query, [requester_id, receiver_id]);

    return rows[0];

}       

const findAnyExistingRequest = async (requester_id, receiver_id) => {

    const query = ` SELECT * FROM partner_requests WHERE ((requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1))`;

    const {rows} = await db.query(query, [requester_id, receiver_id]);

    return rows[0];

}       

const findIncomingRequests = async (user_id) => {
    
    const query = ` SELECT pr.id,pr.requester_id, u.username as requester_username From partner_requests pr JOIN users u ON pr.requester_id = u.id WHERE pr.receiver_id = $1 AND pr.status = 'pending'`;

    const {rows} = await db.query(query, [user_id]);
    return { requests: rows };
}

const updateRequestStatus = async (request_id, status) => {

    const query = ` UPDATE partner_requests SET status = $1, updated_at = current_timestamp WHERE id = $2 returning *`;

    const {rows} = await db.query(query, [status, request_id]);

    return rows[0];
}

const linkPartners = async (requester_id, partner_id) => {
    const query1 = ` UPDATE users SET partner_id = $2 WHERE id = $1`;
    await db.query(query1, [requester_id, partner_id]);
    const query2 = ` UPDATE users SET partner_id = $2 WHERE id = $1`;
    await db.query(query2, [partner_id, requester_id]);
}

const disconnectPartners = async (user1_id, user2_id) => {
    // Remove partner_id from both users
    const query1 = ` UPDATE users SET partner_id = NULL WHERE id = $1`;
    await db.query(query1, [user1_id]);
    const query2 = ` UPDATE users SET partner_id = NULL WHERE id = $1`;
    await db.query(query2, [user2_id]);
}

const createPartnerRequestNotification = async (receiver_id, requester_username) => {
    const query = ` INSERT INTO daily_notifications (user_id, notification_type, message) VALUES ($1, 'partner_request', $2)`;
    const message = `${requester_username} sent you a partner request!`;
    await db.query(query, [receiver_id, message]);
}

const createPartnerResponseNotification = async (requester_id, receiver_username, response) => {
    const query = ` INSERT INTO daily_notifications (user_id, notification_type, message) VALUES ($1, 'partner_response', $2)`;
    const message = response === 'approved' 
        ? `${receiver_username} accepted your partner request! You are now partners! 💕`
        : `${receiver_username} declined your partner request.`;
    await db.query(query, [requester_id, message]);
}

module.exports = { 
    createrPartnerRequest,
    findPendingRequests,
    findAnyExistingRequest,
    findIncomingRequests,
    updateRequestStatus,
    linkPartners,
    disconnectPartners,
    createPartnerRequestNotification,
    createPartnerResponseNotification
};
