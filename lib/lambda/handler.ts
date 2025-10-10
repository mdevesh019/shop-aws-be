exports.main = async (event: any) => {
  console.log("Event:", JSON.stringify(event));

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello from the root handler!",
      input: event,
    }),
  };
};
