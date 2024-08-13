const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    thumbnail: [{
        type: String
    }],
    gallery: [{
        type: String,
    }],
    videos: [{
        type: String,
    }]
}, { collection: 'media' });

module.exports = mongoose.model('media', mediaSchema);