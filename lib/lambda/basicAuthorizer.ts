const dotenv = require("dotenv");
dotenv.config();

exports.main = async (event: any) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  const authHeader =
    event.headers?.Authorization || event.headers?.authorization;

  if (!authHeader) {
    console.log("Missing Authorization header");
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: "Unauthorized: No authorization header provided",
      }),
    };
  }

  const token = authHeader.split(" ")[1]; // Expecting "Basic base64string"

  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized: Invalid token format" }),
    };
  }

  const decoded = Buffer.from(token, "base64").toString("utf-8"); // "username:password"
  const [username, password] = decoded.split(":");

  console.log(`Decoded credentials -> username: ${username}`);

  // Validate from environment variable
  const expectedPassword = process.env[username];

  if (!expectedPassword || expectedPassword !== password) {
    console.log("Invalid credentials");
    return {
      statusCode: 403,
      body: JSON.stringify({ message: "Forbidden: Invalid credentials" }),
    };
  }

  console.log("Authorization successful");

  // Return IAM policy for API Gateway Authorizer
  return generatePolicy(username, "Allow", event.methodArn);
};

const generatePolicy = (principalId: any, effect: any, resource: any) => ({
  principalId,
  policyDocument: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "execute-api:Invoke",
        Effect: effect,
        Resource: resource,
      },
    ],
  },
});
