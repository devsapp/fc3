exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello from FC3 with Scaling Config!',
      event,
    }),
  };
};
