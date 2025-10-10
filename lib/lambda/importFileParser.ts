const AWS = require("aws-sdk");
const csv = require("csv-parser");

const s3 = new AWS.S3();

exports.main = async (event: any) => {
  console.log("S3 event:", JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    console.log(`Processing file from bucket: ${bucket}, key: ${key}`);

    const s3Stream = s3
      .getObject({ Bucket: bucket, Key: key })
      .createReadStream();

    await new Promise((resolve, reject) => {
      s3Stream
        .pipe(csv())
        .on("data", (data: any) => console.log("Parsed record:", data))
        .on("end", () => {
          console.log("CSV file successfully processed.");
          resolve("Resolved");
        })
        .on("error", (error: any) => {
          console.error("Error parsing CSV:", error);
          reject(error);
        });
    });
  }

  return { statusCode: 200 };
};
