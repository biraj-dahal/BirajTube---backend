import express from "express";
import ffmpeg from "fluent-ffmpeg";
import { convertVid, deleteProcessedVid, deleteRawVid, downloadRawVid, setupDirectories, uploadProcessedVid } from "./storage";

setupDirectories();

const app = express();
app.use(express.json());

app.post("/process-video", async (req, res) => {
  let data;

  try{
    const message = Buffer.from(req.body.message.data, 'base64').toString('utf8');
    data = JSON.parse(message);
    if (!data.name){
      throw new Error('Invalid message payload received')
    }
  }catch(error){
    console.error(error);
    return res.status(400).send(`Bad request: missing filename.`);
  }

  const inputFileName = data.name;
  const outputFileName = `processed-${inputFileName}`;

  await downloadRawVid(inputFileName);

  try{
    await convertVid(inputFileName, outputFileName);
  }catch (err){
    await Promise.all([    
      deleteRawVid(inputFileName),
      deleteProcessedVid(outputFileName)
    ]);

    console.error(err);
    return res.status(500).send(`Internal Server Error: Video Processing Failed/`);
  }

  await uploadProcessedVid(outputFileName);

  await Promise.all([    
    deleteRawVid(inputFileName),
    deleteProcessedVid(outputFileName)
  ]);

  return res.status(200).send('Processing finished successfully.');

});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Video Processing Service listening at http://localhost:${port}`);
});

