const express = require('express');

const router = express.Router();

// Models
const UserModel = require('../Models/usermodel.js');
const MediaModel = require('../Models/media.js');

// Multer - Media processing
const multer = require('multer');
const upload = multer();
// AWS
const AWS = require('aws-sdk');
const fs = require('fs');
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
const bucketName = process.env.AWS_BUCKET;

const util = require('util')

//==============================================================
// CREATE
//==============================================================
//Post Method
const mediaUpload = upload.fields([
    { name: 'thumbnail', maxCount: 1 }, 
    { name: 'gallery', maxCount: 10 }, 
    { name: 'videos', maxCount: 4 }
]);
router.post('/post', mediaUpload, async (req, res) => {
    // MEDIA HANDLING
    const filesR = req.files;
    console.log("OBJECTS FILE: "+util.inspect(filesR, false, null, true /* enable colors */));
    const uploadFilesToS3 = async (files) => {
        const fileArrayObject = {};
        for (const [field, fileArray] of Object.entries(files)) {
          const uploadPromises = fileArray.map((file) => {
            const params = {
              Bucket: bucketName,
              Key: `${field}/${file.originalname}`.replace(/\/$/, ''),
              Body: Buffer.from(file.buffer, 'binary'),
              ContentType: file.mimetype
            };
            return s3.upload(params).promise();
          });
          const results = await Promise.all(uploadPromises);
          const fileLocations = results.map((file) => file.Location);
          let fileIndex = 0;
          fileArrayObject[field] = fileArray.map((file) => ({
            location: fileLocations[fileIndex++]
          }));
        }
        console.log("fileArrayObject: ", util.inspect(fileArrayObject, false, null, true /* enable colors */));
        return fileArrayObject;
    };

    const saveS3ToMediaModel = async (fileArrayObject) => {
        const objectPush = {
            thumbnailArray: [],
            galleryArray: [],
            videosArray: []
        };
        for (const [key, value] of Object.entries(fileArrayObject)) {
            if (`${key}Array` in objectPush) {
                for (const item of value) {
                  objectPush[`${key}Array`].push(item.location);
                }
            }
        };
        const mediaModel = new MediaModel({
            thumbnail: objectPush.thumbnailArray,
            gallery: objectPush.galleryArray,
            videos: objectPush.videosArray
        });
        try {
            const media = await mediaModel.save();
            console.log("Media Model Saved!")
            return media._id;
        } catch (err) {
            console.log(err);
            return null;
        }
    };

    // Body HANDLING
    const saveModelToMongoDB = async (mediaId) => {
        const model = new UserModel({ 
            name: req.body.name,
            password: req.body.password,
            media: mediaId,
        });
        try {
          await model.save();
          console.log("User Model Saved!")
          return model;
        } catch (err) {
          console.log(err);
          return null;
        }
    };

    const uploadAndSave = async (files) => {
        const fileArrayObject = await uploadFilesToS3(files);
        if (fileArrayObject) {
          const mediaId = await saveS3ToMediaModel(fileArrayObject);
          if (mediaId) {
            const uModel = await saveModelToMongoDB(mediaId);
            return uModel;
          } else {
            return null;
          }
        } else {
          return null;
        }
      };

    uploadAndSave(filesR).then((model) => {
        console.log("Added entry!");
        res.status(201).json({ message: 'Files uploaded successfully!', model });
      }).catch((err) => {
        console.log("Failed: "+err);
    });

});

//==============================================================
// Read
//==============================================================
//Get all Method
router.get('/getAll', async (req, res) => {
    try{
        const data = await Model.find();
        res.json(data)
    }
    catch(error){
        res.status(500).json({message: error.message})
    }
});

//Get by ID Method
router.get('/getOne/:id', async (req, res) => {
    try{
        const data = await Model.findById(req.params.id);
        res.json(data)
    }
    catch(error){
        res.status(500).json({message: error.message})
    }
});

//==============================================================
// Update
//==============================================================
//Update PUT
router.put('/putupdate/:id', async (req, res) => {
    try {
        const updatedUser = await Model.updateOne(
            { _id: req.params.id }, 
            { $set: { 
                name: req.body.name,
                password: req.body.password 
            } }
        );
        res.json(updatedUser);
    } catch (err) {
        res.json({ message:err });
    }
});

// Update PATCH
router.patch('/patchupdate/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const updatedData = req.body;
        const options = { new: true };

        const result = await Model.findByIdAndUpdate(
            id, updatedData, options
        )

        res.send(result)
    }
    catch (error) {
        res.status(400).json({ message: error.message })
    }
});

//==============================================================
// Delete
//==============================================================
//Delete by ID Method
router.delete('/deleteOne/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const data = await Model.findByIdAndDelete(id)
        res.send(`${data.name} === deleted`)
    }
    catch (error) {
        res.status(400).json({ message: error.message })
    }
});

// Delete All
router.delete('/deleteAll', async (req, res) => {
    try {
        await Model.deleteMany({})
        res.send(`All Users deleted`)
    }
    catch (error) {
        res.status(400).json({ message: error.message })
    }
});
module.exports = router;