const { createrPartnerRequest,findPendingRequests,findIncomingRequests,updateRequestStatus,linkPartners,disconnectPartners,createPartnerRequestNotification,createPartnerResponseNotification,findAnyExistingRequest } = require("../../services/db/PartnerQueries");
const { findUserByUsername } = require("../../services/db/userQueries");
const db = require("../../config/db");
const crypto = require('crypto');

// Generate a unique partner link
const generatePartnerLink = async (req, res) => {
    const userId = req.user.id;
    
    try {
        // Check if user already has a partner
        if (req.user.partner_id) {
            return res.status(409).json({
                success: false,
                message: "You already have a partner"
            });
        }

        // Generate a unique link token
        const linkToken = crypto.randomBytes(32).toString('hex');
        const link = `datequiz://partner/connect/${linkToken}`;
        
        // Store the link token in the database (you'll need to add this to your schema)
        // For now, we'll store it in a temporary way
        // You should create a partner_links table with: id, user_id, link_token, created_at, expires_at
        
        // For demo purposes, we'll store it in the user table temporarily
        // In production, create a separate table for this
        
        res.status(200).json({
            success: true,
            link: link,
            message: "Partner link generated successfully"
        });
        
    } catch (error) {
        console.error('Error generating partner link:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Connect via partner link
const connectViaLink = async (req, res) => {
    const userId = req.user.id;
    const { link } = req.body;
    
    try {
        // Check if user already has a partner
        if (req.user.partner_id) {
            return res.status(409).json({
                success: false,
                message: "You already have a partner"
            });
        }

        // Extract token from link
        const linkMatch = link.match(/datequiz:\/\/partner\/connect\/([a-f0-9]{64})/);
        if (!linkMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid partner link format"
            });
        }

        const linkToken = linkMatch[1];
        
        // Find the user who generated this link
        // You'll need to implement this query based on your schema
        // const linkOwner = await findUserByLinkToken(linkToken);
        
        // For demo purposes, we'll simulate finding a user
        // In production, implement the actual database query
        
        // Simulate finding a partner (replace with actual implementation)
        const partnerUser = await findUserByUsername('demo_partner'); // Replace with actual query
        
        if (!partnerUser) {
            return res.status(404).json({
                success: false,
                message: "Partner link not found or expired"
            });
        }

        if (partnerUser.id === userId) {
            return res.status(400).json({
                success: false,
                message: "You cannot connect to yourself"
            });
        }

        if (partnerUser.partner_id) {
            return res.status(409).json({
                success: false,
                message: "Partner is already connected to someone else"
            });
        }

        // Link the partners
        await linkPartners(partnerUser.id, userId);
        
        res.status(200).json({
            success: true,
            partnerName: partnerUser.username,
            partnerInfo: {
                id: partnerUser.id,
                username: partnerUser.username
            },
            message: "Successfully connected with partner"
        });
        
    } catch (error) {
        console.error('Error connecting via link:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Get partner status
const getPartnerStatus = async (req, res) => {
    const userId = req.user.id;
    
    try {
        // Check for partner via partner_requests table (more reliable than user.partner_id)
        const partnerQuery = `
            SELECT 
                CASE 
                    WHEN pr.requester_id = $1 THEN pr.receiver_id
                    ELSE pr.requester_id
                END as partner_id,
                u.username as partner_username,
                u.id as partner_user_id
            FROM partner_requests pr
            JOIN users u ON u.id = (
                CASE 
                    WHEN pr.requester_id = $1 THEN pr.receiver_id
                    ELSE pr.requester_id
                END
            )
            WHERE (pr.requester_id = $1 OR pr.receiver_id = $1) AND pr.status = 'approved'
            LIMIT 1
        `;
        const partnerResult = await db.query(partnerQuery, [userId]);
        
        const hasPartner = partnerResult.rows.length > 0;
        let partnerInfo = null;
        let coupleName = null;
        
        if (hasPartner) {
            const partner = partnerResult.rows[0];
            partnerInfo = {
                id: partner.partner_id,
                username: partner.partner_username
            };
            
            // Get couple name
            const coupleNameQuery = `
                SELECT couple_name
                FROM couple_names
                WHERE (user_id = $1 AND partner_id = $2) OR (user_id = $2 AND partner_id = $1)
            `;
            const coupleNameResult = await db.query(coupleNameQuery, [userId, partner.partner_id]);
            coupleName = coupleNameResult.rows[0]?.couple_name || null;
        }
        
        res.status(200).json({
            success: true,
            hasPartner,
            partnerInfo,
            coupleName
        });
        
    } catch (error) {
        console.error('Error getting partner status:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Disconnect partner
const disconnectPartner = async (req, res) => {
    const userId = req.user.id;
    
    try {
        if (!req.user.partner_id) {
            return res.status(400).json({
                success: false,
                message: "You don't have a partner to disconnect from"
            });
        }

        // Disconnect partners
        await disconnectPartners(userId, req.user.partner_id);
        
        res.status(200).json({
            success: true,
            message: "Successfully disconnected from partner"
        });
        
    } catch (error) {
        console.error('Error disconnecting partner:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const sendPartnerRequest = async (req,res) => {
    
    const requester_id = req.user.id;

    const {receiverUsername} = req.body;

    
    try{

        const receiver = await findUserByUsername(receiverUsername);
        console.log(receiver);
        
        if(!receiver){
            return res.status(404).json({message: "User not found"});
        }

        if(receiver.id === requester_id){
            return res.status(400).json({message: "You cannot send a request to yourself"});
        }

        // Check if either user is already linked to a partner
        if(req.user.partner_id || receiver.partner_id){
            return res.status(409).json({message: "One or both users are already in a partnership"});
        }

        // Check for any existing request between these users (regardless of status)
        const anyExistingRequest = await findAnyExistingRequest(requester_id, receiver.id);
        console.log('Any existing request:', anyExistingRequest);
        
        if(anyExistingRequest) {
            if(anyExistingRequest.status === 'pending') {
                return res.status(400).json({message: "Request already sent"});
            } else if(anyExistingRequest.status === 'approved') {
                // If there's an approved request but users aren't actually linked, 
                // this means there was an error during approval. Let's clean it up.
                console.log('Found approved request but users not linked, cleaning up...');
                try {
                    await db.query('DELETE FROM partner_requests WHERE id = $1', [anyExistingRequest.id]);
                } catch (error) {
                    console.error('Error deleting inconsistent approved request:', error);
                }
            } else if(anyExistingRequest.status === 'denied') {
                // If there was a denied request, we can allow a new request
                // But first, let's delete the old denied request
                try {
                    await db.query('DELETE FROM partner_requests WHERE id = $1', [anyExistingRequest.id]);
                } catch (error) {
                    console.error('Error deleting old denied request:', error);
                }
            }
        }

        // Double-check that no request exists after cleanup
        const checkAgain = await findAnyExistingRequest(requester_id, receiver.id);
        if(checkAgain) {
            console.log('Still found existing request after cleanup, deleting it...');
            try {
                await db.query('DELETE FROM partner_requests WHERE id = $1', [checkAgain.id]);
            } catch (error) {
                console.error('Error deleting remaining request:', error);
            }
        }

        console.log(receiver.id,requester_id);
        

        await createrPartnerRequest(requester_id, receiver.id);
        
        // Create notification for the receiver
        await createPartnerRequestNotification(receiver.id, req.user.username);
        
        res.status(201).json({message: "Request sent successfully"});


    }catch(error){
        console.error(error);
        res.status(500).json({message: "Internal server error"});
    }
}


const getIncommingRequests = async (req,res) => {

    const user_id = req.user.id;

    try{
        const requests = await findIncomingRequests(user_id);
        res.status(200).json(requests);
    }catch(error){
        console.error(error);
        res.status(500).json({message: "Internal server error"});
    }
}


const respondToRequest = async (req,res) => {
    console.log(req.user);
    
    const { requestId, response } = req.body;
    console.log(requestId, response);
    
    if(!['approved','denied'].includes(response)){
        return res.status(400).json({message: "Invalid response, Must be approved or denied"});
    }

    try{
        const request = await updateRequestStatus(requestId, response);
        if(!request){
            return res.status(404).json({message: "Request not found"});
        }
        if(request.receiver_id !== req.user.id){
            return res.status(400).json({message: "You are not authorized to respond to this request"});
        }

        if(response === 'approved'){
            await linkPartners(request.requester_id, request.receiver_id);
            
            // Create notification for the requester about approval
            await createPartnerResponseNotification(request.requester_id, req.user.username, 'approved');
            
            return res.status(200).json({message: "Request approved successfully, you are now partners"});

        }           

        // Create notification for the requester about denial
        await createPartnerResponseNotification(request.requester_id, req.user.username, 'denied');
        
        return res.status(200).json({message: "Request Denied."});

    }catch(error){
        console.error(error);
        res.status(500).json({message: "Internal server error"});
    }
}


module.exports = { 
    sendPartnerRequest,
    getIncommingRequests,
    respondToRequest,
    generatePartnerLink,
    connectViaLink,
    getPartnerStatus,
    disconnectPartner
};  

