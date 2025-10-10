import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({ region: process.env.REGION });

exports.main = async (event: any) => {
  console.log("impoerProductsFile -> Event:", JSON.stringify(event));

  try {
    const fileName = event.queryStringParameters?.name;

    if (!fileName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing 'name' query parameter" }),
      };
    }

    const bucketName = process.env.BUCKET_NAME;
    const objectKey = `uploaded/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: "text/csv",
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
      },
      body: JSON.stringify({
        uploadUrl: signedUrl,
        key: objectKey,
      }),
    };
  } catch (error) {
    console.error("Error generating signed URL:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error generating signed URL",
        body: JSON.stringify({ message: "Error generating signed URL", error }),
      }),
    };
  }
};
