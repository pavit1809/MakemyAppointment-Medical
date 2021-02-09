const validator=require('validator');
const mongoose=require('mongoose');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');

const UserSchema=mongoose.Schema({
      UserName:{
            type: String,
            required: true,
            trim:true
      },
      Age:{
            type: Number,
            required: true,
            default: 0
      },
      Gender:{
            type:String,
            required: true,
            trim:true
      },
      PhoneNumber:{
            type: String,
            required: true
      },
      IdType:{
            type:String,
            required:true
      },
      IdentificationIdNumber:{
            type:String,
            required:true
      },
      Email:{
            type: String,
            required:true,
            unique:true,
            trim: true,
            lowercase: true,
            validate(value){
                  if (!validator.isEmail(value)){
                        throw new Error('Email is invalid');
                  }
            }
      },
      Password:{
            type:String,
            required:true,
            minlength:8
      },
      RecentMobileOtps:[Number],
      RecentEmailOtps:[Number],
      Status:{
            type:Boolean //true means activated ;;false means not activated
      },
      // tokens:[{
      //       token:{
      //             type:String,
      //             required:true
      //       }
      // }],
      NearestLandmark:{
            type:String,
            required:true
      },
      City:{
            type:String,
            required:true
      },
      Pincode:{
            type:String,
            required:true
      },
      State:{
            type:String,
            required:true
      },
      Country:{
            type:String,
            required:true
      },
      PositionCoordinates:[Number]
});

//Adding below options will automatically hide all auth-related data for the user

// UserSchema.methods.toJSON=function(){
//       const user=this;
//       const userobj=user.toObject();

//       // delete userobj.tokens;
//       delete userobj.RecentMobileOtps;
//       delete userobj.RecentEmailOtps;
//       return userobj;
// }
UserSchema.statics.findbycredentials=async (email,password)=>{
      const user=await User.findOne({Email:email});
      if (!user)
      {
            throw new Error("Unable to login");
      }
      const isMatch=await bcrypt.compare(password,user.Password);
      if (!isMatch)
      {
            throw new Error('Unable to login');
      }
      return user;
}


UserSchema.pre('save',async function(next){
      if (this.isModified('Password')){
            const hash=await bcrypt.hash(this.Password,8);
            this.Password=hash;
      }
      next();
});



const User=mongoose.model('User',UserSchema);

module.exports=User;