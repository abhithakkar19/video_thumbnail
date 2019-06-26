var AWS = require("aws-sdk");
var fs = require('fs');
var ffmpeg = require('ffmpeg');


// console.log("Source bucket : ", event.Records[0].s3.bucket.name);
// console.log("Source key : ", event.Records[0].s3.object.key);

// var s3 = new AWS.S3();
// var sourceBucket = "video2019";
// var objectKey = "video2019/734998667045295400.mp4";
// var destinationBucket = sourceBucket;
// var img_path = objectKey.split("/");
// // var sourceBucket = "video2019";
// // var destinationBucket = "video2019";
// // var objectKey = event.Records[0].s3.object.key;
// var getObjectParams = {
//     Bucket: sourceBucket,
//     Key: objectKey
// };
// s3.getObject(getObjectParams, function (err, data) {
//     if (err) {
//         console.log(err, err.stack);
//     } else {
//         var params = { Bucket: sourceBucket, Key: objectKey };
//         console.log("Parameters :", params);
//         s3.getSignedUrl('getObject', params, function (err, url) {

//             console.log("Image Path : ", img_path);
//             console.log('The URL is', url);
//             console.log("S3 object retrieval get successful.", data);
//             var path_to_store_image = "/tmp";
//             var image_file_name = objectKey.split('.').slice(0, -1).join('.') + ".jpg";
//             var dstKey = "thumb/" + objectKey.split('.').slice(0, -1).join('.') + ".jpg";

//             console.log("Path to store : ", path_to_store_image);
//             console.log("Image file name : ", image_file_name);
//             console.log("Thumb path : ", dstKey);

            try {
                var process = new ffmpeg(`https://video2019.s3.amazonaws.com/734998667045295400.mp4?AWSAccessKeyId=ASIAU7VCRWMGKBFSOMWV&Expires=1542031863&Signature=qsnK3liC3mbzRRlSvomARlzeXA0%3D&x-amz-security-token=FQoGZXIvYXdzEMf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDMFh0yHer0cM2kM4ECLoAegTAS37XY1xjHVTfkAmmWv1iMmRGKJh84i7qDNPGahI%2FbA6IZEYj5sD3RJ3zj0uMDUD5hRQXT6bx8lE3OpI%2BOQS647%2Bgt0Mq8OY0FAqRNWVUb9vB9M%2FhTPdzeMtc6ENHOeiXEz8WiCXW8IhyGTO6sDxxH%2Bl7drHKdxOY4861zD%2FcadqgVS9mwoghJ40hRAxGXqORGw0So2F%2BW2aaU9pl9wpbtJpYotT2%2BJvtyOCqH0YvpzTSsVf7EeULBTh%2BxfUNvbDZj%2F7Sez4oAeXJkIbBj55AO3jM1TDccNoc%2FWDuIvzlJV64OUfXAUo5Pul3wU%3D`);
                process.then(function (video) {
                    // Callback mode
                    video.fnExtractFrameToJPG("/", {
                        frame_rate: 1,
                        number: 1,
                        file_name: 'my_frame_%t_%s'
                    }, function (error, files) {
                        if (error) {
                            console.log("Error while getting video thumbnail : ", error);
                        }
                        else {
                            console.log('Frames: ' + files);

                            var content = new Buffer(fs.readFileSync(`${path_to_store_image}/${files[0]}`));

                            console.log("Content :", content);
                            var uploadParams = { Bucket: destinationBucket, Key: dstKey, Body: content, ContentType: 'image/jpg', StorageClass: "STANDARD" };
                            s3.upload(uploadParams, function (err, data) {
                                if (err) {
                                    console.log(err, err.stack);
                                } else {
                                    console.log("Video thumbnail successfully generated on s3.");
                                }
                            });
                        }
                    });
                }, function (err) {
                    console.log('Error while processing video : ' + err);
                });
            } catch (e) {
                console.log("Coming in catch :", e.code);
                console.log("Coming in catch :", e.msg);
            }
//         });
//     }
// });