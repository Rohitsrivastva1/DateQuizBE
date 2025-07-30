const { createrPartnerRequest,findPendingRequests,findIncomingRequests,updateRequestStatus,linkPartners } = require("../../services/db/PartnerQueries");
const { findUserByUsername } = require("../../services/db/userQueries");
 
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


module.exports = { sendPartnerRequest,getIncommingRequests,respondToRequest };  

