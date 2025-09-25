import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class Task4ShopAwsBeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB tables
    const stockTable = dynamodb.Table.fromTableName(
      this,
      "StockTable",
      "stock"
    );
    const productsTable = dynamodb.Table.fromTableName(
      this,
      "ProductsTable",
      "products"
    );

    const lambdaFunction = new lambda.Function(this, "lambda-function", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "handler.main",
      code: lambda.Code.fromAsset(path.join(__dirname, "lambda")),
    });

    // Lambda for /products
    const productsLambda = new lambda.Function(this, "products-lambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "products.main",
      code: lambda.Code.fromAsset(path.join(__dirname, "lambda")),
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCK_TABLE: stockTable.tableName,
        REGION: "ap-south-1",
      },
    });

    // Lambda for /products/{id}
    const productByIdLambda = new lambda.Function(this, "productById-lambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "productById.main",
      code: lambda.Code.fromAsset(path.join(__dirname, "lambda")),
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCK_TABLE: stockTable.tableName,
        REGION: "ap-south-1",
      },
    });

    // Grant Lambda read access to DynamoDB tables
    productsTable.grantReadData(productsLambda);
    stockTable.grantReadData(productsLambda);

    productsTable.grantReadData(productByIdLambda);
    stockTable.grantReadData(productByIdLambda);

    const api = new apigateway.RestApi(this, "shop-aws-be-api", {
      restApiName: "Shop API Gateway",
      description: "This API serves the Lambda functions.",
      defaultCorsPreflightOptions: {
        allowOrigins: [
          "http://localhost:3000",
          "https://d1baeafe5g0fnf.cloudfront.net",
        ],
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      deployOptions: {
        stageName: "dev",
      },
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction, {
      proxy: true,
    });

    const shopResource = api.root.addResource("shop");
    shopResource.addMethod("GET", lambdaIntegration);
    // shopResource.addCorsPreflight({
    //   allowOrigins: ["https://your-frontend-url.com"],
    //   allowMethods: ["GET", "OPTIONS"],
    // });

    // /products route
    const productsResource = api.root.addResource("products");
    productsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(productsLambda)
    );

    // /products/{productId} route
    const productByIdResource = productsResource.addResource("{productId}");
    productByIdResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(productByIdLambda)
    );

    new cdk.CfnOutput(this, "ApiUrl", { value: api.url });
  }
}
