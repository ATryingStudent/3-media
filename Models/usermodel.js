const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        required: true,
        type: String
    },
    password: {
        required: true,
        type: String
    },
    media: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'media'
	}
}, { collection: 'user' });

module.exports = mongoose.model('user', userSchema);