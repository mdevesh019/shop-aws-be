const AWS = require("aws-sdk");
const csv = require("csv-parser");

const s3 = new AWS.S3();
const sqs = new AWS.SQS();

const QUEUE_URL = process.env.SQS_URL; // 👈 Add this in Lambda environment variables via CDK

exports.main = async (event: any) => {
  console.log("S3 event:", JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    console.log(`Processing file from bucket: ${bucket}, key: ${key}`);

    const s3Stream = s3
      .getObject({ Bucket: bucket, Key: key })
      .createReadStream();

    const sendPromises: Array<Promise<any>> = [];

    await new Promise((resolve, reject) => {
      s3Stream
        .pipe(csv())
        .on("data", (data: any) => {
          // ✅ Send each parsed record to SQS instead of logging
          const params = {
            QueueUrl: QUEUE_URL,
            MessageBody: JSON.stringify(data),
          };

          sendPromises.push(sqs.sendMessage(params).promise());
        })
        .on("end", async () => {
          console.log("All records parsed, waiting for SQS sends...");
          try {
            await Promise.all(sendPromises);
            console.log("All messages sent to SQS.");
            resolve("Promise resolved!");
          } catch (error) {
            console.error("Error sending messages to SQS:", error);
            reject(error);
          }
        })
        .on("error", (error: any) => {
          console.error("Error parsing CSV:", error);
          reject(error);
        });
    });
  }

  return { statusCode: 200 };
};
