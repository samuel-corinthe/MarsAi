const { Readable } = require("stream");
const request = require('supertest');
const fs = require('fs');

const mockInsert = jest.fn().mockResolvedValue({ data: { id: 'yt123' } });
const mockYoutube = jest.fn(() => ({ videos: { insert: mockInsert } }));
const mockSetCredentials = jest.fn();
const mockOAuth2 = jest.fn(() => ({ setCredentials: mockSetCredentials }));

jest.mock('googleapis', () => ({
  google: {
    youtube: mockYoutube,
    auth: { OAuth2: mockOAuth2 },
  },
}));

let mockProbeMeta = { width: 1920, height: 1080, duration: 60 };

jest.mock('child_process', () => {
  const original = jest.requireActual('child_process');
  return {
    ...original,
    execFile: (...args) => {
      const cb = args[args.length - 1];
      const stdout = JSON.stringify({
        streams: [{ width: mockProbeMeta.width, height: mockProbeMeta.height }],
        format: { duration: mockProbeMeta.duration },
      });
      setImmediate(() => cb(null, stdout));
    },
  };
});

const app = require('../server');

describe('POST /api/upload validation', () => {
  let existsSpy;
  let readSpy;
  let readStreamSpy;
  const realExists = fs.existsSync;
  const realRead = fs.readFileSync;
  const realCreateRead = fs.createReadStream;

  beforeAll(() => {
    existsSpy = jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
      if (typeof p === 'string' && (p.endsWith('client_secret.json') || p.endsWith('token-node.json'))) return true;
      return realExists(p);
    });
    readSpy = jest.spyOn(fs, 'readFileSync').mockImplementation((p, enc) => {
      if (typeof p === 'string' && p.endsWith('client_secret.json')) {
        return JSON.stringify({
          installed: {
            client_id: 'id',
            client_secret: 'secret',
            redirect_uris: ['http://localhost:5173'],
          },
        });
      }
      if (typeof p === 'string' && p.endsWith('token-node.json')) {
        return JSON.stringify({ access_token: 't', refresh_token: 'r' });
      }
      return realRead(p, enc);
    });
    readStreamSpy = jest
      .spyOn(fs, 'createReadStream')
      .mockImplementation(() => Readable.from(Buffer.from('data')));
  });

  afterAll(() => {
    existsSpy.mockRestore();
    readSpy.mockRestore();
    readStreamSpy.mockRestore();
  });

  beforeEach(() => {
    mockProbeMeta = { width: 1920, height: 1080, duration: 60 };
    mockInsert.mockClear();
  });

  it('returns 200 and youtube_id when video is valid', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('video', Buffer.from('dummy'), { filename: 'video.mp4', contentType: 'video/mp4' })
      .field('title', 'Test');

    expect(res.status).toBe(200);
    expect(res.body.youtube_id).toBe('yt123');
    expect(mockInsert).toHaveBeenCalled();
  });

  it('rejects non-mp4 format', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('video', Buffer.from('dummy'), { filename: 'video.avi', contentType: 'video/avi' });

    expect(res.status).toBe(400);
    expect(res.body.details).toContain('format');
  });

  it('rejects duration out of range', async () => {
    mockProbeMeta = { width: 1920, height: 1080, duration: 10 };

    const res = await request(app)
      .post('/api/upload')
      .attach('video', Buffer.from('dummy'), { filename: 'video.mp4', contentType: 'video/mp4' });

    expect(res.status).toBe(400);
    expect(res.body.details).toContain('duration_range');
  });

  it('rejects wrong aspect ratio', async () => {
    mockProbeMeta = { width: 1000, height: 1000, duration: 60 };

    const res = await request(app)
      .post('/api/upload')
      .attach('video', Buffer.from('dummy'), { filename: 'video.mp4', contentType: 'video/mp4' });

    expect(res.status).toBe(400);
    expect(res.body.details).toContain('ratio');
  });
});
