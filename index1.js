var AWS = require("aws-sdk");
var videoScreen = require('video-screen');
var fs = require('fs');
var getDimensions = require('get-video-dimensions');

exports.handler = (event, context, callback) => {

    console.log("Source bucket : ", event.Records[0].s3.bucket.name);
    console.log("Source key : ", event.Records[0].s3.object.key);

    var s3 = new AWS.S3();
    var sourceBucket = event.Records[0].s3.bucket.name;
    var objectKey = event.Records[0].s3.object.key;
    var destinationBucket = sourceBucket;
    var img_path = objectKey.split("/");
    // var sourceBucket = "video2019";
    // var destinationBucket = "video2019";
    // var objectKey = event.Records[0].s3.object.key;
    var getObjectParams = {
        Bucket: sourceBucket,
        Key: objectKey
    };
    var video_stream = s3.getObject(getObjectParams, function (err, data) {
        if (err) {
            console.log(err, err.stack);
        } else {
            var params = { Bucket: sourceBucket, Key: objectKey };
            s3.getSignedUrl('getObject', params, function (err, url) {
                console.log('The URL is', url);
                console.log("S3 object retrieval get successful.", data);
                var resizedFileName = "/tmp/" + objectKey.split('.').slice(0, -1).join('.') + ".png";
                var dstKey = "thumb/" + objectKey.split('.').slice(0, -1).join('.') + ".png";
                console.log("Destination key :", dstKey);
                console.log("Starting getting dimensions ===========================>");
                // getDimensions(url).then(function (dimensions) {
                //     console.log("Got dimensions =========================>", dimensions);
                //     console.log("Dimensions : ", dimensions);
                //     console.log("Width :", dimensions.width);
                //     console.log("Height :", dimensions.height);

                // videoScreen(url, { width: 300, height: 300 })
                //     .pipe(fs.createWriteStream(resizedFileName));
                videoScreen('path/to/video.mp4')
                    .pipe(fs.createWriteStream('video.png'));
                videoScreen(url, function (err, screenshot) {
                    if (err) {
                        console.log("Error while generating screenshot :", err);
                    }
                    else {
                        console.log("Screenshot Result =====================>", screenshot);
                        fs.writeFile(resizedFileName, screenshot, function () {
                            console.log('screenshot saved!');
                            // var content = new Buffer(fs.readFileSync(resizedFileName));
                            var content = new Buffer(fs.createReadStream(resizedFileName));

                            console.log("Content ===========================>", content);
                            var uploadParams = { Bucket: destinationBucket, Key: dstKey, Body: content, ContentType: data.ContentType, StorageClass: "STANDARD" };
                            s3.upload(uploadParams, function (err, data) {
                                if (err) {
                                    console.log(err, err.stack);
                                } else {
                                    console.log("Thumbnail uploaded to S3 successfully.");
                                }
                            });
                        });
                    }
                });
                // });
            });
        }
    }).createReadStream();
};