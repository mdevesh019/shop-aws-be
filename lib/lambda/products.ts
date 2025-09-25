const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

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

  try {
    // Fetch products
    const productsResult = await ddbDocClient.send(
      new ScanCommand({ TableName: process.env.PRODUCTS_TABLE })
    );
    const products = productsResult.Items || [];

    // Fetch stock
    const stockResult = await ddbDocClient.send(
      new ScanCommand({ TableName: process.env.STOCK_TABLE })
    );
    const stock = stockResult.Items || [];

    // Merge stock into products
    const productsWithStock = products.map((p: any) => {
      const s = stock.find((st: any) => st.product_id === p.id);
      return { ...p, stock: s?.count || 0 };
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
      },
      body: JSON.stringify(productsWithStock),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
