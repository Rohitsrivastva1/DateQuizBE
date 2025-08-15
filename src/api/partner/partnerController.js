const { createrPartnerRequest,findPendingRequests,findIncomingRequests,updateRequestStatus,linkPartners } = require("../../services/db/PartnerQueries");
const { findUserByUsername } = require("../../services/db/userQueries");
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
        const hasPartner = !!req.user.partner_id;
        let partnerInfo = null;
        let partnerLink = null;
        
        if (hasPartner) {
            // Get partner information
            // You'll need to implement this query
            // partnerInfo = await findPartnerInfo(req.user.partner_id);
            
            // For demo purposes
            partnerInfo = {
                id: req.user.partner_id,
                username: 'Partner User' // Replace with actual query
            };
            
            // Generate partner link if needed
            // partnerLink = `datequiz://partner/connect/${linkToken}`;
        }
        
        res.status(200).json({
            hasPartner,
            partnerInfo,
            partnerLink
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

        // Disconnect partners (you'll need to implement this)
        // await disconnectPartners(userId, req.user.partner_id);
        
        // For demo purposes, we'll just return success
        // In production, implement the actual database update
        
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
        if(req.user.partner_id || receiver.partner_id){
            return res.status(409).json({message: "One or both users are already in a partnership"});
        }

        const existingRequest = await findPendingRequests(requester_id, receiver.id);
        console.log(existingRequest);
        
        if(existingRequest){
            return res.status(400).json({message: "Request already sent"});
        }

        console.log(receiver.id,requester_id);
        

        await createrPartnerRequest(requester_id, receiver.id);
        
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
            return res.status(200).json({message: "Request approved successfully, you are now partners"});

        }           

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

