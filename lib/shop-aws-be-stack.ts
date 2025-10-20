import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";

import * as cognito from "aws-cdk-lib/aws-cognito";

interface Task4ShopAwsBeStackProps extends cdk.StackProps {
  userPool: cognito.IUserPool;
}

export class Task4ShopAwsBeStack extends cdk.Stack {
  public readonly catalogQueue: sqs.Queue; // Expose the queue as a public property

  constructor(scope: Construct, id: string, props: Task4ShopAwsBeStackProps) {
    super(scope, id, props);

    const { userPool } = props;

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

    // Create SQS queue
    const catalogItemsQueue = new sqs.Queue(this, "CatalogItemsQueue", {
      queueName: "catalogItemsQueue",
    });

    // SNS topic for product creation
    const createProductTopic = new sns.Topic(this, "createProductTopic", {
      displayName: "Create Product Notifications",
      topicName: "createProductTopic",
    });

    // Subscribe to the topic with an email endpoint
    createProductTopic.addSubscription(
      new subs.EmailSubscription("fin.freedom4devesh@gmail.com")
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

    // Lambda for /createProduct
    const createProductLambda = new lambda.Function(
      this,
      "createProduct-lambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "createProduct.main",
        code: lambda.Code.fromAsset(path.join(__dirname, "lambda")),
        environment: {
          PRODUCTS_TABLE: productsTable.tableName,
          STOCK_TABLE: stockTable.tableName,
          REGION: "ap-south-1",
        },
      }
    );

    // Lmbda for catalogBatchProcess
    const catalogBatchProcessLambda = new lambda.Function(
      this,
      "CatalogBatchProcessLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "catalogBatchProcess.main", // file: catalogBatchProcess.js, export function main
        code: lambda.Code.fromAsset(path.join(__dirname, "lambda")),
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        environment: {
          PRODUCTS_TABLE: productsTable.tableName,
          STOCK_TABLE: stockTable.tableName,
          CREATE_PRODUCT_TOPIC_ARN: createProductTopic.topicArn,
          REGION: "ap-south-1",
        },
      }
    );

    // Grant Lambda read access to DynamoDB tables
    productsTable.grantReadData(productsLambda);
    stockTable.grantReadData(productsLambda);

    productsTable.grantReadData(productByIdLambda);
    stockTable.grantReadData(productByIdLambda);

    productsTable.grantWriteData(createProductLambda);
    productsTable.grantReadData(createProductLambda);
    stockTable.grantWriteData(createProductLambda);
    stockTable.grantReadData(createProductLambda);

    productsTable.grantWriteData(catalogBatchProcessLambda);
    createProductTopic.grantPublish(catalogBatchProcessLambda);

    // Grant the Lambda permissions to send messages to the SQS queue
    catalogBatchProcessLambda.addEventSource(
      new SqsEventSource(catalogItemsQueue, {
        batchSize: 5, // process up to 5 messages at once
      })
    );

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

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "my-authorizer",
      {
        authorizerName: "my-authorizer",
        cognitoUserPools: [userPool],
      }
    );

    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction, {
      proxy: true,
    });

    const shopResource = api.root.addResource("shop");
    shopResource.addMethod("GET", lambdaIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
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
    productsResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createProductLambda)
    );

    // /products/{productId} route
    const productByIdResource = productsResource.addResource("{productId}");
    productByIdResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(productByIdLambda)
    );

    // export queue to be used in other stacks
    this.catalogQueue = catalogItemsQueue;

    new cdk.CfnOutput(this, "ApiUrl", { value: api.url });

    // output queue URL
    new cdk.CfnOutput(this, "CatalogQueueArn", {
      value: catalogItemsQueue.queueArn,
      exportName: "CatalogQueueArn",
    });
    new cdk.CfnOutput(this, "CatalogQueueUrl", {
      value: catalogItemsQueue.queueUrl,
      exportName: "CatalogQueueUrl",
    });
  }
}
