const express = require('express')
const fs = require("fs");
const app = express()
const port = 8080
const Hls = require('hls-server');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const cors = require("cors");

app.use(express.static('/'));

const corsOptions ={
    origin:'http://localhost:3000',
    credentials:true,            //access-control-allow-credentials:true
    optionSuccessStatus:200
}
app.use(cors(corsOptions));

app.get('/client', (req, res) => {
    return res.status(200).sendFile(`${__dirname}/client.html`);
});

app.get('/', (req, res) => {

    ffmpeg.setFfmpegPath(ffmpegPath);
    // const ffmpeg = require('fluent-ffmpeg');

// open input stream
    const infs = new ffmpeg

    infs.addInput('video.mp4').outputOptions([
        '-map 0:0',
        '-map 0:1',
        '-map 0:0',
        '-map 0:1',
        '-s:v:0 2160x3840',
        '-c:v:0 libx264',
        '-b:v:0 2000k',
        '-s:v:1 960x540',
        '-c:v:1 libx264',
        '-b:v:1 365k',
        // '-var_stream_map', '"v:0,a:0 v:1,a:1"',
        '-master_pl_name master.m3u8',
        '-f hls',
        '-max_muxing_queue_size 1024',
        '-hls_time 1',
        '-hls_list_size 0',
        '-hls_segment_filename', 'fileSequence%d.ts'
    ]).output('./video.m3u8')
        .on('start', function (commandLine) {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('error', function (err, stdout, stderr) {
            console.log('An error occurred: ' + err.message, err, stderr);
        })
        .on('progress', function (progress) {
            console.log(progress)
            console.log('Processing: ' + progress.percent + '% done')
        })
        .on('end', function (err, stdout, stderr) {
            console.log('Finished processing!' /*, err, stdout, stderr*/)
        })
        .run()

    res.send('Hello World!')
})

const server = app.listen(port, () => {
    console.log(`app listening on port ${port}`)
});

new Hls(server, {
    provider: {
        exists: (req, cb) => {
            const ext = req.url.split('.').pop();

            if (ext !== 'm3u8' && ext !== 'ts') {
                return cb(null, true);
            }

            fs.access(__dirname + req.url, fs.constants.F_OK, function (err) {
                if (err) {
                    console.log('File not exist');
                    return cb(null, false);
                }
                cb(null, true);
            });
        },
        getManifestStream: (req, cb) => {
            const stream = fs.createReadStream(__dirname + req.url);
            cb(null, stream);
        },
        getSegmentStream: (req, cb) => {
            const stream = fs.createReadStream(__dirname + req.url);
            cb(null, stream);
        }
    }
});

