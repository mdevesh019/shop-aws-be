# Task 5.1

- new stack named ImportServiceStack is added with file name `import-service-stack.ts`
- an S3 bucket has been added in ImportServiceStack with folder name `uploaded`

# Task 5.2

- Lambda function named `importProductsFile` added with proper functional logic and api gateway to upload a file
- Lambda function returns a signed URL, which front end uses to upload the file. FE url is provided below.

# Task 5.3

- Lambda function named `importFileParser` has beed added with S3 event configuration and logic to parse the CSV file

# Frontend Integration

Endpoints are integrated in frontend app here : https://d1baeafe5g0fnf.cloudfront.net
