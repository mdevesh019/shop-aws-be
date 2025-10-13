const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const client = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(client);

exports.main = async (event: any) => {
  const { v4: uuidv4 } = await import("uuid");
  try {
    for (const record of event.Records) {
      const product = JSON.parse(record.body);

      const productId = uuidv4();

      const newProduct = {
        id: productId,
        title: product.title,
        description: product.description,
        price: Number(product.price),
        count: Number(product.count),
      };

      console.log("Processing newProduct:", newProduct);

      const command = new PutCommand({
        TableName: process.env.PRODUCTS_TABLE,
        Item: newProduct,
      });

      await ddbDocClient.send(command);

      // ✅ Publish message to SNS
      const message = `New product created: ${newProduct.title} (ID: ${newProduct.id})`;
      const snsClient = new SNSClient({ region: process.env.REGION });

      await snsClient.send(
        new PublishCommand({
          TopicArn: process.env.CREATE_PRODUCT_TOPIC_ARN,
          Subject: "New Product Created",
          Message: message,
        })
      );
    }
  } catch (error) {
    console.error("in catalogBatchProcess Error processing batch:", error);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Products processed and SNS notified." }),
  };
};
