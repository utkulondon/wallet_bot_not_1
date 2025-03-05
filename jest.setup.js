process.env.MONGODB_URI = 'mongodb+srv:
process.env.NODE_ENV = 'test';


const EventEmitter = require('events');
global.eventEmitter = new EventEmitter(); 
