process.env.PATH = process.env.PATH + ":/var/task";
process.env["FFMPEG_PATH"] = process.env["LAMBDA_TASK_ROOT"] + "/ffmpeg";
var child_process = require("child_process"),
    async = require("async"),
    AWS = require("aws-sdk"),
    fs = require("fs"),
    utils = {
        decodeKey: function (key) {
            return decodeURIComponent(key).replace(/\+/g, " ");
        }
    },
    mediainfo = require('mediainfo-wrapper');
var s3 = new AWS.S3();
var thumbKeyPrefix = "thumb/",
    thumbWidth = 180,
    thumbHeight = 180,
    allowedFileTypes = ["mov", "mpg", "mpeg", "mp4", "wmv", "avi"];


exports.handler = function (event, context) {
    var tmpFile = fs.createWriteStream(`/tmp/${event.Records[0].s3.object.key}`);
    var srcKey = utils.decodeKey(event.Records[0].s3.object.key),
        bucket = event.Records[0].s3.bucket.name,
        dstKey = thumbKeyPrefix + srcKey.replace(/\.\w+$/, ".jpg"),
        fileType = srcKey.match(/\.\w+$/),
        target = s3.getSignedUrl("getObject", { Bucket: bucket, Key: srcKey, Expires: 900 });
    var metadata = { Width: 0, Height: 0 };
    if (srcKey.indexOf(thumbKeyPrefix) === 0) {
        return;
    }

    if (fileType === null) {
        context.fail("Invalid filetype found for key: " + srcKey);
        return;
    }

    fileType = fileType[0].substr(1);

    if (allowedFileTypes.indexOf(fileType) === -1) {
        context.fail("Filetype " + fileType + " not valid for thumbnail, exiting");
        return;
    }
    async.waterfall([

        function createMetaData(next) {
            mediainfo(target).then(function (data) {
                for (var i in data) {

                    for (var x in data[i].video) {
                        metadata.Width = data[i].video[0].width[0]; //Width in pixels
                        metadata.Height = data[i].video[0].height[0]; //Height in pixels
                        thumbHeight = data[i].video[0].height[0];
                        thumbWidth = data[i].video[0].width[0];
                        break;
                    }
                };
                next(null);
            }).catch(function (e) { console.error(e) });
        },

        function createThumbnail(next) {
            var scalingFactor = Math.min(thumbWidth / metadata.Width, thumbHeight / metadata.Height),
                width = Math.round(scalingFactor * metadata.Width),
                height = Math.round(scalingFactor * metadata.Height);

            if (isNaN(width)) width = thumbWidth;
            if (isNaN(height)) height = thumbHeight;
            var ffmpeg = child_process.spawn("ffmpeg", [
                "-ss", "00:00:05", // time to take screenshot
                "-i", target, // url to stream from
                "-vf", "thumbnail,scale=" + width + ":" + height,
                "-qscale:v", "2",
                "-frames:v", "1",
                "-f", "image2",
                "-c:v", "mjpeg",
                "pipe:1"
            ]);
            ffmpeg.on("error", function (err) {
                console.log(err);
            })
            ffmpeg.on("close", function (code) {
                if (code != 0) {
                    console.log("child process exited with code " + code);
                } else {
                    console.log("Processing finished !");
                }
                tmpFile.end();
                next(code);
            });
            tmpFile.on("error", function (err) {
                console.log("stream err: ", err);
            });
            ffmpeg.on("end", function () {
                tmpFile.end();
            })
            ffmpeg.stdout.pipe(tmpFile)
                .on("error", function (err) {
                    console.log("error while writing: ", err);
                });
        },

        function uploadThumbnail(next) {
            var tmpFile = fs.createReadStream(`/tmp/${event.Records[0].s3.object.key}`);
            child_process.exec("echo `ls -l -R /tmp`",
                function (error, stdout, stderr) {
                    console.log("stdout: " + stdout) // for checking on the screenshot
                });
            var params = {
                Bucket: bucket,
                Key: dstKey,
                Body: tmpFile,
                ContentType: "image/jpg",
                ACL: "public-read",
                Metadata: {
                    thumbnail: "TRUE"
                }
            };

            var uploadMe = s3.upload(params);
            uploadMe.send(
                function (err, data) {
                    if (err != null) console.log("error: " + err);
                    next(err);
                }
            );
        }
    ],
        function (err) {
            if (err) {
                console.error(
                    "Unable to generate thumbnail for '" + bucket + "/" + srcKey + "'" +
                    " due to error: " + err
                );
                context.fail(err);
            } else {
                context.succeed("Created thumbnail for '" + bucket + "/" + srcKey + "'");
            }
        }
    );
};