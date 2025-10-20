#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { Task4ShopAwsBeStack } from "../lib/shop-aws-be-stack";
import { ImportServiceStack } from "../lib/import-service-stack";
import { AuthorizerStack } from "../lib/authorizer-stack";

const app = new cdk.App();

const authStack = new AuthorizerStack(app, "AuthorizerStack", {
  env: { region: "ap-south-1" },
});

new Task4ShopAwsBeStack(app, "Task4ShopAwsBeStack", {
  env: { region: "ap-south-1" },
  userPool: authStack.userPool,
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */
  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

new ImportServiceStack(app, "ImportServiceStack", {
  env: { region: "ap-south-1" },
  userPool: authStack.userPool,
});
