const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(client);

exports.main = async (event: any) => {
  const { v4: uuidv4 } = await import("uuid");
  try {
    const body = JSON.parse(event.body);

    const newProduct = {
      id: uuidv4(),
      title: body.title,
      description: body.description,
      price: body.price,
    };

    const TABLE_NAME = process.env.PRODUCTS_TABLE;

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: newProduct,
    });

    await ddbDocClient.send(command);

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Product created successfully",
        product: newProduct,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          message: "Error while creating product!!!",
          error,
        },
      }),
    };
  }
};
