const { Schema, model} = require("mongoose")
const findOrCreate = require('mongoose-find-or-create')

const userSchema = new Schema({
    discordId: {
        type: String,
        required: [true, "Discord ID not set!"]
    },
    email: {
        type: String
    },
    username: {
        type: String
    }
},{
    collection: "User"
})
userSchema.plugin(findOrCreate)
const userModel = model('User', userSchema);

module.exports = userModel;
