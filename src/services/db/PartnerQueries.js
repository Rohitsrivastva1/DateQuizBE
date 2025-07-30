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


module.exports = { createrPartnerRequest,findPendingRequests,findIncomingRequests,updateRequestStatus,linkPartners };
