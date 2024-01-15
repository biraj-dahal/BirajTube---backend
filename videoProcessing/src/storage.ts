import { Storage } from "@google-cloud/storage"; // package to interact with google cloud storage containers, bucket
import fs from "fs"; // interact with file system
import ffmpeg from "fluent-ffmpeg"; // cli tool made into a package to use in a script to change resolutions. 

const storage = new Storage();  // dynamically allocate a new object Storage GCS.

const rawVidStorageBucket = "kryp-user-raw-vids"; // to store the raw input file from user to GCS bucket
const processedVidStorageBucket = "kryp-user-processed-vids" // to store the processed output file after ffmpeging from user to GCS bucket

const localRawVidPath = "./rawVids" // Google Cloud Run  for computation and local storage we will keep the raw videos to process.
const localProcessedVidPath = "./processedVids" // Google Could Run local storage we will keep processed videos to upload to processedVidStorageBucket

// Local Directories for Raw and Processed file
export function setupDirectories(){ // This function will be called from another file, not this file. so we have export
    dirExists(localProcessedVidPath); // create this Processed Video path in google cloud run if it doesnt exist already
    dirExists(localRawVidPath); // create this Raw Video path in google cloud run if it doesnt exist already

}

// create the local raw, and processed videos if doesnt exist
function dirExists(dirPath: string){ // local function to this file
    if (!fs.existsSync(dirPath)){ //if the path doesnt exist

        fs.mkdirSync(dirPath, {recursive: true}); // naya directory with the path name dirPath, it might /.././././fileDir, so we have to do it recursively
        console.log(`Directory created at ${dirPath}`); // print to the concole that it is successfully created
    }
}


// conver the raw video to processed video
export function convertVid(rawVidName:string, processedVidName:string){ // This function will be called from another file, not this file. so we have export

    return new Promise<void>((resolve, reject) => { // to signify if this function did its work properly or not when called in another file

        ffmpeg(`${localRawVidPath}/${rawVidName}`) // load the localRaw file to ffmpeg 
        .outputOptions("-vf", "scale=-1:360") // signify its a video file and we want output video to be of resultion 360px
        .on("end", ()=>{ // if  
            console.log('Processing finished successfully');
            resolve();
        })
        .on("error", (err)=>{
            console.log(`An error occured: ${err.message}`);
            reject(err);
        })
        .save(`${localProcessedVidPath}/${processedVidName}`);
    });
}

export async function downloadRawVid(fileName: string){
    await storage.bucket(rawVidStorageBucket)
        .file(fileName)
        .download({destination: `${localRawVidPath}/${fileName}`});

    console.log(`gs://${rawVidStorageBucket}/${fileName} downloaded to ${localRawVidPath}/${fileName}`);
}

export async function uploadProcessedVid(fileName: string){
    const bucket = storage.bucket(processedVidStorageBucket);

    await bucket.upload(`${localProcessedVidPath}/${fileName}`, {
        destination: fileName
    });

    console.log(`${localProcessedVidPath}/${fileName} uploaded to gs://${processedVidStorageBucket}/${fileName}`)
    await bucket.file(fileName).makePublic();

}

function deleteFile(filePath: string): Promise<void>{
    return new Promise((resolve, reject) => {
        if (fs.existsSync(filePath)){
            fs.unlink(filePath, (err) => {
                if (err){
                    console.log(`Failed to delete the file at ${filePath}`);
                    reject(err);
                } else{
                    console.log(`File deleted successfully at the path ${filePath}`);
                    resolve();
                }
            });
        } else{
            console.log(`File ${filePath} does not exist. Skipping the clutter deletion.`);
            resolve();
        }
    });

}

export function deleteProcessedVid(fileName: string){
    return deleteFile(`${localProcessedVidPath}/${fileName}`);
}

export function deleteRawVid(fileName: string){
    return deleteFile(`${localRawVidPath}/${fileName}`);
}
