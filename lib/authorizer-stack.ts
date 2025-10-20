// Filename: authorizer-stack/authorizer-stack.ts
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

export class AuthorizerStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const basicAuthorizerLambda = new lambda.Function(
      this,
      "basicAuthorizerLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "basicAuthorizer.main",
        code: lambda.Code.fromAsset(path.join(__dirname, "lambda")),
      }
    );

    const userPool = new cognito.UserPool(this, "my-user-pool", {
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        familyName: {
          mutable: true,
          required: true,
        },
        phoneNumber: { required: false },
      },
      customAttributes: {
        createdAt: new cognito.DateTimeAttribute(),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: false,
        requireDigits: true,
        requireSymbols: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const appClient = userPool.addClient("my-app-client", {
      userPoolClientName: "my-app-client",
      authFlows: {
        userPassword: true,
      },
    });

    const domain = userPool.addDomain("Domain", {
      cognitoDomain: {
        domainPrefix: "authorization",
      },
    });

    // Expose userPool as a public property
    this.userPool = userPool;

    const api = new apigateway.RestApi(this, "my-api", {
      restApiName: "My API Gateway",
      description: "This API serves the Lambda functions.",
    });

    // const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
    //   this,
    //   "my-authorizer",
    //   {
    //     authorizerName: "my-authorizer",
    //     cognitoUserPools: [userPool],
    //   }
    // );

    const helloFromLambdaIntegration = new apigateway.LambdaIntegration(
      basicAuthorizerLambda,
      {
        requestTemplates: {
          "application/json": `{ "message": "$input.params('message')" }`,
        },
        integrationResponses: [
          {
            statusCode: "200",
          },
        ],
        proxy: false,
      }
    );

    // Create a resource /hello and GET request under it
    const helloResource = api.root.addResource("hello");
    // On this resource attach a GET method which pass reuest to our Lambda function
    helloResource.addMethod("GET", helloFromLambdaIntegration, {
      methodResponses: [{ statusCode: "200" }],
    });

    // Outputs
    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "AppClientId", {
      value: appClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, "CognitoDomain", {
      value: `https://${domain.domainName}.auth.${this.region}.amazoncognito.com`,
    });
  }
}
