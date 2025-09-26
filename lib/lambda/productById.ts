const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(client);

exports.main = async (event: any) => {
  console.log("Event:", JSON.stringify(event));

  const allowedOrigins = [
    "http://localhost:3000", // local frontend
    "https://d1baeafe5g0fnf.cloudfront.net", // deployed frontend
  ];

  const origin = event.headers?.origin;
  const allowOrigin = allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0];

  const productId = event.pathParameters?.productId;

  if (!productId) {
    return {
      statusCode: 404,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Product not found" }),
    };
  }

  try {
    /// Get product from DynamoDB
    const productResult = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.PRODUCTS_TABLE,
        Key: { id: productId },
      })
    );

    const product = productResult.Item;
    if (!product) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": allowOrigin },
        body: JSON.stringify({ message: "product not found" }),
      };
    }

    // Get stock
    const stockResult = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.STOCK_TABLE,
        Key: { product_id: productId },
      })
    );
    const stockCount = stockResult.Item ? stockResult.Item.count : 0;

    const productWithStock = { ...product, stock: stockCount };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
      },
      body: JSON.stringify(productWithStock),
    };
  } catch (error) {
    console.error("Error fetching product:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": allowOrigin },
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
