const AWS = require('aws-sdk');
const fetch = require("node-fetch");
const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
AWS.config.update({ region: 'us-east-1' });

const snsRequest = async message => {
  const params = {
    Message: message,
    TopicArn: process.env.SNS_TOPIC_ARN,
  };
  return new AWS.SNS({ apiVersion: '2010-03-31' }).publish(params).promise();
}

const saveStatus = async status => {
  const params = {
    TableName: 'STATUS_TABLE',
    Item: {
      'STATUS': { S: status }
    }
  };
  return await ddb.putItem(params).promise();
}

const getLastStatus = async status => {
  const params = {
    TableName: 'STATUS_TABLE',
    Key: {
      'STATUS': { S: status }
    },
  };
  return (await ddb.getItem(params).promise()).Item;
}


module.exports.notificator = async event => {
  const response = await fetch(process.env.ORDER_TRACKING_URL)
    .then(response => response.json())
    .then(data => data);

  const message = response.history.map((history) => history.status);
  const dynamoStatus = await getLastStatus(message[0]);
  const lastStatus = dynamoStatus === undefined ? undefined : dynamoStatus.STATUS.S;

  if (lastStatus !== message[0]) {
    await snsRequest(`La orden cambio de estado: ${message[0]}!!`);
    await saveStatus(message[0]);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: message[0],
      },
      200
    ),
  };
}
