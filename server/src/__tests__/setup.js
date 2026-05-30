const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

// Initialize mock Redis store
const mockRedisStore = new Map();
const mockRedisClient = {
  set: vi.fn(async (key, value) => {
    mockRedisStore.set(key, value);
    return "OK";
  }),
  get: vi.fn(async (key) => mockRedisStore.get(key) || null),
  del: vi.fn(async (key) => {
    mockRedisStore.delete(key);
    return 1;
  }),
  keys: vi.fn(async () => Array.from(mockRedisStore.keys())),
};

// Override the require cache for redis config
const redisPath = require.resolve("../config/redis");
require.cache[redisPath] = {
  id: redisPath,
  filename: redisPath,
  loaded: true,
  exports: {
    redisClient: mockRedisClient,
    connectRedis: vi.fn(),
  },
};

// Initialize mock Mailer
const mockSendEmail = vi.fn().mockResolvedValue(undefined);
const mailerPath = require.resolve("../utils/mailer");
require.cache[mailerPath] = {
  id: mailerPath,
  filename: mailerPath,
  loaded: true,
  exports: {
    sendEmail: mockSendEmail,
    buildEmailTemplate: vi.fn().mockReturnValue("<html>test</html>"),
  },
};

// Expose mock store and mock spies globally for assertions in tests
global.mockRedisStore = mockRedisStore;
global.mockSendEmail = mockSendEmail;

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
