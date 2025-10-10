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

  const products = [
    {
      id: 1,
      title: "Laptop",
      description: "This is a Laptop, pls buy it!",
      price: 700,
    },
    {
      id: 2,
      title: "Phone",
      description: "This is a Phone, pls buy it!",
      price: 400,
    },
    {
      id: 3,
      title: "Tablet",
      description: "This is a Tablet, pls buy it!",
      price: 300,
    },
    {
      id: 4,
      title: "Monitor",
      description: "This is a Monitor, pls buy it!",
      price: 450,
    },
  ];

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*",
    },
    body: JSON.stringify(products),
  };
};
