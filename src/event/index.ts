import express from 'express';
import {helloWorldController} from "./controller/hello-world.controller.ts";
import {errorHandler} from "./helper/error.handler.ts";

const port = process.env.APP_PORT;
const appName = process.env.APP_NAME || 'unknown';

if (!port)
    throw new Error('Port for the microservice is not set. Please, set the APP_PORT environment variable.');

const app = express();

// add controllers here...
app.use('/hello', helloWorldController);

// global handler for app specified exceptions
app.use(errorHandler);

app.listen(port, () => console.log(`🥳 Microservice ${appName} is now running on port ${port}!`));