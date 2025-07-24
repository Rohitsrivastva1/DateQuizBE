const { createrPartnerRequest,findPendingRequests,findIncommingRequests,updateRequestStatus,linkPartners } = require("../../services/db/PartnerQueries");
const { findUserByUsername } = require("../../services/db/UserQueries");
 
const sendPartnerRequest = async (req,res) => {
    console.log(req.user);
    
    const requester_id = req.user.id;

    const {reciever_username} = req.body;

    try{

        const reciever = await findUserByUsername(reciever_username);
        if(!reciever){
            return res.status(404).json({message: "User not found"});
        }

        if(reciever.id === requester_id){
            return res.status(400).json({message: "You cannot send a request to yourself"});
        }
        if(req.user.partner_id || reciever.partner_id){
            return res.status(400).json({message: "On or both already has a partner"});
        }

        const existingRequest = await findPendingRequests(requester_id, reciever.id);

        if(existingRequest){
            return res.status(400).json({message: "Request already sent"});
        }

        await createrPartnerRequest(requester_id, reciever.id);
        
        res.status(201).json({message: "Request sent successfully"});


    }catch(error){
        console.error(error);
        res.status(500).json({message: "Internal server error"});
    }
}


const getIncommingRequests = async (req,res) => {

    const user_id = req.user.id;

    try{
        const requests = await findIncommingRequests(user_id);
        res.status(200).json(requests);
    }catch(error){
        console.error(error);
        res.status(500).json({message: "Internal server error"});
    }
}


const respondToRequest = async (req,res) => {

   const request_id = req.user.request_id;

   const {requester_id, status} = req.body;

   if(!['accepted','rejected'].includes(status)){
    return res.status(400).json({message: "Invalid status, Must be approved or rejected"});
   }

   try{
    const request = await updateRequestStatus(request_id, status);
    if(!request){
        return res.status(404).json({message: "Request not found"});
    }
    if(request.reciever_id !== reciever_id){
        return res.status(400).json({message: "You are not authorized to respond to this request"});
    }

    if(status === 'accepted'){
        await linkPartners(request.requester_id, request.reciever_id);
        return res.status(200).json({message: "Request approved successfully, you are now partners"});

    }           

    return res.status(200).json({message: "Request Denied."});

   }catch(error){
    console.error(error);
    res.status(500).json({message: "Internal server error"});
   }
}


module.exports = { sendPartnerRequest,getIncommingRequests,respondToRequest };  

