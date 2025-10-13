# Task 6.1

- created a new lambda `catalogBatchProcessLambda` which will be triggered by SQS event
- created `catalogItemsQueue` queue to trigger same lambda

# Task 6.2

- Updated `importFileParser` file to send CSV records to SQS.

# Task 6.3

- Created an SNS topic `createProductTopic` and email subscription.
- Updated `catalogBatchProcess` lambda function to send SNS notification on product create.

# Frontend Integration

Endpoints are integrated in frontend app here : https://d1baeafe5g0fnf.cloudfront.net
