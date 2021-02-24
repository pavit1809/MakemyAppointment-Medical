const express=require('express');
const User=require('../models/user');
const Appointment=require('../models/appointment');
const Center=require('../models/center');
const Facility=require('../models/facilities');
const router=new express.Router();
const RegistrationUtil=require('../helpers/center-registration-helper');
const RegistrationUtil1=require('../helpers/Registration-helper');
const Vonage = require('@vonage/server-sdk');
const nodemailer=require('nodemailer');
const axios = require('axios').default;
const { response } = require('express');
const Authmiddleware=require('../middleware/auth1');

//Setting up functionality for message-based authentication
const vonage = new Vonage({
      apiKey: 'b054c65b',
      apiSecret: 'gur6FHnIalka5e7d'
});

//Setting up functionality for email-based authentication
const transporter=nodemailer.createTransport({
      service: 'gmail',
      auth:{
            user:'r20324pavitra@dpsrkp.net',
            pass:'PASSWORD'
      }
});

//Route-1: Saving a center :Part-1
router.post('/center/signup1',async (req,res)=>{
      // console.log(req.body)
      let center=new Center(req.body);
      center.OpeningTime=RegistrationUtil.formattimestring(req.body.OpeningTime);
      center.ClosingTime=RegistrationUtil.formattimestring(req.body.ClosingTime);
      try{
            const hs=req.body.OpeningTime[0]+req.body.OpeningTime[1];
            const ms=req.body.OpeningTime[3]+req.body.OpeningTime[4];
            const he=req.body.ClosingTime[0]+req.body.ClosingTime[1];
            const me=req.body.ClosingTime[3]+req.body.ClosingTime[4];
            if ((he>hs) || (he==hs && me>ms) || (he==0))
            {
                  await center.save();
                  center.Status=false;
                  const ProvidedAddress=center.NearestLandmark+' '+center.City+' '+center.Pincode+' '+center.State+' '+center.Country;
                  // const response=await axios.get('https://geocode.search.hereapi.com/v1/geocode?q='+ProvidedAddress+'&apiKey=tbeKC9DJdnRIZ1p5x496OgpIUj2vbL5CWADs8czW5Rk');
                  // const coordinates=Object.values(response.data.items[0].position);
                  // await center.PositionCoordinates.push(coordinates[0]);
                  // await center.PositionCoordinates.push(coordinates[1]);
                  const token=await center.generateauthtoken();
                  await center.save();
                  const offd=Object.entries(req.body.offdays);
                  let Offdays=[];
                  for(let i=0;i<7;i++)
                  {     
                        if (offd[i][1]==true){
                              Offdays.push(offd[i][0]);
                        }
                  }
                  let s=new Set();
                  for(let i=0;i<req.body.facilities.length;i++){
                        s.add(req.body.facilities[i]);
                  }
                  let allprovidedfacilities=Array.from(s);
                  console.log(allprovidedfacilities.length);
                  for(let i=0;i<allprovidedfacilities.length;i++)
                  {
                        const element=allprovidedfacilities[i];
                        const newFac=new Facility({
                              FacilityName:element.FacilityName,
                              CapacityperSlot:element.CapacityperSlot,
                              Price:element.Price,
                              Offdays:Offdays,
                              owner:center._id
                        });
                        center.Alloptions.push(element.FacilityName);
                        await center.save();
                        const currdate=RegistrationUtil.formatdate(new Date());
                        newFac.SlotAvailability=RegistrationUtil.listofnextsevendays(Offdays,currdate,element.CapacityperSlot,center.OpeningTime,center.ClosingTime);
                        await newFac.save();
                  }
                  res.status(201).send({center,token});      
            }
            else{
                  res.status(400).send('TIME ERROR');
            }
      }catch(err){
            const CenterinQuestion=await Center.findOne({Email:req.body.Email});
            // console.log(CenterinQuestion);
            console.log(err);
            if (CenterinQuestion==undefined){
                  res.status(400).send("Email is invalid");
            }
            else if (CenterinQuestion.PositionCoordinates.length==0){
                  res.status(400).send("User is already registered");
            }
            else if(CenterinQuestion!=undefined){
                  await Center.deleteOne({Email:req.body.Email});
                  res.status(400).send("Invalid Address");
            }
      }
})

router.post('/center/signup2',Authmiddleware,async (req,res)=>{
      // console.log(req.body);
      try{
            // console.log(req.body.centerInfo.data.center.Email);
            const center=await Center.findOne({Email:req.body.centerInfo.data.center.Email}) 
            if (center==undefined){
                  res.status(404).send();
            }
            else{
                  if (RegistrationUtil1.Verificationutil(center,req)==true){
                        const token=await center.generateauthtoken();
                        center.Status=true;
                        await center.RecentEmailOtps.pop();
                        await center.RecentMobileOtps.pop();
                        await center.save();
                        res.status(200).send({center,token});
                  }
                  else{
                        res.status(404).send(center);
                  }
            }
      }catch(err){
            console.log(err);
            res.status(400).send('Some error occured');
      }
});

router.post('/center/newotps',Authmiddleware,async (req,res)=>{
      try{
            // console.log(req.body);
            const CenterEmail=req.body.centerInfo.data.center.Email;
            const center=await Center.findOne({Email:CenterEmail});
            if (center!==undefined && center.Status==false)
            {
                  const otp1=RegistrationUtil1.GetOtp();
                  const otp2=RegistrationUtil1.GetOtp();
                  const emailbody=RegistrationUtil1.EmailBody(center.Email,otp1);
                  const messagebody=RegistrationUtil1.MessageBody(otp2);
                  // let emailinfo=await transporter.sendMail(emailbody);
                  // let messageinfo=await vonage.message.sendSms('Team',"91"+center.PhoneNumber,messagebody);
                  center.RecentEmailOtps.push(otp1);
                  center.RecentMobileOtps.push(otp2);
                  await center.save();
                  res.status(200).send();
            }
      }catch(err){
            console.log(err);
            res.status(400).send();
      }
})

router.post('/center/login',async (req,res)=>{
      try{
            const center=await Center.findbycredentials(req.body.email,req.body.password);
            const token=await center.generateauthtoken();
            res.status(200).send({center,token});
      }catch(err){
            console.log(err);
            res.status(404).send("Center not registered");
      }
});

router.post('/review/new',async (req,res)=>{
      try{
            console.log(req.body);
            const center=await Center.findOne({_id:req.body._id});
            center.Reviews.push({
                  text:req.body.review,
                  stars:req.body.rating
            });
            await center.save();
            res.status(200).send();
      }catch(err){
            console.log(err);
            res.status(400).send();
      }
})

module.exports=router;