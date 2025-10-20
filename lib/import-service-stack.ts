import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import { AuthorizerStack } from "./authorizer-stack";
import { Construct } from "constructs";

import * as sqs from "aws-cdk-lib/aws-sqs";
import * as cognito from "aws-cdk-lib/aws-cognito";

interface ImportServiceStackProps extends cdk.StackProps {
  userPool: cognito.IUserPool;
}

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ImportServiceStackProps) {
    super(scope, id, props);

    const { userPool } = props;

    const catalogItemsQueue = sqs.Queue.fromQueueArn(
      this,
      "ImportedCatalogQueue",
      cdk.Fn.importValue("CatalogQueueArn")
    );

    const bucket = new s3.Bucket(this, "Task5Bucket", {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Note: only use DESTROY for development
    });

    bucket.addCorsRule({
      allowedOrigins: ["https://d1baeafe5g0fnf.cloudfront.net"],
      allowedMethods: [
        s3.HttpMethods.GET,
        s3.HttpMethods.PUT,
        s3.HttpMethods.POST,
        s3.HttpMethods.DELETE,
        s3.HttpMethods.HEAD,
      ],
      allowedHeaders: ["*"],
      exposedHeaders: ["ETag"],
    });

    new s3deploy.BucketDeployment(this, "CreateUploadedFolder", {
      destinationBucket: bucket,
      sources: [
        s3deploy.Source.data(
          "uploaded/.keep",
          "Placeholder file to create uploaded folder"
        ),
      ],
    });

    const importProductsFileLambda = new lambda.Function(
      this,
      "ImportProductsFileLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "importProductsFile.main",
        code: lambda.Code.fromAsset(path.join(__dirname, "lambda")),
        environment: {
          BUCKET_NAME: bucket.bucketName,
          REGION: "ap-south-1",
        },
      }
    );

    // Lambda to process files uploaded to S3
    const importFileParserLambda = new lambda.Function(
      this,
      "ImportFileParserLambda",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "importFileParser.main",
        code: lambda.Code.fromAsset(path.join(__dirname, "lambda")),
        environment: {
          BUCKET_NAME: bucket.bucketName,
          SQS_URL: catalogItemsQueue.queueUrl,
        },
      }
    );

    bucket.grantReadWrite(importProductsFileLambda);
    bucket.grantReadWrite(importFileParserLambda);

    // Grant the Lambda permissions to send messages to the SQS queue
    catalogItemsQueue.grantSendMessages(importFileParserLambda);

    // notification to lambda when new file is created in S3
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParserLambda),
      { prefix: "uploaded/" }
    );

    const api = new apigateway.RestApi(this, "ImportServiceApi", {
      restApiName: "Import Service",
      description: "This service handles product file imports.",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
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

    const importProductResource = api.root.addResource("import");

    importProductResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(importProductsFileLambda),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    new cdk.CfnOutput(this, "ImportApiUrl", {
      value: api.url ?? "No URL available",
      description: "The endpoint for importing products",
    });

    new cdk.CfnOutput(this, "ImportBucketName", {
      value: bucket.bucketName,
      description: "S3 Bucket used for product file uploads",
    });
  }
}
