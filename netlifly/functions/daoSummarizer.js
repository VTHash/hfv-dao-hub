// netlify/functions/daoSummarizer.js
exports.handler = async function(event, context) {
  const body = JSON.parse(event.body || '{}');
  const result = `Summary for ${body.dao}`;
  return {
    statusCode: 200,
    body: JSON.stringify({ result })
  };
};
